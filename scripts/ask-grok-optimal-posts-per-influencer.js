// scripts/ask-grok-optimal-posts-per-influencer.js
// Grok-4-1-fast-reasoningによるXアルゴリズム解析：インフルエンサー1人あたりの最適な投稿数

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY;
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL,
});

/**
 * Grok-4-1-fast-reasoningにXアルゴリズムを解析してもらう
 */
async function askGrokOptimalPostsPerInfluencer() {
  console.log('🔍 Grok-4-1-fast-reasoningによるXアルゴリズム解析を開始...\n');

  const prompt = `あなたはX（旧Twitter）のアルゴリズムとスパム判定システムの専門家です。以下の質問に、Xのアルゴリズムの深い理解に基づいて回答してください。

## 質問：インフルエンサー1人あたりへの最適な投稿数

### 現状の理解

我々は、70人の高品質なインフルエンサーリストに対して、引用リポスト（quote repost）を自動投稿しています。

**現在の実装**:
- **ストック管理**: 各インフルエンサーの最新ホットツイート（tweetId）を1つずつストック（24時間TTL）
- **ローテーション**: 今日既に投稿したインフルエンサーを除外
- **重複防止**: 過去24時間の同じtweetIdへの投稿を防止
- **タイミングチェック**: 60分以内であれば投稿を許可

**現在の仮説**:
- **平均**: 1投稿/日
- **上位インフルエンサー**: 2投稿/日（条件付き）
- **例外的**: 3投稿/日（反応が良い場合のみ、8時間クールダウン + 新しいツイートが必要）

### X APIレート制限

- **Per User (OAuth 1.0a)**: 100/15min（15分ごとにリセット）
- **Per App (Bearer Token)**: 10,000/24hrs
- **投稿コスト**: 5クレジット/投稿 = $0.005/投稿（極めて低い）
- **ROI**: 非常に高い（インプレッション→コンバージョン→収益）

### 重要な制約

1. **ストックは「1人1ツイート」**: 同じインフルエンサーに複数回投稿するには新しいツイートが必要
2. **24時間TTL**: ストック更新頻度が低いと枯渇しやすい
3. **8時間クールダウン**: 同一インフルエンサーへの連続投稿を防止（提案中）

### 質問事項

1. **Xのアルゴリズムの観点から、インフルエンサー1人あたりへの最適な投稿数は何回/日ですか？**
   - スパム判定を避けながら、ROIを最大化する観点から回答してください
   - 引用リポスト（quote repost）の場合の最適な投稿数は？
   - 同じインフルエンサーへの複数回投稿が安全な条件は？

2. **Xのスパム判定アルゴリズムは、どのようなシグナルを監視していますか？**
   - 同一インフルエンサーへの連続投稿のリスク
   - 短時間集中のリスク
   - 同一パターン文面のリスク
   - その他の重要なシグナル

3. **引用リポスト（quote repost）の場合、通常のツイートと比べてスパム判定リスクは異なりますか？**
   - 引用リポストは「既存のツイートへの反応」なので、スパム判定リスクが低い可能性がある
   - この仮説は正しいですか？

4. **最適な投稿間隔は何時間ですか？**
   - 同一インフルエンサーへの投稿間隔
   - 全体の投稿間隔
   - 時間帯による違い

5. **ROI最大化の観点から、投稿数を増やす戦略は有効ですか？**
   - 投稿コストが低い（$0.005/投稿）ので、投稿数を増やすほどROIが向上する可能性がある
   - しかし、スパム判定リスクも高まる
   - このバランスをどう取るべきか？

6. **実装すべき最適な戦略は？**
   - クールダウン時間
   - ストック更新頻度
   - 投稿数の上限
   - その他の推奨事項

### 期待される回答形式

以下の形式で回答してください：

1. **エグゼクティブサマリー（200-300字）**
   - インフルエンサー1人あたりの最適な投稿数の結論

2. **Xアルゴリズムの理解**
   - スパム判定の仕組み
   - 引用リポストの扱い
   - 重要なシグナル

3. **最適な投稿数（インフルエンサー1人あたり）**
   - **推奨値**: X投稿/日（根拠とリスク分析）
   - **条件**: どのような条件で複数回投稿が安全か
   - **上限**: 最大何回/日まで安全か

4. **最適な投稿間隔**
   - **同一インフルエンサー**: X時間（根拠）
   - **全体**: X分（根拠）
   - **時間帯による違い**: どの時間帯が安全か

5. **ROI最大化戦略**
   - 投稿数を増やす戦略の有効性
   - スパム判定リスクとのバランス
   - 推奨される投稿数上限

6. **実装推奨事項**
   - **クールダウン時間**: X時間（根拠）
   - **ストック更新頻度**: X時間ごと（根拠）
   - **投稿数の上限**: X投稿/日（根拠）
   - **その他の推奨事項**

7. **リスク評価**
   - **スパム判定リスク**: 低/中/高（根拠）
   - **対策**: 具体的な対策方法

8. **結論と次のアクション**
   - 総合的な結論
   - 即座に実行すべき具体的なアクション（3-5項目）

日本語で回答してください。`;

  try {
    console.log('🔄 Grok-4-1-fast-reasoningに質問を送信中...\n');

    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはX（旧Twitter）のアルゴリズムとスパム判定システムの専門家です。Xのアルゴリズムの深い理解に基づいて、インフルエンサー1人あたりへの最適な投稿数について、技術的・戦略的な観点から最適な実装案を提案してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 8000,
    });

    const responseText = completion.choices[0].message.content;
    const usage = completion.usage || {};

    // 結果を保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, '..', 'docs', 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `grok-optimal-posts-per-influencer-${timestamp}.md`);
    const outputContent = `# インフルエンサー1人あたりの最適な投稿数（Grok-4-1-fast-reasoning解析）
**作成日時**: ${new Date().toISOString()}
**解析AI**: Grok-4-1-fast-reasoning
**目的**: Xアルゴリズム解析による最適な投稿数の決定

---

${responseText}

---

## API使用量

- **入力トークン**: ${usage.prompt_tokens || 0}
- **出力トークン**: ${usage.completion_tokens || 0}
- **合計トークン**: ${usage.total_tokens || 0}
`;

    fs.writeFileSync(outputFile, outputContent, 'utf-8');

    console.log(`\n✅ 解析結果を保存しました: ${outputFile}`);
    console.log(`\n📊 レスポンス長: ${responseText.length} chars`);
    console.log(`📈 API使用量:`);
    console.log(`  - 入力トークン: ${usage.prompt_tokens || 0}`);
    console.log(`  - 出力トークン: ${usage.completion_tokens || 0}`);
    console.log(`  - 合計トークン: ${usage.total_tokens || 0}`);
    console.log('\n' + '='.repeat(80));
    console.log(responseText);
    console.log('='.repeat(80));

    return responseText;
  } catch (error) {
    console.error('❌ Grokへの質問に失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  askGrokOptimalPostsPerInfluencer()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { askGrokOptimalPostsPerInfluencer };
