# CTOレビュー: affiliate-dmワークフロー + Whop統合

**レビュー日**: 2026-01-11T02:51:56.281Z  
**レビュー者**: GPT: CTO (gpt-5.2-2025-12-11)  
**依頼者**: COO: Cursor (Composer)

---

# CTOレビュー: affiliate-dmワークフロー + Whop統合

## 1. コードの重複（DRY原則）

- **affiliate-dmワークフロー内でWhop APIを直接呼び出しているか？**
  - 提示された `route.ts` 断片の範囲では **Whop API呼び出しは見当たりません**（Telegram/OpenAI/CSVロードが中心）。
  - ただし、テンプレート内に「アフィリエイト登録/購入導線（リンク）」が入る設計であれば、今後ワークフロー側でWhopリンク生成を追加する可能性が高く、その際に **Whop呼び出しをワークフローに直書きすると重複の温床**になります。

- **現時点での重複/冗長性**
  - `candidate.name || candidate.name` が複数箇所にあり **明確な重複（タイポ）**です。`candidate.name || "候補者"` に統一すべきです。
  - OpenAIキー未設定時/例外時のテンプレ置換処理が複数箇所に散っており、将来テンプレ仕様が変わると修正漏れが起きやすいです（置換関数化推奨）。

**評価:** Whop観点のDRYは「今は未発生」だが、統合するなら `api/unified-api.ts` への集約が妥当。現状でも `name` 置換などに小さな重複がある。

---

## 2. api/unified-api.tsの活用

- **affiliate-dmにWhopアフィリエイトリンク生成を統合する場合**
  - 結論: **`generateWhopAffiliateLink` を使用すべき**です（ワークフロー内にWhop API呼び出しを直接実装しない）。
  - 理由:
    - 認証（`WHOP_API_KEY`）、URL組み立て、エラーハンドリングを **単一箇所に集約**できる
    - API仕様変更（v2→v3、エンドポイント変更、レスポンス形式変更）時の影響範囲を最小化
    - 監視/ロギング/リトライなどの横断的改善を `whopRequest` 側に集約可能

- **ワークフロー内で直接実装すべきケース**
  - 例外的に「ワークフロー固有の特殊なWhop操作（unified-api.tsが想定していない）」がある場合のみ。ただしその場合でも、最終的には `unified-api.ts` に機能追加して取り込む方が中長期で健全です。

- **統合の設計ポイント（推奨）**
  - DMテンプレートに `[AffiliateLink]` のようなプレースホルダを追加し、送信直前に
    1) `generateWhopAffiliateLink(...)` でリンク生成  
    2) テンプレへ差し込み  
    3) OpenAIに渡す場合は「リンクも含めて自然に整形」させるか、OpenAI後に差し込むかを決める  
  - **おすすめは「OpenAI生成後にリンク差し込み」**です（LLMがリンクを改変/短縮/壊すリスクを避ける）。

**評価:** Whop統合は `api/unified-api.ts` を中心に据えるべき。ワークフロー直書きは避ける。

---

## 3. エラーハンドリング

### affiliate-dm（OpenAI/テンプレフォールバック）
- 良い点:
  - `OPENAI_API_KEY` 未設定時にテンプレへフォールバックするのは実運用上堅い
  - OpenAI呼び出し失敗時もテンプレ使用に切り替えるのは妥当

- 改善点:
  - **ログ粒度**: `console.warn` だけだと追跡が難しい。候補者ID/marketCode/処理ステップ等のコンテキストを付与（PIIに注意）。
  - **プロンプト生成の例外**: `candidate` が想定外の形（nullなど）の場合に落ちうるので、`candidate?.name` のように防御的に。
  - **テンプレ置換の一貫性**: 成功時は `candidate.name || "候補者"`、失敗時は `candidate.name || candidate.name || "候補者"` とブレがある（統一）。

### whopRequest
- 良い点:
  - `response.ok` を見て `text()` を含むエラー内容を投げているのはデバッグに有用

- 改善点（重要）:
  - **Whop APIのエラーはJSONで返る場合もある**ため、`text()` 固定だと情報が欠けることがある。`content-type` を見て `json()`/`text()` を切り替えると良い。
  - **レート制限(429)・一時障害(5xx)へのリトライ**がない。ワークフローで複数候補へ送るなら、指数バックオフ付きリトライを `whopRequest` 側に実装する価値が高い。
  - `fetch` 自体のネットワーク例外（DNS/timeout）も捕捉して、エラー文言に endpoint/method を含めると運用が楽。

**評価:** affiliate-dmのフォールバック方針は妥当。Whop側は運用品質（リトライ、エラー解釈）を強化余地。

---

## 4. 型安全性

