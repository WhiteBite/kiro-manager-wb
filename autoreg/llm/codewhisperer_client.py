#!/usr/bin/env python3
"""
CodeWhisperer Client for Kiro LLM API

Based on AnyAI-2-Open-API implementation.
Endpoint: https://codewhisperer.{region}.amazonaws.com/generateAssistantResponse
"""

import json
import uuid
import hashlib
import platform
from typing import AsyncGenerator, Dict, Any, List, Optional

import httpx

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from llm.token_pool import TokenPool, PoolToken
from core.kiro_config import get_machine_id, get_kiro_version

# ============================================================================
# Configuration
# ============================================================================

DEFAULT_REGION = "us-east-1"

# Model mapping (from Kiro UI)
MODEL_MAPPING = {
    # Opus 4.5 (2.2x credit)
    "claude-opus-4-5": "CLAUDE_OPUS_4_5_V1_0",
    "claude-opus-4.5": "CLAUDE_OPUS_4_5_V1_0",
    "claude-4-opus": "CLAUDE_OPUS_4_5_V1_0",
    "opus": "CLAUDE_OPUS_4_5_V1_0",
    
    # Sonnet 4.5 (1.3x credit)
    "claude-sonnet-4-5": "CLAUDE_SONNET_4_5_V1_0",
    "claude-sonnet-4.5": "CLAUDE_SONNET_4_5_V1_0",
    "claude-4-sonnet": "CLAUDE_SONNET_4_5_V1_0",
    
    # Sonnet 4 (1.3x credit)
    "claude-sonnet-4": "CLAUDE_SONNET_4_20250514_V1_0",
    "claude-sonnet-4-20250514": "CLAUDE_SONNET_4_20250514_V1_0",
    "sonnet": "CLAUDE_SONNET_4_20250514_V1_0",
    
    # Haiku 4.5 (0.4x credit)
    "claude-haiku-4-5": "CLAUDE_HAIKU_4_5_V1_0",
    "claude-haiku-4.5": "CLAUDE_HAIKU_4_5_V1_0",
    "haiku": "CLAUDE_HAIKU_4_5_V1_0",
    
    # Auto (default)
    "auto": "AUTO",
}

def get_endpoint(region: str) -> str:
    """Get CodeWhisperer endpoint for region."""
    return f"https://codewhisperer.{region}.amazonaws.com/generateAssistantResponse"

def get_user_agent(machine_id: str) -> Dict[str, str]:
    """Generate Kiro-compatible user agent headers."""
    version = get_kiro_version()
    os_info = f"win32#{platform.version()}" if platform.system() == "Windows" else f"{platform.system().lower()}#{platform.release()}"
    
    return {
        "x-amz-user-agent": f"aws-sdk-js/1.0.7 KiroIDE-{version}-{machine_id}",
        "user-agent": f"aws-sdk-js/1.0.7 ua/2.1 os/{os_info} lang/js md/nodejs#20.16.0 api/codewhispererstreaming#1.0.7 m/E KiroIDE-{version}-{machine_id}",
    }

# ============================================================================
# CodeWhisperer Client
# ============================================================================

