# BuzzDefence / BuzzWeave 最終レビュー用パック（Copilot・Grok向け）

このドキュメントは、`Trap Defence OS` の現行実装を第三者レビューにかけるための「渡し資料」です。  
目的は **不具合・回帰・運用事故リスクの発見** です。

---

## 1) まず押さえる前提（ここを読んでからレビュー開始）

- 本番実行の入口は `api/buzzweave-run.js`。
- 本番の主エンジンは `services/td/buzzWeaveEngine.js`。
- **PQT-ONLY モード**: `BUZZWEAVE_PQT_ONLY=true` で、投稿は PQT（引用リポスト）のみ。通常ポスト・固定スケジュール・Grok 数字は廃止。仕様は `docs/BUZZWEAVE_PQT_ONLY_SPEC.md`。
- `services/td/buzzDefenceEngineV4.js` / `services/td/buzzDefenceEngineV4_1.js` は、現状は主にテスト・サンプル参照（本番入口から直接は呼ばれていない）。
- X API 暴走防止は、`x_api_blocked` フラグ・ロック・TTL・1run上限で多段防御。

---

## 2) レビュー対象の実行経路（本番）

1. `api/buzzweave-run.js`
   - 認証（`CRON_SECRET`）
   - 緊急停止チェック
   - `x_api_blocked` チェック
   - Supabase ロック取得/解放（finally）
   - snapshot を取得して `runBuzzWeaveCycle` 実行

2. `services/td/buzzWeaveEngine.js`
   - 候補収集（search/recent）
   - 候補選別・分類
   - 投稿文生成（slot/narrative/CTA）
   - 本文投稿 + 自リプ（リンク先行）
   - KPI ログ保存
   - 402検知時のブロックフラグ更新

3. `services/x/client.js`
   - X API 呼び出し共通
   - 429/5xx リトライ（上限あり）
   - 402 はリトライしない

4. `utils/supabase.js`
   - BuzzWeave ロック管理（TTL）
   - `x_api_blocked` 管理
   - 最小スキーマ時の run 拒否（バイパス無効化済み）

5. `api/buzzweave-clear-x-api-blocked.js`（新規）
   - 402 後の `x_api_blocked` を CRON_SECRET 認証で解除

---

## 3) 重要機能（今回の「最終形態」として見てほしい点）

### A. 投稿生成・導線最適化

- `services/textgen/buildStructuredPost.js`
  - slot + market snapshot から main/replies 生成
  - `pickBestFunnelLink`（学習型導線選択）連携
- `services/links/index.js`
  - 言語別リンク取得
  - 72h KPI（subs/ctr）優先で funnel_type 選択
- `services/links/metrics.js`
  - `buzzweave_post_log` から導線効果を集計

### B. 市場連動ナラティブ

- `services/market/getBtcSnapshot.js`
  - 最新 snapshot を正規化して取得
- `services/narrative/narrativeDetector.js`
  - trap/netflow/liquidation/funding から narrative 推定
- `services/td/autonomousSlotGenerator.js`
  - cluster/lang/CTA/weight を統合決定

### B'. PQT CTR 最大化（6言語・200〜350投稿レンジ）

- **設計**: `docs/BUZZWEAVE_PQT_CTR_DESIGN.md`（Grok の数字は使わず、Fisherman 検出＋CTR 学習のみ）
- `services/td/languageConfig.js` — 6言語 weight/tone
- `services/td/pqtPlanner.js` — 1日 PQT レンジ（trap_score 連動）・言語別配分
- `services/td/fishermanDetector.js` — hype＋engagement でスロット選定
- `services/td/pqtTemplates.js` — 6言語×2バリアント
- `services/td/pqtCtaEngine.js` — テンプレ選択（CTR）・buildPqt・recordPqtResult
- `services/td/pqtProofSnippet.js` — buildProofSnippetFromSnapshot
- `services/td/pqtRunner.js` — runPqtDay 統合（candidatesByLang は呼び出し元が用意。本番入口は未接続）

### C. CQ 一本化・言語penalty

- `services/snapshot/cqLatestWriter.js`
  - `cq:latest` 正規化/読取/変換
- `api/cron.js`
  - `cq:latest` 優先（不足時のみ deep fetch）
