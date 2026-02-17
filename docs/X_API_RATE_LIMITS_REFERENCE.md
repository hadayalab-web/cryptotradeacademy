# X API レート制限 — 参照は公式のみ

**レート制限の根拠は X API 公式ドキュメントだけを参照する。**  
他（grokOptimalTiming 等）の「○○投稿/日」「rate limit ceiling」などの数値は検証されておらず参照しない。

- 公式: **X API Rate Limits** — Per-endpoint rate limits for X API v2  
  https://developer.x.com/en/docs/twitter-api/rate-limits

---

## 仕組み

| 概念 | 説明 |
|------|------|
| Time window | 多くは 15 分または 24 時間 |
| Per-user | OAuth 1.0a / OAuth 2.0 ユーザートークンで適用 |
| Per-app | Bearer Token（app-only）で適用 |
| Per-endpoint | エンドポイントごとに別枠 |

超過時は 429 が返り、ウィンドウリセットまで待つ。

---

## レスポンスヘッダで確認

| ヘッダ | 説明 |
|--------|------|
| `x-rate-limit-limit` | ウィンドウ内の最大リクエスト数 |
| `x-rate-limit-remaining` | 残りリクエスト数 |
| `x-rate-limit-reset` | ウィンドウリセット時刻（Unix 秒） |

---

## BuzzWeave で使うエンドポイント（抜粋）

いずれも **15 分あたり** の制限（別注記がない限り）。

| Method | Endpoint | Per App | Per User | 備考 |
|--------|----------|---------|----------|------|
| **POST** | **/2/tweets** | **10,000/24hrs** | **100/15min** | ツイート・リプライ投稿 |
| GET | /2/tweets/search/recent | 450/15min | 300/15min | 10 default, 100 max results; 512 query length |
| GET | /2/tweets/:id | 450/15min | 900/15min | 単一ツイート取得 |
| GET | /2/tweets | 3,500/15min | 5,000/15min | 複数ツイート取得 |

投稿数上限の議論は **POST /2/tweets** の Per App（10,000/24hrs）または Per User（100/15min）を基準にする。
