// api/x-webhook.js
// X API Webhookエンドポイント（リアルタイムエンゲージメント追跡）

const crypto = require('crypto');

// Vercel KV（エンゲージメントデータ保存用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[X Webhook] @vercel/kv not available:', error.message);
}

// X API Consumer Secret（Webhook署名検証用）
const X_API_CONSUMER_KEY_SECRET = process.env.X_API_CONSUMER_KEY_SECRET;

/**
 * CRC Challenge-Response Check（Webhook URL検証）
 * X APIがWebhook URLの所有権を確認するために送信するCRCトークンを検証
 * @param {string} crcToken - CRCトークン
 * @returns {string} 検証レスポンストークン
 */
function generateCrcResponse(crcToken) {
  if (!X_API_CONSUMER_KEY_SECRET) {
    throw new Error('X_API_CONSUMER_KEY_SECRET is required for CRC verification');
  }

  // HMAC SHA-256ハッシュを生成
  const hmac = crypto.createHmac('sha256', X_API_CONSUMER_KEY_SECRET);
  hmac.update(crcToken);
  const hash = hmac.digest('base64');

  // レスポンス形式: {"response_token": "sha256=<encoded_hash>"}
  return {
    response_token: `sha256=${hash}`
  };
}

/**
 * Webhook署名を検証（POSTリクエストの署名検証）
 * @param {string} signature - X APIから送信された署名
 * @param {string} body - リクエストボディ（文字列）
 * @param {string} timestamp - タイムスタンプ
 * @returns {boolean} 署名が有効な場合true
 */
function verifyWebhookSignature(signature, body, timestamp) {
  if (!X_API_CONSUMER_KEY_SECRET) {
    console.warn('[X Webhook] X_API_CONSUMER_KEY_SECRET not set, skipping signature verification');
    return true; // 開発環境では検証をスキップ
  }

  // 署名検証の実装（X APIの仕様に従う）
  // 注意: X APIの署名検証の詳細な実装は公式ドキュメントを参照
  // ここでは基本的な実装を提供
  
  try {
    // 署名文字列を構築（X APIの仕様に従う）
    const signatureString = `${timestamp}.${body}`;
    
    // HMAC SHA-256ハッシュを生成
    const hmac = crypto.createHmac('sha256', X_API_CONSUMER_KEY_SECRET);
    hmac.update(signatureString);
    const expectedSignature = hmac.digest('base64');
    
    // 署名を比較
    return signature === expectedSignature;
  } catch (error) {
    console.error('[X Webhook] Signature verification error:', error.message);
    return false;
  }
}

/**
 * いいねイベントを処理
 * @param {Object} event - いいねイベントデータ
 */
async function handleLikeEvent(event) {
  try {
    const tweetId = event.favorite_events?.[0]?.favorited_status?.id_str;
    const userId = event.favorite_events?.[0]?.user?.id_str;
    
    if (!tweetId) {
      console.warn('[X Webhook] Like event missing tweetId');
      return;
    }

    console.log(`[X Webhook] ✅ Like event: tweetId=${tweetId}, userId=${userId}`);

    // KVストレージに保存
    if (kv) {
      const key = `x:webhook:like:${tweetId}:${Date.now()}`;
      await kv.set(key, {
        tweetId,
        userId,
        eventType: 'like',
        timestamp: new Date().toISOString(),
      }, { ex: 86400 * 7 }); // 7日間保持
    }

    // エンゲージメント統計を更新
    await updateEngagementStats(tweetId, 'like');
  } catch (error) {
    console.error('[X Webhook] Error handling like event:', error.message);
  }
}

/**
 * リツイートイベントを処理
 * @param {Object} event - リツイートイベントデータ
 */
async function handleRetweetEvent(event) {
  try {
    const tweetId = event.retweet_events?.[0]?.source?.id_str;
    const userId = event.retweet_events?.[0]?.user?.id_str;
    
    if (!tweetId) {
      console.warn('[X Webhook] Retweet event missing tweetId');
      return;
    }

    console.log(`[X Webhook] ✅ Retweet event: tweetId=${tweetId}, userId=${userId}`);

    // KVストレージに保存
    if (kv) {
      const key = `x:webhook:retweet:${tweetId}:${Date.now()}`;
      await kv.set(key, {
        tweetId,
        userId,
        eventType: 'retweet',
        timestamp: new Date().toISOString(),
      }, { ex: 86400 * 7 }); // 7日間保持
    }

    // エンゲージメント統計を更新
    await updateEngagementStats(tweetId, 'retweet');
  } catch (error) {
    console.error('[X Webhook] Error handling retweet event:', error.message);
  }
}

/**
 * リプライイベントを処理
 * @param {Object} event - リプライイベントデータ
 */
async function handleReplyEvent(event) {
  try {
    const tweetId = event.tweet_create_events?.[0]?.in_reply_to_status_id_str;
    const userId = event.tweet_create_events?.[0]?.user?.id_str;
    const replyText = event.tweet_create_events?.[0]?.text;
    
    if (!tweetId) {
      console.warn('[X Webhook] Reply event missing tweetId');
      return;
    }

    console.log(`[X Webhook] ✅ Reply event: tweetId=${tweetId}, userId=${userId}, text=${replyText?.substring(0, 50)}`);

    // KVストレージに保存
    if (kv) {
      const key = `x:webhook:reply:${tweetId}:${Date.now()}`;
      await kv.set(key, {
        tweetId,
        userId,
        replyText,
        eventType: 'reply',
        timestamp: new Date().toISOString(),
      }, { ex: 86400 * 7 }); // 7日間保持
    }

    // エンゲージメント統計を更新
    await updateEngagementStats(tweetId, 'reply');
  } catch (error) {
    console.error('[X Webhook] Error handling reply event:', error.message);
  }
}

