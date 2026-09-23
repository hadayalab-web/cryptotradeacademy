se# 環境変数管理ガイド

## 📋 概要

このプロジェクトでは、環境変数を**ローカル管理（.envファイル）**で管理します。Infisicalは手動でトークンを取得し、`.env`ファイルにコピーして使用します。

## 🎯 使い分け

### 1. ローカル管理（.envファイル） - **推奨**

**用途:**
- 開発環境でのみ使用するAPIキー
- MCPサーバーで使用する認証情報
- ローカル開発に必要な設定

**メリット:**
- ✅ シンプルで高速
- ✅ オフラインでも動作
- ✅ Cursor MCPサーバーと直接連携
- ✅ バージョン管理から除外（.gitignore）

**デメリット:**
- ❌ チーム間での共有が困難
- ❌ 本番環境では使用不可

**設定場所:**
```
hadayalab-automation-platform/.env
```

**例:**
```env
# MCPサーバー用APIキー
WHOP_API_KEY=whop_xxx
HEYGEN_API_KEY=sk_V2_xxx
NOTION_API_KEY=ntn_xxx

# その他のローカル設定
NODE_ENV=development
```

### 2. Infisical CLI（手動管理）

**用途:**
- 本番環境で使用するシークレット
- チーム間で共有する必要がある認証情報
- 期限切れが頻繁に発生するトークン

**使用方法:**
1. Infisical CLIでログイン
2. シークレットを取得
3. `.env`ファイルに手動でコピー

**メリット:**
- ✅ チーム間での安全な共有
- ✅ 本番環境での使用
- ✅ トークンの自動ローテーション
- ✅ アクセス制御

**デメリット:**
- ❌ CLIログインが必要
- ❌ ネットワーク接続が必要
- ❌ 手動での取得・コピーが必要

**設定場所:**
```
Infisical Cloud
プロジェクト: hadayalab-automation-platform-c79-q
プロジェクトID: 446f131c-be8d-45e5-a83a-4154e34501a5
```

## 🔧 現在の設定

### MCPサーバーの環境変数管理

| MCPサーバー | 管理方法 | 理由 |
|------------|---------|------|
| `whop` | `.env` | ローカル開発のみ |
| `heygen` | `.env` | ローカル開発のみ |
| `notion` | `.env` | ローカル開発のみ |
| `grok-x-affiliate` | `.env` | ローカル開発のみ |
| `grok-x-market-analyzer` | `.env` | ローカル開発のみ |
| `telegram-affiliate-dm` | `.env` | ローカル開発のみ |

### 環境変数の読み込み順序

1. **MCPサーバー起動時:**
   - `.env`ファイルから自動読み込み（`dotenv`パッケージ使用）
   - `mcp.json`の`env`セクションから読み込み（優先度: 高）

2. **Infisical CLI（手動管理）:**
   - Infisical CLIでログイン後、手動でシークレットを取得
   - `.env`ファイルに手動でコピーして使用

## 📝 推奨設定

### ✅ ローカル管理（.env）を使用する場合

**推奨される理由:**
1. **シンプルさ**: セットアップが簡単
2. **高速**: ネットワーク接続不要
3. **Cursor統合**: MCPサーバーと直接連携
4. **開発効率**: オフラインでも動作

**設定手順:**
```bash
# 1. .envファイルを作成
cp .env.example .env

# 2. APIキーを設定
# .envファイルを編集してAPIキーを追加

# 3. MCPサーバーを再起動（Cursor再起動）
```

### ⚠️ Infisicalを使用する場合

**使用する理由:**
1. チーム間での共有が必要
2. 本番環境で使用
3. トークンの自動ローテーションが必要

**設定手順:**
```bash
# 1. Infisical CLIでログイン
infisical login

# 2. シークレットを設定
infisical secrets set N8N_API_KEY=xxx

# 3. Infisical CLIで手動取得して.envに追加
infisical secrets get N8N_API_KEY
# 取得した値を.envファイルに追加
```

## 🔄 移行ガイド

### .env → Infisical への移行

```bash
# 1. Infisical CLIでログイン
infisical login

# 2. .envファイルの内容をInfisicalに移行
infisical secrets set WHOP_API_KEY=$(grep WHOP_API_KEY .env | cut -d'=' -f2)
infisical secrets set HEYGEN_API_KEY=$(grep HEYGEN_API_KEY .env | cut -d'=' -f2)
# ... 他のキーも同様に

# 3. .envファイルから削除（オプション）
# または、.envファイルを保持してローカル開発用に使用
```

### Infisical → .env への移行

```bash
# 1. Infisicalからシークレットを取得
infisical secrets

# 2. .envファイルに追加
echo "WHOP_API_KEY=xxx" >> .env
echo "HEYGEN_API_KEY=xxx" >> .env
# ... 他のキーも同様に
```

## 🚨 トラブルシューティング

### 問題: MCPサーバーが起動しない

**原因:**
- `.env`ファイルにAPIキーが設定されていない
- `mcp.json`の環境変数設定が間違っている

**解決策:**
```bash
# 1. .envファイルを確認
cat .env

# 2. 必要なAPIキーが設定されているか確認
# 3. Cursorを再起動
```

### 問題: Infisical CLIでシークレットが取得できない

**原因:**
- Infisical CLIがログインしていない
- プロジェクトIDが間違っている

**解決策:**
```bash
# 1. Infisical CLIでログイン
infisical login

# 2. シークレット一覧を確認
infisical secrets

# 3. 特定のシークレットを取得
infisical secrets get N8N_API_KEY
```

### 問題: 環境変数が読み込まれない

**原因:**
- `.env`ファイルのパスが間違っている
- 環境変数の名前が間違っている

**解決策:**
```bash
# 1. MCPサーバースクリプトを確認
# scripts/*-mcp-server.js の .env 読み込み部分を確認

# 2. .envファイルのパスを確認
# 通常は: hadayalab-automation-platform/.env

# 3. 環境変数の名前を確認
# 大文字小文字を区別する
```

## 📚 参考資料

- [Infisical vs GitHub Secrets + Notion](./INFISICAL_VS_GITHUB_SECRETS_NOTION.md)
- [MCPサーバー最適化](./MCP_SERVERS_OPTIMIZATION.md)

## ✅ 結論

**推奨: ローカル管理（.envファイル）**

理由:
1. シンプルで高速
2. Cursor MCPサーバーと直接連携
3. オフラインでも動作
4. 開発効率が高い

**Infisicalは以下の場合に使用:**
- チーム間での共有が必要
- 本番環境で使用
- トークンの自動ローテーションが必要


