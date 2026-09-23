# DATABASE_URL設定ガイド

**作成日時**: 2026-01-13  
**目的**: DATABASE_URLの取得方法と設定手順を詳しく説明

---

## 📋 DATABASE_URLとは

`DATABASE_URL`は、データベースへの接続情報を含む環境変数です。Prismaがこの変数を使用してデータベースに接続します。

---

## 🎯 データベースの選択

このプロジェクトは**PostgreSQL**と**SQLite**の両方に対応しています。

### PostgreSQL（推奨・本番環境）
- ✅ 本番環境に最適
- ✅ 高度なクエリ機能
- ✅ パフォーマンスが高い
- ✅ 複数ユーザー同時アクセス対応

### SQLite（開発・テスト環境）
- ✅ セットアップが簡単
- ✅ ファイルベース（サーバー不要）
- ✅ 開発・テストに最適
- ⚠️ 本番環境には非推奨

---

## 🚀 方法1: PostgreSQLを使用する場合

### Step 1: PostgreSQLデータベースの準備

#### オプションA: ローカルにPostgreSQLをインストール

**Windowsの場合**:
1. [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/)からダウンロード
2. インストール時にパスワードを設定（覚えておく）
3. デフォルトポート: `5432`

**macOSの場合**:
```bash
# Homebrewを使用
brew install postgresql@15
brew services start postgresql@15
```

**Linuxの場合**:
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### オプションB: クラウドサービスを使用（推奨）

**Supabase（無料プランあり）**:
1. [Supabase](https://supabase.com/)にアカウント作成
2. 新しいプロジェクトを作成
3. Settings → Database → Connection string をコピー
4. 形式: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

**Neon（無料プランあり）**:
1. [Neon](https://neon.tech/)にアカウント作成
2. 新しいプロジェクトを作成
3. Connection Detailsから接続文字列をコピー

**Railway（無料プランあり）**:
1. [Railway](https://railway.app/)にアカウント作成
2. PostgreSQLテンプレートを選択
3. Variablesタブから`DATABASE_URL`をコピー

**Vercel Postgres（Vercel使用時）**:
1. VercelプロジェクトのSettings → Storage
2. Create Database → Postgres
3. `.env.local`に自動的に`POSTGRES_URL`が追加される

### Step 2: データベースの作成

**ローカルPostgreSQLの場合**:
```bash
# PostgreSQLに接続
psql -U postgres

# データベースを作成
CREATE DATABASE cryptotradeacademy;

# ユーザーを作成（オプション）
CREATE USER cryptouser WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cryptotradeacademy TO cryptouser;

# 終了
\q
```

### Step 3: DATABASE_URLの設定

`.env`ファイルに以下を追加：

```env
# PostgreSQL（ローカル）
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/cryptotradeacademy?schema=public"

# PostgreSQL（Supabase）
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"

# PostgreSQL（Neon）
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require"

# PostgreSQL（Railway）
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway"
```

**接続文字列の形式**:
```
postgresql://[ユーザー名]:[パスワード]@[ホスト]:[ポート]/[データベース名]?schema=public
```

**各パラメータの説明**:
- `ユーザー名`: PostgreSQLのユーザー名（通常は`postgres`）
- `パスワード`: PostgreSQLのパスワード
- `ホスト`: データベースサーバーのアドレス（ローカルの場合は`localhost`）
- `ポート`: PostgreSQLのポート（デフォルトは`5432`）
- `データベース名`: 作成したデータベース名（例: `cryptotradeacademy`）
- `schema=public`: スキーマ名（通常は`public`）

---

## 🚀 方法2: SQLiteを使用する場合（開発・テスト用）

### Step 1: DATABASE_URLの設定

`.env`ファイルに以下を追加：

```env
# SQLite（開発用）
DATABASE_URL="file:./dev.db"
```

**注意**: SQLiteはファイルベースなので、サーバーのセットアップは不要です。

### Step 2: Prismaスキーマの変更（必要に応じて）

`database/prisma/schema.prisma`の`datasource`を変更：

```prisma
datasource db {
  provider = "sqlite"  // postgresqlからsqliteに変更
  url      = env("DATABASE_URL")
}
```

---

## ✅ 設定後の確認手順

### Step 1: 環境変数の確認

```bash
# .envファイルにDATABASE_URLが設定されているか確認
cat .env | grep DATABASE_URL
```

### Step 2: Prismaクライアントの生成

```bash
npx prisma generate --schema=database/prisma/schema.prisma
```

### Step 3: データベース接続のテスト

```bash
# データベース状態確認スクリプトを実行
npx tsx scripts/check-en-dm-database-status.ts
```

**成功した場合**:
```
📊 EN版DMデータベース状態確認
...
✅ データベース状態確認完了
```

**失敗した場合**:
```
❌ エラー: Environment variable not found: DATABASE_URL
```

### Step 4: マイグレーションの実行（初回のみ）

```bash
# データベーススキーマを作成
npx prisma migrate dev --schema=database/prisma/schema.prisma --name initial_schema
```

---

## 🔍 トラブルシューティング

### エラー: Environment variable not found: DATABASE_URL

**原因**: `.env`ファイルに`DATABASE_URL`が設定されていない

**解決方法**:
1. プロジェクトルートに`.env`ファイルがあるか確認
2. `.env`ファイルに`DATABASE_URL`を追加
3. スクリプトを再実行

### エラー: Can't reach database server

**原因**: データベースサーバーに接続できない

**解決方法**:
1. PostgreSQLが起動しているか確認
   ```bash
   # Windows
   services.msc で PostgreSQL サービスを確認
   
   # macOS/Linux
   brew services list  # macOS
   sudo systemctl status postgresql  # Linux
   ```
2. ホスト名とポートが正しいか確認
3. ファイアウォール設定を確認

### エラー: password authentication failed

**原因**: パスワードが間違っている

**解決方法**:
1. `.env`ファイルのパスワードを確認
2. データベースのパスワードをリセット（必要に応じて）

### エラー: database "cryptotradeacademy" does not exist

**原因**: データベースが作成されていない

**解決方法**:
```bash
# PostgreSQLに接続してデータベースを作成
psql -U postgres
CREATE DATABASE cryptotradeacademy;
```

---

## 📊 推奨設定

### 開発環境
```env
# SQLite（簡単・高速）
DATABASE_URL="file:./dev.db"
```

### 本番環境
```env
# PostgreSQL（Supabase/Neon/Railwayなど）
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

---

## 🔐 セキュリティ注意事項

1. **`.env`ファイルをGitにコミットしない**
   - `.gitignore`に`.env`が含まれているか確認
   - 機密情報を含むため、公開リポジトリには絶対にコミットしない

2. **本番環境のパスワード**
   - 強力なパスワードを使用
   - 定期的にパスワードを変更

3. **接続文字列の保護**
   - 環境変数として管理
   - シェル履歴に残らないよう注意

---

## 📚 参考リンク

- [Prisma公式ドキュメント - データベース接続](https://www.prisma.io/docs/concepts/database-connectors)
- [PostgreSQL公式サイト](https://www.postgresql.org/)
- [Supabase](https://supabase.com/)
- [Neon](https://neon.tech/)
- [Railway](https://railway.app/)

---

## 🎯 次のステップ

1. **データベースを選択**（PostgreSQL推奨）
2. **データベースをセットアップ**
3. **`.env`ファイルに`DATABASE_URL`を設定**
4. **Prismaクライアントを生成**
5. **マイグレーションを実行**
6. **テストサイクルを実行**

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