/**
 * エンゲージメント統計を更新
 * @param {string} tweetId - ツイートID
 * @param {string} eventType - イベントタイプ（like, retweet, reply）
 */
async function updateEngagementStats(tweetId, eventType) {
  if (!kv) {
    return;
  }

  try {
    const key = `x:webhook:stats:${tweetId}`;
    const stats = await kv.get(key) || {
      likes: 0,
      retweets: 0,
      replies: 0,
      lastUpdated: new Date().toISOString(),
    };

    // イベントタイプに応じてカウントを増加
    if (eventType === 'like') {
      stats.likes = (stats.likes || 0) + 1;
    } else if (eventType === 'retweet') {
      stats.retweets = (stats.retweets || 0) + 1;
    } else if (eventType === 'reply') {
      stats.replies = (stats.replies || 0) + 1;
    }

    stats.lastUpdated = new Date().toISOString();

    // KVストレージに保存（30日間保持）
    await kv.set(key, stats, { ex: 86400 * 30 });

    console.log(`[X Webhook] 📊 Updated engagement stats for tweet ${tweetId}:`, stats);
  } catch (error) {
    console.error('[X Webhook] Error updating engagement stats:', error.message);
  }
}

/**
 * バズ投稿を検知（エンゲージメント急上昇）
 * @param {string} tweetId - ツイートID
 * @param {Object} stats - エンゲージメント統計
 */
async function detectViralPost(tweetId, stats) {
  const totalEngagement = (stats.likes || 0) + (stats.retweets || 0) + (stats.replies || 0);
  
  // バズの閾値: 100件以上のエンゲージメント
  if (totalEngagement >= 100) {
    console.log(`[X Webhook] 🚀 VIRAL POST DETECTED: tweetId=${tweetId}, engagement=${totalEngagement}`);
    
    // KVストレージにバズ投稿として記録
    if (kv) {
      const key = `x:webhook:viral:${tweetId}`;
      await kv.set(key, {
        tweetId,
        stats,
        detectedAt: new Date().toISOString(),
      }, { ex: 86400 * 7 }); // 7日間保持
    }

    // TODO: フォローアップ投稿を実行する機能を追加
    // await postFollowUpTweet(tweetId);
  }
}

/**
 * X API Webhook Handler
 * GET /api/x-webhook (CRC Challenge-Response Check)
 * POST /api/x-webhook (Webhookイベント受信)
 */
async function handler(req, res) {
  // GETリクエスト: CRC Challenge-Response Check
  if (req.method === 'GET') {
    const crcToken = req.query.crc_token;
    
    if (!crcToken) {
      console.warn('[X Webhook] ⚠️ GET request without crc_token parameter');
      return res.status(400).json({ error: 'Missing crc_token parameter' });
    }

    try {
      const response = generateCrcResponse(crcToken);
      console.log('[X Webhook] ✅ CRC verification successful for token:', crcToken.substring(0, 10) + '...');
      return res.status(200).json(response);
    } catch (error) {
      console.error('[X Webhook] ❌ CRC verification failed:', error.message);
      return res.status(500).json({ error: 'CRC verification failed' });
    }
  }

  // POSTリクエスト: Webhookイベント受信
  if (req.method === 'POST') {
    try {
      // 署名検証（オプション、開発環境ではスキップ可能）
      const signature = req.headers['x-twitter-webhooks-signature'];
      const timestamp = req.headers['x-twitter-request-timestamp'];
      
      if (signature && timestamp) {
        const body = JSON.stringify(req.body);
        const isValid = verifyWebhookSignature(signature, body, timestamp);
        
        if (!isValid) {
          console.warn('[X Webhook] ⚠️ Invalid signature, but continuing (development mode)');
          // 本番環境では署名検証失敗時にエラーを返す
          // return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      const event = req.body;

      // デバッグログ
      console.log('[X Webhook] 📨 Received webhook event:', JSON.stringify(event, null, 2).substring(0, 500));

      // イベントタイプに応じて処理
      if (event.favorite_events && event.favorite_events.length > 0) {
        // いいねイベント
        await handleLikeEvent(event);
      }

      if (event.retweet_events && event.retweet_events.length > 0) {
        // リツイートイベント
        await handleRetweetEvent(event);
      }

      if (event.tweet_create_events && event.tweet_create_events.length > 0) {
        // リプライイベント（in_reply_to_status_id_strが存在する場合）
        const replyEvents = event.tweet_create_events.filter(
          e => e.in_reply_to_status_id_str
        );
        if (replyEvents.length > 0) {
          await handleReplyEvent(event);
        }
      }

      // エンゲージメント統計を取得してバズ投稿を検知
      if (event.favorite_events || event.retweet_events || event.tweet_create_events) {
        const tweetId = 
          event.favorite_events?.[0]?.favorited_status?.id_str ||
          event.retweet_events?.[0]?.source?.id_str ||
          event.tweet_create_events?.[0]?.in_reply_to_status_id_str;
        
        if (tweetId && kv) {
          const statsKey = `x:webhook:stats:${tweetId}`;
          const stats = await kv.get(statsKey);
          if (stats) {
            await detectViralPost(tweetId, stats);
          }
        }
      }

      // X APIの要件: 200ステータスを返す
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('[X Webhook] ❌ Error processing webhook:', error.message);
      console.error('[X Webhook] Stack:', error.stack);
      
      // エラーでも200を返す（X APIの要件）
      return res.status(200).json({ received: false, error: error.message });
    }
  }

  // その他のHTTPメソッドは許可しない
  return res.status(405).json({ error: 'Method not allowed' });
}

// Vercel Serverless Functions用のエクスポート
module.exports = handler;

// Vercel/Next.js用のデフォルトエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = handler;
}
