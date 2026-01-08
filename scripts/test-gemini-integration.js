// scripts/test-gemini-integration.js
// Gemini API統合の動作確認テストスクリプト

require('dotenv').config({ path: '.env.local' });

const { generateMarketImage } = require('../services/gemini/imageGenerator');
const { generateMarketVideo } = require('../services/gemini/videoGenerator');
const { sendPhoto, sendVideo } = require('../services/telegram/bot');

// テスト用の市場データ
const testMarketData = {
  price_usd_display: 45000,
  priceUsd: 45000,
  market_score: 65,
  sentiment_label: 'Bullish',
  change_24h: 2.5,
  inflow: 1500,
};

const testSummary = 'BTC is showing strong bullish momentum with increased exchange inflows. Market sentiment is positive with a score of 65/100.';

async function testImageGeneration() {
  console.log('\n🧪 Testing Gemini Image Generation...');
  console.log('='.repeat(50));
  
  try {
    const imageUrl = await generateMarketImage(testMarketData, 'en');
    
    if (imageUrl) {
      console.log('✅ Image generated successfully');
      console.log(`   Format: ${imageUrl.startsWith('data:') ? 'Base64 Data URL' : 'URL'}`);
      console.log(`   Length: ${imageUrl.length} characters`);
      console.log(`   Preview: ${imageUrl.substring(0, 80)}...`);
      return imageUrl;
    } else {
      console.log('❌ Image generation returned null');
      console.log('   Possible reasons:');
      console.log('   - GEMINI_API_KEY not set');
      console.log('   - API quota exceeded');
      console.log('   - API error');
      return null;
    }
  } catch (error) {
    console.error('❌ Image generation failed:', error.message);
    return null;
  }
}

async function testVideoGeneration() {
  console.log('\n🧪 Testing Gemini Video Generation...');
  console.log('='.repeat(50));
  
  try {
    const videoUrl = await generateMarketVideo(testMarketData, testSummary, 'en');
    
    if (videoUrl) {
      console.log('✅ Video generated successfully');
      console.log(`   Format: ${videoUrl.startsWith('data:') ? 'Base64 Data URL' : 'URL'}`);
      console.log(`   Length: ${videoUrl.length} characters`);
      console.log(`   Preview: ${videoUrl.substring(0, 80)}...`);
      return videoUrl;
    } else {
      console.log('❌ Video generation returned null');
      console.log('   Possible reasons:');
      console.log('   - GEMINI_API_KEY not set');
      console.log('   - API quota exceeded');
      console.log('   - API error');
      console.log('   - Video generation timeout (max 10 minutes)');
      return null;
    }
  } catch (error) {
    console.error('❌ Video generation failed:', error.message);
    return null;
  }
}

async function testTelegramImage(imageUrl) {
  if (!imageUrl) {
    console.log('\n⏭️  Skipping Telegram image test (no image URL)');
    return;
  }
  
  console.log('\n🧪 Testing Telegram Image Sending...');
  console.log('='.repeat(50));
  
  try {
    const result = await sendPhoto(imageUrl, 'Test: Gemini-generated market analysis image');
    
    if (result?.success) {
      console.log('✅ Image sent to Telegram successfully');
      console.log(`   Message ID: ${result.message_id}`);
    } else {
      console.log('❌ Image sending failed');
      console.log(`   Error: ${result?.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Telegram image sending failed:', error.message);
  }
}

async function testTelegramVideo(videoUrl) {
  if (!videoUrl) {
    console.log('\n⏭️  Skipping Telegram video test (no video URL)');
    return;
  }
  
  console.log('\n🧪 Testing Telegram Video Sending...');
  console.log('='.repeat(50));
  
  try {
    const result = await sendVideo(videoUrl, 'Test: Gemini-generated AI caster video');
    
    if (result?.success) {
      console.log('✅ Video sent to Telegram successfully');
      console.log(`   Message ID: ${result.message_id}`);
    } else {
      console.log('❌ Video sending failed');
      console.log(`   Error: ${result?.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Telegram video sending failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Gemini API Integration Test');
  console.log('='.repeat(50));
  console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`TELEGRAM_CHAT_ID: ${process.env.TELEGRAM_CHAT_ID ? '✅ Set' : '❌ Not set'}`);
  
  // 1. 画像生成テスト
  const imageUrl = await testImageGeneration();
  
  // 2. 動画生成テスト（時間がかかる可能性があるため、オプション）
  const testVideo = process.argv.includes('--video');
  let videoUrl = null;
  if (testVideo) {
    videoUrl = await testVideoGeneration();
  } else {
    console.log('\n⏭️  Skipping video generation test (use --video flag to test)');
  }
  
  // 3. Telegram送信テスト（オプション）
  const testTelegram = process.argv.includes('--telegram');
  if (testTelegram) {
    if (imageUrl) {
      await testTelegramImage(imageUrl);
    }
    if (videoUrl) {
      await testTelegramVideo(videoUrl);
    }
  } else {
    console.log('\n⏭️  Skipping Telegram tests (use --telegram flag to test)');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test completed');
  console.log('\nUsage:');
  console.log('  node scripts/test-gemini-integration.js              # Image only');
  console.log('  node scripts/test-gemini-integration.js --video      # Image + Video');
  console.log('  node scripts/test-gemini-integration.js --telegram  # Image + Telegram');
  console.log('  node scripts/test-gemini-integration.js --video --telegram  # All tests');
}

main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
