# Whop クーポン自動補充機能 - 2026-01-21
**作成日時**: 2026-01-21  
**機能**: プロモコード在庫の自動補充

---

## 🎯 概要

プロモコードの在庫が少なくなったら、自動で在庫数を増やす機能を実装しました。

**主な機能**:
- 在庫が設定したしきい値以下になったら自動で在庫を補充
- 重複実行防止（KVストレージで履歴管理）
- 自動補充の実行結果をCEOレポートで通知
- エラー時もCEOレポートで通知

---

## ⚙️ 環境変数設定

### 必須設定

```bash
# Whop API Key（既に設定済み）
WHOP_API_KEY=apik_6Ql14WHRU0Sje_C3791174_C_cb45d64f7f618e1c592233edf2cf04ba11ff7d7e5cede362db19089df8a7a6

# プロモコードID（既に設定済み）
WHOP_PROMO_CODE_ID=promo_5iQP2R6hGTVq
```

### 自動補充設定（新規追加）

```bash
# 自動補充の有効/無効（デフォルト: false）
WHOP_AUTO_RESTOCK_ENABLED=true

# 自動補充のしきい値（デフォルト: 20）
# 在庫がこの値以下になったら自動補充を実行
WHOP_AUTO_RESTOCK_THRESHOLD=20

# 自動補充の目標在庫数（デフォルト: 200）
# 自動補充時にこの値まで在庫を増やす
WHOP_AUTO_RESTOCK_TARGET=200
```

---

## 🚀 動作仕様

### 自動補充の実行条件

1. **`WHOP_AUTO_RESTOCK_ENABLED=true`** が設定されている
2. **在庫数が `WHOP_AUTO_RESTOCK_THRESHOLD` 以下** になった
3. **同じ在庫数での自動補充が未実行**（重複実行防止）

### 自動補充の実行フロー

```
1. 在庫数を取得
   ↓
2. 在庫数がしきい値以下かチェック
   ↓
3. 既に自動補充済みかチェック（KVストレージ）
   ↓
4. Whop APIで在庫を更新（stock → AUTO_RESTOCK_TARGET）
   ↓
5. 自動補充の実行履歴を記録（KVストレージ）
   ↓
6. CEOレポートで自動補充の結果を通知
```

### 重複実行防止

- **KVストレージキー**: `promo_auto_restock_{PROMO_CODE_ID}_{currentStock}`
- **記録内容**: `{restockedAt, fromStock, toStock}`
- **効果**: 同じ在庫数での自動補充は1回のみ実行

---

## 📊 推奨設定値

### 48時間予測に基づく推奨設定

**保守的予測（100成約予測）**:
```bash
WHOP_AUTO_RESTOCK_ENABLED=true
WHOP_AUTO_RESTOCK_THRESHOLD=20
WHOP_AUTO_RESTOCK_TARGET=100
```

**平均予測（150成約予測）**:
```bash
WHOP_AUTO_RESTOCK_ENABLED=true
WHOP_AUTO_RESTOCK_THRESHOLD=20
WHOP_AUTO_RESTOCK_TARGET=150
```

**楽観的予測（225成約予測）**:
```bash
WHOP_AUTO_RESTOCK_ENABLED=true
WHOP_AUTO_RESTOCK_THRESHOLD=20
WHOP_AUTO_RESTOCK_TARGET=200
```

### 週次予測に基づく推奨設定

**保守的予測（350成約予測）**:
```bash
WHOP_AUTO_RESTOCK_ENABLED=true
WHOP_AUTO_RESTOCK_THRESHOLD=50
WHOP_AUTO_RESTOCK_TARGET=350
```

**平均予測（420成約予測）**:
```bash
WHOP_AUTO_RESTOCK_ENABLED=true
WHOP_AUTO_RESTOCK_THRESHOLD=50
WHOP_AUTO_RESTOCK_TARGET=420
```

**楽観的予測（630成約予測）**:
```bash
WHOP_AUTO_RESTOCK_ENABLED=true
WHOP_AUTO_RESTOCK_THRESHOLD=50
WHOP_AUTO_RESTOCK_TARGET=630
```

---

## 📧 CEOレポート

### 自動補充成功時

**ステータス**: `SUCCESS`

**内容**:
- Promo Code: `DEFEND50`
- Auto Restock: `EXECUTED`
- From Stock: `20` → To Stock: `200`

**メッセージ**:
```
✅ Auto restock executed: Promo code "DEFEND50" stock increased from 20 to 200.
Threshold: 20, Target: 200
```

### 自動補充失敗時

**ステータス**: `ERROR`

**内容**:
- Promo Code: `DEFEND50`
- Auto Restock: `FAILED`
- Current Stock: `20`
- Error: `[エラーメッセージ]`

**メッセージ**:
```
❌ Auto restock failed: Promo code "DEFEND50" stock update failed.
Current stock: 20, Target: 200
Error: [エラーメッセージ]
Action: Please manually increase stock in Whop Dashboard.
```

---

## 🔍 ログ出力

### 自動補充実行時

```
[PromoMonitor] 🤖 Auto restocking: 20 → 200
[PromoMonitor] ✅ Auto restock successful: 20 → 200
[PromoMonitor] Marked auto restock: 20 → 200
```

### 自動補充スキップ時

```
[PromoMonitor] Auto restock already executed for stock 20, skipping
```

### 自動補充失敗時

```
[PromoMonitor] ❌ Auto restock failed: [エラーメッセージ]
```

---

## ⚠️ 注意事項

### 1. 自動補充の有効化

- **デフォルト**: `WHOP_AUTO_RESTOCK_ENABLED=false`（無効）
- **有効化**: Vercel環境変数で `WHOP_AUTO_RESTOCK_ENABLED=true` を設定

### 2. 重複実行防止

- 同じ在庫数での自動補充は1回のみ実行
- 在庫が減って再度しきい値以下になった場合は、新しい在庫数で再度自動補充可能

### 3. エラー時の対応

- 自動補充が失敗した場合は、CEOレポートで通知
- 手動でWhop Dashboardから在庫を増やす必要がある

### 4. API制限

- Whop APIのレート制限に注意
- 15分ごとのCron実行なので、通常は問題なし

---

## 🎯 期待される効果

### 1. 在庫切れの防止

- 在庫が少なくなったら自動で補充
- 収益機会の損失を防ぐ

### 2. 運用の自動化

- 手動での在庫管理が不要
- CEOレポートで自動補充の状況を把握可能

### 3. CVRの維持

- リードが購入できる状態を維持
- 在庫切れによる離脱を防ぐ

---

## 📝 実装ファイル

- `services/whop/promo-monitor.js`: 自動補充ロジックの実装
- `services/whop/client.js`: Whop APIクライアント（`updatePromoCode`関数）
- `api/promo-stock-monitor.js`: Vercel Cronエンドポイント（15分ごと実行）

---

## 🚀 次のステップ

1. **環境変数の設定**: Vercel Dashboardで `WHOP_AUTO_RESTOCK_ENABLED=true` を設定
2. **しきい値と目標在庫数の設定**: 予測に基づいて適切な値を設定
3. **動作確認**: 15分ごとのCron実行で自動補充が動作するか確認
4. **CEOレポートの確認**: 自動補充の実行結果を確認

---

## 💡 結論

**自動補充機能により、在庫管理が完全に自動化されました！**

- ✅ 在庫が少なくなったら自動で補充
- ✅ 重複実行防止で安全に運用
- ✅ CEOレポートで状況を把握可能
- ✅ エラー時も適切に通知

これにより、**在庫切れによる機会損失を防ぎ、収益を最大化**できます。
