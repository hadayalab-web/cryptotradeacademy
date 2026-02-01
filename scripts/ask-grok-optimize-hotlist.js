// scripts/ask-grok-optimize-hotlist.js
// 既存ホットリスト（資産）を最大限活用する戦略をGrokに聞く

const OpenAI = require("openai");

const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
// services/grok/client.jsのGROK_MODEL_X_LIVEと同じモデルを使用
const MODEL = process.env.GROK_MODEL_X_LIVE || "grok-4-1-fast-reasoning";

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL
});

async function askGrokOptimization() {
  console.log(`🚀 Grokに既存ホットリスト（資産）の最大活用戦略を聞いています...`);
  console.log(`📊 使用モデル: ${MODEL}\n`);

  const prompt = `あなたはX（旧Twitter）のアルゴリズムとソーシャルメディアマーケティングの専門家です。

【重要】既存の70人のホットリスト（資産）を最大限活用する戦略に焦点を当ててください。
新しいインフルエンサーを追加するのではなく、既存の資産を最大限に活用する方法を教えてください。

【正確な現状データ - 実装済み】
1. ホットリスト（70人）:
   - EN: 20人（ストック、config/influencerStrategy.jsのINFLUENCER_STOCK_COUNT_EN）
   - ES: 10人（ストック、config/influencerStrategy.jsのINFLUENCER_STOCK_COUNT_ES）
   - PT-BR: 10人（ストック、config/influencerStrategy.jsのINFLUENCER_STOCK_COUNT_PT_BR）
   - AR: 10人（ストック、config/influencerStrategy.jsのINFLUENCER_STOCK_COUNT_AR）
   - KO: 10人（ストック、config/influencerStrategy.jsのINFLUENCER_STOCK_COUNT_KO）
   - JA: 10人（ストック、config/influencerStrategy.jsのINFLUENCER_STOCK_COUNT_JA）
   - 合計: 70人（20+10+10+10+10+10）
   - 全員エンゲージメント率4%以上でフィルタリング済み（services/x/influencerStock.jsの154-158行目）
   - **重要**: ストックからのみ取得（api/x-quote-repost.jsでGrok APIによる新規発掘機能は削除済み）

2. 実装済み投稿ファネル（84回/日）:
   - **Quote Reposts** (api/x-quote-repost.js):
     * Cron: 0 0,1,13,14,20,21,22 * * * (7回/日)
     * 6言語対応: EN, ES, PT-BR, AR, KO, JA
     * 実装: ストックからインフルエンサーを取得し、Grokが引用リポストテキストを生成
     * 現在の投稿数: 42回/日（6言語×7時間）
   
   - **Free Reports** (api/x-post-free-report.js):
     * Cron: 0 12,13,14,15,18 * * * (5回/日)
     * 6言語対応: EN, ES, PT-BR, AR, KO, JA
     * 実装: 無料版レポートのX投稿（メイン投稿+スレッド）
     * 現在の投稿数: 30回/日（6言語×5時間）
   
   - **Minimal Version** (api/x-post-minimal-version-cron.js):
     * Cron: 0 8,20 * * * (2回/日)
     * 6言語対応: EN, ES, PT-BR, AR, KO, JA
     * 実装: 無料版リードマグネット（Trap Score + 簡易分析）
     * 現在の投稿数: 12回/日（6言語×2時間）
   
   - **合計**: 84回/日

3. X APIレート制限（大幅な余裕あり）:
   - Per User: 100/15min
   - 理論上の最大値: 400/時間（100×4）
   - 安全な設定値: 100/時間
   - 現在の使用率: 84回/日 = 12.6%（レート制限の12.6%しか使用していない）
   - 余裕: 87.4%のレート制限が未使用

4. 実装の制約（重要）:
   - **インフルエンサー発掘機能は削除済み**: api/x-quote-repost.jsでGrok APIによる新規発掘機能（discoverInfluencersForQuoteRepost）は削除済み
   - **ストックからのみ取得**: getInfluencersFromStock()を使用し、ストックが空の場合はスキップ
   - **ストック更新**: /api/x-update-influencer-stock?lang={lang}で各言語のストックを更新（手動実行専用。Cronには登録しない）
   - **新規発掘は行わない**: 既存の70人ホットリスト（ストック）のみを使用
   - **getInfluencersFromStock()の実装**: 
     * 基本機能: ストックから取得
     * ✅ スコアリング機能: オプションで有効化可能（enableScoring: true）
     * ✅ 動的スコアリング: エンゲージメント率60% + インプレッション30% + Webhookエンゲージメント10%
     * ✅ フィルタリング機能: topNオプションで上位N人を取得可能
     * ✅ Webhookデータ活用: x:webhook:stats:influencer:{username}からエンゲージメント統計を取得
   - **ストックのデータ構造**: discoverInfluencersForQuoteRepost()が返すデータ構造
     * ✅ username: string
     * ✅ tweetId: string
     * ✅ engagementRate: number (0-1、例: 0.05 = 5%)
     * ✅ followerCount: number
     * ✅ recentImpressions: number
     * ⚠️ profileVisits: 存在しない（Webhookエンゲージメントで代替）
     * ⚠️ score: 動的スコアリングで計算（enableScoring有効時）

5. X API Webhook実装済み（重要）:
   - **エンドポイント**: /api/x-webhook (api/x-webhook.js)
   - **URL**: https://cryptotradeacademy.vercel.app/api/x-webhook
   - **ステータス**: 有効（X Developer Consoleで確認済み）
   - **機能**: リアルタイムでエンゲージメント（いいね、リツイート、リプライ）を受信
   - **保存先**: 
     * ツイートID別: Vercel KV（x:webhook:stats:{tweetId}、30日間保持）
     * インフルエンサーID別: Vercel KV（x:webhook:stats:influencer:{username}、30日間保持）
   - **データ構造**: 
     * ツイートID別: { likes: number, retweets: number, replies: number, lastUpdated: string }
     * インフルエンサーID別: { totalLikes: number, totalRetweets: number, totalReplies: number, tweetCount: number, lastUpdated: string }
   - **実装済み機能**: 
     * ✅ 投稿時にツイートIDとインフルエンサーIDの関連を保存（x:post:influencer:{tweetId}）
     * ✅ Webhookでエンゲージメントを受信した際に、ツイートIDからインフルエンサーIDを逆引き
     * ✅ インフルエンサーID別にエンゲージメントを集計
   - **活用**: ポーリング方式ではなく、Webhookでリアルタイムエンゲージメント追跡が可能

以前、Grokが700以上の候補から厳選した70人の高品質インフルエンサーがあります。
この70人という資産を最大限に活用する戦略を教えてください。

【実装上の重要な制約と実装済み機能】
- インフルエンサー発掘機能は削除済み（api/x-quote-repost.jsでdiscoverInfluencersForQuoteRepostは使用不可）
- ストック（既存の70人）からのみ取得可能
- ストックが空の場合はスキップ（新規発掘は行わない）
- ストック更新は手動のみ（/api/x-update-influencer-stock?lang={lang} または discover-and-stock-influencers-840.js。Cronでは呼ばない）
- **X API Webhook実装済み**: /api/x-webhookでリアルタイムエンゲージメント（いいね、リツイート、リプライ）を受信可能（ポーリング不要）
- **実装済み機能**:
  * ✅ 投稿時にツイートIDとインフルエンサーIDの関連を保存（x:post:influencer:{tweetId}）
  * ✅ WebhookでインフルエンサーID別にエンゲージメントを集計（x:webhook:stats:influencer:{username}）
  * ✅ getInfluencersFromStock()でスコアリング機能を実装（enableScoring: trueで有効化、api/x-quote-repost.jsで使用中）
  * ✅ 動的スコアリング: エンゲージメント率60% + インプレッション30% + Webhookエンゲージメント10%

質問（既存資産の活用に焦点）:
1. 70人のホットリストから、X APIレート制限（100/15min）を最大活用して最適なパフォーマンスを引き出す具体的な戦略
   - 現在84回/日（12.6%使用）→ レート制限を最大限活用する方法
   - 70人をどのように優先順位付け・グループ化して活用すべきか
   - 各インフルエンサーへの投稿頻度の最適化

2. 既存70人のホットリストを最大限活用するための戦略
   - エンゲージメント率に基づく優先順位付け
   - 言語別・時間帯別の最適な配分
   - 各インフルエンサーの特性に応じた投稿タイミング

3. エンゲージメント率に基づく動的調整の具体的な実装方法
   - パフォーマンスが良いインフルエンサーへの集中
   - パフォーマンスが悪いインフルエンサーへの対応
   - リアルタイムでの調整ロジック
   - **実装済み機能**: 
     * ✅ 投稿時にツイートIDとインフルエンサーIDの関連を保存（x:post:influencer:{tweetId}）
     * ✅ WebhookでインフルエンサーID別にエンゲージメントを集計（x:webhook:stats:influencer:{username}）
     * ✅ getInfluencersFromStock()でスコアリング・フィルタリング可能（enableScoring: true, topN: 35）

4. レート制限を最大活用するための時間帯別・言語別・ファネル別の最適な投稿配分
   - 1日400回（理論値）または100回/時間（安全値）を最大限活用
   - 70人をどのように配分すべきか

5. 既存70人から最大のROIを引き出す具体的な戦術
   - 各インフルエンサーの最適な投稿タイミング
   - コンテンツタイプ別の最適化
   - エンゲージメント最大化のための具体的なアクション

具体的で実装可能な戦略を、JSON形式で返してください:
{
  "strategy": {
    "existingHotlistOptimization": {
      "priorityRanking": {
        "method": string,
        "criteria": string[],
        "topPerformers": number
      },
      "distributionStrategy": {
        "hourlyDistribution": {[hour: string]: number},
        "languageDistribution": {[lang: string]: number},
        "funnelDistribution": {[funnel: string]: number},
        "influencerFrequency": {[tier: string]: number}
      }
    },
    "rateLimitMaximization": {
      "currentUsage": "84/day (12.6%)",
      "targetUsage": number,
      "optimizationPlan": string[],
      "hourlyBreakdown": {[hour: string]: number}
    },
    "engagementBasedAdjustment": {
      "thresholds": {[level: string]: number},
      "actions": {[level: string]: string[]},
      "implementation": string,
      "realTimeAdjustment": boolean
    },
    "performanceMaximization": {
      "keyTactics": string[],
      "priorityActions": string[],
      "expectedResults": {[metric: string]: number},
      "roiOptimization": string[]
    },
    "implementationRoadmap": {
      "immediateActions": string[],
      "shortTermActions": string[],
      "metricsToTrack": string[]
    }
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are Dr. Grok, an expert at X (Twitter) algorithm optimization and social media marketing. Provide detailed, actionable strategies in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    });

    const response = completion?.choices?.[0]?.message?.content?.trim();
    console.log('📊 Grokの回答:\n');
    console.log(response);
    console.log('\n');

    // JSONを抽出してパース
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const strategy = JSON.parse(jsonMatch[0]);
        console.log('✅ 戦略をパースしました\n');
        return strategy;
      } catch (e) {
        console.warn('⚠️ JSONパースエラー:', e.message);
      }
    }

    return response;
  } catch (error) {
    console.error('❌ Grok APIエラー:', error.message);
    throw error;
  }
}

async function main() {
  try {
    // Grokに既存ホットリスト（資産）の最大活用戦略を聞く
    const strategy = await askGrokOptimization();

    // 戦略の詳細を表示
    if (typeof strategy === 'object' && strategy.strategy) {
      console.log('\n📊 戦略サマリー:');
      console.log(JSON.stringify(strategy, null, 2));
      
      // 実装可能なアクションを抽出
      if (strategy.strategy.implementationRoadmap) {
        console.log('\n🎯 即座に実行可能なアクション:');
        strategy.strategy.implementationRoadmap.immediateActions?.forEach((action, idx) => {
          console.log(`${idx + 1}. ${action}`);
        });
      }
    }

    console.log('\n✅ 既存ホットリスト活用戦略の取得が完了しました！');

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { askGrokOptimization };
