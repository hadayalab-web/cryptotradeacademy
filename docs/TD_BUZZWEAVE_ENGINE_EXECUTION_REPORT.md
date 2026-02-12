# TD BuzzWeave Engine 実行検証レポート

作成日: 2026-02-12

---

## 1. 実施内容

指定された手順を順番に実行し、実行可否と出力を確認した。

1. `node scripts/td-generate-daily-slots.js`
2. `npm run dev`
3. `curl "http://localhost:3000/api/buzzweave-run?dry_run=true"`

---

## 2. 実行結果（ログ）

### 2-1. `node scripts/td-generate-daily-slots.js`

結果: 失敗（exit code: 1）

```text
[KV] 🔵 KV初期化開始...
[KV] 環境変数確認:
[KV]   KV_REST_API_URL: ✅ 設定済み
[KV]   KV_REST_API_TOKEN: ✅ 設定済み
[KV]   KV_URL: ✅ 設定済み
[KV] ✅ KVインスタンス初期化成功（@vercel/kv）
(node:17964) Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification.
(Use `node --trace-warnings ...` to show where the warning was created)
[KV] ✅ KV接続テスト成功（初期化時）
[TD-Slots] td_post_slots が存在しません。Supabase SQL Editor で docs/supabase-tweet-metrics-schema.sql を実行してテーブルを作成してください。
```

---

### 2-2. `npm run dev`

結果: 失敗（`dev` script 未定義）

```text
npm error Missing script: "dev"
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error A complete log of this run can be found in: C:\Users\chiba\AppData\Local\npm-cache\_logs\2026-02-12T03_35_22_339Z-debug-0.log
```

---

### 2-3. `curl "http://localhost:3000/api/buzzweave-run?dry_run=true"`

結果: 失敗（localhost:3000 接続不可）

```text
curl: (7) Failed to connect to localhost port 3000 after 2237 ms: Could not connect to server
```

---

## 3. チェック観点の判定

### A. slot 件数 / mode 比率

- 600件生成: **未達**
  - 理由: `td_post_slots` テーブル未作成でスロット生成処理が停止
- mode 比率（実データ）: **未検証**
  - ただしコード定義は以下で確認済み
  - `const MODE_WEIGHTS = { regular: 70, minimal: 30 };`

### B. buzz candidate 選定

- **未達**
  - 理由: API サーバー未起動のため dry-run API が実行できない

### C. copy generation（body の有無）

- **未達**
  - 理由: dry-run API 実行まで到達していないため `body` 未取得

---

## 4. KPI 3原則との整合評価

Trap Defence OS の KPI:

1. 高インプレッション
2. 高エンゲージメント
3. 高CVR

評価:

- **設計・コード整合**: 概ね整合（バズ抽出、文脈分類、Regular 70/Minimal 30）
- **実行整合**: 未達（インフラ前提未充足）
  - `td_post_slots` 未作成
  - ローカルAPI実行環境未起動

---

## 5. 次アクション（最短）

1. Supabase SQL Editor で `td_post_slots` を作成
2. スロット生成を再実行
   - `node scripts/td-generate-daily-slots.js`
3. ローカルで API を起動可能な手段を確立
   - このリポジトリには `npm run dev` がないため、実行手段を別途定義する
4. dry-run 実行
   - `curl "http://localhost:3000/api/buzzweave-run?dry_run=true"`

以上。

