# GPT-5.2 APIパラメータ問題 包括的解決策

**作成日**: 2026-01-11T02:59:24.295Z  
**レビュー者**: GPT: CTO (gpt-5.2-2025-12-11)  
**依頼者**: COO: Cursor (Composer)

---

# GPT-5.2 APIパラメータ問題 包括的解決策

## 1. 問題の根本原因

- **原因**: `GPT-5.2-2025-12-11` のAPI（少なくとも現在利用しているエンドポイント/SDK/互換レイヤー）では、リクエストパラメータとして `reasoningEffort` / `verbosity`（または `reasoning`）が **未サポート**。  
- **結果**: リクエストに未知パラメータが混入し、API側で **400 Unknown parameter** が返却される。
- **構造的問題**:
  1. `api/unified-api.ts` の型定義・戻り値に「存在しないパラメータ」が含まれ、呼び出し側が“使えるもの”と誤認しやすい。
  2. 複数スクリプト/ワークフローが独自に `reasoningEffort` / `verbosity` を渡しており、**横断的に再発**しやすい。
  3. ドキュメントが「サポートされている」と誤記しており、実装がそれに引きずられている。

---

## 2. 包括的な解決策

### 2.1 コード修正方針

#### 方針A（推奨・最短で確実）: **全呼び出しから該当パラメータを撤去**
- すべての `reasoningEffort` / `verbosity` を削除し、APIに渡さない。
- `api/unified-api.ts` の型定義・戻り値からも除去し、「存在しない設定」を表に出さない。

#### 方針B（後方互換も維持したい場合）: **“受け取るが送らない”互換レイヤー**
- 呼び出し側のコードを一気に直せない場合、`unified-api.ts` 側で
  - 入力としては `reasoningEffort` / `verbosity` を受け取れる（deprecated）
  - 実リクエスト送信前に **必ずフィルタリング**して落とす
- そのうえでログに「無視した」警告を出す（開発環境のみ等）。

#### エラーハンドリング改善（必須）
- 400系で `Unknown parameter` を検知したら、以下を行う:
  - エラーメッセージに「どのパラメータが未知だったか」「どの呼び出し経路か」を付与
  - 可能なら「サニタイズ済みでリトライ」する（ただし無限リトライ防止）
- さらに、**送信直前に許可パラメータのホワイトリスト**で落とすことで、未知パラメータを“そもそも送らない”仕組みにする。

---

### 2.2 修正の優先順位

優先順位は「本番/CIで落ちる頻度」と「影響範囲」で決めます。

1. **共通レイヤー（最優先）**
   - `api/unified-api.ts`  
   理由: ここでサニタイズ/型の是正をすれば、以後の再発が止まり、全呼び出しに効く。

2. **CIや日常運用で使うスクリプト（次点）**
   - `scripts/request-cto-review.ts`
   - `scripts/call-cto-review.mjs`
   - `scripts/cto-review-direct.ts`
   - `scripts/request-cto-review-simple.ts`  
   理由: 開発者が直接叩く頻度が高く、失敗が目立つ。

3. **ワークフロー配下（業務フロー影響）**
   - `workflows/affiliate-recruitment/src/utils/gpt-enhanced.ts`
   - `workflows/affiliate-recruitment/scripts/ask-gpt-synergy.ts`
   - `workflows/affiliate-recruitment/scripts/gpt-code-review.ts`  
   理由: ジョブ/自動化で失敗すると業務影響が出る。

4. **ドキュメント（最後に必ず整合）**
   - `docs/HIGH_END_MODELS_CONFIGURATION.md`
   - `docs/DIRECT_AI_API_USAGE.md`  
   理由: 誤記が残ると再発する。コード修正後に正を確定して更新。

---

### 2.3 後方互換性の考慮（オプション）

後方互換を維持するなら、次の2段階が安全です。

- **段階1（即時）**: `unified-api.ts` で `reasoningEffort/verbosity` を受け取っても **送らずに破棄**。  
  - `console.warn` かロガーで「deprecated: ignored」ログを出す（本番は抑制可）。
- **段階2（後日）**: 呼び出し側から完全削除し、型定義からも削除。  
  - 互換入力の受付も削除（破壊的変更）するなら、リリースノート/CHANGELOGに明記。

---

## 3. 実装計画

### 3.1 修正対象ファイル一覧

**コード**
1. `api/unified-api.ts`
2. `workflows/affiliate-recruitment/src/utils/gpt-enhanced.ts`
3. `workflows/affiliate-recruitment/scripts/ask-gpt-synergy.ts`
4. `workflows/affiliate-recruitment/scripts/gpt-code-review.ts`
5. `scripts/request-cto-review.ts`
6. `scripts/call-cto-review.mjs`
7. `scripts/cto-review-direct.ts`
8. `scripts/request-cto-review-simple.ts`

**ドキュメント**
9. `docs/HIGH_END_MODELS_CONFIGURATION.md`
10. `docs/DIRECT_AI_API_USAGE.md`

---

### 3.2 修正手順

#### Step 1: `api/unified-api.ts` を“防波堤”にする（最重要）

1) **入力型定義の見直し**
- 推奨: `reasoningEffort` / `verbosity` を型から削除  
- 後方互換を残すなら:
  - `/** @deprecated ignored */ reasoningEffort?: ...` のように明示
  - 実送信には含めない

2) **送信前サニタイズ（ホワイトリスト方式）**
- 例（概念）:
  - `const allowed = pick(opts, ['model','messages','temperature','max_output_tokens', ...])`
  - `reasoningEffort/verbosity/reasoning` は**絶対に混入させない**

