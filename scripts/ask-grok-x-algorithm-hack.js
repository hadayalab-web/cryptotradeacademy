// scripts/ask-grok-x-algorithm-hack.js
// GrokにXアルゴリズムハッキングとエンゲージメント最大化の研究を依頼
// Whop直リン導線を最優先に

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL,
});

// 現在の投稿パターンを読み込む
const currentPostingPattern = {
  quoteRepost: {
    schedule: 'UTC 0,1,20,21時（1日4回）',
    languages: {
      'UTC 0:00': 'AR（2投稿）',
      'UTC 1:00': 'KO（2投稿）',
      'UTC 20:00': 'EN/PT-BR（4投稿）',
      'UTC 21:00': 'ES（2投稿）',
    },
    totalPerDay: 10,
  },
  freeReport: {
    schedule: 'UTC 12,13,14,15,18時（1日5回）',
    languages: {
      'UTC 12:00': 'EN（1投稿）',
      'UTC 13:00': 'KO（1投稿）',
      'UTC 14:00': 'EN/PT-BR（1投稿）',
      'UTC 15:00': 'ES（1投稿）',
      'UTC 18:00': 'AR（1投稿）',
    },
    totalPerDay: 5,
  },
  minimalVersion: {
    schedule: 'UTC 8:00（1日1回）',
    languages: '全6言語（1投稿）',
    totalPerDay: 1,
  },
  totalPerDay: 16,
};

// 現在の導線設定
const currentFunnelSetup = {
  minimalVersion: {
    telegramDeepLink: '✅ 含まれている',
    position: 'メッセージ内',
    cta: 'Get FREE Trap Score daily',
  },
  whop: {
    link: '✅ 追加済み',
    promoCode: 'DEFEND50（50% OFF）',
    position: 'メッセージ内',
    cta: 'Upgrade to Full (50% OFF)',
    priority: '現在は無料版と同等',
  },
};

async function askGrokXAlgorithmHack() {
  console.log('========================================');
  console.log('GrokにXアルゴリズムハッキング研究を依頼');
  console.log('========================================\n');

  const systemPrompt = `You are an expert X (Twitter) algorithm hacker and engagement optimization specialist. Your mission is to maximize engagement rates and drive conversions through strategic algorithm manipulation while maintaining authenticity.

You have deep knowledge of:
- X's 2026 algorithm ranking factors (freshness, engagement velocity, reply depth, media types)
- Engagement rate optimization techniques
- Conversion funnel optimization (especially direct Whop product link conversion)
- Multi-language posting strategies
- Peak time optimization
- Content format optimization (text, images, polls, videos)

Your analysis should be:
- Actionable and implementable
- Data-driven with specific recommendations
- Focused on Whop direct link conversion as TOP PRIORITY
- Algorithm-compliant (no spam tactics)
- Multi-language aware (EN, ES, PT-BR, AR, JA, KO)`;

  const userPrompt = `Analyze our current X posting pattern and provide a comprehensive algorithm hacking strategy to maximize engagement rates and Whop direct link conversions.

## CURRENT POSTING PATTERN:

### 1. Quote Reposts (10 posts/day)
- Schedule: UTC 0,1,20,21 (4 times/day)
- Languages: AR (UTC 0), KO (UTC 1), EN/PT-BR (UTC 20), ES (UTC 21)
- Format: Quote reposts of influencer tweets with Trap Score analysis

### 2. Free Reports (5 posts/day)
- Schedule: UTC 12,13,14,15,18 (5 times/day)
- Languages: EN (UTC 12), KO (UTC 13), EN/PT-BR (UTC 14), ES (UTC 15), AR (UTC 18)
- Format: Full trap score analysis with Telegram deep link + Whop link

### 3. Minimal Version Posts (1 post/day)
- Schedule: UTC 8:00 (once/day)
- Languages: All 6 languages
- Format: Thread format with hook message + detailed analysis

## CURRENT FUNNEL SETUP:

### Minimal Version (Free) Funnel:
- Telegram Deep Link: ✅ Included in messages
- Position: Within message content
- CTA: "Get FREE Trap Score daily"

### Whop Direct Link Funnel:
- Link: ✅ Added to messages
- Promo Code: DEFEND50 (50% OFF)
- Position: Within message content (same priority as free link)
- CTA: "Upgrade to Full (50% OFF)"
- **CURRENT PRIORITY: Equal to free link (needs to be TOP PRIORITY)**

## YOUR MISSION:

1. **X Algorithm Hacking Strategy**:
   - Analyze X's 2026 algorithm ranking factors
   - Provide specific tactics to maximize engagement rate
   - Optimize posting times, formats, and content structure
   - Recommend engagement velocity tactics

2. **Whop Direct Link Optimization (TOP PRIORITY)**:
   - How to make Whop links MORE VISIBLE and HIGHER CONVERSION than free links
   - Optimal placement and CTA wording
   - Promo code presentation strategy
   - A/B testing recommendations

3. **Content Format Optimization**:
   - Best media types for engagement (images, polls, videos, text)
   - Thread structure optimization
   - Hook message strategies
   - Engagement-driving elements

4. **Posting Pattern Refinement**:
   - Optimal timing adjustments
   - Language-specific optimizations
   - Frequency recommendations
   - Cross-pollination strategies

5. **Engagement Rate Maximization**:
   - Reply depth strategies
   - Engagement velocity tactics
   - Algorithm-friendly content patterns
   - Multi-language engagement optimization

Provide:
- Specific, actionable recommendations
- Code examples where applicable
- Priority ranking (what to implement first)
- Expected impact on engagement rate and conversion rate
- Implementation steps

Format your response as a comprehensive strategy document with clear sections and actionable items.`;

  try {
    console.log('📡 Asking Grok for X algorithm hacking strategy...\n');

    const completion = await openai.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: 8000,
      temperature: 0.3,
    });

    const response = completion?.choices?.[0]?.message?.content?.trim();

    if (!response) {
      console.error('❌ No response from Grok');
      return;
    }

    console.log('✅ Grok response received\n');
    console.log('========================================');
    console.log('GROK X ALGORITHM HACKING STRATEGY');
    console.log('========================================\n');
    console.log(response);
    console.log('\n========================================\n');

    // 結果をファイルに保存
    const outputDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const outputPath = path.join(outputDir, `GROK_X_ALGORITHM_HACK_${dateStr}.md`);

    const markdownContent = `# Grok X Algorithm Hacking Strategy
**生成日時**: ${new Date().toISOString()}
**目的**: Xアルゴリズムハッキングとエンゲージメント最大化、Whop直リン導線最優先化

---

## 現在の投稿パターン

\`\`\`json
${JSON.stringify(currentPostingPattern, null, 2)}
\`\`\`

## 現在の導線設定

\`\`\`json
${JSON.stringify(currentFunnelSetup, null, 2)}
\`\`\`

---

## Grok推奨戦略

${response}

---

## 実装優先順位

1. **最優先**: Whop直リン導線の最適化
2. **高優先度**: エンゲージメント率最大化戦略
3. **中優先度**: 投稿パターン調整
4. **低優先度**: A/Bテスト実施

---

**注意**: このドキュメントはGrok AIによって生成されました。実装前に実際のデータで検証してください。
`;

    fs.writeFileSync(outputPath, markdownContent, 'utf-8');
    console.log(`✅ 結果を保存しました: ${outputPath}`);

    return response;
  } catch (error) {
    console.error('❌ Error asking Grok:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

if (require.main === module) {
  askGrokXAlgorithmHack()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { askGrokXAlgorithmHack };
