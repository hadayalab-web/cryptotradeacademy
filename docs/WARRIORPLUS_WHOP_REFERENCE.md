# WarriorPlus ↔ Whop 構成メモ（参照用）

**秘密情報は Vercel 環境変数のみに保持し、このファイルには書かないこと。**

---

## 環境変数（Vercel に設定）

```
WARRIORPLUS_SECURITY_KEY=<Account > Security Key の値>
WARRIORPLUS_API_KEY=<任意・API 呼び出し用>
```

### 言語別マッピング（Item Number → Whop Plan ID）

| Lang | WP_ITEM_NUMBER | 環境変数 | Whop Plan ID |
|------|----------------|----------|--------------|
| EN | wso_vqp3r4 | WARRIORPLUS_ITEM_NUMBER_wso_vqp3r4_WHOP_PLAN_ID | plan_olVeC5G1xFCdr |
| ES | wso_lxd2wq | WARRIORPLUS_ITEM_NUMBER_wso_lxd2wq_WHOP_PLAN_ID | plan_6TmiQiiBSRmQJ |
| PT | wso_dqz789 | WARRIORPLUS_ITEM_NUMBER_wso_dqz789_WHOP_PLAN_ID | plan_QNZ4sduF22Dvf |
| AR | wso_zn9g7p | WARRIORPLUS_ITEM_NUMBER_wso_zn9g7p_WHOP_PLAN_ID | plan_OEzHaVG2NDANY |
| KO | wso_vm68d9 | WARRIORPLUS_ITEM_NUMBER_wso_vm68d9_WHOP_PLAN_ID | plan_rMXTaSJ43z61d |
| JA | wso_zv25jy | WARRIORPLUS_ITEM_NUMBER_wso_zv25jy_WHOP_PLAN_ID | plan_EOpVbfNgJxoQr |

---

## URL 一覧

### Whop LP（ボタンクリック → WarriorPlus へリダイレクト）

| Lang | Whop LP |
|------|---------|
| EN | https://whop.com/trapdefence/btc-en-warriorplus/ |
| ES | https://whop.com/trapdefence/btc-es-warriorplus/ |
| PT | https://whop.com/trapdefence/btc-pt-warriorplus/ |
| AR | https://whop.com/trapdefence/btc-ar-warriorplus/ |
| KO | https://whop.com/trapdefence/btc-ko-warriorplus/ |
| JA | https://whop.com/trapdefence/btc-ja-warriorplus/ |

### WarriorPlus 購入リンク

| Lang | WarriorPlus Buy URL |
|------|---------------------|
| EN | https://warriorplus.com/o2/buy/spc506/njtfnb/vqp3r4 |
| ES | https://warriorplus.com/o2/buy/c37794/gcnzkr/lxd2wq |
| PT | https://warriorplus.com/o2/buy/m3jwnl/qb6408/dqz789 |
| AR | https://warriorplus.com/o2/buy/jzk9wx/qt3833/zn9g7p |
| KO | https://warriorplus.com/o2/buy/b14qfw/fbx1hs/vm68d9 |
| JA | https://warriorplus.com/o2/buy/jwsrsj/r4bjnk/zv25jy |

### Webhook（WarriorPlus 側で設定）

- **Notification URL**: `https://cryptotradeacademy.vercel.app/api/whop-webhook`
- **Key Generation URL**: `https://cryptotradeacademy.vercel.app/api/whop-webhook?output=text`

---

※ Security Key / API Key の実値は Vercel の Environment Variables のみに保存し、リポジトリにはコミットしないこと。
