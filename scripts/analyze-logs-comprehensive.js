// scripts/analyze-logs-comprehensive.js
// ログファイルの徹底分析（CronJobs、オプトイン、コンバージョン、エラー、テンプレート、言語別など）

const fs = require('fs');
const path = require('path');

const logFile = 'c:/Users/chiba/Downloads/logs_result (3).json';

async function analyzeLogsComprehensive() {
  console.log('='.repeat(100));
  console.log('📊 ログファイル徹底分析');
  console.log('='.repeat(100));
  console.log();

  try {
    // ログファイルを読み込む
    console.log(`📂 ログファイルを読み込み中: ${logFile}`);
    const fileContent = fs.readFileSync(logFile, 'utf8');
    const logs = JSON.parse(fileContent);
    console.log(`✅ ログエントリ数: ${logs.length.toLocaleString()}件`);
    console.log();

    // ========================================
    // 1. CronJobs実行状況の分析
    // ========================================
    console.log('='.repeat(100));
    console.log('📋 1. CronJobs実行状況');
    console.log('='.repeat(100));

    const cronJobs = {};
    const cronEndpoints = [
      'cron',
      'x-post-free-report',
      'x-post-minimal-version',
      'x-quote-repost',
      'x-engagement-metrics',
      'x-algorithm-analysis',
      'vsl2-last-call',
      'weekly-report',
      'monthly-engagement-report',
    ];

    for (const log of logs) {
      const requestPath = log.requestPath || '';
      const functionName = log.function || '';
      const path = requestPath || functionName;
      
      for (const endpoint of cronEndpoints) {
        if (path.includes(endpoint)) {
          if (!cronJobs[endpoint]) {
            cronJobs[endpoint] = {
              count: 0,
              successes: 0,
              errors: 0,
              timestamps: [],
            };
          }
          cronJobs[endpoint].count++;
          
          const statusCode = log.responseStatusCode;
          if (statusCode >= 200 && statusCode < 300) {
            cronJobs[endpoint].successes++;
          } else if (statusCode >= 400) {
            cronJobs[endpoint].errors++;
          }
          
          const timestamp = log.TimeUTC || log.timestamp || '';
          if (timestamp) {
            cronJobs[endpoint].timestamps.push(timestamp);
          }
        }
      }
    }

    for (const [endpoint, data] of Object.entries(cronJobs)) {
      console.log(`\n📌 ${endpoint}:`);
      console.log(`   実行回数: ${data.count}回`);
      console.log(`   成功: ${data.successes}回`);
      console.log(`   エラー: ${data.errors}回`);
      if (data.timestamps.length > 0) {
        console.log(`   最新実行: ${data.timestamps[data.timestamps.length - 1]}`);
      }
    }

    // ========================================
    // 2. エラー分析
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('❌ 2. エラー分析');
    console.log('='.repeat(100));

    const errors = [];
    const errorPatterns = {};
    const errorEndpoints = {};

    for (const log of logs) {
      const level = (log.level || '').toLowerCase();
      const statusCode = log.responseStatusCode;
      const message = (log.message || log.text || '').toLowerCase();
      
      if (level === 'error' || statusCode >= 400 || message.includes('error') || message.includes('failed') || message.includes('exception')) {
        errors.push(log);
        
        // エラーパターン
        let pattern = 'Other';
        if (message.includes('syntaxerror')) pattern = 'SyntaxError';
        else if (message.includes('referenceerror')) pattern = 'ReferenceError';
        else if (message.includes('typeerror')) pattern = 'TypeError';
        else if (message.includes('cannot find module')) pattern = 'ModuleNotFound';
        else if (message.includes('timeout')) pattern = 'Timeout';
        else if (message.includes('rate limit')) pattern = 'RateLimit';
        else if (message.includes('unauthorized')) pattern = 'Unauthorized';
        
        errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
        
        // エンドポイント別
        const endpoint = log.requestPath || log.function || 'unknown';
        errorEndpoints[endpoint] = (errorEndpoints[endpoint] || 0) + 1;
      }
    }

    console.log(`\n総エラー数: ${errors.length}件`);
    console.log('\nエラーパターン:');
    for (const [pattern, count] of Object.entries(errorPatterns).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${pattern}: ${count}件`);
    }
    
    if (errors.length > 0) {
      console.log('\nエラー詳細（最初の10件）:');
      errors.slice(0, 10).forEach((error, idx) => {
        const msg = (error.message || error.text || '').substring(0, 200);
        const timestamp = error.TimeUTC || error.timestamp || '';
        const endpoint = error.requestPath || error.function || 'unknown';
        console.log(`\n   ${idx + 1}. [${timestamp}] ${endpoint}`);
        console.log(`      ${msg}`);
      });
    } else {
      console.log('\n✅ エラーは検出されませんでした');
    }

    // ========================================
    // 3. Minimal Version（無料版）オプトイン分析
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('🎁 3. Minimal Version（無料版）オプトイン分析');
    console.log('='.repeat(100));

    const minimalOptIns = [];
    const minimalByLang = {};
    const minimalTemplates = {};
    const minimalSentLogs = [];

    for (const log of logs) {
      const message = (log.message || log.text || '').toLowerCase();
      const fullMessage = log.message || log.text || '';
      
      // 1. FreeUsers追加ログ（オプトイン）
      if (message.includes('[freeusers]') && message.includes('added free user')) {
        minimalOptIns.push(log);
        
        // chatIdとlangを抽出
        const chatIdMatch = fullMessage.match(/added free user:\s*(\d+)/i);
        const langMatch = fullMessage.match(/lang:\s*([a-z-]+)/i);
        if (langMatch) {
          const lang = langMatch[1].toLowerCase();
          minimalByLang[lang] = (minimalByLang[lang] || 0) + 1;
        }
      }
      
      // 2. Minimal Version送信ログ
      if (message.includes('[minimal]') || message.includes('[free version]') || 
          (message.includes('minimal') && (message.includes('sent') || message.includes('message sent')))) {
        minimalSentLogs.push(log);
        
        // 言語別
        const langMatch = fullMessage.match(/(en|es|pt-br|ar|ko|ja|english|spanish|portuguese|arabic|korean|japanese)/i);
        if (langMatch) {
          const lang = langMatch[1].toLowerCase();
          if (lang === 'english') minimalByLang['en'] = (minimalByLang['en'] || 0) + 1;
          else if (lang === 'spanish') minimalByLang['es'] = (minimalByLang['es'] || 0) + 1;
          else if (lang === 'portuguese') minimalByLang['pt-br'] = (minimalByLang['pt-br'] || 0) + 1;
          else if (lang === 'arabic') minimalByLang['ar'] = (minimalByLang['ar'] || 0) + 1;
          else if (lang === 'korean') minimalByLang['ko'] = (minimalByLang['ko'] || 0) + 1;
          else if (lang === 'japanese') minimalByLang['ja'] = (minimalByLang['ja'] || 0) + 1;
          else minimalByLang[lang] = (minimalByLang[lang] || 0) + 1;
        }
      }
      
      // 3. テンプレートロード
      if (message.includes('template') && message.includes('minimal')) {
        if (message.includes('minimal-high-quality')) {
          minimalTemplates['minimal-high-quality'] = (minimalTemplates['minimal-high-quality'] || 0) + 1;
        } else if (message.includes('minimal')) {
          minimalTemplates['minimal'] = (minimalTemplates['minimal'] || 0) + 1;
        }
      }
    }

    console.log(`\n総オプトイン数（FreeUsers追加）: ${minimalOptIns.length}件`);
    console.log(`Minimal Version送信ログ: ${minimalSentLogs.length}件`);
    
    if (Object.keys(minimalByLang).length > 0) {
      console.log('\n言語別オプトイン:');
      for (const [lang, count] of Object.entries(minimalByLang).sort((a, b) => b[1] - a[1])) {
        console.log(`   ${lang}: ${count}件`);
      }
    }
    
    if (Object.keys(minimalTemplates).length > 0) {
      console.log('\nテンプレート使用状況:');
      for (const [template, count] of Object.entries(minimalTemplates)) {
        console.log(`   ${template}: ${count}回`);
      }
    }

    if (minimalOptIns.length > 0) {
      console.log('\nオプトイン詳細（FreeUsers追加、最初の10件）:');
      minimalOptIns.slice(0, 10).forEach((log, idx) => {
        const msg = (log.message || log.text || '').substring(0, 300);
        const timestamp = log.TimeUTC || log.timestamp || '';
        console.log(`\n   ${idx + 1}. [${timestamp}]`);
        console.log(`      ${msg}`);
      });
    }
    
    if (minimalSentLogs.length > 0) {
      console.log('\nMinimal Version送信ログ（最初の10件）:');
      minimalSentLogs.slice(0, 10).forEach((log, idx) => {
        const msg = (log.message || log.text || '').substring(0, 300);
        const timestamp = log.TimeUTC || log.timestamp || '';
        console.log(`\n   ${idx + 1}. [${timestamp}]`);
        console.log(`      ${msg}`);
      });
    }

    // ========================================
    // 4. Regular Briefing（有料版）コンバージョン分析
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('💰 4. Regular Briefing（有料版）コンバージョン分析');
    console.log('='.repeat(100));

    const regularConversions = [];
    const regularByLang = {};
    const regularSentLogs = [];

    for (const log of logs) {
      const message = (log.message || log.text || '').toLowerCase();
      const fullMessage = log.message || log.text || '';
      
      // 1. Regular Briefing送信ログ
      if (message.includes('[regular]') || 
          (message.includes('regular') && (message.includes('sent') || message.includes('successfully sent'))) ||
          (message.includes('[telegram]') && message.includes('regular message sent'))) {
        regularSentLogs.push(log);
        
        // 言語別
        const langMatch = fullMessage.match(/\(([a-z-]+)\)/i) || fullMessage.match(/(en|es|pt-br|ar|ko|ja|english|spanish|portuguese|arabic|korean|japanese)/i);
        if (langMatch) {
          const lang = langMatch[1].toLowerCase();
          if (lang === 'english') regularByLang['en'] = (regularByLang['en'] || 0) + 1;
          else if (lang === 'spanish') regularByLang['es'] = (regularByLang['es'] || 0) + 1;
          else if (lang === 'portuguese') regularByLang['pt-br'] = (regularByLang['pt-br'] || 0) + 1;
          else if (lang === 'arabic') regularByLang['ar'] = (regularByLang['ar'] || 0) + 1;
          else if (lang === 'korean') regularByLang['ko'] = (regularByLang['ko'] || 0) + 1;
          else if (lang === 'japanese') regularByLang['ja'] = (regularByLang['ja'] || 0) + 1;
          else regularByLang[lang] = (regularByLang[lang] || 0) + 1;
        }
      }
      
      // 2. コンバージョン関連（Whop、subscriptionなど）
      if (message.includes('conversion') || message.includes('whop') || message.includes('subscription') || 
          message.includes('コンバージョン') || message.includes('有料版')) {
        regularConversions.push(log);
      }
    }

    console.log(`\nRegular Briefing送信ログ: ${regularSentLogs.length}件`);
    console.log(`コンバージョン関連ログ: ${regularConversions.length}件`);
    
    if (Object.keys(regularByLang).length > 0) {
      console.log('\n言語別Regular Briefing送信:');
      for (const [lang, count] of Object.entries(regularByLang).sort((a, b) => b[1] - a[1])) {
        console.log(`   ${lang}: ${count}件`);
      }
    }

    if (regularSentLogs.length > 0) {
      console.log('\nRegular Briefing送信ログ（最初の10件）:');
      regularSentLogs.slice(0, 10).forEach((log, idx) => {
        const msg = (log.message || log.text || '').substring(0, 300);
        const timestamp = log.TimeUTC || log.timestamp || '';
        console.log(`\n   ${idx + 1}. [${timestamp}]`);
        console.log(`      ${msg}`);
      });
    }

    if (regularConversions.length > 0) {
      console.log('\nコンバージョン関連ログ（最初の10件）:');
      regularConversions.slice(0, 10).forEach((log, idx) => {
        const msg = (log.message || log.text || '').substring(0, 300);
        const timestamp = log.TimeUTC || log.timestamp || '';
        console.log(`\n   ${idx + 1}. [${timestamp}]`);
        console.log(`      ${msg}`);
      });
    }

    // コンバージョン率計算（オプトイン数と送信数の比較）
    if (minimalOptIns.length > 0 && regularSentLogs.length > 0) {
      const conversionRate = (regularSentLogs.length / minimalOptIns.length) * 100;
      console.log(`\n📊 Minimal オプトイン → Regular 送信 比率: ${conversionRate.toFixed(2)}%`);
    }

    // ========================================
    // 5. テンプレートロード分析
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('📝 5. テンプレートロード分析');
    console.log('='.repeat(100));

    const templateLoads = {
      success: [],
      failed: [],
      fallback: [],
    };

    for (const log of logs) {
      const message = (log.message || log.text || '').toLowerCase();
      
      if (message.includes('template') || message.includes('テンプレート')) {
        if (message.includes('loaded') || message.includes('success') || message.includes('成功')) {
          templateLoads.success.push(log);
        } else if (message.includes('failed') || message.includes('error') || message.includes('失敗')) {
          templateLoads.failed.push(log);
        } else if (message.includes('fallback') || message.includes('フォールバック')) {
          templateLoads.fallback.push(log);
        }
      }
    }

    console.log(`\nテンプレートロード成功: ${templateLoads.success.length}回`);
    console.log(`テンプレートロード失敗: ${templateLoads.failed.length}回`);
    console.log(`テンプレートフォールバック: ${templateLoads.fallback.length}回`);

    if (templateLoads.failed.length > 0) {
      console.log('\n失敗詳細（最初の5件）:');
      templateLoads.failed.slice(0, 5).forEach((log, idx) => {
        const msg = (log.message || log.text || '').substring(0, 200);
        const timestamp = log.TimeUTC || log.timestamp || '';
        console.log(`\n   ${idx + 1}. [${timestamp}]`);
        console.log(`      ${msg}`);
      });
    }

    // ========================================
    // 6. 言語別配信状況
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('🌍 6. 言語別配信状況');
    console.log('='.repeat(100));

    const langDistribution = {};
    const langKeywords = {
      en: ['english', 'en', 'en/'],
      es: ['spanish', 'es', 'es/'],
      'pt-br': ['portuguese', 'pt-br', 'pt', 'pt/'],
      ar: ['arabic', 'ar', 'ar/'],
      ko: ['korean', 'ko', 'ko/'],
      ja: ['japanese', 'ja', 'ja/'],
    };

    for (const log of logs) {
      const message = (log.message || log.text || '').toLowerCase();
      
      for (const [lang, keywords] of Object.entries(langKeywords)) {
        for (const keyword of keywords) {
          if (message.includes(keyword)) {
            langDistribution[lang] = (langDistribution[lang] || 0) + 1;
            break;
          }
        }
      }
    }

    console.log('\n言語別ログ出現回数:');
    for (const [lang, count] of Object.entries(langDistribution).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${lang}: ${count}回`);
    }

    // ========================================
    // 7. X投稿・インプレッション・エンゲージメント分析
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('📱 7. X投稿・インプレッション・エンゲージメント分析');
    console.log('='.repeat(100));

    const xPosts = [];
    const impressions = [];
    const engagements = [];
    const quoteReposts = [];

    for (const log of logs) {
      const message = (log.message || log.text || '').toLowerCase();
      
      // X投稿
      if (message.includes('posted') || message.includes('tweet') || message.includes('quote repost')) {
        xPosts.push(log);
        
        if (message.includes('quote repost')) {
          quoteReposts.push(log);
        }
      }
      
      // インプレッション
      if (message.includes('impression') || message.includes('impression_count')) {
        impressions.push(log);
      }
      
      // エンゲージメント
      if (message.includes('engagement') || message.includes('like_count') || message.includes('retweet_count') || message.includes('reply_count')) {
        engagements.push(log);
      }
    }

    console.log(`\nX投稿数: ${xPosts.length}件`);
    console.log(`Quote Repost数: ${quoteReposts.length}件`);
    console.log(`インプレッション関連ログ: ${impressions.length}件`);
    console.log(`エンゲージメント関連ログ: ${engagements.length}件`);

    // 実際のインプレッション数を抽出
    const actualImpressions = [];
    for (const log of impressions) {
      const message = log.message || log.text || '';
      const match = message.match(/impression_count[:\s]+(\d+)/i) || 
                    message.match(/impressions?[:\s]+(\d+)/i);
      if (match) {
        const count = parseInt(match[1]);
        if (count > 0) {
          actualImpressions.push({ count, timestamp: log.TimeUTC || log.timestamp });
        }
      }
    }

    if (actualImpressions.length > 0) {
      const totalImpressions = actualImpressions.reduce((sum, item) => sum + item.count, 0);
      console.log(`\n実際のインプレッション総数: ${totalImpressions.toLocaleString()}`);
      console.log(`インプレッション記録数: ${actualImpressions.length}件`);
    }

    // ========================================
    // 8. サマリー
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('📊 8. 総合サマリー');
    console.log('='.repeat(100));

    console.log(`\n✅ CronJobs実行: ${Object.keys(cronJobs).length}種類`);
    console.log(`❌ エラー数: ${errors.length}件`);
    console.log(`🎁 Minimal Version オプトイン（FreeUsers追加）: ${minimalOptIns.length}件`);
    console.log(`📤 Minimal Version 送信ログ: ${minimalSentLogs.length}件`);
    console.log(`💰 Regular Briefing 送信ログ: ${regularSentLogs.length}件`);
    console.log(`💳 コンバージョン関連ログ: ${regularConversions.length}件`);
    
    if (minimalOptIns.length > 0 && regularSentLogs.length > 0) {
      const conversionRate = (regularSentLogs.length / minimalOptIns.length) * 100;
      console.log(`📈 Minimal オプトイン → Regular 送信 比率: ${conversionRate.toFixed(2)}%`);
    }
    
    console.log(`📝 テンプレートロード成功: ${templateLoads.success.length}回`);
    console.log(`📝 テンプレートロード失敗: ${templateLoads.failed.length}回`);
    console.log(`📱 X投稿数: ${xPosts.length}件`);
    console.log(`📱 Quote Repost数: ${quoteReposts.length}件`);
    
    if (actualImpressions.length > 0) {
      const totalImpressions = actualImpressions.reduce((sum, item) => sum + item.count, 0);
      console.log(`👁️  インプレッション総数: ${totalImpressions.toLocaleString()}`);
    }

    console.log('\n' + '='.repeat(100));
    console.log('✅ 徹底分析完了');
    console.log('='.repeat(100));

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// 実行
analyzeLogsComprehensive().catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
});
