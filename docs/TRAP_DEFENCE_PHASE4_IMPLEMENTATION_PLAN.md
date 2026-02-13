# Trap Defence OS Phase 4 — Implementation Plan

**作成日**: 2026-02-13  
**ステータス**: 計画確定（実装前）  
**目的**: External Integration & Intelligence Expansion — マルチアセット・マルチ surface・完全外部化

---

## 0. Phase 4 ゴール

Trap Defence OS を単一アセット内製システムから以下へ転換する：

- **multi-asset**: BTC / ETH / SOL / NASDAQ / GOLD
- **multi-surface**: Telegram / Email / Web Dashboard / BWE
- **multi-output**: snapshot-native で全チャネル統一
- **fully externalized**: CQ Pro 100%、外部データソース統合

---

## 1. 実装順序（必須）

| 順 | Task | 内容 |
|----|------|------|
| 1 | Task 1 | Email snapshot-native migration |
| 2 | Task 2 | Web Dashboard (Snapshot Viewer) |
| 3 | Task 3 | BWE Regime-Aware Copywriting |
| 4 | Task 4 | Multi-Asset Snapshot Framework |
| 5 | Task 5 | Snapshot Diff Engine |
| 6 | Task 6 | CQ Pro 100% Full Integration |
| 7 | Task 7 | Trap Defence OS v1.0 Documentation |

---

## 2. Task 1 — Email Snapshot-Native Migration（ファイル単位計画）

### 2.1 目的

Telegram と Email を同一の snapshot-native アーキテクチャで統一する。

### 2.2 新規作成

| ファイル | 内容 |
|----------|------|
| `services/email/messages/user/en/regular.en.js` | 既存を書き換え（後述） |
| `services/email/messages/user/ja/regular.ja.js` | formatRegularBriefingHTML(snapshot, lang, opts) — JA |
| `services/email/messages/user/ko/regular.ko.js` | 同上 — KO |
| `services/email/messages/user/es/regular.es.js` | 同上 — ES |
| `services/email/messages/user/pt-br/regular.pt-br.js` | 同上 — PT-BR |
| `services/email/messages/user/ar/regular.ar.js` | 同上 — AR |

### 2.3 変更

| ファイル | 内容 |
|----------|------|
| `services/email/messages/user/en/regular.en.js` | `formatRegularBriefingHTML(snapshot, lang, opts)` にリファクタ。レガシー引数を削除し、snapshot から raw, cqDeep, trapDetection, divergenceSignal, marketRegime, sosovalueArticle, drGrok.base, xSentiment, meta を参照。opts: `{ psychologicalSupport, nonUserImpactReport, missedOpportunities }` |
| `utils/snapshotToRegularEmailPayload.js` | **削除または非推奨化**。formatRegularBriefingHTML が snapshot を直接受け取るため不要 |
| `api/cron.js` | Regular メール送信を再活性化。`formatRegularBriefingHTML(snapshot, targetLang, opts)` を言語ループ内で呼び、`sendBatchEmails` に渡す。`snapshotToRegularEmailPayload` 呼び出しを削除 |
| `scripts/test-email-*.js` | モック snapshot で formatRegularBriefingHTML(snapshot, 'en', opts) を呼ぶ形式に更新 |

### 2.4 formatRegularBriefingHTML 新シグネチャ

```js
/**
 * @param {Object} snapshot - btcSnapshot (raw, cqDeep, trapDetection, divergenceSignal, marketRegime, sosovalueArticle, drGrok.base, xSentiment, highResX, meta)
 * @param {string} lang - 'en'|'ja'|'ko'|'es'|'pt-br'|'ar'
 * @param {Object} [opts] - { psychologicalSupport, nonUserImpactReport, missedOpportunities }
 * @returns {string} HTML
 */
function formatRegularBriefingHTML(snapshot, lang = 'en', opts = {})
```

### 2.5 cron での呼び出し例

