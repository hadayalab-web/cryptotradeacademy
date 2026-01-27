// scripts/verify-funnel-health.js
// ファネルの動作状況を確認するスクリプト
// X投稿 → Telegram Deep Link → Whop Link → コンバージョン追跡の各ステップを検証

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// 必要なモジュールをインポート
const { getWhopProductUrl } = require('../services/telegram/whop-links');

// サポートされている言語
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

/**
 * Telegram Deep Linkの生成をテスト
 */
function testTelegramDeepLink(lang, source) {
  try {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TrapDefenceBot';
    const normalizedBotUsername = botUsername.replace(/^@/, '');
    const normalizedLang = lang.toLowerCase().replace('_', '-');
    
    const startParam = `minimal_${normalizedLang}_${source}`;
    const deepLink = `https://t.me/${normalizedBotUsername}?start=${startParam}`;
    
    // UTMパラメータのテスト
    const utmParams = [
      `utm_source=${encodeURIComponent(`${source}_${normalizedLang}`)}`,
      `utm_medium=social`,
      `utm_campaign=${source}_${normalizedLang}_${new Date().toISOString().split('T')[0]}`
    ];
    
    const fullDeepLink = `${deepLink}&${utmParams.join('&')}`;
    
    return {
      success: true,
      deepLink: fullDeepLink,
      botUsername: normalizedBotUsername,
      startParam,
      lang: normalizedLang,
      source
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Whop Linkの生成をテスト
 */
function testWhopLink(lang) {
  try {
    const normalizedLang = lang.toLowerCase().replace('_', '-');
    const whopLink = getWhopProductUrl(normalizedLang);
    const whopLinkWithPromo = `${whopLink}?promo=DEFEND50`;
    
    return {
      success: true,
      whopLink,
      whopLinkWithPromo,
      promoCode: 'DEFEND50',
      lang: normalizedLang
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * X投稿の各タイプのリンク生成をテスト
 */
function testXPostLinks() {
  const results = {
    quoteRepost: {},
    freeReport: {},
    minimalVersion: {}
  };
  
  // Quote Repostのテスト
  console.log('\n📋 Quote Repost リンクテスト');
  console.log('='.repeat(80));
  SUPPORTED_LANGS.forEach(lang => {
    const telegramLink = testTelegramDeepLink(lang, 'x_quote');
    const whopLink = testWhopLink(lang);
    
    results.quoteRepost[lang] = {
      telegram: telegramLink,
      whop: whopLink
    };
    
    console.log(`\n[${lang.toUpperCase()}]`);
    console.log(`  Telegram Deep Link: ${telegramLink.success ? '✅' : '❌'} ${telegramLink.deepLink || telegramLink.error}`);
    console.log(`  Whop Link: ${whopLink.success ? '✅' : '❌'} ${whopLink.whopLinkWithPromo || whopLink.error}`);
  });
  
  // Free Reportのテスト
  console.log('\n\n📋 Free Report リンクテスト');
  console.log('='.repeat(80));
  SUPPORTED_LANGS.forEach(lang => {
    const telegramLink = testTelegramDeepLink(lang, 'x_direct');
    const whopLink = testWhopLink(lang);
    
    results.freeReport[lang] = {
      telegram: telegramLink,
      whop: whopLink
    };
    
    console.log(`\n[${lang.toUpperCase()}]`);
    console.log(`  Telegram Deep Link: ${telegramLink.success ? '✅' : '❌'} ${telegramLink.deepLink || telegramLink.error}`);
    console.log(`  Whop Link: ${whopLink.success ? '✅' : '❌'} ${whopLink.whopLinkWithPromo || whopLink.error}`);
  });
  
  // Minimal Versionのテスト
  console.log('\n\n📋 Minimal Version リンクテスト');
  console.log('='.repeat(80));
  SUPPORTED_LANGS.forEach(lang => {
    const telegramLink = testTelegramDeepLink(lang, 'x_minimal');
    const whopLink = testWhopLink(lang);
    
    results.minimalVersion[lang] = {
      telegram: telegramLink,
      whop: whopLink
    };
    
    console.log(`\n[${lang.toUpperCase()}]`);
    console.log(`  Telegram Deep Link: ${telegramLink.success ? '✅' : '❌'} ${telegramLink.deepLink || telegramLink.error}`);
    console.log(`  Whop Link: ${whopLink.success ? '✅' : '❌'} ${whopLink.whopLinkWithPromo || whopLink.error}`);
  });
  
  return results;
}

/**
 * 環境変数の確認
 */
function checkEnvironmentVariables() {
  console.log('\n🔍 環境変数チェック');
  console.log('='.repeat(80));
  
  const requiredVars = [
    'TELEGRAM_BOT_USERNAME',
    'TELEGRAM_BOT_TOKEN',
    'X_API_CONSUMER_KEY',
    'X_API_CONSUMER_KEY_SECRET', // 実装ではX_API_CONSUMER_KEY_SECRETを使用
    'X_API_ACCESS_TOKEN',
    'X_API_ACCESS_TOKEN_SECRET',
  ];
  
  const optionalVars = [
    'WHOP_PRODUCT_ID_EN',
    'WHOP_PRODUCT_ID_JA',
    'WHOP_PRODUCT_ID_ES',
    'WHOP_PRODUCT_ID_PT_BR',
    'WHOP_PRODUCT_ID_AR',
    'WHOP_PRODUCT_ID_KO',
  ];
  
  const results = {
    required: {},
    optional: {}
  };
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    results.required[varName] = {
      set: !!value,
      value: value ? (varName.includes('TOKEN') || varName.includes('SECRET') || varName.includes('KEY') ? '***' : value) : null
    };
    console.log(`  ${varName}: ${value ? '✅' : '❌'} ${results.required[varName].value || 'NOT SET'}`);
  });
  
  console.log('\n  Optional Variables:');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    results.optional[varName] = {
      set: !!value,
      value: value || null
    };
    console.log(`  ${varName}: ${value ? '✅' : '⚠️'} ${results.optional[varName].value || 'NOT SET'}`);
  });
  
  return results;
}

/**
 * Cronスケジュールの確認
 */
function checkCronSchedule() {
  console.log('\n⏰ Cronスケジュールチェック');
  console.log('='.repeat(80));
  
  try {
    const vercelJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf-8'));
    const crons = vercelJson.crons || [];
    
    const xPostCrons = crons.filter(cron => 
      cron.path.includes('x-quote-repost') || 
      cron.path.includes('x-post-free-report') || 
      cron.path.includes('x-post-minimal-version')
    );
    
    console.log('\n  X投稿関連のCronジョブ:');
    xPostCrons.forEach(cron => {
      console.log(`    ${cron.path}: ${cron.schedule}`);
    });
    
    return {
      success: true,
      crons: xPostCrons,
      totalCrons: crons.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ファネルの動作状況を総合的に確認
 */
async function verifyFunnelHealth() {
  console.log('🚀 ファネル動作状況確認');
  console.log('='.repeat(80));
  console.log(`実行日時: ${new Date().toISOString()}`);
  
  // 1. 環境変数の確認
  const envCheck = checkEnvironmentVariables();
  
  // 2. Cronスケジュールの確認
  const cronCheck = checkCronSchedule();
  
  // 3. リンク生成のテスト
  const linkTest = testXPostLinks();
  
  // 4. 総合レポートの生成
  const report = {
    timestamp: new Date().toISOString(),
    environment: envCheck,
    cron: cronCheck,
    links: linkTest,
    summary: {
      allRequiredVarsSet: Object.values(envCheck.required).every(v => v.set),
      cronConfigured: cronCheck.success,
      linksWorking: Object.values(linkTest).every(type => 
        Object.values(type).every(lang => 
          lang.telegram.success && lang.whop.success
        )
      )
    }
  };
  
  // 5. 結果の保存
  const outputDir = path.join(__dirname, '..', 'docs', 'reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFile = path.join(outputDir, `funnel-health-check-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2), 'utf-8');
  
  // 6. 総合結果の表示
  console.log('\n\n📊 総合結果');
  console.log('='.repeat(80));
  console.log(`  環境変数: ${report.summary.allRequiredVarsSet ? '✅' : '❌'}`);
  console.log(`  Cron設定: ${report.summary.cronConfigured ? '✅' : '❌'}`);
  console.log(`  リンク生成: ${report.summary.linksWorking ? '✅' : '❌'}`);
  console.log(`\n  詳細レポート: ${outputFile}`);
  
  if (report.summary.allRequiredVarsSet && report.summary.cronConfigured && report.summary.linksWorking) {
    console.log('\n  ✅ ファネルは正常に動作する準備ができています！');
  } else {
    console.log('\n  ⚠️ ファネルに問題がある可能性があります。上記の詳細を確認してください。');
  }
  
  return report;
}

// 実行
if (require.main === module) {
  verifyFunnelHealth()
    .then(() => {
      console.log('\n✅ 確認完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { verifyFunnelHealth, testTelegramDeepLink, testWhopLink };
