#!/usr/bin/env node
/**
 * GPT-5.2に修正後の無料版（Minimal Version）の6言語版を最終チェックしてもらうスクリプト
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// ユーザーが提供したAPIキーを使用
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// GPT設計ガイドラインを読み込む
const designFile = path.join(__dirname, '..', 'output', 'gpt-native-design-2026-01-26T02-29-35-581Z.md');
if (!fs.existsSync(designFile)) {
  console.error('❌ GPT設計ファイルが見つかりません:', designFile);
  process.exit(1);
}
const designGuidelines = fs.readFileSync(designFile, 'utf-8');

// GPTの前回レビュー（ダメ出し）を読み込む
const reviewFile = path.join(__dirname, '..', 'output', 'gpt-minimal-implementation-review-2026-01-26T02-35-48-934Z.md');
let previousReview = '';
if (fs.existsSync(reviewFile)) {
  previousReview = fs.readFileSync(reviewFile, 'utf-8');
}

// 実装ファイルを読み込む（全ファイル）
const langFiles = {
  en: path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'en', 'minimal-high-quality.en.js'),
  es: path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'es', 'minimal-high-quality.es.js'),
  'pt-br': path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'pt-br', 'minimal-high-quality.pt-br.js'),
  ar: path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'ar', 'minimal-high-quality.ar.js'),
  ja: path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'ja', 'minimal-high-quality.ja.js'),
  ko: path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'ko', 'minimal-high-quality.ko.js'),
};

const implementations = {};
for (const [lang, filePath] of Object.entries(langFiles)) {
  if (fs.existsSync(filePath)) {
    implementations[lang] = fs.readFileSync(filePath, 'utf-8');
  } else {
    console.warn(`⚠️ ファイルが見つかりません: ${filePath}`);
  }
}

/**
 * GPTに最終チェックを依頼
 */
