#!/usr/bin/env node
/**
 * xAI APIで利用可能なモデルを確認
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// .env ファイルのパスを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

// .env ファイルを読み込む
config({ path: envPath });

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_API_BASE = 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY が設定されていません');
  process.exit(1);
}

async function listModels() {
  try {
    const response = await fetch(`${XAI_API_BASE}/models`, {
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    throw new Error(`Failed to list models: ${error.message}`);
  }
}

async function testModel(modelName) {
  try {
    const response = await fetch(`${XAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: 'Say "OK" if you can read this.'
          }
        ],
        max_tokens: 10
      })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, response: data.choices[0]?.message?.content || '' };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 xAI APIで利用可能なモデルを確認中...\n');
  console.log('='.repeat(60));

  try {
    // モデルリストを取得
    console.log('📋 モデルリストを取得中...');
    const models = await listModels();
    
    console.log(`\n✅ 利用可能なモデル: ${models.length}件\n`);
    
    const grokModels = models.filter(m => m.id && m.id.includes('grok'));
    
    console.log('🤖 Grokモデル一覧:');
    console.log('-'.repeat(60));
    grokModels.forEach(model => {
      console.log(`  - ${model.id}`);
      if (model.owned_by) {
        console.log(`    (owned_by: ${model.owned_by})`);
      }
    });
    
    if (grokModels.length === 0) {
      console.log('  （Grokモデルが見つかりませんでした）');
    }

    // よく使われるモデル名をテスト
    console.log('\n🧪 よく使われるモデル名をテスト中...\n');
    const testModels = [
      'grok-beta',
      'grok-2',
      'grok-2-1212',
      'grok-3',
      'grok-4-0709',
      'grok-2-vision-1212'
    ];

    const uniqueTestModels = [...new Set([...testModels, ...grokModels.map(m => m.id)])];

    for (const modelName of uniqueTestModels.slice(0, 10)) {
      console.log(`  ${modelName}... `);
      const result = await testModel(modelName);
      if (result.success) {
        console.log(`    ✅ 利用可能`);
      } else {
        console.log(`    ❌ エラー: ${result.error.substring(0, 100)}`);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 推奨モデル:');
    const availableModels = [];
    for (const modelName of uniqueTestModels.slice(0, 10)) {
      const result = await testModel(modelName);
      if (result.success) {
        availableModels.push(modelName);
      }
    }
    
    if (availableModels.length > 0) {
      console.log(`  推奨: ${availableModels[0]}`);
      console.log(`  その他利用可能: ${availableModels.slice(1).join(', ')}`);
    } else {
      console.log('  （利用可能なモデルが見つかりませんでした）');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  }
}

main();



