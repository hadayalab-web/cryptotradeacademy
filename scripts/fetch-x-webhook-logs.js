// scripts/fetch-x-webhook-logs.js
// X API Webhookログを取得するスクリプト

const { kv } = require('@vercel/kv');

/**
 * X API Webhookログを取得
 * @param {number} hours - 取得する時間範囲（デフォルト: 12時間）
 */
async function fetchWebhookLogs(hours = 12) {
  console.log(`🔍 X API Webhookログを取得中（過去${hours}時間）...\n`);
  
  if (!kv) {
    console.error('❌ Vercel KVが利用できません');
    return;
  }

  try {
    // Webhookアクセスログを取得
    // 注意: KVストレージには個別のキーとして保存されているため、
    // すべてのキーをスキャンする必要がある
    // 実際の実装では、時間範囲に基づいてキーをフィルタリングする必要がある
    
    const now = Date.now();
    const timeRange = hours * 60 * 60 * 1000; // ミリ秒に変換
    const cutoffTime = now - timeRange;
    
    console.log(`📊 検索範囲: ${new Date(cutoffTime).toISOString()} ～ ${new Date(now).toISOString()}\n`);
    
    // 注意: Vercel KVはキーのスキャン機能が限られているため、
    // 実際の実装では、時間ベースのインデックスを使用する必要がある
    
    // デモ: 特定のキーパターンで検索
    const webhookKeys = [
      'x:webhook:access',
      'x:webhook:like',
      'x:webhook:retweet',
      'x:webhook:reply',
      'x:webhook:stats',
    ];
    
    const logs = [];
    
    // 各キーパターンでログを検索
    for (const keyPattern of webhookKeys) {
      try {
        // 注意: 実際の実装では、時間範囲に基づいてキーを生成して検索する必要がある
        // 例: x:webhook:access:${timestamp} の形式で保存されている場合
        
        // デモ: 最新の10件のログを取得
        // 実際の実装では、時間範囲に基づいてキーを生成して検索する必要がある
        console.log(`🔍 ${keyPattern} パターンのログを検索中...`);
        
        // 実際の実装では、時間範囲に基づいてキーを生成して検索する必要がある
        // 例: 1時間ごとのキーを生成して検索
        for (let i = 0; i < hours; i++) {
          const hourTimestamp = now - (i * 60 * 60 * 1000);
          const hourKey = `${keyPattern}:${hourTimestamp}`;
          
          try {
            const data = await kv.get(hourKey);
            if (data) {
              logs.push({
                key: hourKey,
                pattern: keyPattern,
                data,
                timestamp: new Date(hourTimestamp).toISOString(),
              });
            }
          } catch (error) {
            // キーが存在しない場合は無視
          }
        }
      } catch (error) {
        console.warn(`⚠️ ${keyPattern} パターンの検索に失敗:`, error.message);
      }
    }
    
    console.log(`\n📊 取得したログ: ${logs.length}件\n`);
    
    // ログを時系列でソート
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // ログを表示
    logs.forEach((log, index) => {
      console.log(`[${index + 1}] ${log.timestamp}`);
      console.log(`    パターン: ${log.pattern}`);
      console.log(`    キー: ${log.key}`);
      console.log(`    データ:`, JSON.stringify(log.data, null, 2).substring(0, 200));
      console.log('');
    });
    
    // JSONファイルに保存
    const fs = require('fs');
    const path = require('path');
    const outputDir = path.join(__dirname, '../data/webhook-logs');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `webhook-logs-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(logs, null, 2));
    
    console.log(`✅ ログを保存しました: ${outputFile}`);
    
    return logs;
  } catch (error) {
    console.error('❌ Webhookログの取得に失敗:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// メイン実行
if (require.main === module) {
  const hours = parseInt(process.argv[2]) || 12;
  fetchWebhookLogs(hours)
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { fetchWebhookLogs };