3) **Unknown parameter のエラー改善**
- APIエラー本文に `Unknown parameter` が含まれる場合:
  - 「未知パラメータを送った可能性」を示すガイダンスを付与
  - 可能ならサニタイズ後に **1回だけ**自動リトライ（任意）
    - リトライは “同一リクエストIDで1回まで” など制限必須

4) **戻り値からも除去**
- 戻り値に `reasoningEffort/verbosity` を含めない（常にundefinedならノイズ）
- ログ/メトリクスに残したいなら、`debugMeta.ignoredParams` のように別枠へ

#### Step 2: 呼び出し側から `reasoningEffort` / `verbosity` を削除

- 機械的置換でOK:
  - `reasoningEffort: 'high'` を削除
  - `verbosity: 'high'` を削除
- もし「高品質にしたい」意図があるなら、代替として:
  - **プロンプト側で明示**（例: 「結論→根拠→手順で」「レビュー観点を網羅」等）
  - `max_output_tokens` を増やす
  - `temperature` を適切に調整（レビュー用途なら低め、発散用途なら高め）

#### Step 3: ドキュメントを実装に合わせて修正

- 「このモデルでは reasoning/verbosity は使えない」ことを明記
- 代替策（プロンプト/トークン/温度）を提示
- “将来サポートされた場合の分岐”が必要なら、**モデルごとの対応表**を載せる

---

### 3.3 テスト計画

#### 目的
- 未知パラメータが **絶対に送信されない**こと
- 送ってしまった場合でも **エラーが分かりやすく**、必要なら自動回復できること

#### テスト種別

1) **ユニットテスト（推奨: `unified-api.ts` のサニタイズ）**
- 入力: `{ reasoningEffort: 'high', verbosity: 'high', model, messages... }`
- 期待: 実際にHTTP送信されるペイロードに `reasoning*` / `verbosity` が含まれない
- 手段: HTTPクライアント/SDK呼び出しをモックし、送信bodyをスナップショット検証

2) **統合テスト（スモーク）**
- 代表スクリプト（例: `scripts/request-cto-review-simple.ts`）をCIで1回実行
- 期待: 400が出ない、最低限のレスポンスが返る

3) **エラーケーステスト**
- モックでAPIが `400 Unknown parameter: 'reasoning'.` を返す状況を作る
- 期待:
  - エラーが握りつぶされない
  - メッセージに「未知パラメータ」「呼び出し元」「対処（削除/更新）」が含まれる
  - （自動リトライを入れるなら）1回のみリトライして成功/失敗が確定する

4) **静的検査（再発防止に直結）**
- リポジトリ内で `reasoningEffort` / `verbosity` / `reasoning:` をgrepし、残っていたらCIを落とす（後述）

---

## 4. ドキュメント更新計画

### 更新対象
- `docs/HIGH_END_MODELS_CONFIGURATION.md`
- `docs/DIRECT_AI_API_USAGE.md`

### 更新方針（書くべき内容）
1) **サポート状況の明確化**
- 「GPT-5.2-2025-12-11 では `reasoning.effort` / `verbosity` はサポートされない（少なくとも当プロジェクトの利用APIでは）」と明記
- エラー例（今回の400）と原因を掲載

2) **推奨設定の代替案**
- 高品質化はパラメータではなく以下で担保する、と整理:
  - プロンプト設計（チェックリスト、出力フォーマット固定）
  - `max_output_tokens`
  - `temperature`（用途別推奨値）

3) **互換レイヤーがある場合の注意**
- 「`reasoningEffort/verbosity` は受け取っても無視される（deprecated）」を明記
- 将来復活させる場合は「モデル能力表/フラグ」で管理する、など運用ルールも記載

---

## 5. 再発防止策

1) **API送信ペイロードのホワイトリスト化（最重要）**
- “受け取れるオプション” と “送って良いパラメータ” を分離
- 送信直前に必ず `pick()` する（未知は落ちる）

2) **型で封じる**
- `unified-api.ts` の公開型から `reasoningEffort/verbosity` を削除
- 後方互換で残すなら `@deprecated` + `never` に寄せる（TSで利用時に警告/エラー）

3) **CIでのgrepガード**
- 例: `reasoningEffort:` や `verbosity:` が差分に入ったら落とす（allowlist例外はレビュー必須）
- ドキュメントも対象に含める（誤記再流入を防ぐ）

4) **モデル別機能フラグの導入（必要なら）**
- `modelCapabilities = { gpt52: { supportsVerbosity:false, supportsReasoningEffort:false } }`
- 新モデル追加時は必ずここを更新する運用にする

5) **コードレビュー手順**
- 「SDK/モデルの対応パラメータを根拠リンク付きで確認」チェック項目を追加
- “ドキュメントに書いてあるからOK”ではなく、**実際のAPIリファレンス/SDK型**を根拠にする

---

## 6. 結論

- 根本原因は「未サポートパラメータをAPIに送っていること」と「型・ドキュメントの誤誘導」です。
- 最短で確実な解決は、**`api/unified-api.ts` を中心に送信パラメータをホワイトリストで固定し、全呼び出し側から `reasoningEffort/verbosity` を削除**することです。
- 後方互換が必要なら「受け取るが送らない」互換レイヤーを一時的に入れ、段階的に撤去します。
- ドキュメント修正とCIガード（grep/静的検査）まで入れることで、同種の事故を再発しにくい構造にできます。

---

## 使用量


- Prompt Tokens: N/A
- Completion Tokens: N/A
- Total Tokens: N/A


---

**最終更新**: 2026-01-11T02:59:24.297Z
