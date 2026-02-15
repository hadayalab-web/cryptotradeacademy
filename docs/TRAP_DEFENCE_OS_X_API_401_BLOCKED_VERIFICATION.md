# Trap Defence OS — X API ブロック・401 ログの確認チェックリスト

Copilot との会話ログおよび Vercel Logs で指摘されている事象を、コードベースに照らして整理した確認用ドキュメントです。

---

## ログが示していること（結論）

- **怪しいログではなく、Trap Defence OS の防御機構が正しく働いている結果**です。
- ただし **X API の認証が通っていない** ため、BuzzWeave の外部血流と KIBA の外部通知が止まっています。
- 以下を**優先度順**で確認・対応してください。

---

## ① X API Bearer Token が有効か確認（最優先）

### コード上の参照箇所

| 用途 | 環境変数 | 参照ファイル |
|------|----------|--------------|
| Search API（検索） | `X_API_BEARER_TOKEN` | `services/x/client.js`（`searchPostsRecent` / Bearer 経路） |
| 投稿・メトリクス | OAuth 1.0a（別設定） | 同上（`X_API_ACCESS_TOKEN` 等） |

- **設定場所**: `.env` および Vercel の Environment Variables。
- **例**: `.env.example` の `X_API_BEARER_TOKEN=your-x-api-bearer-token` を本物のトークンに差し替えているか。

### 確認手順

1. **X Developer Portal** → 対象 App → **Keys and Tokens**
2. **Bearer Token** が Regenerate されていないか確認
3. Token の有効期限・スコープ（Search API 等）を確認
4. Vercel の **Production / Preview** 両方で `X_API_BEARER_TOKEN` が正しく設定されているか確認

### 補足

- 現在の実装では、**402 (Payment Required)** を検知すると `x_api_blocked` が立ち、BuzzWeave は X API を叩かず early return します（`api/buzzweave-run.js` 52–55 行、`utils/supabase.js` の `getBuzzweaveStatus` / `upsertBuzzweaveStatus402`）。
- **401** はコード上で `x_api_blocked` を立てるトリガーにはなっていませんが、X 側がレート制限等で 401 を返す場合があり、実質「認証エラー」として扱われます。

---

## ② レート制限（429 → 401 化）が起きていないか

- X はレート制限超過時に **401 を返すことがある**（仕様が不安定）。
- BuzzWeave の実行は `vercel.json` で **毎分**（`* * * * *`）の Cron です。投稿頻度が高くないか確認。
- 参照: `docs/BUZZWEAVE_X_API_COST_GUARDRAILS_REPORT.md`（429 時は search でリトライせず即諦める設計）。

---

## ③ OS 側の "blocked flag" を解除する

`x_api_blocked` は **402 検知時に自動で立つ** だけで、**解除は手動**です。Token を修正したら、以下いずれかで解除してください。

### 方法 A: スクリプトで解除（推奨）

```bash
node scripts/clear-buzzweave-x-api-blocked.js
```

- 前提: `.env` に `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` を設定し、**本番と同じ Supabase プロジェクト**を指していること。
- 実装: `utils/supabase.js` の `clearBuzzweaveStatusXApiBlocked()` を呼び出します。

### 方法 B: API で解除（CRON_SECRET 認証）

```bash
curl -X GET "https://your-app.vercel.app/api/buzzweave-clear-x-api-blocked?cron_secret=YOUR_CRON_SECRET"
# または
curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" "https://your-app.vercel.app/api/buzzweave-clear-x-api-blocked"
```

- リモートから解除する場合に便利。CRON_SECRET 必須。

### 方法 C: Supabase SQL で解除

```sql
UPDATE buzzweave_status
SET x_api_blocked = false, updated_at = NOW()
WHERE id = 'main';
```

- Supabase Dashboard → SQL Editor で実行可能です。

### テーブル・関数の参照

- テーブル: `buzzweave_status`（`docs/supabase-buzzweave-locks.sql`）
- フラグを立てる: `upsertBuzzweaveStatus402()`（402 時のみ）
- フラグを読む: `getBuzzweaveStatus()`（`api/buzzweave-run.js` 冒頭でチェック）

---

## ④ KIBA の 401 Unauthorized について

ログの **`POST 401 /api/kiba/run`** は、**cron が自前の `/api/kiba/run` を呼ぶときの認証**が通っていない状態です（X API の 401 とは別です）。

### 認証の仕様

- **cron**（`api/cron.js`）は `/api/kiba/run` を呼ぶ際、次の両方で秘密を送っています。
  - ヘッダ: `Authorization: Bearer ${CRON_SECRET}`
  - クエリ: `cron_secret=${cronSecret}`
  - Body: `{ "cron_secret": cronSecret }`
- **kiba/run**（`api/kiba/run.js`）は次のいずれかで一致すれば 200 にします。
  - `Authorization: Bearer <CRON_SECRET>`（大文字小文字は無視）
  - `cron_secret`（query または body）が `CRON_SECRET` と一致

### 確認すべき点

1. **CRON_SECRET の一致**
   - Vercel の **cron が動く環境**（Production）の `CRON_SECRET` と、**kiba/run が動く環境**の `CRON_SECRET` が**完全に同一**か。
   - 本番とステージングで別値にしている場合、cron の `INTERNAL_API_BASE_URL` / `CRON_BASE_URL` が別デプロイを指していないか。

2. **cron からの kiba 実行**
   - cron は **HTTP で自アプリの /api/kiba/run を叩かず**、`runKibaOnce(kv, { btcSnapshot, ... })` を直接呼ぶ実装に変更済み（過剰実装の解消）。401 は cron 経由では発生しません。
   - 手動で POST する場合（例: 疎通確認）のみ `CRON_SECRET` が必要です。

3. **前後のスペース**
   - `CRON_SECRET` に前後のスペースが入っていないか（.env や Vercel の値のコピペミス）。

### 確認方法

- 本番と同じ `CRON_SECRET` とベース URL で、手動で POST して 200 が返るか確認する。

```powershell
# 例（PowerShell）
$base = "https://cryptotradeacademy.vercel.app"   # 本番 URL
$secret = $env:CRON_SECRET
Invoke-RestMethod -Uri "$base/api/kiba/run" -Method POST -Headers @{ Authorization = "Bearer $secret" } -Body (@{ cron_secret = $secret } | ConvertTo-Json) -ContentType "application/json"
```

---

## まとめ（優先度順）

| 優先度 | 確認内容 | アクション |
|--------|----------|------------|
| 1 | X API Bearer Token が有効か | Developer Portal と Vercel の `X_API_BEARER_TOKEN` を確認・必要なら再設定 |
| 2 | レート制限・過剰呼び出し | 投稿頻度と X の 429/401 の有無を確認 |
| 3 | blocked flag の解除 | Token 修正後、`scripts/clear-buzzweave-x-api-blocked.js` または SQL で `x_api_blocked = false` に更新 |
| 4 | KIBA 401 | 同一環境の `CRON_SECRET` と内部 API URL（`INTERNAL_API_BASE_URL` 等）を確認 |

このログは「壊れている」のではなく、**Trap Defence OS が壊れないように止めている状態**です。X API の認証を直し、必要に応じて blocked flag を解除すれば、BuzzWeave と KIBA の外部血流を再開できます。
