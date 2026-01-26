#!/usr/bin/env node
/**
 * GPTに実装した無料版（Minimal Version）の6言語版をチェックしてもらうスクリプト
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

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

// 実装ファイルを読み込む
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
 * GPTにチェックを依頼
 */
async function askGPTForReview() {
  try {
    const prompt = `You are an expert copywriter and localization specialist specializing in native, conversational tone for crypto trading content.

I have implemented the Minimal Version (Free) messages for 6 languages (EN, ES, PT-BR, AR, JA, KO) based on your design guidelines. Please review the implementations and provide:

1. **Overall Assessment**: Are the implementations following your design guidelines correctly?

2. **Language-Specific Review**: For each language, check:
   - Is the tone native and conversational (not translation-style)?
   - Are cultural nuances respected (ES→Latin American, PT→Brazilian, AR→Dubai/Gulf, etc.)?
   - Are the recommended expressions and idioms used correctly?
   - Are there any translation-style phrases that should be replaced?

3. **Structure Review**: 
   - Is the message structure aligned with your design (4-post thread format adapted for Telegram)?
   - Are all key elements present (hook, data, psychological insights, CTA)?

4. **Specific Issues**: List any specific problems, inconsistencies, or improvements needed for each language.

5. **Recommendations**: Provide specific, actionable recommendations for each language.

## Your Original Design Guidelines:

${designGuidelines}

## Implemented Code:

### EN (English):
\`\`\`javascript
${implementations.en ? implementations.en.substring(0, 5000) : 'Not found'}
\`\`\`

### ES (Spanish - Latin American):
\`\`\`javascript
${implementations.es ? implementations.es.substring(0, 5000) : 'Not found'}
\`\`\`

### PT-BR (Portuguese - Brazilian):
\`\`\`javascript
${implementations['pt-br'] ? implementations['pt-br'].substring(0, 5000) : 'Not found'}
\`\`\`

### AR (Arabic - Dubai/Gulf):
\`\`\`javascript
${implementations.ar ? implementations.ar.substring(0, 5000) : 'Not found'}
\`\`\`

### JA (Japanese):
\`\`\`javascript
${implementations.ja ? implementations.ja.substring(0, 5000) : 'Not found'}
\`\`\`

### KO (Korean):
\`\`\`javascript
${implementations.ko ? implementations.ko.substring(0, 5000) : 'Not found'}
\`\`\`

Please provide a comprehensive review focusing on:
- Native tone authenticity
- Cultural appropriateness
- Consistency with your design guidelines
- Specific improvements needed

Format your review clearly with sections for each language.`;

    console.log('🤖 GPTに実装チェックを依頼中...\n');
    
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'You are an expert copywriter and localization specialist specializing in native, conversational tone for crypto trading content. You review implementations for authenticity, cultural appropriateness, and adherence to design guidelines.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 8000,
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
  console.log('🚀 GPT 実装チェックスクリプト\n');
  console.log('='.repeat(80));
  console.log('📋 チェック対象:');
  console.log('  1. EN (English)');
  console.log('  2. ES (Spanish - Latin American)');
  console.log('  3. PT-BR (Portuguese - Brazilian)');
  console.log('  4. AR (Arabic - Dubai/Gulf)');
  console.log('  5. JA (Japanese)');
  console.log('  6. KO (Korean)');
  console.log('='.repeat(80) + '\n');

  const result = await askGPTForReview();

  console.log('\n' + '='.repeat(80));
  console.log('📊 GPTレビュー結果');
  console.log('='.repeat(80) + '\n');
  console.log(result);
  console.log('\n');

  // 結果をファイルに保存
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `gpt-minimal-implementation-review-${timestamp}.md`);

  const outputContent = `# GPT 無料版（Minimal Version）実装レビュー

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
