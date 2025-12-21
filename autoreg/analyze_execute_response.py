#!/usr/bin/env python3
"""Analyze execute API responses in HAR"""
import json
import base64

with open('1.har', 'r', encoding='utf-8') as f:
    har = json.load(f)

entries = har['log']['entries']

print("=== EXECUTE API RESPONSES ===\n")

for e in entries:
    url = e['request']['url']
    if '/api/execute' in url or '/signup/api/execute' in url:
        print(f"URL: {url[:80]}...")
        print(f"Method: {e['request']['method']}")
        print(f"Status: {e['response']['status']}")
        print(f"Time: {e.get('time', 0):.0f}ms")
        
        # Request body
        if 'postData' in e['request']:
            body = e['request']['postData'].get('text', '')
            print(f"\nREQUEST BODY:")
            try:
                body_json = json.loads(body)
                print(json.dumps(body_json, indent=2)[:1000])
            except:
                print(body[:500])
        
        # Response body
        if 'content' in e['response'] and 'text' in e['response']['content']:
            resp_text = e['response']['content']['text']
            print(f"\nRESPONSE BODY:")
            try:
                # Try to decode if base64
                if e['response']['content'].get('encoding') == 'base64':
                    resp_text = base64.b64decode(resp_text).decode('utf-8')
                resp_json = json.loads(resp_text)
                print(json.dumps(resp_json, indent=2)[:2000])
            except:
                print(resp_text[:1000] if resp_text else "No response body")
        
        print("\n" + "="*60 + "\n")
