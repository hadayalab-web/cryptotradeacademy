# Trap Defence X Repost OS — Stateless 動作確認

## エンドポイント一覧

| パス | 言語 |
|------|------|
| `/api/x-quote-repost-en` | 英語 |
| `/api/x-quote-repost-es` | スペイン語 |
| `/api/x-quote-repost-pt` | ポルトガル語 |
| `/api/x-quote-repost-pt-br` | ポルトガル語（ブラジル） |
| `/api/x-quote-repost-ja` | 日本語 |
| `/api/x-quote-repost-ko` | 韓国語 |
| `/api/x-quote-repost-ar` | アラビア語 |

## QueryParam

| パラメータ | 値 | デフォルト |
|------------|-----|------------|
| `dryRun` | `1` \| `0` | `0`（1=投稿しない） |
| `count` | 1〜10 | 3 |
| `tier` | `mixed` \| `minimal` \| `regular` | `mixed` |
| `mode` | `template` \| `grok` \| `hybrid` | `hybrid` |

## curl 例

### dryRun テスト（投稿しない・EN）

```bash
# 3件ぶんの text を返す（実際は投稿しない）
curl -s "https://YOUR_VERCEL_DOMAIN/api/x-quote-repost-en?dryRun=1&count=3&mode=hybrid&tier=mixed"
```

### 実弾テスト（EN・実際に投稿）

```bash
curl -s "https://YOUR_VERCEL_DOMAIN/api/x-quote-repost-en?dryRun=0&count=3&mode=hybrid&tier=mixed"
```

### テンプレのみ（Grok を使わない）

```bash
curl -s "https://YOUR_VERCEL_DOMAIN/api/x-quote-repost-en?dryRun=1&count=3&mode=template&tier=mixed"
```

### 他言語（JA dryRun）

```bash
curl -s "https://YOUR_VERCEL_DOMAIN/api/x-quote-repost-ja?dryRun=1&count=3&mode=hybrid&tier=mixed"
```

## 想定レスポンス構造

```json
{
  "success": true,
  "lang": "en",
  "posted": 3,
  "results": [
    { "tweetId": "1234567890", "ok": true, "dryRun": true, "text": "..." },
    { "tweetId": "1234567891", "ok": true, "dryRun": true, "text": "..." },
    { "tweetId": "1234567892", "ok": true, "dryRun": true, "text": "..." }
  ],
  "error": null,
  "runId": "qr-en-1234567890-abc123",
  "mode": "hybrid",
  "dryRun": true,
  "count": 3,
  "tier": "mixed",
  "timestamp": "2026-02-11T12:00:00.000Z"
}
```

### 実弾投稿時（dryRun=0）

```json
{
  "success": true,
  "lang": "en",
  "posted": 3,
  "results": [
    { "tweetId": "1234567890", "ok": true, "postedId": "9876543210" },
    { "tweetId": "1234567891", "ok": true, "postedId": "9876543211" },
    { "tweetId": "1234567892", "ok": true, "postedId": "9876543212" }
  ],
  "runId": "qr-en-...",
  "mode": "hybrid",
  "dryRun": false,
  "count": 3,
  "tier": "mixed",
  "timestamp": "2026-02-11T12:00:00.000Z"
}
```

## 12リンク統合（環境変数）

| 環境変数 | 用途 |
|----------|------|
| `VID_LINK_REGULAR_EN` / `VID_LINK_MINIMAL_EN` | 英語 |
| `VID_LINK_REGULAR_ES` / `VID_LINK_MINIMAL_ES` | スペイン語 |
| `VID_LINK_REGULAR_PT_BR` / `VID_LINK_MINIMAL_PT_BR` | ポルトガル語（pt / pt-br 共通） |
| `VID_LINK_REGULAR_JA` / `VID_LINK_MINIMAL_JA` | 日本語 |
| `VID_LINK_REGULAR_KO` / `VID_LINK_MINIMAL_KO` | 韓国語 |
| `VID_LINK_REGULAR_AR` / `VID_LINK_MINIMAL_AR` | アラビア語 |

- `tier=mixed` では regular:80% / minimal:20% でランダム選択
- 環境変数未設定時はフォールバック値を使用
- ローカル確認: `node scripts/verify-vid-links-stateless.js`

## Vercel ログで確認する項目

- `[QuoteRepostStateless] Start lang=... count=... mode=... tier=... dryRun=...`
- `[QuoteRepostStateless] Search hits=N`
- `[QuoteRepostStateless] Pick tweetIds=[...]`
- `[QuoteRepostStateless] GrokPool size=N`（mode !== template のとき）
- `[QuoteRepostStateless] dryRun tweetId=... textLen=...`（dryRun=1 のとき）
- `[QuoteRepostStateless] Posted quote N/3 for ...`（実弾時）
