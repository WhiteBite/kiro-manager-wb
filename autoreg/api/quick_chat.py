#!/usr/bin/env python3
"""
Quick Chat Test - быстрый тест API

Usage:
    python autoreg/api/quick_chat.py "твой вопрос"
    python autoreg/api/quick_chat.py  # интерактивный режим
"""

import sys
import requests

API_URL = "http://localhost:8421"

def chat(message: str, stream: bool = True) -> str:
    """Send message and get response."""
    resp = requests.post(
        f"{API_URL}/v1/chat/completions",
        json={
            "model": "claude-sonnet-4-20250514",
            "messages": [{"role": "user", "content": message}],
            "stream": stream,
            "max_tokens": 500
        },
        stream=stream,
        timeout=60
    )
    
    if resp.status_code != 200:
        return f"Error {resp.status_code}: {resp.text[:200]}"
    
    if stream:
        import json
        content = ""
        for line in resp.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                        if delta:
                            print(delta, end="", flush=True)
                            content += delta
                    except:
                        pass
        print()
        return content
    else:
        data = resp.json()
        return data.get("choices", [{}])[0].get("message", {}).get("content", "")

def main():
    if len(sys.argv) > 1:
        # Single message from command line
        message = " ".join(sys.argv[1:])
        print(f"You: {message}")
        print("AI: ", end="")
        chat(message)
    else:
        # Interactive mode
        print("=" * 50)
        print("Kiro LLM Quick Chat")
        print("Type 'exit' to quit")
        print("=" * 50)
        
        while True:
            try:
                message = input("\nYou: ").strip()
                if not message:
                    continue
                if message.lower() in ['exit', 'quit', 'q']:
                    print("Bye!")
                    break
                
                print("AI: ", end="")
                chat(message)
                
            except KeyboardInterrupt:
                print("\nBye!")
                break
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    main()
