# X API 401 Unauthorized（Search Tweets）トラブルシューティング

**発生箇所**: QuoteRepostStateless（`/tweets/search/recent`）  
**エラー**: `401 Unauthorized` — Authentication/Authorization Error

---

## 1. 確認チェックリスト

### ✅ Vercel 環境変数（必須 4 つ）

| 変数名 | 用途 | 確認 |
|--------|------|------|
| `X_API_CONSUMER_KEY` | API Key（Consumer Key） | Developer Portal > App > Keys and tokens |
| `X_API_CONSUMER_KEY_SECRET` | API Key Secret | 同上 |
| `X_API_ACCESS_TOKEN` | Access Token | 同上 |
| `X_API_ACCESS_TOKEN_SECRET` | Access Token Secret | 同上 |

**注意**: アクセストークンを再生成した場合は、必ず Vercel の環境変数も更新すること。

---

## 2. X Developer Portal での確認

### 2.1 Search API のアクセス権限

- **`/tweets/search/recent`** は **X API Basic 以上** が必要
- Free / Essential プランでは **Search API が利用不可** の可能性あり
- [X Developer Portal](https://developer.x.com/) → プロジェクト → **Products** で Search が有効か確認

### 2.2 App の権限（Permissions）

- **Read and write** または **Read** が必要
- 引用リポスト（POST /2/tweets）には Read and write が必要
- Search は Read で可（通常）

### 2.3 認証方式

- 本プロジェクトは **OAuth 1.0a User Context** を使用
- **OAuth 2.0** のみの App だと 401 になる場合あり
- Developer Portal で **OAuth 1.0a** が有効か確認

---

## 3. よくある原因と対処

| 原因 | 対処 |
|------|------|
| アクセストークン再生成後、Vercel 未更新 | 4 つの認証情報をすべて再設定 |
| Search API が契約されていない | Basic 以上にアップグレード |
| Consumer Key/Secret の typo | Developer Portal の値をコピーして再貼り付け |
| 別環境用の認証情報を混在 | 本番用 App の認証情報のみを使用 |

---

## 4. 手動検証（ローカル）

```bash
# 環境変数が読み込まれているか確認（.env がある場合）
node -e "
const c = process.env.X_API_CONSUMER_KEY;
const s = process.env.X_API_CONSUMER_KEY_SECRET;
const t = process.env.X_API_ACCESS_TOKEN;
const ts = process.env.X_API_ACCESS_TOKEN_SECRET;
console.log('Consumer Key:', c ? c.slice(0,8)+'...' : 'NOT SET');
console.log('Consumer Secret:', s ? 'SET' : 'NOT SET');
console.log('Access Token:', t ? t.slice(0,8)+'...' : 'NOT SET');
console.log('Access Token Secret:', ts ? 'SET' : 'NOT SET');
"
```

---

## 5. Search API が使えない場合の代替

- X API Free/Essential で Search が使えない場合は、**Stateless 引用リポストを一時停止**するか、**別の情報源（トレンド API 等）** への切り替えを検討
- Cron から `x-quote-repost-*` を外す場合は `vercel.json` の `crons` から該当エントリを削除