- `api/refresh-chain-raid-mv.js`
  - MV refresh + `chain_raid:lang_penalty` KV 更新（3段階）
- `utils/langPenalty.js`
  - penalty 読取 API

### D. 運用安全性（暴走防止）

- `x_api_blocked` で run 入口停止
- lock + TTL による多重実行防止
- minimal lock schema は常に拒否（危険バイパス削除済み）
- 402 は即停止、429/5xx は上限付きリトライ

---

## 4) レビューで重点的に見てほしい論点

1. **本番経路の整合性**
   - `buzzweave-run -> buzzWeaveEngine -> x/client` の経路で、重複投稿や無限リトライの余地がないか
2. **ロック安全性**
   - 例外・タイムアウト時でも lock が詰まり続けないか（TTL/legacy分岐含む）
3. **402/429 異常時の挙動**
   - 402 後に再突入しないか
   - 429 のリトライが過剰にならないか
4. **データ学習の妥当性**
   - funnel 選択がサンプル不足時に暴れないか（`MIN_POSTS`）
5. **死蔵コード / 分岐乖離**
   - v4/v4.1 エンジン（`buzzDefenceEngineV4*`）が本番未接続であることが設計意図どおりか
6. **可観測性**
   - 障害時のログが復旧判断に十分か（warn/error レベル含む）

---

## 5) 実行してほしい確認コマンド（ローカル）

```bash
node scripts/test-v41-bloodflow.js
node scripts/test-v42-bloodflow.js
node scripts/sample-v4-posts.js
```

可能なら追加で:

```bash
# dry-run
curl "http://localhost:3000/api/buzzweave-run?dry_run=1&lang=ja"
```

---

## 6) Copilot への依頼テンプレ（そのまま貼り付け可）

```text
Trap Defence OS の最終レビューをしてください。目的は概要説明ではなく、バグ/回帰/運用事故リスクの抽出です。

必ず以下を優先順位順で報告してください:
1) 重大バグ（投稿暴走・ロック不整合・402/429異常）
2) 仕様不整合（本番経路と実装の齟齬）
3) 中程度の保守リスク（将来バグ化しやすい分岐）

レビュー対象の中心:
- api/buzzweave-run.js
- services/td/buzzWeaveEngine.js
- services/x/client.js
- utils/supabase.js
- api/buzzweave-clear-x-api-blocked.js
- services/textgen/buildStructuredPost.js
- services/links/index.js
- services/links/metrics.js
- services/td/autonomousSlotGenerator.js
- services/narrative/narrativeDetector.js

出力形式:
- Findings first（重大度順）
- 各 finding に「原因」「再現条件」「影響範囲」「推奨修正」を記載
- 最後に「追加テスト観点」を5件以内で提示
```

---

## 7) Grok への依頼テンプレ（そのまま貼り付け可）

```text
Trap Defence OS (BuzzWeave/BuzzDefence) のアーキテクチャ監査をしてください。
主眼は「この設計が本番で事故らないか」です。解説より監査結果を優先してください。

監査観点:
1) X API runaway 防止（402, 429, retry ceiling, per-run call cap）
2) lock safety（acquire/release/finally/TTL/legacy path）
3) data-driven routing（funnel learning, lang penalty, narrative inference）
4) operational recoverability（x_api_blocked clear path, observability）
5) dead path / design drift（v4 engines vs current production path）

対象ファイル:
- api/buzzweave-run.js
- services/td/buzzWeaveEngine.js
- services/x/client.js
- utils/supabase.js
- api/buzzweave-clear-x-api-blocked.js
- services/textgen/buildStructuredPost.js
- services/links/index.js
- services/links/metrics.js
- api/refresh-chain-raid-mv.js
- services/snapshot/cqLatestWriter.js
- api/cron.js

返答フォーマット:
- Critical / High / Medium の順に箇条書き
- 各項目に「why」「evidence(file/function)」「fix suggestion」
- 最後に「Go/No-Go 判定」と「Go 条件（必要なら）」を明記
```

---

## 8) 期待するレビューアウトプット形式（共通）

- Findings を重大度順で列挙（要約先出し禁止）
- 各 finding は「再現条件」と「修正案」まで含める
- 「問題なし」の場合でも、残余リスクとテストギャップを明記

この形式で返ってくると、すぐ修正タスクに落とし込めます。
