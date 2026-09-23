/**
 * OpenAI APIで利用可能なモデルを確認
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEYが設定されていません');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

async function checkModels() {
  console.log('🔍 OpenAI APIで利用可能なモデルを確認中...\n');
  
  try {
    // モデルリストを取得
    const models = await openai.models.list();
    
    console.log('✅ 利用可能なモデル一覧:\n');
    console.log('='.repeat(70));
    
    // GPT-5系を抽出
    const gpt5Models = models.data.filter(m => 
      m.id.includes('gpt-5') || 
      m.id.includes('gpt-4') ||
      m.id.includes('o1') ||
      m.id.includes('o3')
    ).sort((a, b) => a.id.localeCompare(b.id));
    
    if (gpt5Models.length > 0) {
      console.log('\n📋 GPT-5系 / GPT-4系 / o1系 / o3系 モデル:');
      console.log('-'.repeat(70));
      gpt5Models.forEach(model => {
        console.log(`  ✅ ${model.id}`);
        if (model.owned_by) {
          console.log(`     (owned_by: ${model.owned_by})`);
        }
      });
    }
    
    // GPT-5.2系を特定
    const gpt52Models = gpt5Models.filter(m => m.id.includes('gpt-5.2') || m.id.includes('5.2'));
    
    if (gpt52Models.length > 0) {
      console.log('\n🎯 GPT-5.2系モデル（推奨）:');
      console.log('-'.repeat(70));
      gpt52Models.forEach(model => {
        console.log(`  ⭐ ${model.id}`);
      });
    } else {
      console.log('\n⚠️  GPT-5.2系モデルが見つかりませんでした');
      console.log('   GPT-4o系またはo1系の使用を検討してください');
    }
    
    console.log('\n' + '='.repeat(70));
    
    // 推奨モデルをテスト
    const testModels = [
      'gpt-5.2-extra-high-fast',
      'gpt-5.2-extra-high',
      'gpt-5.2-high-fast',
      'gpt-5.2-high',
      'gpt-4o',
      'gpt-4o-mini',
      'o1-preview',
      'o3-mini'
    ];
    
    console.log('\n🧪 推奨モデルのテスト中...\n');
    
    for (const modelName of testModels) {
      // モデルリストに存在するかチェック
      const exists = models.data.some(m => m.id === modelName);
      if (exists) {
        console.log(`  ✅ ${modelName} - 利用可能`);
      } else {
        console.log(`  ❌ ${modelName} - 利用不可`);
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (error.status === 401) {
      console.log('\n💡 APIキーが無効です。.envファイルのOPENAI_API_KEYを確認してください');
    }
  }
}

checkModels().catch(console.error);


