// scripts/ask-gpt-x-data-extraction.js
// GPTにXの投稿データを正確に抽出する方法を質問

const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

async function askGPTAboutXDataExtraction() {
  console.log('='.repeat(80));
  console.log('📊 GPTにXの投稿データを正確に抽出する方法を質問');
  console.log('='.repeat(80));
  console.log();

  const prompt = `あなたはX（Twitter）API v2の専門家です。以下の問題について、正確な解決方法を教えてください。

## 現在の問題

1. **データソースの混在**: ログから抽出したインプレッション数が、Grokの推定値（\`influencer.recentImpressions\`）と実際のX APIから取得したインプレッション数を区別していない

2. **実際のX APIから取得したインプレッション数が0**: KVストレージから確認した結果、実際のX APIから取得したインプレッション数が0である

3. **投稿直後のインプレッション数**: X APIの\`impression_count\`は、投稿直後にはまだ正確な値が反映されていない可能性がある

## コードの状況

### 投稿時のコード（api/x-quote-repost.js）
\`\`\`javascript
// 746行目: 実際のX APIから取得したインプレッション数
engagementMetrics = {
  impressions: quoteMetrics.nonPublicMetrics?.impression_count || quoteMetrics.organicMetrics?.impression_count || 0,
  engagements: (quoteMetrics.publicMetrics?.like_count || 0) +
              (quoteMetrics.publicMetrics?.retweet_count || 0) +
              (quoteMetrics.publicMetrics?.reply_count || 0) +
              (quoteMetrics.publicMetrics?.quote_count || 0),
  // ...
};

// 813行目: Grokの推定値（インフルエンサーの過去のツイートの推定値）
estimatedImpressions: influencer.recentImpressions || 0,
\`\`\`

### ログ抽出スクリプト（scripts/extract_metrics_from_logs.py）
\`\`\`python
# 104行目: インプレッションを検出（Grokの推定値と実際の値を区別していない）
imp_match = re.search(r'impressions?[:\s]+(\d+(?:[,\-]\d+)?)', msg, re.I)
if imp_match:
    imp_str = imp_match.group(1).replace(',', '')
    post_info['impressions'] = int(imp_str)
\`\`\`

### メトリクス追跡（services/x/metricsTracker.js）
\`\`\`javascript
// 38行目: 実際のX APIから取得したインプレッション数
impressions: metrics.nonPublicMetrics?.impression_count || metrics.organicMetrics?.impression_count || 0,
\`\`\`

## 質問事項

1. **X API v2で、投稿直後に\`impression_count\`を取得する場合、どのくらいの時間がかかりますか？**

2. **ログから抽出する際に、Grokの推定値（\`influencer.recentImpressions\`）と実際のX APIから取得したインプレッション数を区別する方法はありますか？**

3. **Cron Jobで定期的に追跡する場合、どのくらいの間隔で実行すれば、正確なインプレッション数を取得できますか？**

4. **X API v2の\`non_public_metrics\`と\`organic_metrics\`の違いは何ですか？どちらを使用すべきですか？**

5. **投稿直後にインプレッション数が0の場合、どのように対処すべきですか？**

6. **正確なインプレッション数を取得するためのベストプラクティスを教えてください。**

## 現在の実装

- X API v2を使用（OAuth 1.0a User Context認証）
- 自分のツイートなので、\`non_public_metrics\`が取得可能
- Cron Job（\`api/x-quote-repost-metrics.js\`）で定期的に追跡
- KVストレージ（\`x:metrics:\${dateString}\`）に保存

## 期待する回答

1. 各質問に対する具体的な回答
2. コードの修正案（可能であれば）
3. ベストプラクティスの推奨事項

日本語で回答してください。`;

  try {
    console.log('🤖 GPTに質問中...');
    console.log();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはX（Twitter）API v2の専門家です。正確で実践的なアドバイスを提供してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const response = completion.choices[0].message.content;
    
    console.log('='.repeat(80));
    console.log('📊 GPTの回答');
    console.log('='.repeat(80));
    console.log();
    console.log(response);
    console.log();
    console.log('='.repeat(80));
    console.log('✅ 質問完了');
    console.log('='.repeat(80));

    // 回答をファイルに保存
    const fs = require('fs');
    const outputFile = 'docs/GPT_X_DATA_EXTRACTION_ADVICE_2026-01-26.md';
    const content = `# GPTによるXの投稿データ正確抽出方法のアドバイス（2026-01-26）

## 📊 質問内容

X API v2を使用して、投稿データを正確に抽出する方法について質問しました。

## 🤖 GPTの回答

${response}

---

## 📚 参照

- \`api/x-quote-repost.js\` - 引用リポスト投稿API
- \`services/x/metricsTracker.js\` - メトリクス追跡サービス
- \`scripts/extract_metrics_from_logs.py\` - ログからメトリクスを抽出するスクリプト
- \`docs/CRITICAL_ERROR_24H_REPORT_ANALYSIS_2026-01-26.md\` - 24時間レポートのデータソース混在エラー
`;

    fs.writeFileSync(outputFile, content, 'utf8');
    console.log(`📝 回答を保存しました: ${outputFile}`);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// 実行
askGPTAboutXDataExtraction().catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
});
