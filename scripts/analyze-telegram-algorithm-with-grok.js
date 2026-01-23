// scripts/analyze-telegram-algorithm-with-grok.js
// GrokにTelegramアルゴリズムを解析させるスクリプト

const { analyzeTelegramAlgorithmWithGrok, getOptimalTelegramTiming } = require('../services/grok/telegramAlgorithmAnalyzer');

async function main() {
  const command = process.argv[2] || 'algorithm'; // 'algorithm' | 'timing'
  
  console.log(`\n🔍 Analyzing Telegram algorithm with Grok...\n`);
  
  try {
    if (command === 'timing') {
      // 最適タイミング分析
      const userData = {
        timezones: ['UTC', 'Asia/Tokyo', 'America/New_York'],
        activeHours: {
          'UTC': [9, 12, 18, 21],
          'Asia/Tokyo': [9, 12, 18, 21],
          'America/New_York': [9, 12, 18, 21],
        },
      };
      
      const result = await getOptimalTelegramTiming(userData);
      
      if (!result.success) {
        console.error('❌ Analysis failed:', result.error);
        process.exit(1);
      }
      
      console.log('✅ Timing analysis completed!\n');
      console.log('='.repeat(80));
      console.log(JSON.stringify(result.timing, null, 2));
      console.log('='.repeat(80));
    } else {
      // アルゴリズム解析
      const telegramData = {
        messagesSent: 1000,
        messagesDelivered: 950,
        messagesRead: 800,
        buttonClicks: 200,
        conversions: 50,
        blocks: 10,
        mutes: 5,
        vsl1: {
          sent: 500,
          read: 400,
          clicked: 100,
          converted: 25,
        },
        vsl2: {
          sent: 300,
          read: 250,
          clicked: 80,
          converted: 20,
        },
        reminder: {
          sent: 150,
          read: 120,
          clicked: 15,
          converted: 3,
        },
        lastCall: {
          sent: 50,
          read: 30,
          clicked: 5,
          converted: 2,
        },
      };
      
      const result = await analyzeTelegramAlgorithmWithGrok(telegramData);
      
      if (!result.success) {
        console.error('❌ Analysis failed:', result.error);
        if (result.rawResponse) {
          console.log('\nRaw response:', result.rawResponse);
        }
        process.exit(1);
      }
      
      console.log('✅ Algorithm analysis completed!\n');
      console.log('='.repeat(80));
      console.log(JSON.stringify(result.analysis, null, 2));
      console.log('='.repeat(80));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
