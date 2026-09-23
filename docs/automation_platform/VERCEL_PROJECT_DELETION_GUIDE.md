# Vercelプロジェクト削除・再設定ガイド

**作成日**: 2026-01-15  
**目的**: 旧プロジェクト名（cryptosignal-ai）から新プロジェクト名（cryptotradeacademy）への移行

---

## ⚠️ 削除前の確認事項

### 現在の状況
- **ローカルフォルダ名**: `cryptotradeacademy`
- **package.jsonのname**: `cryptotradeacademy`
- **Gitリポジトリ**: `cryptosignal-ai`（旧名のまま）
- **Vercelプロジェクト**: 旧名（`cryptosignal-ai`）のまま

### 削除の影響

1. **一時的なサービス停止**
   - Cronジョブが停止する（15分ごとの実行が停止）
   - Telegramメッセージ配信が停止
   - APIエンドポイントが利用不可になる

2. **環境変数の削除**
   - すべての環境変数が削除される
   - 再設定が必要

3. **デプロイ履歴の削除**
   - 過去のデプロイ履歴が削除される
   - ログが削除される

---

## 📋 必要な環境変数リスト（バックアップ用）

### 必須環境変数

| 変数名 | 説明 | 環境 |
|--------|------|------|
| `CRYPTOQUANT_API_KEY` | CryptoQuant APIキー | Production, Preview, Development |
| `GROK_API_KEY` または `XAI_API_KEY` | Grok/X AI APIキー | Production, Preview, Development |
| `OPENAI_API_KEY` | GPT APIキー | Production, Preview, Development |
| `GEMINI_API_KEY` | Gemini APIキー | Production, Preview, Development |
| `TELEGRAM_BOT_TOKEN` | Telegram Botトークン | Production, Preview, Development |
| `TELEGRAM_CHAT_ID` | TelegramチャットID | Production, Preview, Development |
| `CRON_SECRET` | Cron認証用シークレット | Production, Preview, Development |

### VSL関連環境変数

| 変数名 | 説明 | 環境 |
|--------|------|------|
| `VSL1_YOUTUBE_LINK` | VSL1 YouTube URL | Production, Preview, Development |
| `VSL2_YOUTUBE_LINK` | VSL2 YouTube URL | Production, Preview, Development |
| `VSL_YOUTUBE_LINK` | VSL YouTube URL（フォールバック） | Production, Preview, Development |

### Vercel KV関連

| 変数名 | 説明 | 環境 |
|--------|------|------|
| `KV_URL` | Vercel KV URL | Production, Preview, Development |
| `KV_REST_API_URL` | Vercel KV REST API URL | Production, Preview, Development |
| `KV_REST_API_TOKEN` | Vercel KV REST APIトークン | Production, Preview, Development |

### オプション環境変数

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `GPT_MODEL` | `gpt-4o-mini` | 使用するGPTモデル |
| `GPT_CACHE_TTL_SECONDS` | `900` | キャッシュTTL（秒） |
| `GPT_TIMEOUT_MS` | `25000` | API呼び出しタイムアウト（ミリ秒） |
| `REGULAR_SCHEDULE` | `4h` | 定期配信スケジュール（4h or 6h） |
| `LANG` | `en` | デフォルト言語 |

---

## 🔧 削除後の再設定手順

### 1. Vercel Dashboardで旧プロジェクトを削除

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. 旧プロジェクト（`cryptosignal-ai`）を選択
3. **Settings** → **General** → **Delete Project** をクリック
4. プロジェクト名を入力して削除を確認

### 2. 新しいプロジェクトを作成

#### 方法1: Vercel CLIで作成（推奨）

```bash
cd C:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy
vercel
```

**設定内容**:
- **Project Name**: `cryptotradeacademy`
- **Directory**: `./`（現在のディレクトリ）
- **Framework Preset**: Other
- **Root Directory**: `./`
- **Build Command**: （空欄）
- **Output Directory**: （空欄）
- **Install Command**: `npm install`

#### 方法2: Vercel Dashboardで作成

