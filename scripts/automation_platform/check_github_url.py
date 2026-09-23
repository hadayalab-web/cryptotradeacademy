#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GitHubのraw URLが正しく機能するか確認
"""
import requests

url = "https://raw.githubusercontent.com/hadayalab-web/hadayalab-automation-platform/main/workflows/simple-time-check.json"

print(f"Checking GitHub raw URL: {url}")
print()

try:
    response = requests.get(url, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Content-Type: {response.headers.get('Content-Type', 'N/A')}")
    print()

    if response.status_code == 200:
        print("✅ URL is accessible!")
        print(f"Response length: {len(response.text)} characters")
        print(f"First 200 characters:")
        print(response.text[:200])

        # JSONとして有効か確認
        try:
            import json
            data = json.loads(response.text)
            print()
            print("✅ Response is valid JSON!")
            print(f"Workflow name: {data.get('name', 'N/A')}")
        except json.JSONDecodeError as e:
            print()
            print(f"❌ Response is NOT valid JSON: {e}")
    elif response.status_code == 404:
        print("❌ File not found (404)")
        print("The file may not be committed/pushed to GitHub yet.")
    else:
        print(f"❌ Error: {response.status_code}")
        print(f"Response: {response.text[:200]}")

except requests.exceptions.RequestException as e:
    print(f"❌ Request failed: {e}")

















