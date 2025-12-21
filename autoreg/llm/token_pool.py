#!/usr/bin/env python3
"""
Token Pool Manager

Manages a pool of Kiro tokens with:
- Round-robin rotation
- Automatic refresh
- Ban detection
- Usage tracking
"""

import asyncio
import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any

import aiofiles

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.paths import get_paths
from services.token_service import TokenService

# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class PoolToken:
    """Token in the pool."""
    filename: str
    account_name: str
    email: str
    access_token: str
    refresh_token: str
    expires_at: datetime
    region: str = "us-east-1"
    auth_method: str = "social"
    
    # Status
    is_banned: bool = False
    ban_reason: str = ""
    
    # Usage tracking
    request_count: int = 0
    error_count: int = 0
    last_used: float = 0
    last_error: str = ""
    
    # Quota (if known)
    quota_used: int = 0
    quota_limit: int = 500
    
    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return True
        return datetime.now(self.expires_at.tzinfo) > self.expires_at
    
    @property
    def is_available(self) -> bool:
        return not self.is_banned and not self.is_expired
    
    @property
    def quota_percent(self) -> float:
        if self.quota_limit <= 0:
            return 0
        return (self.quota_used / self.quota_limit) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "account": self.account_name or self.email,
            "region": self.region,
            "is_banned": self.is_banned,
            "ban_reason": self.ban_reason,
            "is_expired": self.is_expired,
            "is_available": self.is_available,
            "request_count": self.request_count,
            "error_count": self.error_count,
            "quota_used": self.quota_used,
            "quota_limit": self.quota_limit,
            "quota_percent": round(self.quota_percent, 1)
        }

# ============================================================================
# Token Pool
# ============================================================================

