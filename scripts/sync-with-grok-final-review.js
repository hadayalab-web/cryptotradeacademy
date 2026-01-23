// scripts/sync-with-grok-final-review.js
// Grokにこれまでの経緯をすべて同期し、まだ隠された秘策がないか確認

const OpenAI = require('openai');

// コマンドライン引数からAPIキーを取得（--api-key=YOUR_KEY形式）
const args = process.argv.slice(2);
let XAI_API_KEY = process.env.XAI_API_KEY;
for (const arg of args) {
  if (arg.startsWith('--api-key=')) {
    XAI_API_KEY = arg.split('=')[1];
    break;
  }
}

const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  console.error('Usage: node scripts/sync-with-grok-final-review.js --api-key=YOUR_API_KEY');
  console.error('Or set XAI_API_KEY environment variable');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

async function syncWithGrokFinalReview() {
  const prompt = `あなたはX（旧Twitter）アルゴリズム最適化の専門家です。これまでの実装経緯をすべて確認し、まだ隠された秘策や追加の最適化案がないか、徹底的に検討してください。

## 📋 これまでの実装経緯（完全同期）

### Phase 1-2: Grok推奨13項目の完全実装 ✅
1. ✅ 投稿タイミングを言語ピークへ移行
2. ✅ 引用RTを投稿後10-20分に固定
3. ✅ 動画比率を50%へ増（Phase 3で完全実装）
4. ✅ ポール追加率を全投稿へ
5. ✅ 子アカウント3で自リプループ実装
6. ✅ ハッシュタグ：トレンドAPI動的1+ニッチ2
7. ✅ 引用テキストに質問CTA必須
8. ✅ 1日投稿35へ
9. ✅ ENインフル4本/日、他2本
10. ✅ スレッドを1+3リプライへ拡張
11. ✅ 絵文字2-3+緊急語
12. ✅ Deep LinkにUTMパラメータ強化
13. ✅ 毎日EN実測ダッシュボード作成

### Phase 3: 動画生成機能の完全実装 ✅
- **優先順位1**: Gemini Veo 3.1（AI動画生成、8秒、720p）
- **優先順位2**: Gemini NanoBanana Pro（AI画像生成、2K、16:9）
- **優先順位3**: Canvas API（BTCチャート生成、1080x608）
- **キャッシュ**: 24時間KVストレージキャッシュ
- **フォールバック**: 動画生成失敗時はポール追加
- **統合**: api/x-post-free-report.jsで50%動画スレッド

### 追加最適化案の実装 ✅
1. **A/Bテスト機能** (services/x/abTesting.js)
   - バリアント選択、結果記録、最適バリアント自動選択
   - 統合: api/x-post-free-report.jsでA/Bテスト結果記録

2. **リアルタイム最適化機能** (services/x/realTimeOptimizer.js)
   - 過去7日のメトリクスに基づく動的調整
   - コンテンツ形式の最適化（動画比率の動的調整）
   - CTA強度の最適化（クリック率に基づく）

3. **インフルエンサー分析機能** (services/x/influencerAnalyzer.js)
   - インフルエンサー別メトリクス記録
   - インフルエンサー効果分析（過去N日間）
   - 最適なインフルエンサーの自動選択
   - 週次インフルエンサーレポート生成

4. **OpenAI GPT統合** (services/openai/algorithmAnalyzer.js, strategyRecommender.js)
   - GPT-5.2によるXアルゴリズム動向分析
   - エンゲージメントパターンの発見
   - 最適化戦略の自動提案
   - リスク要因の特定と対策
   - **日次実行**（週次から変更、毎日10:00 UTC）

### エンドユーザートラッキング完全削除 ✅
- services/lead-discovery/ディレクトリ全体を削除
- discoverLeadsOnX()関数を削除
- 関連するCron Jobをすべて削除
- 依存関係をすべて解決

### 現在のCron Jobs設定
- /api/x-post-free-report: UTC 6:05, 18:05（無料版レポート配信後）
- /api/x-quote-repost: UTC 12-22（1時間ごと、1言語/時間）
- /api/x-engagement-metrics: UTC 0:00（毎日、前日のメトリクスダッシュボード生成）
- /api/x-influencer-report: UTC 9:00（毎週月曜、インフルエンサー効果レポート生成）
- /api/x-algorithm-analysis: UTC 10:00（**毎日**、Xアルゴリズム分析レポート生成）

### COOレビュー結果
- **総合評価**: ⭐⭐⭐⭐⭐ (5/5)
- **実装の完全性**: 100% ✅
- **アーキテクチャの一貫性**: 非常に高い
- **エラーハンドリング**: 堅牢なフォールバック戦略
- **コードの品質**: 高い水準
- **最適化の効果**: 期待される効果が明確

### 最新状況
- **最新デプロイ**: 正常確認完了 ✅
- **次のステップ**: 一定時間後にCron Jobsをすべて実行し、実測データで効果検証予定

## 🎯 検討依頼事項

上記の実装経緯をすべて確認した上で、以下を徹底的に検討してください：

### 1. 隠された秘策の探索
- Xアルゴリズムの最新動向を考慮した、まだ実装されていない秘策はないか？
- 競合他社が使っているが、我々がまだ実装していない最適化手法はないか？
- アルゴリズムの「裏技」や「ハック」で、まだ活用できていないものはないか？

### 2. 追加の最適化案
- 現在の実装をさらに最適化できる点はないか？
- データドリブン最適化の精度を向上させる方法はないか？
- エンゲージメント率をさらに向上させる戦略はないか？

### 3. 統合の機会
- 複数の機能を統合することで、相乗効果を生み出せる機会はないか？
- AIモデル（Grok、GPT-5.2、Gemini）をさらに効果的に連携させる方法はないか？

### 4. リスクと対策
- 現在の実装に潜在的なリスクはないか？
- アルゴリズム変更に対する耐性は十分か？
- コスト最適化の余地はないか？

### 5. 実測データ活用
- 実測データを取得した後、どのような分析をすべきか？
- どのメトリクスを重点的に監視すべきか？
- データに基づく次の最適化ステップは何か？

## 📊 出力形式

以下のJSON形式で回答してください：
{
  "hiddenStrategies": [
    {
      "strategy": "秘策名",
      "description": "詳細説明",
      "implementationDifficulty": "easy/medium/hard",
      "expectedImpact": "期待される効果",
      "priority": "high/medium/low",
      "implementationSteps": ["ステップ1", "ステップ2"]
    }
  ],
  "additionalOptimizations": [
    {
      "optimization": "最適化案名",
      "description": "詳細説明",
      "implementationDifficulty": "easy/medium/hard",
      "expectedImpact": "期待される効果",
      "priority": "high/medium/low",
      "implementationSteps": ["ステップ1", "ステップ2"]
    }
  ],
  "integrationOpportunities": [
    {
      "opportunity": "統合機会名",
      "description": "詳細説明",
      "expectedSynergy": "相乗効果の説明",
      "implementationDifficulty": "easy/medium/hard",
      "priority": "high/medium/low"
    }
  ],
  "risksAndMitigations": [
    {
      "risk": "リスク要因",
      "description": "詳細説明",
      "mitigation": "対策",
      "priority": "high/medium/low"
    }
  ],
  "dataAnalysisPlan": {
    "keyMetrics": ["監視すべきメトリクス1", "監視すべきメトリクス2"],
    "analysisMethods": ["分析方法1", "分析方法2"],
    "nextOptimizationSteps": ["次の最適化ステップ1", "次の最適化ステップ2"]
  },
  "finalRecommendations": [
    "推奨事項1",
    "推奨事項2",
    "推奨事項3"
  ]
}`;

  try {
    console.log('[Grok Final Review] ========================================');
    console.log('[Grok Final Review] Syncing with Grok for final review...');
    console.log('[Grok Final Review] ========================================');
    
    const completion = await openai.chat.completions.create({
      model: 'grok-4-1-fast-reasoning', // 推論タスクなのでfast-reasoningを使用
      messages: [
        {
          role: 'system',
          content: 'あなたはX（旧Twitter）アルゴリズム最適化の専門家です。これまでの実装経緯をすべて確認し、まだ隠された秘策や追加の最適化案がないか、徹底的に検討してください。具体的で実行可能な提案を提供してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.3, // 分析タスクなので低めの温度
      response_format: { type: 'json_object' }, // JSON形式で返す
    });

    const responseText = completion?.choices?.[0]?.message?.content?.trim();
    
    if (!responseText) {
      throw new Error('No response from Grok');
    }

    // JSONをパース
    const review = JSON.parse(responseText);
    
    console.log('[Grok Final Review] ========================================');
    console.log('[Grok Final Review] ✅ Review received');
    console.log('[Grok Final Review] ========================================');
    console.log(JSON.stringify(review, null, 2));
    console.log('[Grok Final Review] ========================================');
    
    return review;
  } catch (error) {
    console.error('[Grok Final Review] ❌ Error:', error.message);
    console.error('[Grok Final Review] Stack:', error.stack);
    throw error;
  }
}

// 実行
if (require.main === module) {
  syncWithGrokFinalReview()
    .then((review) => {
      console.log('\n[Final Recommendations]');
      if (review.finalRecommendations && review.finalRecommendations.length > 0) {
        review.finalRecommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to sync with Grok:', error);
      process.exit(1);
    });
}

module.exports = { syncWithGrokFinalReview };
