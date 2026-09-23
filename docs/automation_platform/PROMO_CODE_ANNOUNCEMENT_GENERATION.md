# プロモコード残り枠アナウンス自動生成

**作成日時**: 2026-01-14  
**目的**: Whopプロモコードの残り枠に基づいて緊急性の高いアナウンスを自動生成

---

## 🎯 機能概要

50名限定のプロモコード（DEFEND50）の残り枠をAPIで取得し、「あと何名！お早めに！」のような緊急性の高いメッセージを自動生成します。

---

## 📋 使用方法

### 基本的な使用方法

```bash
# DEFEND50の残り枠を確認してメッセージを生成（デフォルト）
npx tsx scripts/generate-promo-code-announcement.ts

# 他のプロモコードを指定
npx tsx scripts/generate-promo-code-announcement.ts --code=YOUR_CODE

# 短縮版メッセージを生成（緊急告知用）
npx tsx scripts/generate-promo-code-announcement.ts --format=short

# Whop URLを指定
npx tsx scripts/generate-promo-code-announcement.ts --url=https://whop.com/your-product/

# VSL URLを指定
npx tsx scripts/generate-promo-code-announcement.ts --vsl=https://youtu.be/your-video
```

---

## 🎨 緊急性レベルとメッセージ

### 残り枠に応じた自動メッセージ生成

| 残り枠 | 緊急性レベル | メッセージ | 絵文字 |
|--------|------------|-----------|--------|
| 1-5名 | Critical | 🚨 残りX名！今すぐ！ | 🚨 |
| 6-10名 | Critical | ⚠️ 残りX名！最後のチャンス！ | ⚠️ |
| 11-25名 | High | ⚡ 残りX名！お早めに！ | ⚡ |
| 26-40名 | Medium | 🎯 残りX名！今すぐ参加 | 🎯 |
| 41-50名 | Low | 🎁 先着50名限定！今すぐ参加 | 🎁 |

---

## 📱 生成されるメッセージ例

### フル版メッセージ（デフォルト）

```
⚡ 残り15名！お早めに！

🎬 Two Young Men Story

昨夜、2人の若者がいました。
1人は、Whale Trapですべてを失いました。
もう1人は、コーヒーを飲みながら、$5,000の利益を出しました。

違いは運ではありませんでした。
それは「ディフェンダー」になることでした。

🛡️ Trap Defence BTCは、4つのAIエンジンが連携:
• CryptoQuant AI: クジラの動きを監視
• Grok AI: リアルタイムセンチメント分析
• GPT Logic: FOMOを排除するメンタルトレーニング
• Gemini Engine: 3秒で判断できるダッシュボード

📊 Trap Score（0-100）で、機関投資家の罠を可視化。
70%の時間は待機、90%の確信がある時だけ動く。

🎁 Defender's Protocol Campaign
先着50名限定、すべて50%OFF！

• 月額プラン: $34.50（通常$69）
• 年間プラン: $294（1日あたり$1以下）

⚡ 残り15名！お早めに！

🎥 このVSLで詳細を確認:
https://youtu.be/6Z7AfE9FSy4

👆 Telegram Botに参加（ワンクリック）:
@TrapDefenceBot /start minimal

または、Whopで直接確認（コード: DEFEND50）:
https://whop.com/aio-media-llc/trap-defence-btc-en/

#Bitcoin #CryptoTrading #TrapDefence #FreeSignals #DEFEND50
```

### 短縮版メッセージ（緊急告知用）

```
⚠️ 残り8名！最後のチャンス！

50%OFFクーポン『DEFEND50』が消滅間近。
今すぐ防御プロトコルを起動してください。

https://whop.com/aio-media-llc/trap-defence-btc-en/?coupon=DEFEND50

#DEFEND50 #TrapDefence
```

---

## 🔄 自動化の推奨事項

### 1. 定期実行（Cron Job）

```bash
# 1時間ごとに残り枠を確認してメッセージを生成
0 * * * * cd /path/to/project && npx tsx scripts/generate-promo-code-announcement.ts --format=short > /tmp/promo-announcement.txt
```

### 2. 緊急時の自動投稿

残り枠が10名以下になったら自動的にTelegram/Xに投稿するワークフローを設定：

```typescript
// 例: n8nワークフローやGitHub Actionsで実装
const remainingUses = await getWhopPromoCodeByCode('DEFEND50');
if (remainingUses.remainingUses <= 10) {
  // Telegram/Xに緊急告知を投稿
  await postToTelegram(generateShortUrgencyMessage(...));
}
```

### 3. 推奨投稿タイミング

- **残り40-50名**: 通常の投稿頻度（1日1-2回）
- **残り25-40名**: 頻繁に投稿（1日2-3回）
- **残り10-25名**: 緊急性を強調（1日3-4回）
- **残り5-10名**: 緊急告知（1時間ごと）
- **残り1-5名**: 最優先告知（30分ごと）

---

## 📊 出力情報

スクリプトは以下の情報を出力します：

1. **プロモコード情報**
   - コード名
   - ステータス
   - 総在庫
   - 使用済み
   - 残り枠
   - 残り割合（%）

2. **緊急性評価**
   - 緊急性レベル（low/medium/high/critical）
   - 緊急性メッセージ

3. **投稿用メッセージ**
   - フル版または短縮版

4. **推奨事項**
   - 投稿頻度の推奨
   - 緊急性に応じたアクション

---

## 🔗 関連ドキュメント

- **プロモコード残り枠確認**: `scripts/check-promo-code-remaining.ts`
- **プロモコード一覧取得**: `scripts/get-whop-promo-codes.ts`
- **限定クーポンキャンペーン戦略**: `docs/LIMITED_COUPON_CAMPAIGN.md`
- **TG/X投稿スクリプト**: `docs/TG_X_POSTING_SCRIPT_MINIMUM_OPTIN.md`

---

## 💡 使用例

### 例1: 残り枠を確認してメッセージを生成

```bash
npx tsx scripts/generate-promo-code-announcement.ts
```

### 例2: 短縮版メッセージを生成してTelegramに投稿

```bash
npx tsx scripts/generate-promo-code-announcement.ts --format=short > message.txt
# その後、Telegram Bot APIで投稿
```

### 例3: カスタムURLでメッセージを生成

```bash
npx tsx scripts/generate-promo-code-announcement.ts \
  --code=DEFEND50 \
  --url=https://whop.com/aio-media-llc/trap-defence-btc-en/ \
  --vsl=https://youtu.be/6Z7AfE9FSy4
```

---

**作成日時**: 2026-01-14  
**報告者**: COO（Cursor/Composer 1）
