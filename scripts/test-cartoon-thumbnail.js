#!/usr/bin/env node
/**
 * 風刺画風（Editorial Cartoon）サムネイル生成テスト
 * 世界共通コンテンツとしてのビジュアルを検証
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const { generateEditorialCartoon } = require('../services/gemini/imageGenerator');

async function testCartoonGeneration() {
  console.log('🎨 風刺画風（Editorial Cartoon）サムネイル生成テスト開始\n');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEYが設定されていません。.envファイルを確認してください。');
    process.exit(1);
  }

  const concepts = ['Whale Trap', 'FOMO Crowd'];
  
  for (const concept of concepts) {
    console.log(`\n🖌️ 生成中: ${concept}...`);
    try {
      const dataUrl = await generateEditorialCartoon(concept);
      
      if (dataUrl) {
        console.log(`✅ 生成成功: ${concept}`);
        console.log(`   データサイズ: ${dataUrl.length} bytes`);
        console.log(`   プレビュー: ${dataUrl.substring(0, 50)}...`);
        
        // Data URLをファイルに保存（オプション）
        // const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        // const buffer = Buffer.from(base64Data, 'base64');
        // const filename = `cartoon_${concept.replace(/\s+/g, '_').toLowerCase()}.png`;
        // fs.writeFileSync(filename, buffer);
        // console.log(`   保存完了: ${filename}`);
      } else {
        console.error(`❌ 生成失敗: ${concept} (null returned)`);
      }
    } catch (error) {
      console.error(`❌ エラー発生: ${concept}`, error.message);
    }
  }
  
  console.log('\n✨ テスト完了');
}

testCartoonGeneration();
