#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Infisicalの全シークレット一覧を表示（Telegram関連キーを探す）
"""
import subprocess
import json
import sys

# UTF-8エンコーディング設定
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Infisical設定（既存スクリプトと同じ設定を使用）
INFISICAL_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoTWV0aG9kIjoiZ29vZ2xlIiwiYXV0aFRva2VuVHlwZSI6ImFjY2Vzc1Rva2VuIiwidXNlcklkIjoiMjBhZTM5NjktODQ0NS00OWNhLTlkY2UtYzUwNmQ1YTMxMzI5IiwidG9rZW5WZXJzaW9uSWQiOiJmZTI0YWY0ZS0zNDZhLTRkZDYtYjZkNy00NWY3Y2JhNDRhNWQiLCJhY2Nlc3NWZXJzaW9uIjoxLCJvcmdhbml6YXRpb25JZCI6IjE2ZjQ0M2I1LWZhMTYtNGZhZC1hNGE5LTgwMjc4MDllZTM1NyIsImlhdCI6MTc2NjU0Njc0NSwiZXhwIjoxNzY3NDEwNzQ1fQ.wZnwKPLkAYBSpz9QBarfb8mcl0h3Fj2EfUbMzC0Q_4o"
PROJECT_ID = "446f131c-be8d-45e5-a83a-4154e34501a5"

def list_all_secrets():
    """Infisicalから全シークレットを取得（JSON形式で全て取得）"""
    try:
        # infisical secrets コマンドで全シークレットを取得
        # --output json を使用してJSON形式で取得
        result = subprocess.run(
            ["infisical", "secrets", "--token", INFISICAL_TOKEN, "--projectId", PROJECT_ID, "--output", "json"],
            capture_output=True,
            text=True,
            check=True
        )
        output = result.stdout.strip()
        secrets = json.loads(output)
        return secrets
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Failed to list secrets: {e.stderr}")
        return None
    except json.JSONDecodeError as e:
        print(f"[ERROR] Failed to parse JSON: {e}")
        return None
    except Exception as e:
        print(f"[ERROR] Exception: {e}")
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("Infisical 全シークレット一覧（Telegram関連検索）")
    print("=" * 60)
    print()

    secrets = list_all_secrets()

    if not secrets:
        print("[ERROR] Failed to retrieve secrets from Infisical")
        sys.exit(1)

    print(f"[OK] Found {len(secrets)} secret(s) in Infisical\n")

    # Telegram関連のキーを検索
    telegram_keys = []
    for secret in secrets:
        key = secret.get('secretKey', '')
        if 'telegram' in key.lower() or 'tg' in key.lower() or 'TELEGRAM' in key:
            telegram_keys.append(secret)

    if telegram_keys:
        print("=" * 60)
        print("Telegram関連キー")
        print("=" * 60)
        print()
        for secret in telegram_keys:
            key = secret.get('secretKey', '')
            value_preview = secret.get('secretValue', '')[:20] + '...' if secret.get('secretValue') else 'N/A'
            print(f"  - {key}: {value_preview}")
        print()
    else:
        print("[WARNING] No Telegram-related keys found")
        print("[INFO] All available keys:")
        print()
        for secret in secrets:
            key = secret.get('secretKey', '')
            print(f"  - {key}")
        print()

    print("=" * 60)
    print("全シークレット一覧")
    print("=" * 60)
    print()
    for secret in secrets:
        key = secret.get('secretKey', '')
        value_preview = secret.get('secretValue', '')[:30] + '...' if secret.get('secretValue') else 'N/A'
        print(f"  {key}: {value_preview}")

