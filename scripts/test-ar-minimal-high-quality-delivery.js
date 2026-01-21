#!/usr/bin/env node
/**
 * Arabic version free (Minimal High Quality) test delivery
 * Actually sends message to Telegram
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env file
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

const { sendMessageToAsset } = require('../services/telegram/bot');

// Test data
const TEST_DATA = {
  now: new Date(),
  trapScore: 25, // Low risk
  priceUsd: 88343,
  change24h: -4.55,
  trapData: {
    exchangeNetflow: -2740, // BTC units (outflow)
    whaleRatio: 0.46, // 46%
  },
  marketData: {
    mpi: 0.65,
  },
  sentimentData: {
    sentiment: 'NEUTRAL',
  },
};

/**
 * Arabic version free message test delivery
 */
async function testArMinimalHighQualityDelivery() {
  console.log('🚀 Arabic version free (Minimal High Quality) test delivery\n');
  console.log('='.repeat(80));
  console.log('⚠️  Warning: This script will actually send a message to Telegram\n');

  try {
    // Load template
    const { formatMinimalHighQualityBriefing } = require(
      '../services/telegram/messages/user/ar/minimal-high-quality.ar'
    );

    // Generate message
    const message = formatMinimalHighQualityBriefing({
      now: TEST_DATA.now,
      trapScore: TEST_DATA.trapScore,
      priceUsd: TEST_DATA.priceUsd,
      change24h: TEST_DATA.change24h,
      trapData: TEST_DATA.trapData,
      marketData: TEST_DATA.marketData,
      sentimentData: TEST_DATA.sentimentData,
      lang: 'ar',
    });

    console.log('📝 Generated message:');
    console.log('='.repeat(80));
    console.log(message);
    console.log('='.repeat(80));
    console.log(`\nCharacter count: ${message.length} characters\n`);

    // Check environment variables
    console.log('🔍 Environment variables check:');
    const minimalChannelId = process.env.TELEGRAM_CHAT_ID_MINIMAL_AR;
    const defaultMinimalChannelId = process.env.TELEGRAM_CHAT_ID_MINIMAL;
    console.log(`  TELEGRAM_CHAT_ID_MINIMAL_AR: ${minimalChannelId || '❌ Not set'}`);
    console.log(`  TELEGRAM_CHAT_ID_MINIMAL (fallback): ${defaultMinimalChannelId || '❌ Not set'}`);
    console.log(`  TELEGRAM_BOT_TOKEN_MINIMAL: ${process.env.TELEGRAM_BOT_TOKEN_MINIMAL ? '✅ Set' : '❌ Not set'}`);
    console.log('');

    // Send to Telegram
    console.log('📤 Sending to Telegram...\n');
    const result = await sendMessageToAsset(message, 'MINIMAL', 'AR');
    
    const messageId = result?.result?.message_id || result?.message_id || 'N/A';
    const chatTitle = result?.result?.chat?.title || result?.chat?.title || 'N/A';
    
    console.log('✅ Send successful!');
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Chat: ${chatTitle}`);
    console.log('\n📱 Please check the actual UI in Telegram');

  } catch (error) {
    console.error('\n❌ An error occurred:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// If script is executed directly
if (require.main === module) {
  testArMinimalHighQualityDelivery().catch((error) => {
    console.error('❌ An error occurred during test delivery:', error);
    process.exit(1);
  });
}

module.exports = { testArMinimalHighQualityDelivery };
