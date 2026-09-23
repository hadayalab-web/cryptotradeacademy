"""
.envファイルからGoogle OAuth2認証情報を確認
"""
import os
import re

def main():
    print("=" * 60)
    print(".envファイルのGoogle OAuth2認証情報確認")
    print("=" * 60)
    print()

    # .envファイルのパス
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")

    if not os.path.exists(env_path):
        print(f"[ERROR] .env file not found: {env_path}")
        return

    print(f"[INFO] Reading .env file: {env_path}")
    print()

    # .envファイルを読み込む
    env_vars = {}
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            # コメント行と空行をスキップ
            if not line or line.startswith('#'):
                continue
            # KEY=VALUE 形式をパース
            if '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()

    # Google関連の環境変数を検索
    google_vars = {}
    for key, value in env_vars.items():
        if 'GOOGLE' in key.upper() or 'OAUTH' in key.upper():
            google_vars[key] = value

    if not google_vars:
        print("[WARNING] Google関連の環境変数が見つかりませんでした")
        print()
        print("[INFO] .envファイルに以下の環境変数を設定してください:")
        print("  GOOGLE_CLIENT_ID=your-client-id")
        print("  GOOGLE_CLIENT_SECRET=your-client-secret")
        print("  GOOGLE_REFRESH_TOKEN=your-refresh-token")
        return

    print("=" * 60)
    print("見つかったGoogle関連の環境変数")
    print("=" * 60)
    print()

    # 環境変数を表示（機密情報は一部のみ表示）
    for key, value in sorted(google_vars.items()):
        if value:
            # 機密情報は最初の20文字のみ表示
            display_value = value[:20] + "..." if len(value) > 20 else value
            print(f"  {key}: {display_value}")
        else:
            print(f"  {key}: (空)")

    print()
    print("=" * 60)
    print("MCPサーバーで使用される環境変数名")
    print("=" * 60)
    print()

    # MCPサーバーが期待する環境変数名を確認
    expected_vars = {
        'GOOGLE_CLIENT_ID': ['GOOGLE_CLIENT_ID', 'GOOGLE_OAUTH2_CLIENT_ID'],
        'GOOGLE_CLIENT_SECRET': ['GOOGLE_CLIENT_SECRET', 'GOOGLE_OAUTH2_CLIENT_SECRET'],
        'GOOGLE_REFRESH_TOKEN': ['GOOGLE_REFRESH_TOKEN', 'GOOGLE_OAUTH2_REFRESH_TOKEN'],
        'GOOGLE_REDIRECT_URI': ['GOOGLE_REDIRECT_URI'],
    }

    for expected_name, alternatives in expected_vars.items():
        found = False
        for alt in alternatives:
            if alt in google_vars and google_vars[alt]:
                print(f"  ✅ {expected_name}: {alt} が見つかりました")
                found = True
                break
        if not found:
            print(f"  ❌ {expected_name}: 見つかりませんでした")
            print(f"     期待される変数名: {', '.join(alternatives)}")

    print()
    print("=" * 60)
    print("次のステップ")
    print("=" * 60)
    print()
    print("1. 必要な環境変数が設定されていることを確認")
    print("2. 設定されていない場合は、.envファイルに追加")
    print("3. MCPサーバーを再起動（Cursor再起動）")

if __name__ == "__main__":
    main()





