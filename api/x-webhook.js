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
// P0 FIX: Webhook署名検証を公式仕様に合わせて修正
function verifyWebhookSignature(signature, body, timestamp) {
  // P0 FIX: 本番環境では検証必須
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  
  if (!X_API_CONSUMER_KEY_SECRET) {
    if (isProduction) {
      console.error('[X Webhook] ❌ CRITICAL: X_API_CONSUMER_KEY_SECRET not set in production');
      return false; // 本番では検証必須
    }
    console.warn('[X Webhook] X_API_CONSUMER_KEY_SECRET not set, skipping signature verification (development mode)');
    return true; // 開発環境でのみ検証をスキップ
  }

  // P0 FIX: X API Webhook署名検証の公式仕様に従う
  // X APIの署名形式: "sha256=<base64_hmac_sha256>"
  // 署名文字列: timestamp + "." + raw_body (JSON文字列化前の生文字列)
  // 
  // 注意: Vercelではreq.bodyが既にパースされているため、raw bodyを取得するには
  // vercel.jsonでbodyParser: falseを設定し、自前でストリーム読み取りが必要です。
  // 現状はJSON.stringify(req.body)を使用していますが、キー順序・空白・エスケープ差分で
  // 署名が一致しない可能性があります。本番環境ではraw body取得の実装を推奨します。
  try {
    // P0 FIX: timestampのリプレイ攻撃対策（±5分の許容ウィンドウ）
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(now - timestampNum);
    const MAX_TIME_DIFF = 5 * 60; // 5分
    
    if (isNaN(timestampNum) || timeDiff > MAX_TIME_DIFF) {
      console.warn('[X Webhook] ⚠️ Timestamp out of range:', {
        timestamp,
        now,
        diff: timeDiff,
        maxDiff: MAX_TIME_DIFF,
      });
      return false; // リプレイ攻撃の可能性
    }
    
    // 署名から "sha256=" プレフィックスを除去
    const signatureWithoutPrefix = signature.replace(/^sha256=/, '');
    
    // 署名文字列を構築（X APIの仕様: timestamp + "." + raw_body）
    // 注意: bodyは既にJSON文字列化されている必要がある（Vercel制約）
    const signatureString = `${timestamp}.${body}`;
    
    // HMAC SHA-256ハッシュを生成
    const hmac = crypto.createHmac('sha256', X_API_CONSUMER_KEY_SECRET);
    hmac.update(signatureString);
    const expectedSignature = hmac.digest('base64');
    
    // タイミング攻撃対策: crypto.timingSafeEqualを使用
    if (signatureWithoutPrefix.length !== expectedSignature.length) {
      console.warn('[X Webhook] ⚠️ Signature length mismatch');
      return false;
    }
    
    // 署名を比較（タイミング攻撃対策）
    // P0 FIX: base64デコードしたバイト列同士で比較（より厳密）
    let isValid = false;
    try {
      const sigBuffer = Buffer.from(signatureWithoutPrefix, 'base64');
      const expectedBuffer = Buffer.from(expectedSignature, 'base64');
      
      if (sigBuffer.length !== expectedBuffer.length) {
        console.warn('[X Webhook] ⚠️ Signature length mismatch (after base64 decode)');
        return false;
      }
      
      isValid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch (base64Error) {
      // base64デコードに失敗した場合は、文字列比較にフォールバック
      console.warn('[X Webhook] ⚠️ Base64 decode failed, falling back to string comparison:', base64Error.message);
      isValid = signatureWithoutPrefix === expectedSignature;
    }
    
    if (!isValid) {
      console.warn('[X Webhook] ⚠️ Invalid signature:', {
        received: signature.substring(0, 20) + '...',
        expected: `sha256=${expectedSignature.substring(0, 20)}...`,
        note: 'This may be due to JSON.stringify() key order differences. Raw body implementation recommended.',
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('[X Webhook] ❌ Signature verification error:', error.message);
    return false;
  }
}

/**
 * いいねイベントを処理（単一イベント）
 * @param {Object} favoriteEvent - いいねイベントデータ（単一）
 */
async function handleSingleLikeEvent(favoriteEvent) {
  try {
    const tweetId = favoriteEvent?.favorited_status?.id_str;
    const userId = favoriteEvent?.user?.id_str;
    
    if (!tweetId) {
      console.warn('[X Webhook] Like event missing tweetId');
      return;
    }

    console.log(`[X Webhook] ✅ Like event: tweetId=${tweetId}, userId=${userId}`);

    // エンゲージメント統計を更新（KV保存は統計更新に統合）
    await updateEngagementStats(tweetId, 'like');
  } catch (error) {
    console.error('[X Webhook] Error handling single like event:', error.message);
  }
}

/**
 * いいねイベントを処理（複数イベント対応）
 * @param {Object} event - いいねイベントデータ
 */
async function handleLikeEvent(event) {
  // P0 FIX: 配列の全件を処理（先頭だけではなく）
  if (!event.favorite_events || !Array.isArray(event.favorite_events)) {
    return;
  }
  
  for (const favoriteEvent of event.favorite_events) {
    await handleSingleLikeEvent(favoriteEvent);
  }
}

/**
 * リツイートイベントを処理（単一イベント）
 * @param {Object} retweetEvent - リツイートイベントデータ（単一）
 */
async function handleSingleRetweetEvent(retweetEvent) {
  try {
    // P0 FIX: RetweetイベントのtweetId抽出を修正（複数のフィールドを確認）
    // X API Webhook仕様: target_object.id_str または retweeted_status.id_str がリツイートされたツイートID
    const tweetId = retweetEvent?.target_object?.id_str || 
                    retweetEvent?.retweeted_status?.id_str || 
                    retweetEvent?.source?.id_str;
    const userId = retweetEvent?.user?.id_str;
    
    if (!tweetId) {
      console.warn('[X Webhook] Retweet event missing tweetId:', JSON.stringify(retweetEvent, null, 2).substring(0, 200));
      return;
    }

    console.log(`[X Webhook] ✅ Retweet event: tweetId=${tweetId}, userId=${userId}`);

    // エンゲージメント統計を更新（KV保存は統計更新に統合）
    await updateEngagementStats(tweetId, 'retweet');
  } catch (error) {
    console.error('[X Webhook] Error handling single retweet event:', error.message);
  }
}

/**
 * リツイートイベントを処理（複数イベント対応）
 * @param {Object} event - リツイートイベントデータ
 */
async function handleRetweetEvent(event) {
  // P0 FIX: 配列の全件を処理（先頭だけではなく）
  if (!event.retweet_events || !Array.isArray(event.retweet_events)) {
    return;
  }
  
  for (const retweetEvent of event.retweet_events) {
    await handleSingleRetweetEvent(retweetEvent);
  }
}

/**
 * リプライイベントを処理（単一イベント）
 * @param {Object} replyTweet - リプライイベントデータ（単一）
 */
async function handleSingleReplyEvent(replyTweet) {
  try {
    // P0 FIX: ReplyイベントのtweetId抽出を修正
    // in_reply_to_status_id_str: 返信先（元ツイート）のID
    // id_str: 返信ツイート自体のID
    // 統計更新は「返信先（自分の投稿）」に対して行うため、in_reply_to_status_id_strを使用
    const replyToTweetId = replyTweet?.in_reply_to_status_id_str; // 返信先（自分の投稿）のID
    const replyTweetId = replyTweet?.id_str; // 返信ツイート自体のID
    const userId = replyTweet?.user?.id_str;
    const replyText = replyTweet?.text;
    
    if (!replyToTweetId) {
      console.warn('[X Webhook] Reply event missing in_reply_to_status_id_str');
      return;
    }

    console.log(`[X Webhook] ✅ Reply event: replyToTweetId=${replyToTweetId}, replyTweetId=${replyTweetId}, userId=${userId}, text=${replyText?.substring(0, 50)}`);

    // エンゲージメント統計を更新（返信先のツイートIDに対して、KV保存は統計更新に統合）
    await updateEngagementStats(replyToTweetId, 'reply');
  } catch (error) {
    console.error('[X Webhook] Error handling single reply event:', error.message);
  }
}

/**
 * リプライイベントを処理（複数イベント対応）
 * @param {Object} event - リプライイベントデータ
 */
async function handleReplyEvent(event) {
  // P0 FIX: 配列の全件を処理（先頭だけではなく）
  if (!event.tweet_create_events || !Array.isArray(event.tweet_create_events)) {
    return;
  }
  
  // リプライイベントのみをフィルタリング
  const replyEvents = event.tweet_create_events.filter(
    e => e.in_reply_to_status_id_str
  );
  
  for (const replyTweet of replyEvents) {
    await handleSingleReplyEvent(replyTweet);
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
    // P0-1: 新しいインフルエンサーパフォーマンス分析機能を統合
    // 可能ならマッピングを取得してメタ補完（KV read 1回）
    let meta = {};
    try {
      const {
        getInfluencerMapping,
        incrementTweetEngagement,
      } = require("../services/x/influencerPerformance");
      const mapping = await getInfluencerMapping(tweetId);
      if (mapping?.influencerUsername) {
        meta = {
          influencerUsername: mapping.influencerUsername,
          lang: mapping.lang,
          postType: mapping.postType,
        };
      }

      // tweet単位の速報カウンタ更新（KV write 1回）
      await incrementTweetEngagement(tweetId, eventType, meta);
    } catch (perfError) {
      console.warn(
        "[X Webhook] ⚠️ Failed to update influencer performance (non-fatal):",
        perfError.message
      );
      // エラーでも既存の統計更新は続行
    }

    // 既存の統計更新ロジック（後方互換性のため維持）
    // ツイートIDでエンゲージメント統計を更新
    const key = `x:webhook:stats:${tweetId}`;
    const stats = (await kv.get(key)) || {
      likes: 0,
      retweets: 0,
      replies: 0,
      lastUpdated: new Date().toISOString(),
    };

    // イベントタイプに応じてカウントを増加
    if (eventType === "like") {
      stats.likes = (stats.likes || 0) + 1;
    } else if (eventType === "retweet") {
      stats.retweets = (stats.retweets || 0) + 1;
    } else if (eventType === "reply") {
      stats.replies = (stats.replies || 0) + 1;
    }

    stats.lastUpdated = new Date().toISOString();

    // KVストレージに保存（30日間保持）
    await kv.set(key, stats, { ex: 86400 * 30 });

    console.log(
      `[X Webhook] 📊 Updated engagement stats for tweet ${tweetId}:`,
      stats
    );

    // 🔥 改善: インフルエンサーID別にエンゲージメントを集計（既存ロジック）
    try {
      const influencerMappingKey = `x:post:influencer:${tweetId}`;
      const influencerMapping = await kv.get(influencerMappingKey);

      if (influencerMapping && influencerMapping.influencerUsername) {
        const influencerUsername = influencerMapping.influencerUsername;
        const influencerStatsKey = `x:webhook:stats:influencer:${influencerUsername}`;

        // インフルエンサーID別の統計を取得または初期化
        const influencerStats = (await kv.get(influencerStatsKey)) || {
          totalLikes: 0,
          totalRetweets: 0,
          totalReplies: 0,
          tweetCount: 0,
          lastUpdated: new Date().toISOString(),
        };

        // 統計を更新
        if (eventType === "like") {
          influencerStats.totalLikes = (influencerStats.totalLikes || 0) + 1;
        } else if (eventType === "retweet") {
          influencerStats.totalRetweets =
            (influencerStats.totalRetweets || 0) + 1;
        } else if (eventType === "reply") {
          influencerStats.totalReplies = (influencerStats.totalReplies || 0) + 1;
        }

        influencerStats.lastUpdated = new Date().toISOString();

        // インフルエンサーID別の統計を保存（30日間保持）
        await kv.set(influencerStatsKey, influencerStats, { ex: 86400 * 30 });

        console.log(
          `[X Webhook] ✅ Updated influencer stats for @${influencerUsername}:`,
          influencerStats
        );
      } else {
        console.log(
          `[X Webhook] ℹ️ No influencer mapping found for tweet ${tweetId} (may be original tweet, not our quote repost)`
        );
      }
    } catch (influencerStatsError) {
      console.warn(
        `[X Webhook] ⚠️ Failed to update influencer stats:`,
        influencerStatsError.message
      );
    }
  } catch (error) {
    console.error(
      "[X Webhook] Error updating engagement stats:",
      error.message
    );
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
 * Webhookアクセスログを記録（デバッグ用）
 * @param {string} method - HTTPメソッド
 * @param {Object} req - リクエストオブジェクト
 */
async function logWebhookAccess(method, req) {
  try {
    const logKey = `x:webhook:access:${Date.now()}`;
    const logData = {
      method,
      timestamp: new Date().toISOString(),
      path: req.url,
      query: req.query,
      hasBody: !!req.body,
      headers: {
        'x-twitter-webhooks-signature': req.headers['x-twitter-webhooks-signature'] ? 'present' : 'missing',
        'x-twitter-request-timestamp': req.headers['x-twitter-request-timestamp'] || 'missing',
        'user-agent': req.headers['user-agent'] || 'missing',
      },
    };
    
    if (kv) {
      await kv.set(logKey, logData, { ex: 86400 * 7 }); // 7日間保持
    }
    
    console.log(`[X Webhook] 📝 Access logged: ${method} ${req.url} at ${logData.timestamp}`);
  } catch (error) {
    console.warn('[X Webhook] ⚠️ Failed to log webhook access:', error.message);
  }
}

/**
 * X API Webhook Handler
 * GET /api/x-webhook (CRC Challenge-Response Check)
 * POST /api/x-webhook (Webhookイベント受信)
 */
async function handler(req, res) {
  // 🔍 重要: すべてのリクエストをログに記録（デバッグ用）
  await logWebhookAccess(req.method, req);
  
  // GETリクエスト: CRC Challenge-Response Check
  if (req.method === 'GET') {
    const crcToken = req.query.crc_token;
    
    console.log('[X Webhook] 🔵 GET request received:', {
      hasCrcToken: !!crcToken,
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
      },
      timestamp: new Date().toISOString(),
    });
    
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
      // P0修正: raw body取得の試行（Vercel制約により、現状はJSON文字列化されたbodyを使用）
      // 将来的には vercel.json で bodyParser: false を設定し、ストリームから読み取る実装を推奨
      let rawBody = null;
      let bodyString = null;
      
      // Vercelでは req.body が既にパースされているため、raw bodyを取得するには
      // vercel.json で bodyParser: false を設定し、req.on('data') でストリームから読み取る必要がある
      // 現状は JSON.stringify(req.body) を使用（キー順序がX APIと一致する可能性は低いが、動作確認は可能）
      if (req.body) {
        // 可能な限り一貫性のあるJSON文字列化（キー順序を固定）
        bodyString = JSON.stringify(req.body, Object.keys(req.body).sort());
        rawBody = bodyString; // 現状は同一として扱う
      }
      
      // 🔍 重要: POSTリクエストの詳細をログに記録
      console.log('[X Webhook] 🔵 POST request received:', {
        hasBody: !!req.body,
        bodyType: typeof req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        hasRawBody: !!rawBody,
        headers: {
          'x-twitter-webhooks-signature': req.headers['x-twitter-webhooks-signature'] ? 'present' : 'missing',
          'x-twitter-request-timestamp': req.headers['x-twitter-request-timestamp'] || 'missing',
          'content-type': req.headers['content-type'] || 'missing',
          'user-agent': req.headers['user-agent'] || 'missing',
        },
        timestamp: new Date().toISOString(),
      });
      
      // P1 FIX: Webhook署名ヘッダ名の揺れに対応（複数の候補を確認）
      // x-twitter-webhooks-signature（複数形）と x-twitter-webhook-signature（単数形）の両方を確認
      const signature = req.headers['x-twitter-webhooks-signature'] || 
                       req.headers['x-twitter-webhook-signature'] ||
                       req.headers['X-Twitter-Webhooks-Signature'] ||
                       req.headers['X-Twitter-Webhook-Signature'];
      const timestamp = req.headers['x-twitter-request-timestamp'] ||
                       req.headers['X-Twitter-Request-Timestamp'];
      
      // P0 FIX: 本番環境では署名検証必須
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
      
      if (signature && timestamp) {
      // P0修正: raw body取得（Vercel制約により、現状はJSON文字列化されたbodyを使用）
      // 将来的には vercel.json で bodyParser: false を設定し、ストリームから読み取る実装を推奨
      // 現状は JSON.stringify(req.body) を使用（キー順序がX APIと一致する可能性は低いが、動作確認は可能）
      let rawBody = null;
      
      // Vercelでは req.body が既にパースされているため、raw bodyを取得するには
      // vercel.json で bodyParser: false を設定し、req.on('data') でストリームから読み取る必要がある
      // 現状は JSON.stringify(req.body) を使用（実装の制約）
      if (typeof req.body === 'string') {
        // 既に文字列の場合はそのまま使用
        rawBody = req.body;
      } else if (req.body) {
        // オブジェクトの場合はJSON文字列化（キー順序を固定して一貫性を保つ）
        rawBody = JSON.stringify(req.body, Object.keys(req.body).sort());
      } else {
        // bodyが無い場合は空文字列
        rawBody = '';
      }
      
      const isValid = verifyWebhookSignature(signature, rawBody, timestamp);
        
        console.log('[X Webhook] 🔐 Signature verification:', {
          hasSignature: !!signature,
          hasTimestamp: !!timestamp,
          isValid,
          isProduction,
          timestamp: new Date().toISOString(),
        });
        
        if (!isValid) {
          if (isProduction) {
            console.error('[X Webhook] ❌ CRITICAL: Invalid signature in production');
            return res.status(401).json({ error: 'Invalid signature' });
          }
          console.warn('[X Webhook] ⚠️ Invalid signature, but continuing (development mode)');
        }
      } else {
        if (isProduction) {
          console.error('[X Webhook] ❌ CRITICAL: Missing signature or timestamp headers in production');
          return res.status(401).json({ error: 'Missing signature or timestamp headers' });
        }
        console.warn('[X Webhook] ⚠️ Missing signature or timestamp headers:', {
          hasSignature: !!signature,
          hasTimestamp: !!timestamp,
        });
      }

      const event = req.body;

      // デバッグログ
      console.log('[X Webhook] 📨 Received webhook event:', JSON.stringify(event, null, 2).substring(0, 500));
      
      // 🔍 重要: イベントタイプをログに記録
      const eventTypes = [];
      if (event.favorite_events && event.favorite_events.length > 0) eventTypes.push('favorite');
      if (event.retweet_events && event.retweet_events.length > 0) eventTypes.push('retweet');
      if (event.tweet_create_events && event.tweet_create_events.length > 0) eventTypes.push('tweet_create');
      
      console.log('[X Webhook] 📊 Event types detected:', {
        eventTypes,
        favoriteCount: event.favorite_events?.length || 0,
        retweetCount: event.retweet_events?.length || 0,
        tweetCreateCount: event.tweet_create_events?.length || 0,
        timestamp: new Date().toISOString(),
      });

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
      // P0 FIX: 全イベントを処理してバズ検知（先頭だけではなく）
      const processedTweetIds = new Set();
      
      // LikeイベントのtweetIdを収集
      if (event.favorite_events && Array.isArray(event.favorite_events)) {
        for (const favoriteEvent of event.favorite_events) {
          const tweetId = favoriteEvent?.favorited_status?.id_str;
          if (tweetId) {
            processedTweetIds.add(tweetId);
          }
        }
      }
      
      // RetweetイベントのtweetIdを収集
      if (event.retweet_events && Array.isArray(event.retweet_events)) {
        for (const retweetEvent of event.retweet_events) {
          const tweetId = retweetEvent?.target_object?.id_str || 
                          retweetEvent?.retweeted_status?.id_str || 
                          retweetEvent?.source?.id_str;
          if (tweetId) {
            processedTweetIds.add(tweetId);
          }
        }
      }
      
      // ReplyイベントのtweetIdを収集
      if (event.tweet_create_events && Array.isArray(event.tweet_create_events)) {
        for (const replyTweet of event.tweet_create_events) {
          const tweetId = replyTweet?.in_reply_to_status_id_str;
          if (tweetId) {
            processedTweetIds.add(tweetId);
          }
        }
      }
      
      // 各tweetIdに対してバズ検知を実行
      if (kv && processedTweetIds.size > 0) {
        for (const tweetId of processedTweetIds) {
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
