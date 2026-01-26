# Grokプロンプト情報ギャップ分析
**作成日**: 2026-01-26  
**目的**: Grokに渡した情報と実際の実装状況の整合性確認

---

## ❌ 発見された重要な不整合

### 1. Webhookデータ構造の不整合（重大）

#### Grokの戦略で参照しているデータ構造
```
x:webhook:stats:{influencerId}  // インフルエンサーIDで保存
```

#### 実際の実装（api/x-webhook.js）
```javascript
const key = `x:webhook:stats:${tweetId}`;  // ツイートIDで保存
const stats = {
  likes: 0,
  retweets: 0,
  replies: 0,
  lastUpdated: new Date().toISOString(),
};
```

**問題点**:
- Grokの戦略では「インフルエンサー別のエンゲージメント追跡」を提案していますが、実際の実装では**ツイートID**で保存されています
- インフルエンサーIDでエンゲージメントを集計する機能が**実装されていません**
- Grokの提案「投稿前にVercel KV（`x:webhook:stats:{influencerId}`）から過去24時間の平均を取得」は**実装不可能**です

**必要な修正**:
1. Webhookでエンゲージメントを受信した際に、ツイートIDからインフルエンサーIDを逆引きする機能
2. インフルエンサーID別にエンゲージメントを集計する機能
3. `x:webhook:stats:influencer:{influencerId}` のようなキーで保存する機能

---

### 2. getInfluencersFromStock()の機能不足

#### Grokの戦略で期待している機能
```
- KVキャッシュからスコアで上位35人をフィルタリング
- Webhookデータ（x:webhook:stats:{influencerId}）を活用
- 動的スコアリング（エンゲージメント率60% + インプレッション30% + コンバージョン10%）
```

#### 実際の実装（services/x/influencerStock.js）
```javascript
async function getInfluencersFromStock(lang) {
  const stockKey = getStockKey(lang);
  const influencers = await kv.get(stockKey);
  // 単純にストックから取得するだけ、フィルタリングやスコアリングなし
  return influencers || [];
}
```

**問題点**:
- スコアリング機能が**実装されていません**
- Webhookデータを活用する機能が**実装されていません**
- ティア分類（Top 35、Mid 20、Low 15）の機能が**実装されていません**

**必要な修正**:
1. インフルエンサーにスコアフィールドを追加
2. Webhookデータからエンゲージメント統計を取得する機能
3. スコアに基づいてフィルタリング・ソートする機能

---

### 3. ストックのデータ構造が不明確

#### Grokの戦略で期待しているデータ構造
```
- エンゲージメント率（engagementRate）
- 最近のインプレッション（recentImpressions）
- プロフィール訪問コンバージョン（profileVisits）
- スコア（score）
```

#### 実際の実装（services/x/influencerStock.js）
```javascript
// ストックに保存されるインフルエンサーのデータ構造は明示されていない
// discoverInfluencersForQuoteRepost()が返すデータ構造に依存
```

**問題点**:
- ストックに保存されるインフルエンサーのデータ構造が**明確に定義されていません**
- Grokが期待しているフィールド（recentImpressions、profileVisits、score）が**存在するか不明**です

**必要な確認**:
1. `discoverInfluencersForQuoteRepost()`が返すデータ構造を確認
2. ストックに保存されるデータ構造を明確に定義
3. Grokが期待しているフィールドが存在するか確認

---

### 4. インフルエンサーIDとツイートIDの関連付けが不明確

#### Grokの戦略で期待している機能
```
- ツイートIDからインフルエンサーIDを逆引き
- インフルエンサーID別にエンゲージメントを集計
```

#### 実際の実装
- ツイートIDとインフルエンサーIDの関連付けが**実装されていません**
- 投稿時にツイートIDとインフルエンサーIDの関連を保存する機能が**実装されていません**

**必要な修正**:
1. 投稿時に `x:post:influencer:{tweetId}` のようなキーでインフルエンサーIDを保存
2. Webhookでエンゲージメントを受信した際に、ツイートIDからインフルエンサーIDを取得
3. インフルエンサーID別にエンゲージメントを集計

---

## ✅ 正しく伝えられている情報

1. **ホットリストの人数**: 70人（EN: 20人、その他各言語: 10人）✅
2. **エンゲージメント率フィルタ**: 4%以上 ✅
3. **投稿ファネル**: Quote Reposts、Free Reports、Minimal Version ✅
4. **X APIレート制限**: 100/15min、現在84回/日（12.6%）✅
5. **Webhook実装済み**: `/api/x-webhook` が実装済み ✅
6. **ストック更新**: `/api/x-update-influencer-stock?lang={lang}` が実装済み ✅

---

## 📋 Grokに追加で伝えるべき情報

### 1. Webhookデータ構造の実際の実装
```
- キー: x:webhook:stats:{tweetId}
- データ構造: { likes, retweets, replies, lastUpdated }
- インフルエンサーIDでの集計機能は未実装
```

### 2. getInfluencersFromStock()の実際の実装
```
- 単純にストックから取得するだけ
- スコアリング・フィルタリング機能なし
- Webhookデータの活用機能なし
```

### 3. ストックのデータ構造
```
- discoverInfluencersForQuoteRepost()が返すデータ構造に依存
- エンゲージメント率（engagementRate）は含まれている可能性が高い
- recentImpressions、profileVisits、scoreは不明
```

### 4. ツイートIDとインフルエンサーIDの関連付け
```
- 実装されていない
- 投稿時にツイートIDとインフルエンサーIDの関連を保存する必要がある
```

---

## 🎯 推奨アクション

### 即座に実行すべき修正

1. **Webhookデータ構造の修正**
   - ツイートIDからインフルエンサーIDを逆引きする機能を実装
   - インフルエンサーID別にエンゲージメントを集計する機能を実装
   - `x:webhook:stats:influencer:{influencerId}` のようなキーで保存

2. **getInfluencersFromStock()の機能拡張**
   - スコアリング機能を追加
   - Webhookデータを活用する機能を追加
   - ティア分類機能を追加

3. **ストックのデータ構造の明確化**
   - ストックに保存されるデータ構造を明確に定義
   - Grokが期待しているフィールドが存在するか確認

4. **Grokプロンプトの更新**
   - 実際の実装状況を正確に反映
   - 実装されていない機能を明確に記載
   - 実装可能な戦略を提案するよう指示

---

**結論**: Grokに渡した情報には**重要な不整合**があります。特にWebhookデータ構造とgetInfluencersFromStock()の機能については、実際の実装とGrokの戦略に大きなギャップがあります。これらの不整合を修正し、Grokプロンプトを更新する必要があります。