class CodeWhispererClient:
    """Client for CodeWhisperer API (Kiro backend)."""
    
    def __init__(self, token_pool: TokenPool):
        self.token_pool = token_pool
        self.current_token: Optional[PoolToken] = None
        self.machine_id = get_machine_id()
    
    async def generate(
        self,
        messages: List[Any],
        model: str = "claude-sonnet-4-20250514",
        max_tokens: int = 4096,
        temperature: float = 0.7
    ) -> str:
        """Generate non-streaming response."""
        content = ""
        async for chunk in self.generate_stream(messages, model, max_tokens, temperature):
            content += chunk
        return content
    
    async def generate_stream(
        self,
        messages: List[Any],
        model: str = "claude-sonnet-4-20250514",
        max_tokens: int = 4096,
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response."""
        
        # Get token from pool
        token = await self.token_pool.get_token()
        if not token:
            raise Exception("No available tokens in pool")
        
        self.current_token = token
        
        # Build request
        url = get_endpoint(token.region)
        request_body = self._build_request(messages, model)
        
        # Headers
        ua_headers = get_user_agent(self.machine_id)
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {token.access_token}",
            "amz-sdk-invocation-id": str(uuid.uuid4()),
            "amz-sdk-request": "attempt=1; max=1",
            "x-amzn-kiro-agent-mode": "vibe",
            **ua_headers
        }
        
        body_str = json.dumps(request_body)
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    url,
                    headers=headers,
                    content=body_str
                )
                
                if response.status_code == 401:
                    await self.token_pool.mark_error(token.filename, "Unauthorized")
                    raise Exception("Token unauthorized - may be expired or banned")
                
                if response.status_code == 403:
                    error_text = response.text[:200]
                    await self.token_pool.mark_error(token.filename, f"Forbidden: {error_text}")
                    raise Exception(f"Access forbidden - {error_text}")
                
                if response.status_code == 429:
                    await self.token_pool.mark_quota_exceeded(token.filename)
                    raise Exception("Rate limited - quota exceeded")
                
                if response.status_code != 200:
                    error_body = response.text[:500]
                    await self.token_pool.mark_error(
                        token.filename, 
                        f"HTTP {response.status_code}: {error_body}"
                    )
                    raise Exception(f"API error {response.status_code}: {error_body}")
                
                # Parse response
                content = self._parse_response(response.text)
                if content:
                    yield content
                
                # Success
                await self.token_pool.mark_success(token.filename)
                    
        except httpx.TimeoutException:
            await self.token_pool.mark_error(token.filename, "Request timeout")
            raise Exception("Request timed out")
        
        except Exception as e:
            error_str = str(e).lower()
            if "unauthorized" in error_str or "forbidden" in error_str:
                await self.token_pool.mark_error(token.filename, str(e))
            raise
    
    def _build_request(self, messages: List[Any], model: str) -> Dict[str, Any]:
        """Build CodeWhisperer request from OpenAI-style messages."""
        conversation_id = str(uuid.uuid4())
        
        # Get model ID
        cw_model = MODEL_MAPPING.get(model, MODEL_MAPPING.get("claude-sonnet-4-20250514"))
        
        # Process messages
        history = []
        system_prompt = ""
        current_message = None
        
        for msg in messages:
            role = msg.role if hasattr(msg, 'role') else msg.get('role', '')
            content = msg.content if hasattr(msg, 'content') else msg.get('content', '')
            
            if role == "system":
                system_prompt = content
            elif role == "user":
                if current_message:
                    # Add previous exchange to history
                    history.append(current_message)
                
                user_content = content
                if system_prompt and not history:
                    # Prepend system prompt to first user message
                    user_content = f"{system_prompt}\n\n{content}"
                    system_prompt = ""
                
                current_message = {
                    "userInputMessage": {
                        "content": user_content,
                        "modelId": cw_model,
                        "origin": "AI_EDITOR",
                        "userInputMessageContext": {}
                    }
                }
            elif role == "assistant":
                if current_message:
                    current_message["assistantResponseMessage"] = {
                        "content": content
                    }
                    history.append(current_message)
                    current_message = None
        
        # Build final request
        if current_message:
            request = {
                "conversationState": {
                    "chatTriggerType": "MANUAL",
                    "conversationId": conversation_id,
                    "currentMessage": current_message,
                    "history": history[:-1] if history else []  # Exclude last if it's current
                }
            }
        else:
            # Fallback - use last message
            last_content = ""
            if messages:
                last_msg = messages[-1]
                last_content = last_msg.content if hasattr(last_msg, 'content') else last_msg.get('content', '')
            
            if system_prompt:
                last_content = f"{system_prompt}\n\n{last_content}"
            
            request = {
                "conversationState": {
                    "chatTriggerType": "MANUAL",
                    "conversationId": conversation_id,
                    "currentMessage": {
                        "userInputMessage": {
                            "content": last_content,
                            "modelId": cw_model,
                            "origin": "AI_EDITOR",
                            "userInputMessageContext": {}
                        }
                    },
                    "history": history
                }
            }
        
        return request
    
    def _parse_response(self, raw_response: str) -> str:
        """Parse CodeWhisperer response and extract content."""
        content_parts = []
        
        # Response format: event{json}event{json}...
        # Look for content fields in the response
        import re
        
        # Try to find all JSON objects with content
        # Pattern: look for "content":"..." 
        content_pattern = re.compile(r'"content"\s*:\s*"((?:[^"\\]|\\.)*)?"', re.DOTALL)
        
        for match in content_pattern.finditer(raw_response):
            content = match.group(1)
            if content:
                # Unescape
                content = content.replace('\\n', '\n')
                content = content.replace('\\t', '\t')
                content = content.replace('\\"', '"')
                content = content.replace('\\\\', '\\')
                content_parts.append(content)
        
        # Also try parsing as JSON events
        # Format: :message-typeevent{...}
        event_pattern = re.compile(r':message-typeevent(\{[^}]+\})', re.DOTALL)
        for match in event_pattern.finditer(raw_response):
            try:
                event = json.loads(match.group(1))
                if 'content' in event and event['content']:
                    content_parts.append(event['content'])
            except json.JSONDecodeError:
                pass
        
        # Deduplicate while preserving order
        seen = set()
        unique_parts = []
        for part in content_parts:
            if part not in seen:
                seen.add(part)
                unique_parts.append(part)
        
        return ''.join(unique_parts)
