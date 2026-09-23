#!/usr/bin/env tsx
/**
 * GPT: CTOを直接呼び出すテストスクリプト
 */

import { callGPT52 } from '../api/unified-api.js';

async function main() {
  console.log('🤖 GPT: CTOを呼び出し中...\n');
  
  try {
    const result = await callGPT52('あなたはGPT: CTOです。1+1は？', {
      temperature: 0.3,
      maxCompletionTokens: 100,
    });

    console.log('✅ 成功！');
    console.log('回答:', result.text);
    console.log('使用量:', result.usage);
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('スタック:', error.stack);
    process.exit(1);
  }
}

main();
