# Regular Briefing 推奨改善一覧

## 実施済み

- **心理ブロック文言の切れ止め**: `regular.en.js` でアドバイス行を最大 150 文字に打ち切り（`…` 付き）。Telegram で「Th…」で切れる問題を防止。
- **X Sentiment の明文化**: 「Data missing」の横に「(no live X feed; interpretation only)」を追加。解釈であることを明示。

## 未実施（今後のタスク）

- **CTA を Signal に紐づける**: 「Change the trend. Change your game. Get the edge.」を、その日の Signal（NONE / STANDBY 等）や Dr. Grok の Mental Note に合わせて 1 行だけ変える（例: 今日が NONE なら「Today’s edge: Sit tight.」）。テンプレに `{{signal_based_cta}}` を差し込む形で実装可。
- **Snapshot の重複削減**: 上部 Key Metrics と下部 Snapshot で価格・Netflow・MPI・Sentiment・Trap Score が二重。Snapshot を「要約 3 点」など別フォーマットにするか、数値は上部に一元化する。
- **3AI の役割を明文化**: `docs/REGULAR_3AI_ROLES.md` を参照。

---

## 末尾「I'm Safe (Trap Avoided)」の有効活用

### 現状

- Regular / Minimal 配信の末尾に **inline ボタン**「🔥 I'm Safe (Trap Avoided)」を表示。
- タップで `callback_data: "action_saved"` が送られ、`bot-commands.js` で:
  - `incrementSavedCount(userId)` でカウント
  - `answerCallbackQuery` でポップアップ「🔥 Defense Confirmed! (Today: N protected)」または「You've already confirmed today!」

### 有効活用の案

1. **2 ボタン構成にする**  
   - 1 つ目: 現状どおり「🔥 I'm Safe (Trap Avoided)」→ `action_saved`（カウント＋ポップアップ）。  
   - 2 つ目: 「Get the edge →」など、**URL ボタン**で Whop や LP へ誘導。タップ＝コンバージョン候補として計測しやすい。

2. **タップ後にフォローアップメッセージを 1 通送る**  
   - `action_saved` 処理のあと、`query.message.chat.id` に短いテキストを送る。  
   - 例: 「Next briefing in 6h. Stay safe.」や「Get the full edge: [link]」。  
   - 初回タップ時のみ、または 1 日 1 回までにするとスパム感を抑えられる。

3. **カウントを分析に使う**  
   - 既に `incrementSavedCount` で「今日 N 人 protected」を記録しているなら、ダッシュボードやレポートで「I'm Safe タップ数」を Regular 配信のエンゲージメント指標として表示する。

**実施済み**: Regular / Minimal ともに **2 ボタン**に変更。1 つ目「I'm Safe」→ `action_saved`（カウント＋ポップアップ）、2 つ目「Get the edge →」/「Free: Get the edge →」→ 言語別 Whop URL（Regular は有料、Minimal は無料チェックアウト）。タップで CTA 誘導可能。

今後の案: (2) フォローアップ 1 通（必要なら）、(3) 分析表示。