async function askGPTForFinalReview() {
  try {
    const prompt = `You are reviewing the Minimal Version (Free) message implementations for 6 languages (EN, ES, PT-BR, AR, JA, KO).

**CRITICAL: Focus ONLY on these 4 CORE REQUIREMENTS. If these are met, approve immediately. Minor polish is OPTIONAL, not required.**

## CORE REQUIREMENTS (Must-Have for Approval):

### 1. Grok's X Algorithm Strategy (from Grok analysis)
- ✅ **4-post thread structure**: [1/4] Hook → [2/4] Quick Reads → [3/4] Psych Coaching → [4/4] Poll + CTA
- ✅ **Hook contains**: Fear vs Trap Score contradiction (e.g., "BTC looks ugly + Extreme Fear... but Trap Score X/100")
- ✅ **Quick Reads**: 1-2 bullets max, trader interpretation (not report-style)
- ✅ **Poll + CTA**: A/B/C/D options + reply keyword "TRAP" loop
- ✅ **15-minute latency window**: Mentioned in [3/4] when score is low (<30)

### 2. Gemini's Deep Psychological Strategy (from Gemini analysis)
- ✅ **Cognitive dissonance hook**: Fear/ugly chart vs low Trap Score contradiction in [1/4]
- ✅ **Complacency warning**: When score < 30, warn that "0/100 can make you complacent"
- ✅ **Latency anxiety**: "15-minute window" / "while you sleep" narrative in [3/4]
- ✅ **Defense-first framing**: "Don't revenge-trade", "defense mode", "wait for confirmation"

### 3. GPT Design Structure (from GPT design document)
- ✅ **4-block structure**: Hook → Quick Reads → Psych → Poll/CTA
- ✅ **Proper labeling**: [1/4], [2/4], [3/4], [4/4] blocks
- ✅ **Telegram adaptation**: Single message containing 4 thread-like blocks

### 4. Native Expression (not translation-style)
- ✅ **Banned phrases removed**: No "market conditions appear", "remain vigilant", "exercise caution", etc.
- ✅ **Native phrasing**: Conversational, trader-to-trader tone (not corporate/report)
- ✅ **Language-specific**: LATAM Spanish (not Spain), Brazilian Portuguese (not Portugal), Gulf Arabic (not generic MSA), natural Japanese/Korean

## EVALUATION CRITERIA:

**APPROVE** if ALL 4 core requirements above are met, even if there are minor polish opportunities.

**REJECT** only if:
- Structure is wrong (not 4 blocks, wrong order, missing labels)
- Core psychological hooks are missing (no contradiction, no latency anxiety, no complacency warning)
- Translation-style/banned phrases are present in the final rendered message
- Native expression is fundamentally broken (e.g., Spain Spanish instead of LATAM, Portugal Portuguese instead of Brazilian)

**DO NOT REJECT** for:
- Minor wording tweaks ("Let the score lead" vs "Wait for the score to confirm")
- Optional polish ("shortくまとめます" vs "shortくいきます")
- Hashtag placement (Telegram vs X)
- Unused helper functions (as long as final message is correct)

## Your Original Design Guidelines:

${designGuidelines}

## Current Implementations:

### EN (English):
\`\`\`javascript
${implementations.en || 'Not found'}
\`\`\`

### ES (Spanish - Latin American):
\`\`\`javascript
${implementations.es || 'Not found'}
\`\`\`

### PT-BR (Portuguese - Brazilian):
\`\`\`javascript
${implementations['pt-br'] || 'Not found'}
\`\`\`

### AR (Arabic - Dubai/Gulf):
\`\`\`javascript
${implementations.ar || 'Not found'}
\`\`\`

### JA (Japanese):
\`\`\`javascript
${implementations.ja || 'Not found'}
\`\`\`

### KO (Korean):
\`\`\`javascript
${implementations.ko || 'Not found'}
\`\`\`

## Review Format:

For each language, provide:
1. **Core Requirements Check**: ✅ or ❌ for each of the 4 requirements
2. **Verdict**: APPROVED / REJECTED (with specific reason if rejected)
3. **Optional Polish** (only if approved): Minor suggestions, clearly marked as "optional"

**Final Summary**: List which languages are APPROVED and which are REJECTED (with specific blocking issues only).`;

    console.log('🤖 GPT-5.2に最終チェックを依頼中...\n');
    
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
      max_completion_tokens: 12000,
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

/**
 * メイン実行
 */
async function main() {
  console.log('🚀 GPT-5.2 最終チェックスクリプト\n');
  console.log('='.repeat(80));
  console.log('📋 チェック対象（再修正後）:');
  console.log('  1. EN (English)');
  console.log('  2. ES (Spanish - Latin American)');
  console.log('  3. PT-BR (Portuguese - Brazilian)');
  console.log('  4. AR (Arabic - Dubai/Gulf)');
  console.log('  5. JA (Japanese)');
  console.log('  6. KO (Korean)');
  console.log('='.repeat(80));
  console.log(`📄 設計書: ${designFile}`);
  console.log(`📄 前回レビュー: ${reviewFile}`);
  console.log('='.repeat(80) + '\n');

  const result = await askGPTForFinalReview();

  console.log('\n' + '='.repeat(80));
  console.log('📊 GPT-5.2 最終レビュー結果');
  console.log('='.repeat(80) + '\n');
  console.log(result);
  console.log('\n');

  // 結果をファイルに保存
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `gpt-final-check-all-minimal-${timestamp}.md`);

  const outputContent = `# GPT-5.2 無料版（Minimal Version）最終チェック

生成日時: ${new Date().toISOString()}

## レビュー結果

${result}
`;

  fs.writeFileSync(outputFile, outputContent, 'utf-8');
  console.log(`\n✅ 結果を保存しました: ${outputFile}`);
  console.log('='.repeat(80));
}

// 実行
main().catch((error) => {
  console.error('\n❌ 予期しないエラー:', error.message);
  if (error.stack) {
    console.error('スタックトレース:', error.stack.substring(0, 500));
  }
  process.exit(1);
});
