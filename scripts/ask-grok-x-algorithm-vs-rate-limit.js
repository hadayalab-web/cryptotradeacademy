// scripts/ask-grok-x-algorithm-vs-rate-limit.js
// Xアルゴリズム解析に基づく戦略 vs 100/15min レート制限の整合性を Grok に問い合わせる

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY;
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set. Set it in .env or: XAI_API_KEY=your-key node scripts/ask-grok-x-algorithm-vs-rate-limit.js');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL,
});

async function askGrokXAlgorithmVsRateLimit() {
  console.log('🔍 Grok に問い合わせ: Xアルゴリズム戦略 vs 100/15min レート制限\n');

  const systemPrompt = `You are an expert on X (Twitter) algorithm ranking factors and growth strategy. You have deep knowledge of:
- X's 2026 algorithm (freshness, engagement velocity, reply depth, media, recency)
- X API rate limits: POST /2/tweets = Per User 100/15min, Per App 10,000/24hrs (https://docs.x.com/x-api/fundamentals/rate-limits)
- Spam detection (volume-based vs content-based)
- Quote repost and multi-language posting best practices

Answer in Japanese. Be specific: cite algorithm factors, rate limits, and give a clear recommendation.`;

  const userPrompt = `## 状況

私たちは X で引用リポストを自動化しています。
- **824人**のインフルエンサーを6言語（EN, ES, PT-BR, AR, JA, KO）でストック
- Cron: EN は6分ごと、他言語は分ずらして実行（例: ES 1,7,13,19分…）
- \`getPeakMapForHour\` で「どの時間帯にどの言語を投稿するか」を制御
- **UTC 8時**は全6言語が対象で、15分窓で **237投稿** になる（EN 35×3 + 他5言語 各2回）
- X API の **Per User 制限は 100/15min**（POST /2/tweets）

つまり「アルゴリズム・ピーク時間を優先した結果、8時台などで 100/15min を超えてしまう」状態です。

## 質問

1. **Xアルゴリズム解析に基づく戦略**として、「15分窓で100を超えるバースト」を正当化する根拠はありますか？
   - 例: エンゲージメント速度（velocity）を最大化するために「短時間にまとめて出す」方がアルゴリズム的に有利、など。
2. それとも、**100/15min は厳守すべき**で、スケジュール側で「15分あたり100以下」に抑えるべきでしょうか？
3. アルゴリズムとレート制限の両面を踏まえた **最適な投稿パターン**（時間帯・言語配分・1窓あたり投稿数）の推奨を、具体的に3〜5項目で示してください。

出力形式:
- **結論**: バースト許容か / 100/15min 厳守か
- **理由**: アルゴリズム・API制限の観点
- **推奨**: 具体的なスケジュール／キャップの提案`;

  try {
    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0].message.content;
    const usage = completion.usage || {};

    console.log('--- Grok 回答 ---\n');
    console.log(responseText);
    console.log('\n---');
    console.log(`Tokens: prompt=${usage.prompt_tokens || '-'} completion=${usage.completion_tokens || '-'}`);

    const outputDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = path.join(outputDir, `grok-x-algorithm-vs-rate-limit-${ts}.md`);
    const md = `# Grok: Xアルゴリズム戦略 vs 100/15min レート制限

**作成日時**: ${new Date().toISOString()}
**モデル**: grok-4-1-fast-reasoning

---

## 質問要約

- 現状: 8時台などで 15分窓 237 投稿 → 100/15min 超過
- Xアルゴリズム上「バースト」を正当化する根拠はあるか、それとも 100/15min 厳守すべきか

---

## Grok 回答

${responseText}

---
*Tokens: prompt=${usage.prompt_tokens || '-'} completion=${usage.completion_tokens || '-'}*
`;
    fs.writeFileSync(outPath, md, 'utf8');
    console.log(`\n📄 Saved: ${outPath}`);

    return responseText;
  } catch (err) {
    console.error('❌ Grok API error:', err.message);
    if (err.status) console.error('Status:', err.status);
    throw err;
  }
}

// 実行: XAI_API_KEY を .env に設定するか、実行時に渡す
// PowerShell: $env:XAI_API_KEY="your-key"; node scripts/ask-grok-x-algorithm-vs-rate-limit.js
// CMD: set XAI_API_KEY=your-key && node scripts/ask-grok-x-algorithm-vs-rate-limit.js
askGrokXAlgorithmVsRateLimit().catch(() => process.exit(1));
