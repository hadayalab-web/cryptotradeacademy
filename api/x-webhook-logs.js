// api/x-webhook-logs.js
// X API Webhookログを取得するAPIエンドポイント

const { kv } = require('@vercel/kv');

/**
 * X API Webhookログを取得するAPI
 * GET /api/x-webhook-logs?hours=12
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  // 認証チェック
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const hours = parseInt(req.query.hours) || 12;
    console.log(`[X Webhook Logs] 🔍 Fetching webhook logs for past ${hours} hours...`);
    
    if (!kv) {
      return res.status(500).json({ error: 'Vercel KV not available' });
    }

    const now = Date.now();
    const timeRange = hours * 60 * 60 * 1000;
    const cutoffTime = now - timeRange;
    
    const logs = [];
    
    // Webhookアクセスログを取得
    // 注意: 実際の実装では、時間範囲に基づいてキーを生成して検索する必要がある
    // 現在の実装では、x:webhook:access:${timestamp} の形式で保存されている
    
    // 1時間ごとのキーを生成して検索
    for (let i = 0; i < hours; i++) {
      const hourTimestamp = now - (i * 60 * 60 * 1000);
      
      // 各時間帯のログを検索（1時間の範囲内）
      for (let j = 0; j < 60; j++) {
        const minuteTimestamp = hourTimestamp - (j * 60 * 1000);
        const accessKey = `x:webhook:access:${minuteTimestamp}`;
        
        try {
          const data = await kv.get(accessKey);
          if (data && new Date(data.timestamp) >= new Date(cutoffTime)) {
            logs.push({
              type: 'access',
              key: accessKey,
              ...data,
            });
          }
        } catch (error) {
          // キーが存在しない場合は無視
        }
      }
    }
    
    // イベントログを取得（like, retweet, reply）
    const eventTypes = ['like', 'retweet', 'reply'];
    for (const eventType of eventTypes) {
      // 各イベントタイプのログを検索
      // 注意: 実際の実装では、時間範囲に基づいてキーを生成して検索する必要がある
      // 現在の実装では、x:webhook:${eventType}:${tweetId}:${timestamp} の形式で保存されている
      
      // デモ: 最新の100件のイベントを取得
      // 実際の実装では、時間範囲に基づいてキーを生成して検索する必要がある
      for (let i = 0; i < 100; i++) {
        const eventTimestamp = now - (i * 60 * 1000);
        const eventKey = `x:webhook:${eventType}:*:${eventTimestamp}`;
        
        // 注意: Vercel KVはワイルドカード検索をサポートしていないため、
        // 実際の実装では、時間範囲に基づいてキーを生成して検索する必要がある
        // または、インデックスキーを使用する必要がある
      }
    }
    
    // ログを時系列でソート
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log(`[X Webhook Logs] ✅ Found ${logs.length} logs`);
    
    return res.status(200).json({
      success: true,
      hours,
      cutoffTime: new Date(cutoffTime).toISOString(),
      currentTime: new Date(now).toISOString(),
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error('[X Webhook Logs] ❌ Error:', error.message);
    console.error('[X Webhook Logs] Stack:', error.stack);
    
    return res.status(500).json({
      error: 'Failed to fetch webhook logs',
      message: error.message,
    });
  }
}

module.exports = handler;
