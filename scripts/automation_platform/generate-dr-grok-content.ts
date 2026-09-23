#!/usr/bin/env tsx
/**
 * Dr. Grokキャラクターコンテンツ生成
 * NanoBanana（画像生成）とVeo（動画生成）を使用してDr. Grokのキャラクターコンテンツを生成
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { callVeo31 } from '../api/unified-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

/**
 * NanoBanana（画像生成）API呼び出し
 */
async function generateImageWithNanoBanana(prompt: string, aspectRatio: string = '1:1', imageSize: string = '2K') {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in .env file");
  }

  const modelName = 'gemini-3-pro-image-preview';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: imageSize,
      }
    }
  };

  console.log(`📸 NanoBanana画像生成中: ${modelName}`);
  console.log(`   アスペクト比: ${aspectRatio}, サイズ: ${imageSize}`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NanoBanana API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  // レスポンスから画像データを取得
  if (data.candidates && data.candidates.length > 0) {
    const candidate = data.candidates[0];
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.mimeType && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType;
          const base64Data = part.inlineData.data;
          const dataUrl = `data:${mimeType};base64,${base64Data}`;
          console.log(`✅ 画像生成成功 (${mimeType}, ${base64Data.length} bytes)`);
          return { dataUrl, mimeType, base64Data };
        }
      }
    }
  }

  throw new Error('画像データがレスポンスに含まれていません');
}

/**
 * Veo（動画生成）API呼び出し
 * unified-api.tsのcallVeo31関数を使用
 */
async function generateVideoWithVeo(prompt: string, durationSeconds: number = 8, resolution: string = '720p') {
  console.log(`🎬 Veo動画生成中: veo-3.1-generate-preview`);
  console.log(`   長さ: ${durationSeconds}秒, 解像度: ${resolution}`);
  console.log(`   ⚠️ Veo APIは非同期処理のため、完了まで時間がかかる場合があります`);

  try {
    const result = await callVeo31(prompt, {
      pollInterval: 10, // 10秒ごとにポーリング
      maxPollAttempts: 60, // 最大60回（10分）
      savePath: join(__dirname, '..', 'docs', 'dr-grok-assets', 'dr-grok-intro.mp4')
    });

    if (result.videos && result.videos.length > 0) {
      const video = result.videos[0];
      console.log(`✅ 動画生成成功`);
      console.log(`   URI: ${video.uri}`);
      console.log(`   Name: ${video.name}`);
      if (video.filePath) {
        console.log(`   保存先: ${video.filePath}`);
      }
      return { 
        uri: video.uri, 
        name: video.name,
        filePath: video.filePath 
      };
    }

    throw new Error('動画データがレスポンスに含まれていません');
  } catch (error: any) {
    console.error(`❌ Veo APIエラー: ${error.message}`);
    throw error;
  }
}

/**
 * 画像をファイルに保存
 */
function saveImage(base64Data: string, mimeType: string, filename: string) {
  const buffer = Buffer.from(base64Data, 'base64');
  const extension = mimeType.split('/')[1] || 'png';
  const filepath = join(__dirname, '..', 'docs', 'dr-grok-assets', `${filename}.${extension}`);
  
  // ディレクトリが存在しない場合は作成
  const dir = dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filepath, buffer);
  console.log(`💾 画像を保存しました: ${filepath}`);
  return filepath;
}

/**
 * 動画をファイルに保存
 */
function saveVideo(base64Data: string, mimeType: string, filename: string) {
  const buffer = Buffer.from(base64Data, 'base64');
  const extension = mimeType.split('/')[1] || 'mp4';
  const filepath = join(__dirname, '..', 'docs', 'dr-grok-assets', `${filename}.${extension}`);
  
  // ディレクトリが存在しない場合は作成
  const dir = dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filepath, buffer);
  console.log(`💾 動画を保存しました: ${filepath}`);
  return filepath;
}