### affiliate-dm
- 現状の問題:
  - `candidate: any`、`sent: [] as any[]`、`failed: [] as any[]` は **型安全性がほぼ無い**状態。
  - `marketCode` も `string` 扱いで、バリデーションはしているが型として表現されていない。

- 推奨:
  - `type MarketCode = "EN" | "AR" | "KO" | "JA" | "ES" | "PT-BR";`
  - `interface Candidate { id: number; name?: string; platform?: string; ... }`
  - リクエストBodyも `zod` 等でパースして型を確定（Next.js Route Handlerでは特に有効）。
  - これにより `dmTemplates: Record<MarketCode, string>` のようにテンプレも市場コードの抜け漏れをコンパイル時に検知可能。

### whopRequest
- 現状の問題:
  - 戻り値 `Promise<any>` で、呼び出し側がレスポンス形状に依存すると壊れやすい。

- 推奨:
  - `whopRequest<T>(...): Promise<T>` のジェネリクス化  
  - `generateWhopAffiliateLink` の戻り値型（例: `{ url: string; code: string; ... }`）を明示

**評価:** 現状は「動けばOK」寄り。ワークフロー/外部API統合は型が効く領域なので、早めに型を起こした方が事故が減る。

---

## 5. パフォーマンス

### affiliate-dm
- OpenAIクライアント生成を `generatePersonalizedDM` 内で毎回行っているため、候補者が複数の場合に **無駄な初期化**が増えます。
  - 推奨: モジュールスコープで `const openai = new OpenAI(...)` を遅延初期化（キーがある場合のみ）し再利用。
- 候補者10件に対して逐次でOpenAIを呼ぶと遅くなります。
  - 推奨: 送信は並列でも良いが、外部API（OpenAI/Telegram/Whop）のレート制限を考え **同時実行数を制限した並列化**（例: p-limit）を推奨。

### whopRequest
- 不要な呼び出し回避:
  - `generateWhopAffiliateLink` は候補者ごとに作るのか、キャンペーン共通リンクで良いのかでコストが変わる。
  - **共通リンクで良いなら1回生成して全員に使う**（候補ごとに `customCode` を変えたい場合のみ個別生成）。

**評価:** 今後「複数候補にDM送信」する前提なら、OpenAI/Whop/Telegramの呼び出し回数と並列制御が鍵。

---

## 6. メンテナンス性

- affiliate-dm `route.ts` は責務が増えやすい構造です（CSV取得、テンプレ、LLM、Telegram送信、将来Whopリンク…）。
  - 推奨: 以下に分割
    - `lib/affiliate/dmTemplates.ts`（市場別テンプレ、プレースホルダ定義）
    - `lib/affiliate/renderMessage.ts`（プレースホルダ置換、リンク差し込み）
    - `lib/affiliate/generateMessage.ts`（OpenAI生成 + フォールバック）
    - `lib/affiliate/sendTelegram.ts`（送信処理）
- テンプレが巨大で `route.ts` に直書きされている点は変更に弱い（差分が見づらい、翻訳/改訂が大変）。
  - 推奨: 外部ファイル化（JSON/YAML/MD）またはCMS、最低でも別TSファイルへ。

**評価:** 現状でも読めるが、機能追加（Whop統合・多言語・ABテスト）で破綻しやすい。今のうちに分割が得策。

---

## 推奨事項

1. **Whop統合は `generateWhopAffiliateLink` を必ず使用**し、ワークフロー直書きのWhop呼び出しを禁止（DRY・変更耐性）。
2. **LLM生成後にWhopリンクを差し込む**（LLMにリンクを壊させない）。
3. `candidate.name || candidate.name` を修正し、テンプレ置換を関数化して一貫性を担保。
4. `MarketCode`/`Candidate`/リクエストBody/レスポンスを型定義し、可能なら `zod` で入力をパースして型を確定。
5. OpenAIクライアントを再利用し、複数候補処理は **同時実行数制限付き並列**にする。
6. `whopRequest` をジェネリクス化し、429/5xxのリトライ、エラーレスポンスのJSON対応を追加。

---

## 結論

- 現状の `affiliate-dm` は「OpenAI失敗時にテンプレへフォールバック」という運用上の堅さはある一方、`any` 多用とテンプレ直書きにより、今後の拡張（Whopリンク生成・多言語運用・大量送信）で保守性/安全性が下がりやすい構造です。  
- Whop統合を行うなら、**`api/unified-api.ts` を唯一のWhop窓口として活用し、ワークフロー側はオーケストレーションに徹する**のが最も合理的です。

---

## 使用量


- Prompt Tokens: N/A
- Completion Tokens: N/A
- Total Tokens: N/A
- Reasoning Effort: N/A
- Verbosity: N/A


---

**最終更新**: 2026-01-11T02:51:56.283Z
