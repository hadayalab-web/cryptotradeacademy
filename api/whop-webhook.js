// api/whop-webhook.js
// Whop Webhookエンドポイント（購入イベント受信・X投稿との紐付け）

const crypto = require('crypto');

// 🚀 シームレスなKVアクセス（utils/kv.js経由）
const { kv } = require('../utils/kv');

// Whop Webhook Secret（署名検証用、環境変数から取得）
const WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET;
// Whop ダッシュボードの「Test webhook」は署名を送らないため、テスト時に1を設定してスキップ可能
const WHOP_SKIP_SIGNATURE_FOR_TEST = process.env.WHOP_SKIP_SIGNATURE_FOR_TEST === '1';

/**
 * WHOP_WEBHOOK_SECRET から HMAC 用キーの候補を返す
 * Whop 公式: "use the webhook_secret as-is (keep the whsec_ prefix)" を最優先
 * - whsec_ 付きのまま文字列で使用
 * - whsec_ 除去 + base64 デコード（Standard Webhooks スタイル）
 * - そのまま + base64 デコード試行
 */
function getWebhookSigningKeyVariants(secret) {
  if (!secret) return [];
  const keys = [];
  keys.push(secret); // as-is（whsec_ 含む）を最優先
  if (secret.startsWith('whsec_')) {
    try {
      keys.push(Buffer.from(secret.slice(6), 'base64'));
    } catch (_) { /* ignore */ }
  }
  try {
    const decoded = Buffer.from(secret, 'base64');
    if (decoded.length > 0) keys.push(decoded);
  } catch (_) { /* ignore */ }
  return keys;
}

/**
 * Whop Webhook署名を検証（Standard Webhooks 準拠）
 * ペイロードは id.timestamp.body と timestamp.body の両方を試行
 */
