// scripts/optimize-minimal-content-for-x-algorithm.js
// Xアルゴリズム解析から逆算して無料版コンテンツを最適化

const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

/**
 * 現在の無料版コンテンツを取得（EN版をサンプルとして）
 */
function getCurrentMinimalContent() {
  return {
    en: {
      full: `🌤️ Trap Defence BTC - Free Report
🚨 BREAKING: TRAP DEFENCE BRIEFING
📅 2026-01-22 06:00:25 UTC

━━━━━━━━━━━━━━━━━━━━
🎯 Today's Trap Score
━━━━━━━━━━━━━━━━━━━━
25/100
✅ VERY LOW TRAP RISK: Very few trap indicators detected. Market conditions appear safe

💰 BTC Price: $89,859 (-0.02% / 24h)

💡 Current market conditions are relatively stable, but it's important to always remain vigilant

━━━━━━━━━━━━━━━━━━━━
📊 Data-Backed Reasons
━━━━━━━━━━━━━━━━━━━━
• Exchange Netflow: +6786 BTC (inflow) — Potential selling pressure
• Whale Ratio: 58% — Moderately high selling pressure

💡 Strategic Insights
  ✅ Trap Score 25/100: Currently low trap risk, but markets always change
  🛡️ Low-risk times are when strategic preparation matters most. Continue defense until clear advantage emerges
  💎 Professional traders prioritize "waiting time" above all. Take the same strategy

━━━━━━━━━━━━━━━━━━━━
💊 Dr. Grok's Quick Insight
━━━━━━━━━━━━━━━━━━━━
"Patience is strategic strength. Keep waiting for clear opportunities."

━━━━━━━━━━━━━━━━━━━━
✅ Mental Note
━━━━━━━━━━━━━━━━━━━━
"Protecting capital is priority #1. Not losing is more important than winning."

━━━━━━━━━━━━━━━━━━━━
🚀 Unlock Full Intelligence Report

You're seeing a glimpse. Full members get:

✨ Complete Intelligence Report
• Full on-chain analysis (all indicators in real-time)
• AI-powered market insights & trap detection (24/7 monitoring)
• Real-time alerts: AVOID-LONG / AVOID-SHORT / STANDBY (instant notifications)
• Exit Map & Mental Training guidance (practical strategies)
• Full Dr. Grok psychological support (mental block resolution)
• Real-time X sentiment analysis (predict market emotions)

💎 All of this is designed to protect your capital

📊 Free vs Full Version
• Free: Trap Score only (directional hint)
• Full: All data + Real-time alerts (specific action plan)

🛡️ One missed signal can determine whether you protect or lose your capital

🎯 Upgrade now and get the complete defense system

━━━━━━━━━━━━━━━━━━━━
This is a free report. For detailed analysis and trap alerts, upgrade to Trap Defence BTC

For educational purposes only. Not financial advice`
    }
  };
}

/**
 * GrokでXアルゴリズム解析から逆算した最適化案を生成
 */
