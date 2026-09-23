#!/usr/bin/env python3
"""
すべてのMCPサーバーを一時的に無効化
エラー解決後に再び有効化できるようにバックアップを作成
"""

import json
import os
from pathlib import Path
from datetime import datetime

# MCP設定ファイルのパス
cursor_dir = Path.home() / ".cursor"
mcp_json_path = cursor_dir / "mcp.json"

def main():
    print("=" * 60)
    print("すべてのMCPサーバーを一時的に無効化")
    print("=" * 60)
    print()

    # mcp.jsonが存在するか確認
    if not mcp_json_path.exists():
        print(f"[INFO] mcp.json not found: {mcp_json_path}")
        print("[INFO] MCP servers are not configured.")
        return

    # 既存の設定を読み込む
    try:
        with open(mcp_json_path, 'r', encoding='utf-8-sig') as f:
            mcp_config = json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to read mcp.json: {e}")
        return

    # バックアップを作成
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = mcp_json_path.with_suffix(f".backup.{timestamp}.json")
    try:
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(mcp_config, f, indent=2, ensure_ascii=False)
        print(f"[OK] Backup created: {backup_path}")
    except Exception as e:
        print(f"[WARNING] Failed to create backup: {e}")

    # すべてのサーバーを無効化（空の設定に置き換え）
    if "mcpServers" in mcp_config:
        server_count = len(mcp_config["mcpServers"])
        server_names = list(mcp_config["mcpServers"].keys())
        
        # 空の設定に置き換え
        mcp_config["mcpServers"] = {}
        
        print(f"[OK] Disabled {server_count} MCP server(s):")
        for name in server_names:
            print(f"  - {name}")
    else:
        print("[INFO] No MCP servers configured")
        return

    # 設定ファイルを保存
    try:
        with open(mcp_json_path, 'w', encoding='utf-8') as f:
            json.dump(mcp_config, f, indent=2, ensure_ascii=False)
        print(f"[OK] mcp.json updated: {mcp_json_path}")
    except Exception as e:
        print(f"[ERROR] Failed to write mcp.json: {e}")
        return

    print()
    print("=" * 60)
    print("無効化完了")
    print("=" * 60)
    print()
    print("次のステップ:")
    print("  1. Cursorを完全に再起動してください")
    print("  2. エラーが解決したか確認してください")
    print("  3. 必要に応じて、バックアップファイルから復元してください:")
    print(f"     {backup_path}")
    print()
    print("復元方法:")
    print(f'  Copy-Item "{backup_path}" "{mcp_json_path}" -Force')

if __name__ == "__main__":
    main()