function verifyWhopWebhookSignature(signatureHeader, body, timestamp, webhookId) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  if (!WHOP_WEBHOOK_SECRET) {
    if (isProduction) {
      console.error('[Whop Webhook] ❌ CRITICAL: WHOP_WEBHOOK_SECRET not set in production');
      return false;
    }
    console.warn('[Whop Webhook] WHOP_WEBHOOK_SECRET not set, skipping signature verification (development mode)');
    return true;
  }

  try {
    const ts = String(timestamp).trim();
    const timestampNum = parseInt(ts, 10);
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(now - timestampNum);
    const MAX_TIME_DIFF = 5 * 60;
    if (isNaN(timestampNum) || timeDiff > MAX_TIME_DIFF) {
      console.warn('[Whop Webhook] ⚠️ Timestamp out of range:', { timestamp: ts, diff: timeDiff });
      return false;
    }

    const keyVariants = getWebhookSigningKeyVariants(WHOP_WEBHOOK_SECRET);
    const payloads = [];
    if (webhookId) payloads.push({ signed: `${webhookId}.${ts}.${body}`, name: 'id.timestamp.body' });
    payloads.push({ signed: `${ts}.${body}`, name: 'timestamp.body' });

    const parts = String(signatureHeader).split(/\s+/);
    for (const part of parts) {
      const trimmed = part.trim();
      const match = trimmed.match(/^v1,(.+)$/);
      const rawSig = match ? match[1].trim() : trimmed;
      if (!rawSig) continue;

      for (const key of keyVariants) {
        for (const { signed } of payloads) {
          const hmac = crypto.createHmac('sha256', key);
          hmac.update(signed);
          const expectedHex = hmac.digest('hex');
          const expectedBase64 = hmac.digest('base64');
          if (rawSig.length === 64 && /^[a-fA-F0-9]+$/.test(rawSig) && rawSig === expectedHex) return true;
          try {
            const sigBuf = Buffer.from(rawSig, 'base64');
            const expBuf = Buffer.from(expectedBase64, 'base64');
            if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) return true;
          } catch (_) { /* ignore */ }
        }
      }
    }
    if (process.env.WHOP_WEBHOOK_DEBUG === '1') {
      console.log('[Whop Webhook] DEBUG paste to Whop:', JSON.stringify({
        'webhook-id': webhookId || null,
        'webhook-timestamp': ts,
        'webhook-signature': signatureHeader,
        body: body,
      }));
    }
    console.warn('[Whop Webhook] ⚠️ Invalid signature (tried hex and base64, multiple key/payload variants)');
    return false;
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
    
    // 購入情報を抽出（checkout / membership / payment / invoice に対応）
    const checkout = data?.checkout || data;
    const membership = data?.membership || data?.membership_data;
    const payment = data?.payment;
    const invoice = data?.invoice;
    const user = data?.user || checkout?.user || membership?.user || payment?.user || invoice?.user;
    
    // UTMパラメータを取得（referrer_urlまたはmetadataから）
    const referrerUrl = checkout?.referrer_url || checkout?.metadata?.referrer_url;
    const metadata = checkout?.metadata || membership?.metadata || payment?.metadata || invoice?.metadata || {};
    
    // UTMパラメータを解析
    let utmSource = null;
    let utmMedium = null;
    let utmCampaign = null;
    let utmContent = null;
    
    let refIdFromReferrer = null;
    if (referrerUrl) {
      try {
        const url = new URL(referrerUrl);
        utmSource = url.searchParams.get('utm_source');
        utmMedium = url.searchParams.get('utm_medium');
        utmCampaign = url.searchParams.get('utm_campaign');
        utmContent = url.searchParams.get('utm_content');
        refIdFromReferrer = url.searchParams.get('ref') || url.searchParams.get('ref_id');
      } catch (urlError) {
        console.warn('[Whop Webhook] ⚠️ Failed to parse referrer URL:', urlError.message);
      }
    }
    
    // FirstPromoter 用: ref_id / promo_code（紹介紐付け）
    const refId = metadata.ref_id || metadata.ref || refIdFromReferrer;
    const promoCode = checkout?.promo_code || membership?.promo_code || payment?.promo_code || invoice?.promo_code || metadata.promo_code;
    
    // metadataからもUTMパラメータを取得
    if (!utmSource && metadata.utm_source) utmSource = metadata.utm_source;
    if (!utmMedium && metadata.utm_medium) utmMedium = metadata.utm_medium;
    if (!utmCampaign && metadata.utm_campaign) utmCampaign = metadata.utm_campaign;
    if (!utmContent && metadata.utm_content) utmContent = metadata.utm_content;
    
    // X投稿情報を抽出
    const xPostInfo = extractXPostInfoFromUtm(utmContent);
    
    // コンバージョン情報を構築（payment / invoice の amount も取得）
    const amountRaw = checkout?.total ?? membership?.renewal_price ?? payment?.amount ?? invoice?.amount ?? payment?.total ?? invoice?.total;
    const conversionData = {
      eventType: type,
      checkoutId: checkout?.id || membership?.checkout_id || payment?.checkout_id || invoice?.checkout_id,
      membershipId: membership?.id || payment?.membership_id || invoice?.membership_id,
      userId: user?.id,
      userEmail: user?.email,
      planId: checkout?.plan_id || membership?.plan_id || payment?.plan_id || invoice?.plan_id,
      productId: checkout?.product_id || membership?.product_id || payment?.product_id || invoice?.product_id,
      amount: amountRaw,
      currency: checkout?.currency || membership?.currency || payment?.currency || invoice?.currency || 'USD',
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
    
    // KPI追跡: コンバージョンを記録
    try {
      const { recordConversion } = require('./analytics-dashboard');
      const dateString = new Date().toISOString().split('T')[0];
      
      // プランIDから無料版/有料版を判定
      const planId = conversionData.planId || '';
      const isMinimal = planId.includes('minimal') || planId.includes('free') || conversionData.amount === 0;
      const conversionType = isMinimal ? 'minimal' : 'regular';
      
      await recordConversion(conversionType, dateString, {
        source: utmSource || 'unknown',
        planId: conversionData.planId,
        amount: conversionData.amount,
        xPostInfo: conversionData.xPostInfo,
      });
      
      console.log(`[Whop Webhook] ✅ KPI conversion recorded: ${conversionType} on ${dateString}`);
    } catch (kpiError) {
      console.warn(`[Whop Webhook] ⚠️ Failed to record KPI conversion:`, kpiError.message);
    }
    
    // FirstPromoter: 紹介売上がある場合のみ track/sale（ref_id または promo_code が取れたとき）
    const amountNum = Number(conversionData.amount);
    if ((refId || promoCode) && amountNum > 0) {
      try {
        const { trackSale } = require('../services/firstpromoter/trackSale');
        const currency = (conversionData.currency || 'USD').toUpperCase();
        const amountForFp = currency === 'JPY' ? Math.round(amountNum) : Math.round(amountNum * 100);
        const eventId = conversionData.checkoutId || conversionData.membershipId || `whop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        // 重複送信防止: 同一購入で checkout.completed / membership.activated 等が複数届く場合、
        // checkoutId または membershipId が既に送信済みならスキップ（詳細: docs/FIRSTPROMOTER_WHOP_INTEGRATION_AUDIT.md）
        const fpDedupKeys = [conversionData.checkoutId, conversionData.membershipId].filter(Boolean).map((id) => `fp_sent:${id}`);
        let shouldSendFp = true;
        if (kv && fpDedupKeys.length > 0) {
          const sentValues = await Promise.all(fpDedupKeys.map((k) => kv.get(k)));
          shouldSendFp = !sentValues.some((v) => !!v);
          if (!shouldSendFp) {
            console.log('[Whop Webhook] ℹ️ FirstPromoter track/sale skipped (already sent for this purchase):', eventId);
          }
        }

        if (shouldSendFp) {
          const fpResult = await trackSale({
            event_id: String(eventId),
            amount: amountForFp,
            email: conversionData.userEmail || undefined,
            ref_id: refId || undefined,
            promo_code: promoCode || undefined,
            currency,
            plan: conversionData.planId || undefined
          });
          if (fpResult.ok) {
            console.log('[Whop Webhook] ✅ FirstPromoter track/sale sent:', fpResult.status, eventId);
            if (kv && fpDedupKeys.length > 0) {
              await Promise.all(fpDedupKeys.map((k) => kv.set(k, '1', { ex: 86400 * 7 }))).catch((e) => console.warn('[Whop Webhook] fp dedup kv set:', e?.message));
            }
          } else {
            console.warn('[Whop Webhook] FirstPromoter track/sale failed:', fpResult.error);
          }
        }
      } catch (fpErr) {
        console.warn('[Whop Webhook] FirstPromoter track/sale error:', fpErr?.message);
      }
    }
    
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
    
    // 署名ヘッダーを取得（x-whop-* と Standard Webhooks の webhook-* 両対応）
    const signature = req.headers['x-whop-signature'] || req.headers['X-Whop-Signature']
      || req.headers['webhook-signature'];
    const timestamp = req.headers['x-whop-timestamp'] || req.headers['X-Whop-Timestamp']
      || req.headers['webhook-timestamp'] || String(Math.floor(Date.now() / 1000));
    const webhookId = req.headers['webhook-id'] || req.headers['Webhook-Id'];
    
    // 署名検証（WHOP_SKIP_SIGNATURE_FOR_TEST=1 時は署名なしを許可：Whop ダッシュボードの Test 用）
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    if (WHOP_SKIP_SIGNATURE_FOR_TEST && !signature) {
      console.log('[Whop Webhook] ℹ️ Signature verification skipped (WHOP_SKIP_SIGNATURE_FOR_TEST=1, test mode)');
    } else if (signature && WHOP_WEBHOOK_SECRET) {
      const isValid = verifyWhopWebhookSignature(signature, rawBody, timestamp, webhookId);
      
      console.log('[Whop Webhook] 🔐 Signature verification:', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        isValid,
        isProduction,
        timestamp: new Date().toISOString(),
      });
      
      if (!isValid) {
        if (WHOP_SKIP_SIGNATURE_FOR_TEST) {
          console.log('[Whop Webhook] ℹ️ Invalid signature but allowed (WHOP_SKIP_SIGNATURE_FOR_TEST=1, e.g. Test webhook)');
        } else if (isProduction) {
          console.error('[Whop Webhook] ❌ CRITICAL: Invalid signature in production');
          return res.status(401).json({ error: 'Invalid signature' });
        } else {
          console.warn('[Whop Webhook] ⚠️ Invalid signature, but continuing (development mode)');
        }
      }
    } else if (isProduction && !signature && !WHOP_SKIP_SIGNATURE_FOR_TEST) {
      console.error('[Whop Webhook] ❌ CRITICAL: Missing signature header in production');
      return res.status(401).json({ error: 'Missing signature header' });
    }
    
    // イベントデータをパース（rawBody 優先: getRawBody 成功時は req.body が空になりうるため）
    let event;
    try {
      event = rawBody ? JSON.parse(rawBody) : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
    } catch (parseErr) {
      console.warn('[Whop Webhook] Failed to parse event:', parseErr?.message);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    if (!event || typeof event !== 'object') {
      console.warn('[Whop Webhook] Empty or invalid event payload');
      return res.status(200).json({ received: false, error: 'Invalid payload' });
    }

    console.log('[Whop Webhook] 📨 Received webhook event:', {
      type: event.type,
      dataKeys: event.data ? Object.keys(event.data) : [],
      timestamp: new Date().toISOString(),
    });
    
    // 購入イベントを処理（ドット形式とアンダースコア形式の両方に対応。Whop の仕様に応じて追加可能）
    const purchaseEventTypes = [
      'checkout.completed',
      'membership.created',
      'membership.renewed',
      'membership.activated',
      'membership_activated',
      'payment_succeeded',
      'payment.succeeded',
      'invoice_paid',
      'invoice.paid',
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
