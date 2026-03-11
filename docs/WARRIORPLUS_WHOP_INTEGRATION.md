# WarriorPlus → Whop 連携（IPN / KeyGen）

**目的**: WarriorPlus の成約イベント（IPN）を受け取り、Whop 側の導線（チェックアウト/登録URL）を自動生成して購入者に渡せるようにする。

**別案**: Whop を **LP のみ**（ボタンクリック → WarriorPlus 決済へ片道リダイレクト）とし、決済後の付与は Resend で TG 招待リンクを送る構成も可能。→ **`docs/WARRIORPLUS_RESEND_TG_FLOW.md`**

このリポジトリでは、エンドポイントとして `https://cryptotradeacademy.vercel.app/api/whop-webhook` を **Whop Webhook と共用**し、以下の条件で分岐します。

- **Whop → 本アプリ**: `Content-Type: application/json`（既存）
- **WarriorPlus → 本アプリ**: `Content-Type: application/x-www-form-urlencoded` かつ `WP_ACTION` を含む（本ドキュメント）

---

## 1. WarriorPlus 側の設定

WarriorPlus の Product → **Custom Integration (advanced)** で設定します（添付スクショの画面）。

- **Notification URL**: `https://cryptotradeacademy.vercel.app/api/whop-webhook`
- **Key Generation URL（推奨）**:  
  `https://cryptotradeacademy.vercel.app/api/whop-webhook?output=text`

### 1.1 `WP_SECURITYKEY` の有効化（推奨）

WarriorPlus のアカウント設定で **Security Key** を設定すると、IPNに `WP_SECURITYKEY` が付与されます。  
本アプリ側でも `WARRIORPLUS_SECURITY_KEY` を環境変数で一致させることで、偽装IPNを弾けます。

本番では **Security Key が一致する IPN のみ** 受理します。Send Test はキーを送らないため 401 になります。実購入時の IPN で検証してください。

---

## 2. Vercel（本番）環境変数

最低限これを設定してください。

| 変数名 | 説明 |
|---|---|
| `WHOP_API_KEY` | Whop API Key（Checkout Session作成で使用） |
| `WARRIORPLUS_SECURITY_KEY` | WarriorPlus の Security Key（設定した場合） |

### 2.1 WarriorPlus 商品 → Whop Plan のマッピング（必須）

WarriorPlus の IPN には `WP_ITEM_NUMBER` / `WP_ITEM_NAME` が来ます。これを Whop の `plan_id` に変換する必要があります。

いずれかの方法で設定してください。

#### 方法A（推奨）: item number 直指定

`WARRIORPLUS_ITEM_NUMBER_<WP_ITEM_NUMBER>_WHOP_PLAN_ID=plan_xxx`

例:

- `WARRIORPLUS_ITEM_NUMBER_123456_WHOP_PLAN_ID=plan_abc123`

#### 方法B: item name 直指定（自動スラッグ化）

`WP_ITEM_NAME` を大文字化し、英数字以外を `_` にしたキーで指定できます。

`WARRIORPLUS_ITEM_NAME_<SLUG>_WHOP_PLAN_ID=plan_xxx`

例: `WP_ITEM_NAME="Crypto Trade Academy - Monthly"`

- `SLUG=CRYPTO_TRADE_ACADEMY_MONTHLY`
- `WARRIORPLUS_ITEM_NAME_CRYPTO_TRADE_ACADEMY_MONTHLY_WHOP_PLAN_ID=plan_abc123`

#### 方法C: JSONでまとめて指定

`WARRIORPLUS_ITEM_TO_WHOP_PLAN_ID_JSON` にJSONを設定します（キーは `WP_ITEM_NUMBER` または `WP_ITEM_NAME`）。

例:

```json
{
  "123456": "plan_abc123",
  "Crypto Trade Academy - Monthly": "plan_abc123"
}
```

---

## 3. 受信イベントの扱い（現状の仕様）

WarriorPlus IPN の `WP_ACTION` を見て処理します。

### 3.1 アクセス付与系

`sale`, `subscr_created`, `subscr_completed`, `subscr_reactivated` の場合:

1. **B案（直接権限付与）**: `WARRIORPLUS_USE_DIRECT_GRANT=1` かつ `WHOP_COMPANY_ID` が設定されている場合、Whop API の `POST /memberships` を試行。成功すれば即座に membership 付与。
2. **A案（フォールバック）**: B案が失敗または未設定の場合、Whop の **Checkout Session** を作成し、URL（`purchase_url`）を返す。  
   **※ plan_id は必ず $0 プランを指定すること。有料プランだと二重決済になる。**

`?output=text` の場合は **URLだけをプレーンテキストで返す**（KeyGen表示向け）。

### 3.2 アクセス剥奪系

`refund`, `dispute`, `subscr_cancelled`, `subscr_refunded`, `subscr_suspended`, `subscr_ended`, `subscr_failed_invalid`, `subscr_failed_declined` の場合:

- Whopの既存 membership を `buyerEmail + plan_id` で探索し、見つかれば `terminate`（または `cancel`）します

