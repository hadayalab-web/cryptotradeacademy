// api/whop-webhook.js
// Whop Webhookエンドポイント（購入イベント受信・X投稿との紐付け）

const crypto = require('crypto');

// 🚀 シームレスなKVアクセス（utils/kv.js経由）
const { kv } = require('../utils/kv');

// Whop Webhook Secret（署名検証用、環境変数から取得）
const WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET;

/**
 * Whop Webhook署名を検証
 * @param {string} signature - Whopから送信された署名
 * @param {string} body - リクエストボディ（文字列）
 * @param {string} timestamp - タイムスタンプ
 * @returns {boolean} 署名が有効な場合true
 */
function verifyWhopWebhookSignature(signature, body, timestamp) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  
  if (!WHOP_WEBHOOK_SECRET) {
    if (isProduction) {
      console.error('[Whop Webhook] ❌ CRITICAL: WHOP_WEBHOOK_SECRET not set in production');
      return false;
    }
    console.warn('[Whop Webhook] WHOP_WEBHOOK_SECRET not set, skipping signature verification (development mode)');
    return true; // 開発環境でのみ検証をスキップ
  }

  try {
    // タイムスタンプのリプレイ攻撃対策（±5分の許容ウィンドウ）
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(now - timestampNum);
    const MAX_TIME_DIFF = 5 * 60; // 5分
    
    if (isNaN(timestampNum) || timeDiff > MAX_TIME_DIFF) {
      console.warn('[Whop Webhook] ⚠️ Timestamp out of range:', {
        timestamp,
        now,
        diff: timeDiff,
        maxDiff: MAX_TIME_DIFF,
      });
      return false;
    }
    
    // Whop Webhook署名形式: HMAC SHA-256
    // 署名文字列: timestamp + "." + raw_body
    const signatureString = `${timestamp}.${body}`;
    
    // HMAC SHA-256ハッシュを生成
    const hmac = crypto.createHmac('sha256', WHOP_WEBHOOK_SECRET);
    hmac.update(signatureString);
    const expectedSignature = hmac.digest('hex');
    
    // タイミング攻撃対策: crypto.timingSafeEqualを使用
    if (signature.length !== expectedSignature.length) {
      console.warn('[Whop Webhook] ⚠️ Signature length mismatch');
      return false;
    }
    
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (sigBuffer.length !== expectedBuffer.length) {
      console.warn('[Whop Webhook] ⚠️ Signature length mismatch (after hex decode)');
      return false;
    }
    
    const isValid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    
    if (!isValid) {
      console.warn('[Whop Webhook] ⚠️ Invalid signature:', {
        received: signature.substring(0, 20) + '...',
        expected: expectedSignature.substring(0, 20) + '...',
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('[Whop Webhook] ❌ Signature verification error:', error.message);
    return false;
  }
}

/**
 * UTMパラメータからX投稿IDを抽出
 * @param {string} utmContent - UTM contentパラメータ（例: "influencer_username" または "x_post_1234567890"）
 * @returns {Object|null} { tweetId, influencerUsername } または null
 */
function extractXPostInfoFromUtm(utmContent) {
  if (!utmContent) return null;
  
  // パターン1: influencer_username形式
  const influencerMatch = utmContent.match(/^influencer_(.+)$/);
  if (influencerMatch) {
    return {
      influencerUsername: influencerMatch[1],
      tweetId: null, // tweetIdは後で検索
    };
  }
  
  // パターン2: x_post_1234567890形式（tweetIdが含まれている場合）
  const tweetIdMatch = utmContent.match(/^x_post_(\d{18,19})$/);
  if (tweetIdMatch) {
    return {
      tweetId: tweetIdMatch[1],
      influencerUsername: null,
    };
  }
  
  return null;
}

/**
 * 購入イベントを処理（X投稿との紐付け）
 * @param {Object} event - Whop Webhookイベントデータ
 */
async function handlePurchaseEvent(event) {
  try {
    const {
      type, // イベントタイプ（例: "checkout.completed", "membership.created"）
      data, // イベントデータ
    } = event;
    
    console.log(`[Whop Webhook] 📨 Received purchase event:`, {
      type,
      data: JSON.stringify(data).substring(0, 500),
      timestamp: new Date().toISOString(),
    });
    
    // 購入情報を抽出
    const checkout = data?.checkout || data;
    const membership = data?.membership || data?.membership_data;
    const user = data?.user || checkout?.user || membership?.user;
    
    // UTMパラメータを取得（referrer_urlまたはmetadataから）
    const referrerUrl = checkout?.referrer_url || checkout?.metadata?.referrer_url;
    const metadata = checkout?.metadata || membership?.metadata || {};
    
    // UTMパラメータを解析
    let utmSource = null;
    let utmMedium = null;
    let utmCampaign = null;
    let utmContent = null;
    
    if (referrerUrl) {
      try {
        const url = new URL(referrerUrl);
        utmSource = url.searchParams.get('utm_source');
        utmMedium = url.searchParams.get('utm_medium');
        utmCampaign = url.searchParams.get('utm_campaign');
        utmContent = url.searchParams.get('utm_content');
      } catch (urlError) {
        console.warn('[Whop Webhook] ⚠️ Failed to parse referrer URL:', urlError.message);
      }
    }
    
    // metadataからもUTMパラメータを取得
    if (!utmSource && metadata.utm_source) utmSource = metadata.utm_source;
    if (!utmMedium && metadata.utm_medium) utmMedium = metadata.utm_medium;
    if (!utmCampaign && metadata.utm_campaign) utmCampaign = metadata.utm_campaign;
    if (!utmContent && metadata.utm_content) utmContent = metadata.utm_content;
    
    // X投稿情報を抽出
    const xPostInfo = extractXPostInfoFromUtm(utmContent);
    
    // コンバージョン情報を構築
    const conversionData = {
      eventType: type,
      checkoutId: checkout?.id || membership?.checkout_id,
      membershipId: membership?.id,
      userId: user?.id,
      userEmail: user?.email,
      planId: checkout?.plan_id || membership?.plan_id,
      productId: checkout?.product_id || membership?.product_id,
      amount: checkout?.total || membership?.renewal_price,
      currency: checkout?.currency || membership?.currency || 'USD',
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      xPostInfo,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`[Whop Webhook] ✅ Conversion data extracted:`, {
      checkoutId: conversionData.checkoutId,
      membershipId: conversionData.membershipId,
      userEmail: conversionData.userEmail,
      utmContent: conversionData.utmContent,
      xPostInfo: conversionData.xPostInfo,
    });
    
    // KVストレージに保存（コンバージョン追跡）
    if (kv) {
      try {
        // コンバージョンIDを生成
        const conversionId = `whop_conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const conversionKey = `whop:conversion:${conversionId}`;
        
        // コンバージョンデータを保存（30日間保持）
        await kv.set(conversionKey, conversionData, { ex: 86400 * 30 });
        
        // ユーザーID別のコンバージョン履歴を保存
        if (conversionData.userId) {
          const userConversionsKey = `whop:conversions:user:${conversionData.userId}`;
          const userConversions = (await kv.get(userConversionsKey)) || [];
          userConversions.push({
            conversionId,
            timestamp: conversionData.timestamp,
            amount: conversionData.amount,
            planId: conversionData.planId,
          });
          await kv.set(userConversionsKey, userConversions, { ex: 86400 * 90 }); // 90日間保持
        }
        
        // X投稿ID別のコンバージョン統計を更新
        if (xPostInfo?.tweetId) {
          const tweetConversionsKey = `x:conversions:tweet:${xPostInfo.tweetId}`;
          const tweetConversions = (await kv.get(tweetConversionsKey)) || {
            tweetId: xPostInfo.tweetId,
            count: 0,
            totalAmount: 0,
            conversions: [],
          };
          tweetConversions.count = (tweetConversions.count || 0) + 1;
          tweetConversions.totalAmount = (tweetConversions.totalAmount || 0) + (conversionData.amount || 0);
          tweetConversions.conversions.push({
            conversionId,
            timestamp: conversionData.timestamp,
            amount: conversionData.amount,
            userId: conversionData.userId,
          });
          await kv.set(tweetConversionsKey, tweetConversions, { ex: 86400 * 30 });
          
          console.log(`[Whop Webhook] ✅ Updated conversion stats for tweet ${xPostInfo.tweetId}:`, {
            count: tweetConversions.count,
            totalAmount: tweetConversions.totalAmount,
          });
        }
        
        // インフルエンサー別のコンバージョン統計を更新
        if (xPostInfo?.influencerUsername) {
          const influencerConversionsKey = `x:conversions:influencer:${xPostInfo.influencerUsername}`;
          const influencerConversions = (await kv.get(influencerConversionsKey)) || {
            influencerUsername: xPostInfo.influencerUsername,
            count: 0,
            totalAmount: 0,
            conversions: [],
          };
          influencerConversions.count = (influencerConversions.count || 0) + 1;
          influencerConversions.totalAmount = (influencerConversions.totalAmount || 0) + (conversionData.amount || 0);
          influencerConversions.conversions.push({
            conversionId,
            timestamp: conversionData.timestamp,
            amount: conversionData.amount,
            userId: conversionData.userId,
          });
          await kv.set(influencerConversionsKey, influencerConversions, { ex: 86400 * 30 });
          
          console.log(`[Whop Webhook] ✅ Updated conversion stats for influencer @${xPostInfo.influencerUsername}:`, {
            count: influencerConversions.count,
            totalAmount: influencerConversions.totalAmount,
          });
        }
        
        console.log(`[Whop Webhook] ✅ Conversion saved: ${conversionId}`);
      } catch (kvError) {
        console.error('[Whop Webhook] ❌ Failed to save conversion to KV:', kvError.message);
        // KV保存の失敗は致命的ではない（ログに記録済み）
      }
    } else {
      console.warn('[Whop Webhook] ⚠️ KV storage not available, conversion data not saved');
    }
    
    return conversionData;
  } catch (error) {
    console.error('[Whop Webhook] ❌ Error handling purchase event:', error.message);
    console.error('[Whop Webhook] Stack:', error.stack);
    throw error;
  }
}

/**
 * Whop Webhook Handler
 * POST /api/whop-webhook
 */
async function handler(req, res) {
  // POSTのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Raw bodyを取得（署名検証用）
    const getRawBody = require('raw-body');
    let rawBody;
    try {
      rawBody = await getRawBody(req, {
        encoding: 'utf8',
        limit: '10mb',
      });
    } catch (rawBodyError) {
      // フォールバック: req.bodyから再構築
      if (typeof req.body === 'string') {
        rawBody = req.body;
      } else if (req.body) {
        rawBody = JSON.stringify(req.body);
      } else {
        rawBody = '';
      }
    }
    
    // 署名ヘッダーを取得
    const signature = req.headers['x-whop-signature'] || req.headers['X-Whop-Signature'];
    const timestamp = req.headers['x-whop-timestamp'] || req.headers['X-Whop-Timestamp'] || String(Math.floor(Date.now() / 1000));
    
    // 署名検証
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    if (signature && WHOP_WEBHOOK_SECRET) {
      const isValid = verifyWhopWebhookSignature(signature, rawBody, timestamp);
      
      console.log('[Whop Webhook] 🔐 Signature verification:', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        isValid,
        isProduction,
        timestamp: new Date().toISOString(),
      });
      
      if (!isValid) {
        if (isProduction) {
          console.error('[Whop Webhook] ❌ CRITICAL: Invalid signature in production');
          return res.status(401).json({ error: 'Invalid signature' });
        }
        console.warn('[Whop Webhook] ⚠️ Invalid signature, but continuing (development mode)');
      }
    } else if (isProduction && !signature) {
      console.error('[Whop Webhook] ❌ CRITICAL: Missing signature header in production');
      return res.status(401).json({ error: 'Missing signature header' });
    }
    
    // イベントデータをパース
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    console.log('[Whop Webhook] 📨 Received webhook event:', {
      type: event.type,
      dataKeys: event.data ? Object.keys(event.data) : [],
      timestamp: new Date().toISOString(),
    });
    
    // 購入イベントを処理
    const purchaseEventTypes = [
      'checkout.completed',
      'membership.created',
      'membership.renewed',
      'membership.activated',
    ];
    
    if (purchaseEventTypes.includes(event.type)) {
      await handlePurchaseEvent(event);
    } else {
      console.log(`[Whop Webhook] ℹ️ Event type ${event.type} is not a purchase event, skipping`);
    }
    
    // Whopの要件: 200ステータスを返す
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Whop Webhook] ❌ Error processing webhook:', error.message);
    console.error('[Whop Webhook] Stack:', error.stack);
    
    // エラーでも200を返す（Whopの要件）
    return res.status(200).json({ received: false, error: error.message });
  }
}

module.exports = handler;