async function optimizeMinimalContentForXAlgorithm() {
  const currentContent = getCurrentMinimalContent();
  
  const prompt = `あなたはTrap Defence BTCのCMO（Chief Marketing Officer）兼Xアルゴリズム専門家として、X（Twitter）のアルゴリズム解析から逆算して、無料版（Minimal Version）コンテンツを最適化してください。

## 📊 Xアルゴリズムの主要要素（最新研究に基づく）

### 1. エンゲージメント指標（最重要）
- **いいね（Like）**: 基本的なエンゲージメント、アルゴリズムの基礎指標
- **リツイート（RT）**: 拡散力の指標、アルゴリズムで高く評価
- **リプライ（Reply）**: 深いエンゲージメント、会話を促進
- **ブックマーク（Bookmark）**: 保存行動、将来のエンゲージメント予測
- **プロフィールクリック**: アカウントへの関心度
- **リンククリック**: CTAの効果測定

### 2. タイミング要素
- **ピーク時間**: フォロワーのアクティブ時間に投稿
- **言語別最適時間**: 各言語圏のローカル時間を考慮
- **トレンド連動**: 市場イベントやニュースと連動

### 3. コンテンツ要素
- **テキスト長**: 280文字以内が推奨（引用リポスト用は140文字以内）
- **ハッシュタグ**: 2-3個のニッチ + 1個のトレンド（最大4個）
- **メディア**: 画像/動画でエンゲージメント2-3倍向上
- **絵文字**: 適度な使用で視認性向上
- **質問/CTA**: エンゲージメントを促進

### 4. アルゴリズムの評価基準
- **初期エンゲージメント**: 投稿後30分以内のエンゲージメントが重要
- **エンゲージメント率**: リーチに対するエンゲージメントの割合
- **拡散力**: RTとリプライの数
- **時間経過**: エンゲージメントの持続性

### 5. 引用リポストの最適化
- **タイミング**: インフルエンサーの投稿後15-60分以内
- **長さ**: 140文字以内（引用部分を除く）
- **エンゲージメント促進**: 質問やCTAを含める
- **ハッシュタグ**: 2-3個に絞る

## 📋 現在の無料版コンテンツ（EN版）

\`\`\`
${currentContent.en.full}
\`\`\`

## 🎯 最適化依頼事項

以下の視点から、Xアルゴリズムに最適化された無料版コンテンツを設計してください：

### 1. 引用リポスト用短縮版（140文字以内）
- インフルエンサーの投稿に引用リポストするための超短縮版
- エンゲージメントを最大化する要素を含める
- ハッシュタグ2-3個
- 明確なCTA

### 2. 通常投稿用最適化版（280文字以内）
- Xに直接投稿するための最適化版
- エンゲージメントを促す質問を含める
- ハッシュタグ3-4個
- 視覚的な要素（絵文字）を活用

### 3. スレッド投稿用最適化版（1メイン + 2-3リプライ）
- メイン投稿: フック（注意を引く）
- リプライ1: データ（Trap Score、Exchange Netflow等）
- リプライ2: インサイト（Strategic Insights）
- リプライ3: CTA（完全版への誘導）

### 4. エンゲージメント最大化要素
- **質問**: フォロワーに回答を促す
- **ポール**: 2択の質問でエンゲージメント向上
- **CTA**: 明確な行動喚起
- **データの強調**: 具体的な数値で権威性

### 5. ハッシュタグ戦略
- **ニッチハッシュタグ**: #BTC #TrapDefence #CryptoTrading
- **トレンドハッシュタグ**: 市場イベントに応じて動的に追加
- **言語別最適化**: 各言語圏で効果的なハッシュタグ

### 6. タイミング最適化
- **ピーク時間**: 各言語圏のアクティブ時間に投稿
- **市場イベント連動**: ボラティリティ高時、FOMC発表後等

## 📋 出力形式

以下の形式で最適化案を出力してください：

### 1. エグゼクティブサマリー（200-300字）
Xアルゴリズム最適化の重要性と期待される効果を要約

### 2. 引用リポスト用短縮版（140文字以内）
- EN版の最適化案
- エンゲージメント最大化のポイント
- 使用するハッシュタグ

### 3. 通常投稿用最適化版（280文字以内）
- EN版の最適化案
- エンゲージメントを促す要素
- ハッシュタグ戦略

### 4. スレッド投稿用最適化版
- メイン投稿（フック）
- リプライ1（データ）
- リプライ2（インサイト）
- リプライ3（CTA）

### 5. エンゲージメント最大化戦略
- 質問の例
- ポールの例
- CTAの最適化

### 6. ハッシュタグ戦略
- ニッチハッシュタグの選定
- トレンドハッシュタグの活用方法
- 言語別最適化

### 7. タイミング最適化
- 各言語圏のピーク時間
- 市場イベント連動のタイミング

### 8. 実装優先度
- Phase 1（即座）: 優先度の高い最適化（5-7項目）
- Phase 2（1-3ヶ月）: 短期実装最適化（5-7項目）
- Phase 3（3-6ヶ月）: 中期実装最適化（3-5項目）

### 9. 期待される効果
- エンゲージメント率の向上予測
- リーチ拡大の予測
- コンバージョン率向上の予測

### 10. 結論と次のアクション
- 総合的な結論
- 即座に実行すべき具体的なアクション（5-7項目）

日本語で回答してください。`;

  try {
    console.log('🔄 Grok CMO（grok-4-1-fast-reasoning）でXアルゴリズム最適化分析を実行中...');
    console.log('📊 現在の無料版コンテンツを分析対象として共有...\n');

    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are a CMO (Chief Marketing Officer) and X algorithm expert for Trap Defence BTC, specializing in optimizing content for X (Twitter) algorithm to maximize engagement and reach.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 8000
    });

    const analysis = completion.choices[0]?.message?.content || '';
    const usage = completion.usage || {};

    console.log('✅ 分析完了\n');
    console.log('='.repeat(80));
    console.log('📊 Xアルゴリズム最適化分析結果');
    console.log('='.repeat(80));
    console.log(analysis);
    console.log('='.repeat(80));
    console.log(`\n📈 Token使用量: ${usage.total_tokens || 0} tokens`);
    console.log(`   - Prompt: ${usage.prompt_tokens || 0} tokens`);
    console.log(`   - Completion: ${usage.completion_tokens || 0} tokens`);

    // 結果をファイルに保存
    const fs = require('fs');
    const path = require('path');
    const outputDir = path.join(__dirname, '../docs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputFile = path.join(outputDir, `X_ALGORITHM_OPTIMIZATION_MINIMAL_${timestamp}.md`);

    const output = `# Xアルゴリズム最適化分析結果 - 無料版コンテンツ

生成日時: ${new Date().toISOString()}

## 分析対象
無料版（Minimal Version）コンテンツのXアルゴリズム最適化

## 分析結果

${analysis}

## Token使用量
- 合計: ${usage.total_tokens || 0} tokens
- Prompt: ${usage.prompt_tokens || 0} tokens
- Completion: ${usage.completion_tokens || 0} tokens
`;

    fs.writeFileSync(outputFile, output, 'utf8');
    console.log(`\n💾 分析結果を保存しました: ${outputFile}`);

    return {
      analysis,
      usage
    };
  } catch (error) {
    console.error('❌ Grok API呼び出しエラー:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  optimizeMinimalContentForXAlgorithm()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { optimizeMinimalContentForXAlgorithm };
