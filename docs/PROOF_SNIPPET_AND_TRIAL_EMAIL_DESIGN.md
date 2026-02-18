# proofSnippet LP/VSL 連携 と トライアル→本契約 初動メール 実装設計案

Gemini レビュー（LP/VSL の「証拠」と刈り取り）を踏まえた設計案。実装は別 PR で行う想定。

---

## Part 1: proofSnippet を LP/VSL の「証拠」に合わせて具体化する

### 1.1 現状

- **ファイル**: `services/td/pqtProofSnippet.js`
- **入力**: `snapshot`（getBtcSnapshot 形式）, `lang`, `slot`（任意）
- **出力**: 1〜2 行。`trap_score_label` / `funding_state` / `netflow_state` のうち最大2要素を並べるだけ。
- **例**: `Trap score: elevated. Funding: neutral.` のような断片的な羅列。

LP の「A Glimpse」や VSL の「Trap Score / Netflow / 構造の変わり目」と**同じ語彙・同じ意味の流れ**になっていない。

### 1.2 設計方針

1. **LP/VSL と語彙を揃える**
   - LP: "Trap Score", "Netflow", "Stop-loss bleeding stops", "one level to verify".
   - VSL: "Defense Protocol", "Doing nothing 70% of the time", "one clear level".
   - proofSnippet では「数値 or 状態」＋「だから何をすべきか」を 1 文にまとめる。

2. **snapshot の参照を統一**
   - Trap Score: `snapshot?.cqDeep?.trapScore ?? snapshot?.trapDetection?.trapScore ?? snapshot?.trap_score`。数値なら `XX/100` 表示、無ければ `trap_score_label` や "elevated" などのラベル。
   - Netflow: `snapshot?.cqDeep?.netflow ?? snapshot?.netflow_state ?? snapshot?.raw?.netflow`。 inflow/outflow/neutral など。
   - Funding: 現行どおり `funding_state` / `fundingRate`。

3. **言語別テンプレ（証拠＋アクション）**
   - 1 行目: Trap Score（と必要なら Netflow）を「証拠」として示す。
   - 2 行目（任意）: 「だから one level to verify / 損切り出血が止まる」に相当する短い行動ヒント。
   - リプライ全体が 280 字に収まるよう、proof 部分は**合計 80〜120 字程度**を目安にする。

### 1.3 文言案（EN / JA 例）

| 言語 | パターン | 例（Trap Score 47, Netflow: inflow） |
|------|----------|--------------------------------------|
| EN   | 証拠＋アクション | `Trap Score 47/100. Netflow: inflow. One level to verify before adding size.` |
| EN   | 証拠のみ（短い） | `Trap Score 47/100 → one level to verify.` |
| JA   | 証拠＋アクション | `トラップスコア 47/100。ネットフロー: 流入。サイズを足す前に確認したい1レベル。` |
| JA   | 証拠のみ（短い） | `トラップスコア 47/100 → 確認すべき1レベル。` |

LP の「Stop-loss bleeding stops」は、proofSnippet では「one level to verify」に寄せる（リプライは「これから見る人」向けなので、結果より「次のアクション」を強調）。

### 1.4 実装タスク（案）

| # | 内容 |
|---|------|
| 1 | `pqtProofSnippet.js` で snapshot から `trapScoreNum`, `netflowState`, `fundingState` を取得するヘルパーを用意（cqDeep / trapDetection / raw を順に参照）。 |
| 2 | 各言語用に「証拠1行」と「証拠＋アクション1行」の 2 パターンを `PHRASES_BY_LANG` に追加（既存の trap/funding/netflow は残して互換性を維持）。 |
| 3 | `buildProofSnippetFromSnapshot` の戻りを「最大2行・合計〜120字」に制限。パターンは `slot` や `snapshot` の有無で切り替え（例: trapScore が数値なら XX/100 表記、無ければラベルのみ）。 |
| 4 | 既存リプライテンプレで `proofSnippet` を挿入している箇所はそのまま利用（変更なし）。 |

### 1.5 注意点

- **権威性と短さの両立**: 「Trap Score XX/100」まで入れると「本物のデータ」感は出るが、長くなりすぎないよう 2 行目は省略可能にする。
- **フォールバック**: snapshot に trapScore も netflow も無い場合は、現行と同様に `"—"` や 1 行の汎用メッセージ（例: "One structure check before you add size."）にフォールバックする。

---

## Part 2: トライアル→本契約 初動メール設計

### 2.1 目的

- Whop で 1 日トライアルに申し込んだユーザーに、**初動のサンクス＋「Defense Protocol を発動する」** を伝える。
- トライアル期間中〜満了前に「次のアクション」を促し、本契約（継続）につなげる。

### 2.2 トリガー