```js
// Regular ループ内（各 targetLang）
const emailOpts = {
  psychologicalSupport: langPsychologicalSupport || null,
  nonUserImpactReport: langNonUserImpactReport,
  missedOpportunities: langMissedOpportunitiesFormatted
};
const { formatRegularBriefingHTML } = require(`../services/email/messages/user/${targetLang}/regular.${targetLang}`);
const emailHTML = formatRegularBriefingHTML(btcSnapshot, targetLang, emailOpts);
// sendBatchEmails({ recipients, subject, html: emailHTML, ... })
```

---

## 3. Task 2 — Web Dashboard（ファイル単位計画）

### 3.1 前提

- 現状: Vercel serverless（api/）のみ。Next.js は未導入。
- **選択肢 A**: Next.js をサブパスで追加（`/dashboard` 用）
- **選択肢 B**: Vercel の Edge/Serverless + 静的 HTML + fetch API

**推奨**: 軽量を優先し、`api/dashboard/btc.js` + `api/dashboard/history.js` を Vercel API として作成し、フロントは `pages/dashboard/` または `app/dashboard/`（Next.js 追加時）で実装。

### 3.2 新規作成（Next.js を追加する場合）

| ファイル | 内容 |
|----------|------|
| `package.json` | next, @supabase/supabase-js, recharts 追加 |
| `app/dashboard/btc/page.js` | /dashboard/btc — snapshot 表示（raw, cqDeep, market_score, tradeSignal, trapDetection, divergenceSignal, marketRegime, sosovalueArticle, drGrok.base, xSentiment, highResX, meta） |
| `app/dashboard/history/page.js` | /dashboard/history — Supabase から btc_snapshots 履歴取得・表示 |
| `app/dashboard/layout.js` | 共通レイアウト |
| `components/dashboard/SnapshotCard.js` | 各セクション表示用 |
| `components/dashboard/Charts.js` | trapScore, market_score, whaleRatio, funding, OI, liquidity, sentimentLabel, divergenceLevel, marketRegime のチャート |
| `lib/supabaseClient.js` | ブラウザ用 Supabase クライアント |

### 3.3 新規作成（API のみ・軽量案）

| ファイル | 内容 |
|----------|------|
| `api/dashboard/btc.js` | GET: KV から btc:snapshot 取得し JSON 返却 |
| `api/dashboard/history.js` | GET: Supabase btc_snapshots から直近 N 件取得 |
| `public/dashboard/index.html` | 静的 HTML + Chart.js CDN で /dashboard/btc, /dashboard/history を表示 |

### 3.4 チャート対象

- trapScore（時系列）
- market_score（時系列）
- whaleRatio
- funding
- OI
- liquidity
- sentimentLabel（カテゴリ）
- divergenceLevel（カテゴリ）
- marketRegime transitions（タイムライン）

---

## 4. Task 3 — BWE Regime-Aware Copywriting（ファイル単位計画）

### 4.1 変更

| ファイル | 内容 |
|----------|------|
| `services/ai/gpt5mini.js` | `regimeTone` ヘルパー追加。marketRegime に応じたトーン指示をプロンプトに注入 |

### 4.2 regimeTone マッピング

| regime | tone |
|--------|------|
| whale-driven | analytical, cautious |
| retail-fomo | contrarian, warning tone |
| high-volatility | short, urgent |
| liquidity-vacuum | defensive |
| miner-capitulation | long-term perspective |
| neutral | balanced |

### 4.3 プロンプト注入例

```
Regime: {{regime}}
Tone rule: {{regimeTone}}
Divergence: {{divergenceLevel}}
Trap severity: {{trapSeverity}}
Whale bias: {{whaleBias}}, Retail FOMO: {{retailFomo}}
```

---

## 5. Task 4 — Multi-Asset Snapshot Framework（ファイル単位計画）

### 5.1 新規作成

