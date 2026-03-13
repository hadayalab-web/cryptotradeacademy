# Stripe アカウント再開設・WarriorPlus 連携

**目的:** 新規で Stripe アカウントを作り直し、WarriorPlus の決済として使えるようにする。

---

## 1. アカウント作成時のポイント

### 個人で開設する場合
- **Stripe のサインアップ**で「個人」を選択。
- **事業内容**は「オンライン教育」「情報コンテンツの販売」「サブスクリプション」など、**投資助言・運用委託ではない**と分かる表現にする。
- 商品説明で「暗号資産のトレードシグナル」だけを前面に出さず、「市場分析・教育コンテンツの配信」のように**情報提供・教育**であることを示す（Disclaimer で投資助言ではないと明記している内容と一致させる）。

### 法人（AIO Media 等）で開設する場合
- 前回「ビジネスモデルが制限対象」とされたため、**事業の説明文**を「教育・情報コンテンツ」「投資助言・運用は行わない」と明確に書く。
- 必要なら Stripe の審査チームに、**追加情報を送って再審査**してもらう案内（前回メールの「返信で再審査」）を利用する。

### 共通で避けること
- 「投資助言」「資産運用」「トレード委託」といった表現は使わない。
- 規約・Disclaimer で「投資助言ではない」と書いているなら、その旨を Stripe の事業説明にも短く反映させる。

---

## 2. 開設後の基本設定

1. **ダッシュボード**で本人確認・口座情報を完了させる。
2. **受け取り可能な国・通貨**を確認（日本なら JPY / USD など）。
3. **テストモード**で一度「支払いを受け取る」テストをして、本番に切り替え。

---

## 3. WarriorPlus 用の権限（Permissions）

WarriorPlus から「Stripe account does not have valid permissions」と言われた場合、次を確認する。

1. **Stripe ダッシュボード**にログイン  
   https://dashboard.stripe.com

2. **アカウントの連携（Applications）**  
   - 案内メールのリンク: https://dashboard.stripe.com/account/applications  
   - または: ダッシュボード右上の **アカウント名** → **設定** などから「連携アプリ」「Applications」を開く。

3. **WarriorPlus に許可する権限**  
   - WarriorPlus が Stripe と「Connect」で連携する場合、**Stripe Connect** の許可や、**チャージ（決済）・出金**に必要な権限が付いているか確認する。  
   - 「〇〇 にアクセスを許可しますか」といった画面が出たら、**許可**する。

4. **再確認**  
   - WarriorPlus の **Account > Merchant Accounts** で Stripe を ON にし、表示や「権限を更新」ボタン（丸い矢印）で再度読み込む。

---

## 4. まだ「許可されていない」と言われる場合

- Stripe ダッシュボードの **ヘルプ / サポート** から「WarriorPlus 用に必要な権限」を問い合わせる。
- WarriorPlus サポート（チャット）で「Stripe のどの権限が不足しているか」を聞く。
- それでも解消しない場合は、**PayPal を Merchant に追加**して決済を PayPal に切り替える（既存の IPN / Webhook はそのまま利用可能）。

---

## 5. このリポジトリ側で必要な変更

- **なし。** 決済は WarriorPlus 経由のため、Stripe か PayPal かは WarriorPlus の設定のみ。  
- IPN は WarriorPlus から送られるので、**api/whop-webhook.js** の処理は変更不要。

---

※ Stripe の審査で再度「サポートできません」となった場合は、[WARRIORPLUS_APPROVAL_REPLY.md](./WARRIORPLUS_APPROVAL_REPLY.md) の流れのとおり、PayPal で運用を続ける。