| イベント | 送信タイミング | 想定メール種別 |
|----------|----------------|----------------|
| トライアル開始 | Whop Webhook `checkout.completed` または `membership.created`（trial 判定） | trial_started |
| トライアル終了 24h 前 | Whop のサブスク終了前リマインダーと連携、または Cron で「trial_end_at - 24h」のユーザーに送信 | trial_ending_soon（任意） |
| 本契約（初回課金 or 継続） | `checkout.completed` で trial でない / 継続課金 | converted_to_paid |

現状、`api/whop-webhook.js` は購入イベントの記録（KV・analytics）のみで、**メール送信は行っていない**。トリガーは Webhook の `type` と `data` から判定する。

### 2.3 メール種別と内容方針

| 種別 | 件名例（EN） | 本文の狙い |
|------|----------------|------------|
| **trial_started** | You're in — Activate your Defense Protocol | 感謝＋「次の一歩」：VSL またはダッシュボードへのリンク。「One level to verify before adding size」でリプ〜LP の流れを継続。 |
| **trial_ending_soon** | Your trial ends in 24h — Lock in DEFEND50 | 残り時間の明示＋クーポン（DEFEND50）＋契約継続リンク。 |
| **converted_to_paid** | Defense Protocol activated — Your first briefing | 感謝＋「プロトコル発動済み」＋初回ブリーフィング or ダッシュボードへのリンク。 |

- 文体: 短く、VSL/LP と同じ「Defense Protocol」「one level」「activate」を使う。
- 多言語: まず EN でテンプレを確定し、JA / ES / PT / AR / KO は同じ構成で文言だけ差し替え。

### 2.4 技術構成案

| 要素 | 内容 |
|------|------|
| **トリガー実装** | `api/whop-webhook.js` の `handlePurchaseEvent` 内（または直後）で、`event.type` と `data` から trial / paid を判定。該当する場合に `services/email/whopTriggeredEmails.js` を呼ぶ。 |
| **メール送信** | 既存の `services/email/resendClient.js` の `sendResendEmail` を使用。`messageType`: `WHOP_TRIAL_START` / `WHOP_TRIAL_ENDING` / `WHOP_CONVERTED` など。 |
| **テンプレ配置** | `services/email/messages/whop/` を新設。`trialStarted.en.js`, `trialEndingSoon.en.js`, `convertedToPaid.en.js`（各 export: subject, html または buildHtml(user, link)）。 |
| **言語** | ユーザーの locale や Whop の `user.locale` / 購入ページ言語が取れればそれを使用、無ければ `en`。 |
| **リンク** | trial_started: Whop ダッシュボード or Vidalytics の「最初の動画」URL。converted_to_paid: Regular Briefing ダッシュボード or 初回レポート URL。 |

### 2.5 trial_ending_soon について

- Whop が「サブスク終了 N 日前」の Webhook を送るかは要確認。送らない場合は、**Cron で「trial ユーザー一覧を取得し、終了 24h 前のユーザーに送信」** する必要がある。
- 初期実装では **trial_started と converted_to_paid の 2 種だけ** にし、trial_ending_soon は Whop API / 自前 DB の整備後に追加してもよい。

### 2.6 実装タスク（案）

| # | 内容 |
|---|------|
| 1 | Whop Webhook の payload から `trial` / `plan_id` / `user.email` / `user.locale` を取得するロジックを整理し、ドキュメント化（または whop-webhook.js にコメントで明記）。 |
| 2 | `services/email/whopTriggeredEmails.js` を新設。`sendTrialStartedEmail({ to, lang, dashboardUrl })`, `sendConvertedToPaidEmail({ to, lang, firstBriefingUrl })` を実装。内部で `messages/whop/*.js` を require し、`sendResendEmail` を呼ぶ。 |
| 3 | `services/email/messages/whop/trialStarted.en.js` と `convertedToPaid.en.js` を追加。件名・本文は上記方針で作成（HTML は `regular.en.js` のスタイルを流用可）。 |
| 4 | `api/whop-webhook.js` の `handlePurchaseEvent` 完了後に、イベント種別に応じて `sendTrialStartedEmail` または `sendConvertedToPaidEmail` を呼ぶ。エラー時はログのみ（Webhook の 200 は返す）。 |
| 5 | （任意）trial_ending_soon 用の Webhook または Cron ジョブとテンプレを後から追加。 |

### 2.7 運用上の注意

- **二重送信**: Webhook が重複して飛んだ場合、同一 `checkout.id` または `membership.id` で 24h 以内に送信済みなら送らない等の簡易重複防止を入れると安全。
- **配信失敗**: Resend のエラーはログに残し、必要なら Retry や Dead Letter を検討。Webhook の応答は 200 を返して Whop 側の再送を防ぐ。

---

## 参照

- proofSnippet 現行: `services/td/pqtProofSnippet.js`
- リプライでの使用: `services/td/buzzWeaveEngine.js`（buildProofSnippetFromSnapshot）, `pqtTemplates.js`（ctx.proofSnippet）
- LP/VSL レビュー: Gemini による「心理的一貫性」「A Glimpse」「Defense Protocol」の指摘
- メール送信: `services/email/resendClient.js`, `api/whop-webhook.js`