### 3.3 剥奪モード

環境変数 `WARRIORPLUS_REVOKE_MODE`:

- `terminate`（デフォルト）: `terminateMembership`
- `cancel`: `cancelMembership`（immediate）

※ Whop側に該当 membership が存在しない場合はログのみです。

### 3.4 解約〜TGキックまでの流れ（自動追放）

1. **Stripe で解約 or 支払失敗** → ユーザーが解約するか、カード残高不足等で決済失敗。
2. **WarriorPlus が検知** → 上記の剥奪系 `WP_ACTION` の IPN を Vercel へ送信。
3. **Vercel → Whop** → 当該 `buyerEmail` + `plan_id` の membership を `terminate` / `cancel`。
4. **Whop → TG** → Membership 終了に連動し、Whop Bot が Telegram から該当ユーザーをキック。

「払わなくなった人は自動で消える」状態になっています。

### 3.5 猶予期間（Grace Period）について

**現状**: IPN を受信した時点で **即座に** Whop membership を revoke しています。

**推奨**: カード期限切れなど「意図しない解約」を防ぐ **猶予（リトライ期間）** は、**Stripe / WarriorPlus 側の「支払いリトライ設定」** で持たせるのが一般的です。

- **Stripe**: ダッシュボードの「Settings → Billing → Subscriptions and emails」などで、失敗時の再試行回数・期間（例: 3日間・数回）を設定可能。リトライし尽くしたあとで初めてサブスクがキャンセルされ、そのタイミングで WarriorPlus から IPN が飛びます。
- **WarriorPlus**: 利用している決済（Stripe）のサブスク設定に従うため、上記 Stripe の猶予を有効にしておけば、**「即キック」ではなく「リトライ尽きた後のキック」** になります。

当方コード側で「IPN 受信から N 日後に revoke」する遅延処理を入れることも可能ですが、運用の単純さ・監査のしやすさの点から、まずは **決済側のリトライ期間の設定** で対応することを推奨します。

### 3.6 メール照合バリデーション（未決済アクセス防止）

Whop のチェックアウトで入力されたメールと、WarriorPlus IPN の購入者メール（`WP_BUYER_EMAIL`）が一致するかどうかを自動照合しています。

- **IPN 受信時（付与系）**: 0円チェックアウトURLを返す直前に、`plan_id` と `buyerEmail` を KV に「許可リスト」として登録（キー: `warriorplus:allowed:{planId}:{正規化メール}`、TTL 1時間）。
- **Whop Webhook 受信時**（`membership.created` / `membership.activated`）: 対象が WarriorPlus 用 0円プラン（環境変数で解決した plan_id 一覧）の場合、イベント内のユーザーメールで上記許可リストを照合。
  - **一致しない場合**: 当該 membership を `terminateMembership` し、200 を返して処理終了（未決済の不正アクセスを防止）。
  - **一致した場合**: 許可キーを削除（1回限り使用）、同一 membership の続きイベント用に「検証済み」を短時間 KV に記録し、通常の `handlePurchaseEvent` へ進む。

これにより「決済していない人が別メールで Whop を完了してメールを受け取る」リスクを防ぎます。

---

## 4. 疎通テスト（手元）

WarriorPlus からは form-urlencoded が来るため、以下で近い形を叩けます。

```powershell
curl -X POST "https://cryptotradeacademy.vercel.app/api/whop-webhook?output=text" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "WP_ACTION=sale&IPN_ID=ipn_test_1&WP_ITEM_NUMBER=123456&WP_ITEM_NAME=Test&WP_BUYER_EMAIL=test@example.com&WP_SECURITYKEY=YOUR_KEY"
```

期待:

- `200 OK`
- body に Whop のURL（または JSON）が返る

**決済完了後のフロー（メール受信 → TG 参加）をテストする場合** は、**`docs/WARRIORPLUS_DELIVERY_TEST.md`** を参照してください。擬似 IPN（curl）でメール〜TG まで検証する手順と、本番購入での確認手順をまとめています。

---

## 5. 環境変数テンプレート

詳細は **`docs/WARRIORPLUS_ENV_TEMPLATE.md`** を参照。  
`WP_ITEM_NUMBER` の取得方法と、Vercel に追加すべき変数の一覧を記載しています。

---

## 6. 注意点（重要）

- **二重決済防止**: `WARRIORPLUS_ITEM_NUMBER_XXX_WHOP_PLAN_ID` には **必ず $0 プラン**（Whop で initial_price: 0 のプラン）を指定してください。有料プランを指定すると、WarriorPlus で決済した後に Whop でも課金画面が表示されます。
- **B案（直接権限付与）**: Whop API の `POST /memberships` は現行仕様では公開されていない可能性が高く、`WARRIORPLUS_USE_DIRECT_GRANT=1` にしても 404 等で失敗し、A案にフォールバックします。将来 Whop が対応 API を提供した場合は、そのまま有効化できます。
- **メール照合**: Whop で入力されたメールと WarriorPlus IPN の購入者メールが一致しない場合、その membership は自動で terminate されます（3.6 参照）。

