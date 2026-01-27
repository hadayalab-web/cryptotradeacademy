#!/usr/bin/env node
/**
 * GPT-5.2に修正後の有料版（Regular Briefing）の英語版（EN）のみを最終チェックしてもらうスクリプト
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const OpenAI = require('openai');

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// 設計ドキュメントを読み込む（短縮版）
const designFile = path.join(__dirname, '..', 'output', 'gpt-native-design-2026-01-26T02-29-35-581Z.md');
const grokGeminiFile = path.join(__dirname, '..', 'output', 'grok-gemini-optimization-2026-01-26T02-22-26-013Z.md');

if (!fs.existsSync(designFile)) {
  console.error('❌ GPT設計ファイルが見つかりません:', designFile);
  process.exit(1);
}

if (!fs.existsSync(grokGeminiFile)) {
  console.error('❌ Grok×Gemini分析ファイルが見つかりません:', grokGeminiFile);
  process.exit(1);
}

const designGuidelines = fs.readFileSync(designFile, 'utf-8');
const grokGeminiAnalysis = fs.readFileSync(grokGeminiFile, 'utf-8');

// 実装ファイルを読み込む（ENのみ）
const langFile = path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'en', 'regular.en.js');

let implementation = '';
if (fs.existsSync(langFile)) {
  implementation = fs.readFileSync(langFile, 'utf-8');
} else {
  console.error(`❌ ファイルが見つかりません: ${langFile}`);
  process.exit(1);
}

async function askGPTForFinalReview() {
  try {
    const prompt = `You are reviewing the Regular Briefing (Paid) message implementation for English (EN) only.

**CRITICAL: Focus ONLY on these 4 CORE REQUIREMENTS. If these are met, approve immediately. Minor polish is OPTIONAL, not required.**

## CORE REQUIREMENTS (Must-Have for Approval):

### 1. Grok's X Algorithm Strategy
- ✅ **Thread-ready structure**: Message can be split into multiple posts for X (Twitter)
- ✅ **Hook contains**: Fear vs Trap Score contradiction or market insight
- ✅ **Quick data reads**: 1-2 lines max, trader interpretation (not report-style)
- ✅ **Poll + CTA**: Engagement-driving poll and clear CTA
- ✅ **15-minute window advantage**: Explicitly mention paid version's real-time advantage over free version

### 2. Gemini's Deep Psychological Strategy
- ✅ **Cognitive dissonance hook**: Fear/ugly chart vs data contradiction
- ✅ **Complacency warning**: Warn against complacency when score is low
- ✅ **Latency anxiety**: Emphasize free version's delay vs paid version's real-time alerts
- ✅ **Defense-first framing**: "Don't revenge-trade", "defense mode", "wait for confirmation"
- ✅ **Value proposition**: Clearly communicate paid version's psychological and practical advantages

### 3. GPT Design Structure
- ✅ **News program structure**: Opening → Data Presentation → Commentator → Closing
- ✅ **Proper section labeling**: Clear section breaks and labels
- ✅ **Telegram adaptation**: Single message that works as a cohesive unit
- ✅ **Information hierarchy**: Important information prioritized appropriately

### 4. Native Expression (not translation-style)
- ✅ **Banned phrases removed**: No "market conditions appear", "remain vigilant", "exercise caution", etc.
- ✅ **Native phrasing**: Conversational, trader-to-trader tone (not corporate/report)
- ✅ **Natural English**: Not translation-style

## EVALUATION CRITERIA:

**APPROVE** if ALL 4 core requirements above are met, even if there are minor polish opportunities.

**REJECT** only if:
- Structure is wrong (not following news program structure, missing sections)
- Core psychological hooks are missing (no contradiction, no latency anxiety, no complacency warning)
- Translation-style/banned phrases are present in the final rendered message
- Value proposition is unclear or missing

**DO NOT REJECT** for:
- Minor wording tweaks
- Optional polish
- Hashtag placement
- Unused helper functions (as long as final message is correct)

## Design Guidelines (Summary):

${designGuidelines.substring(0, 1000)}

## Grok × Gemini Analysis (Summary):

${grokGeminiAnalysis.substring(0, 1000)}

## Current Implementation (EN):

\`\`\`javascript
${implementation}
\`\`\`

## Review Format:

Provide:
1. **Core Requirements Check**: ✅ or ❌ for each of the 4 requirements
2. **Verdict**: APPROVED / REJECTED (with specific reason if rejected)
3. **Optional Polish** (only if approved): Minor suggestions, clearly marked as "optional"

**Final Summary**: APPROVED or REJECTED (with specific blocking issues only).`;

    console.log('🤖 GPT-5.2に英語版（EN）の最終チェックを依頼中...\n');
    
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'You are a strict but fair reviewer focusing on CORE REQUIREMENTS only. You approve implementations that meet the 4 core requirements (Grok X algorithm strategy, Gemini psychological strategy, GPT design structure, native expression). You reject only for blocking issues. Minor polish suggestions are clearly marked as optional.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 3000,
      temperature: 0.7,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    return text || 'No response from GPT';
  } catch (error) {
    console.error('[GPT] Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.substring(0, 500));
    }
    return `Error: ${error.message}`;
  }
}

async function main() {
  console.log('🚀 GPT-5.2 有料版（Regular Briefing）最終チェックスクリプト - EN\n');
  console.log('='.repeat(80));
  console.log('📋 チェック対象: EN (English)');
  console.log('='.repeat(80));
  console.log(`📄 設計書: ${designFile}`);
  console.log(`📄 Grok×Gemini分析: ${grokGeminiFile}`);
  console.log('='.repeat(80) + '\n');

  const result = await askGPTForFinalReview();

  console.log('\n' + '='.repeat(80));
  console.log('📊 GPT-5.2 最終レビュー結果（EN）');
  console.log('='.repeat(80) + '\n');
  console.log(result);
  console.log('\n');

  // 結果をファイルに保存
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `gpt-final-check-regular-en-${timestamp}.md`);

  const outputContent = `# GPT-5.2 有料版（Regular Briefing）最終チェック - EN

生成日時: ${new Date().toISOString()}

## レビュー結果

${result}
`;

  fs.writeFileSync(outputFile, outputContent, 'utf-8');
  console.log(`\n✅ 結果を保存しました: ${outputFile}`);
  console.log('='.repeat(80));
}

main().catch((error) => {
  console.error('\n❌ 予期しないエラー:', error.message);
  if (error.stack) {
    console.error('スタックトレース:', error.stack.substring(0, 500));
  }
  process.exit(1);
});
