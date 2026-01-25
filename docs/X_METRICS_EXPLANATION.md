# X（Twitter）メトリクス用語解説

**作成日**: 2026-01-25  
**目的**: インプレッションとエンゲージメントの正確な意味を説明

---

## 📊 インプレッション（Impressions）

### 定義

**インプレッション** = ツイートがユーザーのタイムラインに表示された回数

### 詳細説明

- **表示回数**: ツイートがユーザーの画面に表示された回数をカウント
- **重複カウント**: 同じユーザーが複数回見た場合もカウントされる
- **取得方法**: X API v2の`non_public_metrics.impression_count`または`organic_metrics.impression_count`から取得
- **制限**: 自分のツイートのみ取得可能（他人のツイートのインプレッション数は取得不可）

### 例

- ツイートが100人のタイムラインに表示された → **インプレッション数: 100**
- 同じユーザーが3回見た場合 → **インプレッション数: 3**（1人のユーザーでも複数回カウント）

### コードでの取得方法

```javascript
// services/x/metrics.js
const metrics = await getTweetMetrics(tweetId, true); // includeNonPublic = true
const impressions = metrics.nonPublicMetrics?.impression_count || 0;
```

---

## 💬 エンゲージメント（Engagement）

### 定義

**エンゲージメント** = ツイートに対するユーザーの反応・行動の総数

### エンゲージメントの種類

1. **いいね（Like）**: `like_count`
2. **リツイート（Retweet）**: `retweet_count`
3. **リプライ（Reply）**: `reply_count`
4. **引用ツイート（Quote Tweet）**: `quote_count`
5. **URLクリック**: `url_link_clicks`（non_public_metrics）
6. **プロフィールクリック**: `user_profile_clicks`（non_public_metrics）

### エンゲージメントの計算

**総エンゲージメント数** = いいね + リツイート + リプライ + 引用ツイート

```javascript
// services/x/metrics.js
const totalEngagements = like_count + retweet_count + reply_count + quote_count;
```

### エンゲージメント率（Engagement Rate）

**エンゲージメント率** = （総エンゲージメント数 / インプレッション数） × 100

```javascript
// services/x/metrics.js
function calculateEngagementRate(metrics, impressions) {
  const totalEngagements = like_count + retweet_count + reply_count + quote_count;
  return impressions > 0 ? totalEngagements / impressions : null;
}
```

### 例

- **インプレッション数**: 10,000
- **いいね**: 500
- **リツイート**: 200
- **リプライ**: 100
- **引用ツイート**: 50
- **総エンゲージメント**: 850
- **エンゲージメント率**: 850 / 10,000 = **8.5%**

---

## 📈 なぜ重要なのか？

### インプレッションの重要性

1. **リーチの測定**: どれだけ多くの人にツイートが表示されたかを把握
2. **アルゴリズム評価**: Xのアルゴリズムがツイートをどれだけ拡散したかを示す
3. **コンテンツ効果測定**: 投稿戦略の効果を測定する基礎指標

### エンゲージメントの重要性

1. **コンテンツ品質の指標**: ユーザーがどれだけ反応したかを示す
2. **アルゴリズム最適化**: エンゲージメント率が高いと、Xのアルゴリズムがより多くの人に表示
3. **コンバージョン予測**: エンゲージメント率が高い → クリック率・コンバージョン率も高い傾向

### エンゲージメント率の業界基準

- **平均的なエンゲージメント率**: 3-5%
- **良好なエンゲージメント率**: 5-10%
- **優秀なエンゲージメント率**: 10%以上

**現在のプロジェクトの目標**: 10%以上のエンゲージメント率を目指す

---

## 🎯 プロジェクトでの活用

### インフルエンサー選択

- **高エンゲージメント率のインフルエンサー**: より多くの反応が期待できる
- **高インプレッション数のインフルエンサー**: より多くの人にリーチできる

### 期待パフォーマンスの計算

```javascript
// インフルエンサーの過去のインプレッション数から期待値を計算
const expectedImpressions = influencer.recentImpressions; // 例: 100,000
const engagementRate = influencer.engagementRate; // 例: 0.12 (12%)
const expectedEngagements = expectedImpressions * engagementRate; // 12,000
```

### PDCAサイクル

1. **Plan（計画）**: 高エンゲージメント率のインフルエンサーを選択
2. **Do（実行）**: インフルエンサーへの引用リポストを投稿
3. **Check（確認）**: 実際のインプレッション数・エンゲージメント数を測定
4. **Act（改善）**: 期待値と実績を比較し、戦略を最適化

---

## 📋 参照

- `services/x/metrics.js` - メトリクス取得機能
- `api/x-engagement-metrics.js` - エンゲージメントダッシュボード生成
- `scripts/analyze-influencer-performance.js` - インフルエンサーパフォーマンス分析

---

**最終更新**: 2026-01-25  
**作成者**: COO（Cursor/Composer 1）