| ファイル | 内容 |
|----------|------|
| `services/snapshot/assetSnapshotBuilder.js` | runAssetSnapshot(assetCode) — Stage 1–6 を assetCode 対応で抽象化 |
| `services/snapshot/assetSnapshotSchema.js` | assetSnapshot スキーマ、asset_snapshots DB 用 |
| `services/snapshot/adapters/btcAdapter.js` | BTC 専用データソース（既存 CQ btc エンドポイント） |
| `services/snapshot/adapters/ethAdapter.js` | ETH 用（CQ Pro ETH エンドポイント or フォールバック） |
| `services/snapshot/adapters/solAdapter.js` | SOL 用 |
| `services/snapshot/adapters/nasdaqAdapter.js` | Yahoo Finance / Alpha Vantage |
| `services/snapshot/adapters/goldAdapter.js` | Yahoo Finance / Alpha Vantage |
| `docs/supabase-asset-snapshots.sql` | asset_snapshots テーブル DDL |

### 5.2 変更

| ファイル | 内容 |
|----------|------|
| `services/snapshot/btcSnapshotSchema.js` | assetSnapshotSchema の BTC  specialized 版として継承 or 共通化 |
| `api/cron.js` | runAssetSnapshot('BTC') を呼び出し。将来的に ETH, SOL 等を並列/順次実行 |
| `api/buzzweave-run.js` | `?asset=BTC` 等のクエリを受け取り、KV `asset:snapshot:${asset}` から取得 |

### 5.3 KV / DB キー

- KV: `btc:snapshot` → `asset:snapshot:BTC` にリネーム or 両立
- DB: `btc_snapshots` のまま BTC 用、`asset_snapshots` を新設して全アセット共通

---

## 6. Task 5 — Snapshot Diff Engine（ファイル単位計画）

### 6.1 新規作成

| ファイル | 内容 |
|----------|------|
| `logic/diff/computeSnapshotDiff.js` | `computeSnapshotDiff(current, previous) → { priceChange, whaleRatioChange, fundingChange, OIChange, liquidityChange, sentimentFlip, trapScoreDelta, divergenceDelta, regimeShift, summaryText }` |

### 6.2 変更

| ファイル | 内容 |
|----------|------|
| `api/cron.js` | buildFullSnapshot 後、getLastBtcSnapshot と比較して diff 計算し `snapshot.diff` にマージ |
| `services/snapshot/btcSnapshotSchema.js` | buildFullSnapshot に diff フィールド追加 |
| Regular briefing（Telegram / Email） | diff.summaryText を「前回からの変化」として表示（オプション） |
| BWE | marketStateNote に diff 要約を追加 |
| Dashboard | diff セクション表示 |

---

## 7. Task 6 — CQ Pro 100% Full Integration（ファイル単位計画）

### 7.1 変更

| ファイル | 内容 |
|----------|------|
| `services/cryptoquant/deepMetrics.js` | 以下エンドポイントを追加・拡張: derivatives（funding, OI, liquidations 等）、liquidity、miner flows、long-term holder、stablecoin、exchange flows、ETF flows。404 時フォールバック、snapshot.cqDeep にフィールド追加 |

### 7.2 追加対象メトリクス（CQ Pro 利用可能範囲）

- Derivatives: funding rate, OI, 可能なら liquidations
- Liquidity: depth, bid-ask spread
- Miner flows: outflow, inflow, netflow
- Long-term holder: LTH-NUPL, SOPR30d
- Stablecoin: supply, exchange reserve（利用可能なら）
- Exchange flows: 各種 exchange 別
- ETF: フロー（利用可能なら）

※ CryptoQuant API の実際のエンドポイント一覧は cryptoquant.com/docs で要確認。

---

## 8. Task 7 — OS v1.0 Documentation（ファイル単位計画）

### 8.1 変更

