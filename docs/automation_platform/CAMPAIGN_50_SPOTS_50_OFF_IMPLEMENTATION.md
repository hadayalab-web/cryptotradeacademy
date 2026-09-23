# 50枠限定×50%オフキャンペーン実装ガイド

## 📋 概要

無料版ユーザーに対して「残りあと○○枠」を告知する50枠限定×50%オフキャンペーンをぐるぐる回す仕組みを実装します。

## 🎯 キャンペーン仕様

### 基本仕様
- **キャンペーン名**: 50枠限定×50%オフ
- **対象**: 無料版ユーザー
- **割引率**: 50%オフ
- **限定枠数**: 50枠
- **告知方法**: 無料版ユーザーへのメッセージ/メール

### キャンペーンの循環ロジック
1. 50枠が埋まる
2. 新しい50枠を開始
3. 無料版ユーザーに「残りあと○○枠」を告知
4. 繰り返し

## 🔧 実装内容

### 1. キャンペーン管理システム

#### データ構造
```typescript
interface Campaign {
  id: string;
  name: string;
  discountRate: number; // 50 = 50%オフ
  totalSpots: number; // 50
  usedSpots: number; // 使用済み枠数
  remainingSpots: number; // 残り枠数
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'paused';
  promoCode: string; // プロモコード
  markets: MarketCode[]; // 対象市場
}

interface CampaignUsage {
  campaignId: string;
  userId: string;
  market: MarketCode;
  usedAt: Date;
  orderId?: string;
}
```

#### ファイル構造
```
data/
  campaigns/
    active-campaigns.json      # アクティブなキャンペーン一覧
    campaign-history.json       # キャンペーン履歴
    campaign-usage.json        # キャンペーン使用履歴
```

### 2. 残り枠計算ロジック

```typescript
// 残り枠数を計算
function calculateRemainingSpots(campaign: Campaign): number {
  return Math.max(0, campaign.totalSpots - campaign.usedSpots);
}

// キャンペーンが満杯かチェック
function isCampaignFull(campaign: Campaign): boolean {
  return campaign.usedSpots >= campaign.totalSpots;
}

// 新しいキャンペーンを開始
function startNewCampaign(markets: MarketCode[]): Campaign {
  const promoCode = generatePromoCode();
  return {
    id: generateCampaignId(),
    name: `50枠限定×50%オフ - ${new Date().toISOString()}`,
    discountRate: 50,
    totalSpots: 50,
    usedSpots: 0,
    remainingSpots: 50,
    startDate: new Date(),
    status: 'active',
    promoCode,
    markets,
  };
}
```

### 3. 無料版ユーザーへの告知機能

#### 告知タイミング
- 無料版オプトイン後24時間
- 無料版利用中（毎日1回、残り枠が10枠以下になったら）
- VSL2送信時（プロモコード告知）

#### 告知メッセージテンプレート

**EN版**:
```
⏰ Limited Time Offer - Only {{remaining_spots}} spots left at 50% OFF!

As a free version user, you get exclusive access to our limited-time promotion.

PROMO CODE: {{promo_code}}

Use your promo code at checkout: {{whop_url}}?promo={{promo_code}}
```

**JA版**:
```
⏰ 限定タイムオファー - 50%オフは残り{{remaining_spots}}枠のみ！

無料版ユーザーとして、限定タイムプロモーションへの特別アクセス権があります。

プロモコード: {{promo_code}}

チェックアウトでプロモコードを使用: {{whop_url}}?promo={{promo_code}}
```

### 4. キャンペーン自動循環システム

```typescript
// キャンペーン監視と自動循環
async function monitorAndRotateCampaigns() {
  const activeCampaigns = await getActiveCampaigns();
  
  for (const campaign of activeCampaigns) {
    // キャンペーンが満杯かチェック
    if (isCampaignFull(campaign)) {
      // キャンペーンを完了状態に
      await completeCampaign(campaign);
      
      // 新しいキャンペーンを開始
      const newCampaign = startNewCampaign(campaign.markets);
      await saveCampaign(newCampaign);
      
      // 無料版ユーザーに新しいキャンペーンを告知
      await notifyFreeUsersAboutNewCampaign(newCampaign);
    } else {
      // 残り枠が少ない場合（10枠以下）に告知
      if (calculateRemainingSpots(campaign) <= 10) {
        await notifyFreeUsersAboutLowSpots(campaign);
      }
    }
  }
}

// 定期実行（1時間ごと）
setInterval(monitorAndRotateCampaigns, 60 * 60 * 1000);
```

### 5. Whop統合

#### プロモコード適用
- Whopのプロモコード機能を使用
- プロモコードは各キャンペーンごとに生成
- プロモコードは50%オフを適用

#### プロモコード生成
```typescript
function generatePromoCode(): string {
  const prefix = 'SPOT50';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
}
```

### 6. 無料版ユーザー管理

#### 無料版ユーザーリスト
- `data/free-users.json`に保存
- 各ユーザーのオプトイン日時を記録
- 告知送信履歴を記録

#### 告知送信ロジック
```typescript
async function notifyFreeUsersAboutCampaign(
  campaign: Campaign,
  market: MarketCode
) {
  const freeUsers = await getFreeUsers(market);
  const vslSequence = await getVSLSequence(market);
  
  for (const user of freeUsers) {
    // 告知メッセージを送信
    await sendCampaignNotification(user, campaign, vslSequence.phases[1]);
  }
}
```

## 📊 モニタリング

### 追跡指標
- キャンペーン使用数
- 残り枠数
- 無料版ユーザーへの告知送信数
- プロモコード使用率
- コンバージョン率（無料版→有料版）

### ダッシュボード
- アクティブなキャンペーン一覧
- 各市場の残り枠数
- キャンペーン使用履歴
- 告知送信履歴

## 🚀 実装手順

1. **キャンペーン管理システムの実装**
   - データ構造の定義
   - キャンペーンCRUD操作
   - 残り枠計算ロジック

2. **無料版ユーザー管理の拡張**
   - 告知送信履歴の記録
   - 告知タイミングの管理

3. **告知機能の実装**
   - メッセージテンプレートの作成
   - 告知送信ロジック
   - 多言語対応

4. **キャンペーン自動循環システムの実装**
   - 監視ロジック
   - 自動循環ロジック
   - 通知機能

5. **Whop統合**
   - プロモコード生成
   - Whop API連携
   - プロモコード適用確認

6. **モニタリングダッシュボードの作成**
   - キャンペーン状況表示
   - 使用履歴表示
   - 告知送信履歴表示

## 📝 注意事項

1. **プロモコードの管理**
   - 各キャンペーンごとに一意のプロモコードを生成
   - プロモコードの有効期限を管理
   - 使用済みプロモコードの追跡

2. **告知の頻度**
   - 無料版ユーザーへの告知は適度な頻度に（1日1回まで）
   - 残り枠が少ない場合のみ追加告知

3. **キャンペーンの循環**
   - 50枠が埋まったら即座に新しいキャンペーンを開始
   - 無料版ユーザーに新しいキャンペーンを告知

4. **データの永続化**
   - キャンペーン履歴はすべて保存
   - 使用履歴は分析用に保存

## 🎯 期待効果

- **緊迫感の創出**: 「残りあと○○枠」の告知で緊迫感を演出
- **コンバージョン率向上**: 50%オフの割引でコンバージョン率向上
- **継続的なエンゲージメント**: キャンペーンの循環で継続的なエンゲージメント
- **無料版ユーザーの有料版への転換**: 無料版ユーザーを有料版に転換