class TokenPool:
    """Manages pool of Kiro tokens."""
    
    def __init__(self):
        self.paths = get_paths()
        self.token_service = TokenService()
        self.tokens: List[PoolToken] = []
        self._lock = asyncio.Lock()
        self._current_index = 0
    
    # =========================================================================
    # Properties
    # =========================================================================
    
    @property
    def total_count(self) -> int:
        return len(self.tokens)
    
    @property
    def available_count(self) -> int:
        return sum(1 for t in self.tokens if t.is_available)
    
    @property
    def banned_count(self) -> int:
        return sum(1 for t in self.tokens if t.is_banned)
    
    @property
    def expired_count(self) -> int:
        return sum(1 for t in self.tokens if t.is_expired and not t.is_banned)
    
    # =========================================================================
    # Load/Save
    # =========================================================================
    
    async def load_tokens(self) -> int:
        """Load all tokens from storage."""
        self.tokens = []
        
        # Load from token service
        token_infos = self.token_service.list_tokens()
        
        for info in token_infos:
            try:
                data = info.raw_data
                if not data.get('accessToken'):
                    continue
                
                # Parse expiry
                expires_at = None
                if data.get('expiresAt'):
                    try:
                        expires_at = datetime.fromisoformat(
                            data['expiresAt'].replace('Z', '+00:00')
                        )
                    except:
                        pass
                
                token = PoolToken(
                    filename=info.path.name,
                    account_name=data.get('accountName', ''),
                    email=data.get('email', ''),
                    access_token=data.get('accessToken', ''),
                    refresh_token=data.get('refreshToken', ''),
                    expires_at=expires_at,
                    region=data.get('region', 'us-east-1'),
                    auth_method=data.get('authMethod', 'social')
                )
                
                self.tokens.append(token)
                
            except Exception as e:
                print(f"[!] Error loading token {info.path.name}: {e}")
        
        # Sort by availability (available first)
        self.tokens.sort(key=lambda t: (t.is_banned, t.is_expired))
        
        print(f"\n[Pool] Loaded {len(self.tokens)} tokens:")
        for t in self.tokens:
            status = "BANNED" if t.is_banned else ("EXPIRED" if t.is_expired else "OK")
            print(f"  [{status}] {t.account_name or t.email}")
        
        return len(self.tokens)
    
    # =========================================================================
    # Token Selection
    # =========================================================================
    
    async def get_token(self) -> Optional[PoolToken]:
        """Get next available token (round-robin)."""
        async with self._lock:
            available = [t for t in self.tokens if t.is_available]
            
            if not available:
                # Try to refresh expired tokens
                for t in self.tokens:
                    if t.is_expired and not t.is_banned:
                        if await self._refresh_token(t):
                            available.append(t)
                            break
            
            if not available:
                return None
            
            # Round-robin
            self._current_index = self._current_index % len(available)
            token = available[self._current_index]
            self._current_index += 1
            
            # Update usage
            token.last_used = time.time()
            token.request_count += 1
            
            return token
    
    async def get_token_data(self) -> Optional[Dict[str, Any]]:
        """Get token data for API request."""
        token = await self.get_token()
        if not token:
            return None
        
        return {
            "filename": token.filename,
            "accountName": token.account_name,
            "email": token.email,
            "accessToken": token.access_token,
            "refreshToken": token.refresh_token,
            "region": token.region,
            "authMethod": token.auth_method
        }
    
    # =========================================================================
    # Token Status Updates
    # =========================================================================
    
    async def mark_success(self, filename: str):
        """Mark token as successfully used."""
        for token in self.tokens:
            if token.filename == filename:
                token.error_count = 0
                token.last_error = ""
                break
    
    async def mark_error(self, filename: str, error: str):
        """Mark token as having an error."""
        for token in self.tokens:
            if token.filename == filename:
                token.error_count += 1
                token.last_error = error
                
                # Check for ban indicators
                error_lower = error.lower()
                if any(x in error_lower for x in [
                    'banned', 'suspended', 'disabled', 
                    'unauthorized', 'forbidden', 'blocked'
                ]):
                    token.is_banned = True
                    token.ban_reason = error
                    print(f"[!] Token {token.account_name} marked as BANNED: {error}")
                
                # Too many errors = temporary ban
                elif token.error_count >= 5:
                    token.is_banned = True
                    token.ban_reason = f"Too many errors: {error}"
                    print(f"[!] Token {token.account_name} disabled due to errors")
                
                break
    
    async def mark_quota_exceeded(self, filename: str):
        """Mark token as quota exceeded."""
        for token in self.tokens:
            if token.filename == filename:
                token.quota_used = token.quota_limit
                print(f"[!] Token {token.account_name} quota exceeded")
                break
    
    # =========================================================================
    # Token Refresh
    # =========================================================================
    
    async def _refresh_token(self, token: PoolToken) -> bool:
        """Refresh a single token."""
        try:
            # Find token info
            token_info = self.token_service.get_token(token.filename)
            if not token_info:
                return False
            
            # Refresh
            new_data = self.token_service.refresh_token(token_info)
            
            # Update pool token
            token.access_token = new_data.get('accessToken', token.access_token)
            if new_data.get('refreshToken'):
                token.refresh_token = new_data['refreshToken']
            
            if new_data.get('expiresAt'):
                try:
                    token.expires_at = datetime.fromisoformat(
                        new_data['expiresAt'].replace('Z', '+00:00')
                    )
                except:
                    pass
            
            print(f"[+] Refreshed token: {token.account_name}")
            return True
            
        except Exception as e:
            print(f"[!] Failed to refresh {token.account_name}: {e}")
            return False
    
    async def refresh_all(self) -> int:
        """Refresh all tokens that need it."""
        refreshed = 0
        
        for token in self.tokens:
            if token.is_expired and not token.is_banned:
                if await self._refresh_token(token):
                    refreshed += 1
        
        return refreshed
    
    # =========================================================================
    # Status
    # =========================================================================
    
    def get_status(self) -> Dict[str, Any]:
        """Get pool status."""
        return {
            "total": self.total_count,
            "available": self.available_count,
            "banned": self.banned_count,
            "expired": self.expired_count,
            "tokens": [t.to_dict() for t in self.tokens]
        }