| ファイル | 内容 |
|----------|------|
| `docs/TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md` | Phase 4 セクション追加。full snapshot schema, Stage 1–6, cron pipeline, divergenceSignal, marketRegime, trapDetection, BWE alignment, multi-asset, diff engine, email snapshot-native, dashboard, scripts, error handling, self-healing |

### 8.2 新規作成

| ファイル | 内容 |
|----------|------|
| `docs/TRAP_DEFENCE_OS_V1.0.md` | 完全版 OS アーキテクチャドキュメント。上記全項目を統合した Single Source of Truth |

---

## 9.  clarifying Questions（実装前確認）

### 9.1 Task 1（Email）

| # | 質問 | 補足 |
|---|------|------|
| Q1 | Regular メール配信を再開するか | 現状「メール送信は廃止（Telegramのみ）」となっている。Phase 4 で再開が前提か |
| Q2 | Email は 6 言語すべてに配信するか | Telegram と同様、targetLang ごとに formatRegularBriefingHTML(snapshot, targetLang, opts) を呼ぶ想定 |
| Q3 | 既存の Resend メール送信フロー（recipientEmails 取得等）はそのまま使用するか | sendBatchEmails の呼び出し元・対象リストの取得ロジックは変更不要か |

### 9.2 Task 2（Dashboard）

| # | 質問 | 補足 |
|---|------|------|
| Q4 | Next.js をプロジェクトに追加するか、それとも API + 静的 HTML の軽量構成でよいか | package.json に next を追加するとビルド・デプロイが変わる |
| Q5 | Dashboard は認証必須か | 公開でよいか、Basic Auth / Supabase Auth 等が必要か |
| Q6 | チャートライブラリの指定はあるか | Chart.js / Recharts / その他 |

### 9.3 Task 4（Multi-Asset）

| # | 質問 | 補足 |
|---|------|------|
| Q7 | CQ Pro で ETH / SOL エンドポイントは利用可能か | 契約・エンドポイント仕様の確認 |
| Q8 | NASDAQ / GOLD のデータソース優先順位 | Yahoo Finance / Alpha Vantage / 他。API キー要件 |
| Q9 | マルチアセットは Phase 4 で一括実装か、まず BTC の枠組みだけ整えて ETH 等は後追いか | 工数・リスクのバランス |

### 9.4 Task 6（CQ Pro）

| # | 質問 | 補足 |
|---|------|------|
| Q10 | CQ Pro の全エンドポイント一覧・仕様書は手元にあるか | cryptoquant.com/docs の他、社内ドキュメントがあれば |
| Q11 | 404 エンドポイントは「無視して続行」でよいか | 現状 deepMetrics は 404 を debug ログで握りつぶしている |

---

## 10. ファイル変更サマリ（全タスク）

### 新規

- `services/email/messages/user/{ja,ko,es,pt-br,ar}/regular.{lang}.js`
- `logic/diff/computeSnapshotDiff.js`
- `services/snapshot/assetSnapshotBuilder.js`
- `services/snapshot/assetSnapshotSchema.js`
- `services/snapshot/adapters/*.js`（btc, eth, sol, nasdaq, gold）
- `docs/supabase-asset-snapshots.sql`
- `docs/TRAP_DEFENCE_OS_V1.0.md`
- Dashboard 関連（Next.js 構成 or API + HTML）

### 変更

- `services/email/messages/user/en/regular.en.js`
- `utils/snapshotToRegularEmailPayload.js`（削除 or 非推奨）
- `api/cron.js`
- `api/buzzweave-run.js`
- `services/ai/gpt5mini.js`
- `services/cryptoquant/deepMetrics.js`
- `services/snapshot/btcSnapshotSchema.js`
- `docs/TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md`
- `scripts/test-email-*.js`

---

## 11. 次のアクション

1. **Clarifying Questions への回答**（セクション 9）
2. **Task 1 から順次実装開始**
3. 各 Task 完了ごとに `docs/TRAP_DEFENCE_PHASE4_IMPLEMENTATION_REPORT.md` に進捗追記