async function generateDrGrokContent() {
  console.log('🎨 Dr. Grokキャラクターコンテンツ生成を開始します...\n');

  // Dr. Grokのキャラクターデザインを読み込む
  const designPath = join(__dirname, '..', 'docs', 'DR_GROK_CHARACTER_DESIGN.md');
  const designContent = fs.readFileSync(designPath, 'utf-8');

  // 画像生成用プロンプト（複数のバリエーション）
  const imagePrompts = [
    {
      name: 'portrait',
      aspectRatio: '1:1',
      prompt: `A professional 3D rendered character portrait of "Dr. Grok", a cryptocurrency market psychologist and mental coach. 

Character design:
- Wearing a high-tech white lab coat made of cyber-fabric material
- Thick brown mustache and eyebrows, large intelligent blue eyes
- Warm, reassuring smile
- A transparent holographic display headset on the forehead showing real-time Fear & Greed Index and X sentiment data (glowing blue)
- A blockchain analyzer device around the neck instead of a stethoscope
- A small Bitcoin-shaped tie pin on the red tie
- Right hand touching chin in a thoughtful "Deep Analysis" pose
- Trap Defense logo subtly embroidered on the sleeve cuff
- Clean, professional medical aesthetic combined with cutting-edge cryptocurrency technology
- Japanese game character-inspired friendly and approachable form
- Premium gold accents (#D4AF37) on buttons and devices
- Soft blue holographic glow (#007BFF) from the sentiment scanner

Style: 3D animation style, clean and professional, trustworthy and approachable, high-quality character design suitable for Telegram bot icon and marketing materials.`
    },
    {
      name: 'full-body',
      aspectRatio: '16:9',
      prompt: `A full-body 3D rendered illustration of "Dr. Grok", the Market Psychologist, standing in a modern cryptocurrency trading office.

Character:
- Wearing high-tech white lab coat with cyber-fabric material
- Thick brown mustache, intelligent blue eyes, warm smile
- Holographic sentiment scanner headset on forehead (glowing blue with real-time market data)
- Blockchain analyzer device around neck
- Bitcoin tie pin on red tie
- Right hand touching chin in thoughtful pose
- Trap Defense logo on sleeve

Setting:
- Modern trading desk with multiple monitors showing cryptocurrency charts
- Clean, professional environment
- Soft blue and gold lighting matching Trap Defense brand colors
- Charts and data visualizations in the background

Style: Professional 3D rendering, cinematic lighting, suitable for landing page hero image, high quality, trustworthy and approachable character design.`
    },
    {
      name: 'icon',
      aspectRatio: '1:1',
      prompt: `A clean, simple icon-style illustration of "Dr. Grok" for Telegram bot avatar.

Design:
- Close-up portrait, friendly and approachable
- White lab coat, thick brown mustache, warm smile
- Holographic headset with blue glow
- Minimalist design, recognizable at small sizes
- Premium gold accents
- Clean white background

Style: Icon design, simple and memorable, suitable for Telegram bot avatar, professional and trustworthy.`
    }
  ];

  // 動画生成用プロンプト
  const videoPrompt = `A short 8-second video of "Dr. Grok", the Market Psychologist, in a thoughtful pose.

Scene:
- Dr. Grok standing in a modern cryptocurrency trading office
- Wearing high-tech white lab coat with holographic sentiment scanner headset
- Right hand touching chin in "Deep Analysis" pose
- Holographic display on headset showing real-time market sentiment data (glowing blue)
- Soft camera movement, gentle zoom in
- Professional lighting with blue and gold accents
- Clean, trustworthy atmosphere

Character details:
- Thick brown mustache, intelligent blue eyes, warm reassuring smile
- Blockchain analyzer device around neck
- Bitcoin tie pin on red tie
- Trap Defense logo visible on sleeve

Style: Professional 3D animation, smooth camera movement, cinematic quality, suitable for marketing video, trustworthy and approachable character.`;

  const results: any[] = [];

  try {
    // 画像生成（複数のバリエーション）
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📸 NanoBanana画像生成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const imagePrompt of imagePrompts) {
      try {
        console.log(`\n🎨 ${imagePrompt.name}画像を生成中...`);
        const imageResult = await generateImageWithNanoBanana(
          imagePrompt.prompt,
          imagePrompt.aspectRatio,
          '2K'
        );
        
        const savedPath = saveImage(
          imageResult.base64Data,
          imageResult.mimeType,
          `dr-grok-${imagePrompt.name}`
        );
        
        results.push({
          type: 'image',
          name: imagePrompt.name,
          path: savedPath,
          aspectRatio: imagePrompt.aspectRatio
        });
        
        // APIレート制限を考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`❌ ${imagePrompt.name}画像生成エラー:`, error.message);
        results.push({
          type: 'image',
          name: imagePrompt.name,
          error: error.message
        });
      }
    }

    // 動画生成
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎬 Veo動画生成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      console.log('\n🎬 Dr. Grok動画を生成中...');
      const videoResult = await generateVideoWithVeo(videoPrompt, 8, '720p');
      
      if (videoResult.operation) {
        console.log(`⏳ 動画生成は非同期処理です。Operation ID: ${videoResult.operation}`);
        results.push({
          type: 'video',
          operation: videoResult.operation,
          done: videoResult.done
        });
      } else if (videoResult.dataUrl) {
        const savedPath = saveVideo(
          videoResult.base64Data,
          videoResult.mimeType,
          'dr-grok-intro'
        );
        
        results.push({
          type: 'video',
          path: savedPath
        });
      }
    } catch (error: any) {
      console.error(`❌ 動画生成エラー:`, error.message);
      results.push({
        type: 'video',
        error: error.message
      });
    }

    // 結果サマリー
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 生成結果サマリー');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const successCount = results.filter(r => r.path || r.uri).length;
    const errorCount = results.filter(r => r.error).length;
    
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`❌ エラー: ${errorCount}件\n`);
    
    results.forEach(result => {
      if (result.path) {
        console.log(`  ✅ ${result.type} (${result.name || 'video'}): ${result.path}`);
      } else if (result.uri) {
        console.log(`  ✅ ${result.type}: ${result.uri} (${result.name || 'video'})`);
      } else if (result.operation) {
        console.log(`  ⏳ ${result.type}: Operation ${result.operation} (非同期処理中)`);
      } else if (result.error) {
        console.log(`  ❌ ${result.type} (${result.name || 'video'}): ${result.error}`);
      }
    });

    // 結果をJSONファイルに保存
    const resultsPath = join(__dirname, '..', 'docs', 'dr-grok-assets', 'generation-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n💾 生成結果を保存しました: ${resultsPath}\n`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

generateDrGrokContent().catch((error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
