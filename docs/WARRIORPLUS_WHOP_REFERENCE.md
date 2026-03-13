# WarriorPlus ↔ LP 構成メモ（参照用）

**秘密情報は Vercel 環境変数のみに保持し、このファイルには書かないこと。**

- **LP**: Carrd に統一済み。Whop 連携は廃止。

---

## 環境変数（Vercel に設定）

```
WARRIORPLUS_SECURITY_KEY=<Account > Security Key の値>
WARRIORPLUS_API_KEY=<任意・API 呼び出し用>
```

### 言語別マッピング（1導線＝1 WarriorPlus 商品）

| Lang | WP_ITEM_NUMBER | 環境変数 |
|------|----------------|----------|
| EN | wso_vqp3r4 | WARRIORPLUS_ITEM_NUMBER_wso_vqp3r4_WHOP_PLAN_ID |
| ES | wso_lxd2wq | WARRIORPLUS_ITEM_NUMBER_wso_lxd2wq_WHOP_PLAN_ID |
| PT | wso_dqz789 | WARRIORPLUS_ITEM_NUMBER_wso_dqz789_WHOP_PLAN_ID |
| AR | wso_zn9g7p | WARRIORPLUS_ITEM_NUMBER_wso_zn9g7p_WHOP_PLAN_ID |
| KO | wso_vm68d9 | WARRIORPLUS_ITEM_NUMBER_wso_vm68d9_WHOP_PLAN_ID |
| JA | wso_zv25jy | WARRIORPLUS_ITEM_NUMBER_wso_zv25jy_WHOP_PLAN_ID |

---

## URL 一覧

### Carrd LP（ボタンクリック → WarriorPlus 決済へ）

| Lang | Carrd LP |
|------|----------|
| EN | https://trapdefence-btc-en.carrd.co/ |
| ES | https://trapdefence-btc-es.carrd.co/ |
| PT | https://trapdefence-btc-pt.carrd.co/ |
| AR | https://trapdefence-btc-ar.carrd.co/ |
| KO | https://trapdefence-btc-ko.carrd.co/ |
| JA | https://trapdefence-btc-ja.carrd.co/ |

### WarriorPlus 購入リンク（1導線＝1リンク）

| Lang | Carrd LP | WarriorPlus Buy URL |
|------|----------|---------------------|
| EN | https://trapdefence-btc-en.carrd.co/ | https://warriorplus.com/o2/buy/spc506/njtfnb/vqp3r4 |
| ES | https://trapdefence-btc-es.carrd.co/ | https://warriorplus.com/o2/buy/spc506/njtfnb/lxd2wq |
| PT | https://trapdefence-btc-pt.carrd.co/ | https://warriorplus.com/o2/buy/spc506/njtfnb/dqz789 |
| AR | https://trapdefence-btc-ar.carrd.co/ | https://warriorplus.com/o2/buy/spc506/njtfnb/zn9g7p |
| KO | https://trapdefence-btc-ko.carrd.co/ | https://warriorplus.com/o2/buy/spc506/njtfnb/vm68d9 |
| JA | https://trapdefence-btc-ja.carrd.co/ | https://warriorplus.com/o2/buy/spc506/njtfnb/zv25jy |

### Webhook（WarriorPlus 側で設定）

- **Notification URL**: `https://cryptotradeacademy.vercel.app/api/warriorplus-webhook`（または現行の決済 Webhook URL）
- Whop Webhook は廃止済み

---

### Telegram 招待リンク（言語別・Vercel 環境変数）

決済後メールに載せる招待リンク。以下を Vercel の Environment Variables に設定すると、Bot API より優先して使用する。

| 変数名 | 値（例） |
|--------|----------|
| WARRIORPLUS_TG_INVITE_LINK_EN | https://t.me/+6qFItJj3pr5lYWZl |
| WARRIORPLUS_TG_INVITE_LINK_ES | https://t.me/+EdTPnKdS8LViYzI9 |
| WARRIORPLUS_TG_INVITE_LINK_PT_BR | https://t.me/+iR7jmYyISZdkODdl |
| WARRIORPLUS_TG_INVITE_LINK_AR | https://t.me/+wXYpJFqM-wk0ZjM1 |
| WARRIORPLUS_TG_INVITE_LINK_KO | https://t.me/+AKRDBgyH_f8wMTNl |
| WARRIORPLUS_TG_INVITE_LINK_JA | https://t.me/+qEgRBFjpKqVhY2U1 |

---

※ Security Key / API Key の実値は Vercel の Environment Variables のみに保存し、リポジトリにはコミットしないこと。
