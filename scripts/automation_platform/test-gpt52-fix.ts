#!/usr/bin/env tsx
/**
 * GPT-5.2 API修正の動作確認テスト
 */

import { callGPT52 } from '../api/unified-api';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function main() {
  try {
    console.log('🧪 GPT-5.2 API修正の動作確認テスト\n');
    
    const testPrompt = 'こんにちは。これはテストです。';
    
    console.log('1. 基本的な呼び出しテスト...');
    const result1 = await callGPT52(testPrompt, {
      temperature: 0.7,
      maxCompletionTokens: 100,
    });
    console.log('✅ 成功:', result1.text.substring(0, 50) + '...');
    
    console.log('\n2. パラメータなしの呼び出しテスト...');
    const result2 = await callGPT52(testPrompt);
    console.log('✅ 成功:', result2.text.substring(0, 50) + '...');
    
    console.log('\n3. 使用量確認...');
    if (result1.usage) {
      console.log(`   - Prompt Tokens: ${result1.usage.prompt_token_count || 'N/A'}`);
      console.log(`   - Completion Tokens: ${result1.usage.completion_token_count || 'N/A'}`);
      console.log(`   - Total Tokens: ${result1.usage.total_token_count || 'N/A'}`);
    }
    
    console.log('\n✅ すべてのテストが成功しました！');
    console.log('✅ reasoningEffort/verbosityパラメータを削除しても正常に動作します。');
    
  } catch (error: any) {
    console.error('❌ エラーが発生しました:');
    console.error(error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();