1. Vercel Dashboard → **Add New** → **Project**
2. GitHubリポジトリを選択（`hadayalab-web/cryptosignal-ai`）
3. **Project Name**: `cryptotradeacademy` に変更
4. **Framework Preset**: Other
5. **Root Directory**: `./`
6. **Environment Variables**: 後で設定（次のステップ）
7. **Deploy** をクリック

### 3. GitHub連携の設定

1. Vercel Dashboard → **Settings** → **Git**
2. **Production Branch**: `main` に設定
3. **Automatic Deployments**: 有効化
4. **Pull Request Comments**: 有効化（オプション）

### 4. 環境変数の再設定

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. 上記の「必要な環境変数リスト」を参照して、すべての環境変数を追加
3. 各環境変数に対して以下を設定：
   - **Key**: 環境変数名
   - **Value**: 実際の値（旧プロジェクトからコピー）
   - **Environment**: Production, Preview, Development（すべてにチェック）

### 5. Vercel KVの設定

1. Vercel Dashboard → **Storage** → **Create Database**
2. **KV** を選択
3. **Database Name**: `cryptotradeacademy-kv` など
4. 作成後、環境変数に以下を追加：
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

### 6. Cronジョブの確認

`vercel.json` に設定されているCronジョブが自動的に設定されます：

```json
{
  "crons": [
    { "path": "/api/cron", "schedule": "*/15 * * * *" },
    { "path": "/api/weekly-report", "schedule": "0 0 * * 0" },
    { "path": "/api/vsl1-post", "schedule": "0 9,21 * * *" },
    { "path": "/api/vsl2-free-users", "schedule": "0 * * * *" },
    { "path": "/api/vsl1-reminder", "schedule": "0 */12 * * *" },
    { "path": "/api/vsl2-last-call", "schedule": "0 * * * *" }
  ]
}
```

**確認方法**:
1. Vercel Dashboard → **Settings** → **Cron Jobs**
2. すべてのCronジョブが表示されていることを確認

### 7. デプロイの確認

1. Vercel Dashboard → **Deployments**
2. 最新のデプロイが成功していることを確認
3. デプロイログでエラーがないことを確認

### 8. 動作確認

#### APIエンドポイントのテスト

```bash
# Prepare APIのテスト
curl "https://cryptotradeacademy.vercel.app/api/prepare?debug=local"

# Cron APIのテスト
curl "https://cryptotradeacademy.vercel.app/api/cron?debug=local"
```

#### Telegramメッセージの確認

- 定期配信（4時間ごと）が正常に動作することを確認
- VSL配信が正常に動作することを確認

---

## ⚠️ 注意事項

1. **削除前に環境変数をバックアップ**
   - Vercel Dashboardで環境変数のリストをスクリーンショットまたはコピー
   - 特にAPIキーは削除後に再取得が必要な場合がある

2. **Gitリポジトリ名の変更**
   - 現在のGitリポジトリ名は `cryptosignal-ai` のまま
   - 必要に応じてGitHubでリポジトリ名を変更することも検討

3. **一時的なサービス停止**
   - 削除から再設定まで、サービスが停止する
   - 可能であれば、メンテナンス時間を設定する

4. **Vercel KVのデータ**
   - Vercel KVのデータは削除されない（別途管理）
   - 新しいプロジェクトで同じKVを使用する場合は、環境変数を設定するだけ

---

## ✅ チェックリスト

### 削除前
- [ ] 環境変数のリストをバックアップ
- [ ] Vercel KVの設定を確認
- [ ] 現在のデプロイ状況を確認

### 削除後
- [ ] 新しいプロジェクトを作成
- [ ] GitHub連携を設定
- [ ] すべての環境変数を再設定
- [ ] Vercel KVを設定（必要に応じて）
- [ ] Cronジョブが正常に設定されていることを確認
- [ ] デプロイが成功することを確認
- [ ] APIエンドポイントが正常に動作することを確認
- [ ] Telegramメッセージ配信が正常に動作することを確認

---

**作成者**: COO（Cursor/Composer 1）  
**状態**: 📋 **削除前の準備完了**
