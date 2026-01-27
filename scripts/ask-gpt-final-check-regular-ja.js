#!/usr/bin/env node
/**
 * GPT-5.2に修正後の有料版（Regular Briefing）の日本語版（JA）のみを最終チェックしてもらうスクリプト
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

const designFile = path.join(__dirname, '..', 'output', 'gpt-native-design-2026-01-26T02-29-35-581Z.md');
const grokGeminiFile = path.join(__dirname, '..', 'output', 'grok-gemini-optimization-2026-01-26T02-22-26-013Z.md');

if (!fs.existsSync(designFile) || !fs.existsSync(grokGeminiFile)) {
  console.error('❌ 設計ファイルが見つかりません');
  process.exit(1);
}

const designGuidelines = fs.readFileSync(designFile, 'utf-8');
const grokGeminiAnalysis = fs.readFileSync(grokGeminiFile, 'utf-8');

const langFile = path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'ja', 'regular.ja.js');

let implementation = '';
if (fs.existsSync(langFile)) {
  implementation = fs.readFileSync(langFile, 'utf-8');
} else {
  console.error(`❌ ファイルが見つかりません: ${langFile}`);
  process.exit(1);
}

async function askGPTForFinalReview() {
  try {
    const prompt = `You are reviewing the Regular Briefing (Paid) message implementation for Japanese (JA) only.

**CRITICAL: Focus ONLY on these 4 CORE REQUIREMENTS. If these are met, approve immediately. Minor polish is OPTIONAL, not required.**

## CORE REQUIREMENTS (Must-Have for Approval):

### 1. Grok's X Algorithm Strategy
- ✅ Thread-ready structure, Hook contains Fear vs Trap Score contradiction, Quick data reads (1-2 lines), Poll + CTA, 15-minute window advantage

### 2. Gemini's Deep Psychological Strategy
- ✅ Cognitive dissonance hook, Complacency warning, Latency anxiety, Defense-first framing, Value proposition

### 3. GPT Design Structure
- ✅ News program structure (Opening → Data Presentation → Commentator → Closing), Proper section labeling, Telegram adaptation

### 4. Native Expression (not translation-style)
- ✅ **Natural Japanese**: Conversational, trader-to-trader tone (not corporate/report)
- ✅ No banned phrases: "market conditions appear", "remain vigilant", "exercise caution", etc.

## EVALUATION CRITERIA:

**APPROVE** if ALL 4 core requirements above are met.

**REJECT** only if:
- Structure is wrong or missing sections
- Core psychological hooks are missing
- Translation-style/banned phrases are present
- Value proposition is unclear or missing

## Design Guidelines (Summary):

${designGuidelines.substring(0, 1000)}

## Grok × Gemini Analysis (Summary):

${grokGeminiAnalysis.substring(0, 1000)}

## Current Implementation (JA):

\`\`\`javascript
${implementation}
\`\`\`

## Review Format:

1. **Core Requirements Check**: ✅ or ❌ for each of the 4 requirements
2. **Verdict**: APPROVED / REJECTED (with specific reason if rejected)
3. **Optional Polish** (only if approved): Minor suggestions, clearly marked as "optional"

**Final Summary**: APPROVED or REJECTED (with specific blocking issues only).`;

    console.log('🤖 GPT-5.2に日本語版（JA）の最終チェックを依頼中...\n');
    
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'You are a strict but fair reviewer focusing on CORE REQUIREMENTS only. You approve implementations that meet the 4 core requirements. You reject only for blocking issues.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 3000,
      temperature: 0.7,
    });

    return completion?.choices?.[0]?.message?.content?.trim() || 'No response from GPT';
  } catch (error) {
    console.error('[GPT] Error:', error.message);
    return `Error: ${error.message}`;
  }
}

async function main() {
  console.log('🚀 GPT-5.2 有料版（Regular Briefing）最終チェックスクリプト - JA\n');
  console.log('='.repeat(80));
  console.log('📋 チェック対象: JA (Japanese)');
  console.log('='.repeat(80) + '\n');

  const result = await askGPTForFinalReview();

  console.log('\n' + '='.repeat(80));
  console.log('📊 GPT-5.2 最終レビュー結果（JA）');
  console.log('='.repeat(80) + '\n');
  console.log(result);
  console.log('\n');

  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `gpt-final-check-regular-ja-${timestamp}.md`);

  fs.writeFileSync(outputFile, `# GPT-5.2 有料版（Regular Briefing）最終チェック - JA\n\n生成日時: ${new Date().toISOString()}\n\n## レビュー結果\n\n${result}\n`, 'utf-8');
  console.log(`\n✅ 結果を保存しました: ${outputFile}`);
  console.log('='.repeat(80));
}

main().catch((error) => {
  console.error('\n❌ 予期しないエラー:', error.message);
  process.exit(1);
});
