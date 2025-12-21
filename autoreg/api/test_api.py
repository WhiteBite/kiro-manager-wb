#!/usr/bin/env python3
"""
Test Kiro LLM API

Usage:
    python autoreg/api/test_api.py
"""

import requests
import json

API_URL = "http://localhost:8421"

def test_health():
    """Test health endpoint."""
    print("\n[1] Testing /health...")
    resp = requests.get(f"{API_URL}/health")
    print(f"Status: {resp.status_code}")
    print(json.dumps(resp.json(), indent=2))
    return resp.status_code == 200

def test_models():
    """Test models endpoint."""
    print("\n[2] Testing /v1/models...")
    resp = requests.get(f"{API_URL}/v1/models")
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Models: {[m['id'] for m in data.get('data', [])]}")
    return resp.status_code == 200

def test_pool_status():
    """Test pool status endpoint."""
    print("\n[3] Testing /pool/status...")
    resp = requests.get(f"{API_URL}/pool/status")
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Total tokens: {data.get('total', 0)}")
    print(f"Available: {data.get('available', 0)}")
    print(f"Banned: {data.get('banned', 0)}")
    return resp.status_code == 200

def test_chat_completion():
    """Test chat completion (non-streaming)."""
    print("\n[4] Testing /v1/chat/completions (non-streaming)...")
    
    resp = requests.post(
        f"{API_URL}/v1/chat/completions",
        json={
            "model": "claude-sonnet-4-20250514",
            "messages": [
                {"role": "user", "content": "Say 'Hello from Kiro LLM API!' in exactly those words."}
            ],
            "stream": False,
            "max_tokens": 50
        }
    )
    
    print(f"Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        print(f"Response: {content[:200]}")
        return True
    else:
        print(f"Error: {resp.text[:200]}")
        return False

def test_chat_streaming():
    """Test chat completion (streaming)."""
    print("\n[5] Testing /v1/chat/completions (streaming)...")
    
    resp = requests.post(
        f"{API_URL}/v1/chat/completions",
        json={
            "model": "claude-sonnet-4-20250514",
            "messages": [
                {"role": "user", "content": "Count from 1 to 5, one number per line."}
            ],
            "stream": True,
            "max_tokens": 100
        },
        stream=True
    )
    
    print(f"Status: {resp.status_code}")
    
    if resp.status_code == 200:
        print("Streaming response:")
        full_content = ""
        for line in resp.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                        if content:
                            print(content, end="", flush=True)
                            full_content += content
                    except json.JSONDecodeError:
                        pass
        print()
        return len(full_content) > 0
    else:
        print(f"Error: {resp.text[:200]}")
        return False

def test_openai_client():
    """Test with OpenAI Python client."""
    print("\n[6] Testing with OpenAI client...")
    
    try:
        from openai import OpenAI
        
        client = OpenAI(
            base_url=f"{API_URL}/v1",
            api_key="not-needed"
        )
        
        response = client.chat.completions.create(
            model="claude-sonnet-4-20250514",
            messages=[
                {"role": "user", "content": "What is 2+2? Answer with just the number."}
            ],
            max_tokens=10
        )
        
        content = response.choices[0].message.content
        print(f"Response: {content}")
        return "4" in content
        
    except ImportError:
        print("OpenAI client not installed. Run: pip install openai")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print("=" * 60)
    print("Kiro LLM API Test Suite")
    print("=" * 60)
    
    results = {}
    
    # Basic tests
    results["health"] = test_health()
    results["models"] = test_models()
    results["pool_status"] = test_pool_status()
    
    # Chat tests (only if pool has tokens)
    try:
        pool_resp = requests.get(f"{API_URL}/pool/status")
        if pool_resp.status_code == 200:
            pool_data = pool_resp.json()
            if pool_data.get("available", 0) > 0:
                results["chat"] = test_chat_completion()
                results["streaming"] = test_chat_streaming()
                results["openai_client"] = test_openai_client()
            else:
                print("\n[!] No available tokens - skipping chat tests")
    except:
        pass
    
    # Summary
    print("\n" + "=" * 60)
    print("Results:")
    print("=" * 60)
    
    for test, result in results.items():
        if result is None:
            status = "SKIP"
        elif result:
            status = "PASS"
        else:
            status = "FAIL"
        print(f"  {test}: {status}")

if __name__ == "__main__":
    main()
