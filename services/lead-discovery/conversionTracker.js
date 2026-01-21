// services/lead-discovery/conversionTracker.js
// リード発見から成約までのCVR追跡システム

const { listMemberships } = require('../whop/client');
const { createClient } = require('@vercel/kv');

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

let kvClient = null;
if (KV_REST_API_URL && KV_REST_API_TOKEN) {
  kvClient = createClient({
    url: KV_REST_API_URL,
    token: KV_REST_API_TOKEN,
  });
}

/**
 * リードIDを生成（ユニークID）
 * @param {Object} lead - リード情報
 * @returns {string} リードID
 */
function generateLeadId(lead) {
  // tweetIdまたはuserIdを優先的に使用（より一意性が高い）
  const crypto = require('crypto');
  let data;
  
  if (lead.tweetId) {
    // Xリード: tweetIdを優先
    data = `tweet:${lead.tweetId}`;
  } else if (lead.userId) {
    // Telegramリード: userIdを優先
    data = `user:${lead.userId}`;
  } else {
    // フォールバック: username + timestamp + source
    data = `${lead.username || 'unknown'}_${lead.timestamp || Date.now()}_${lead.source || 'unknown'}`;
  }
  
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * リードを記録（KVストレージに保存）
 * @param {Object} lead - リード情報
 * @returns {Promise<string>} リードID
 */
async function recordLead(lead) {
  if (!kvClient) {
    console.error('[Conversion Tracker] ❌ CRITICAL: KV client not initialized! Lead will not be tracked.');
    console.error('[Conversion Tracker] KV_REST_API_URL:', process.env.KV_REST_API_URL ? 'SET' : 'NOT SET');
    console.error('[Conversion Tracker] KV_REST_API_TOKEN:', process.env.KV_REST_API_TOKEN ? 'SET' : 'NOT SET');
    // 緊急修正: KVが設定されていない場合でも、リードIDを生成して返す（後で記録可能にする）
    const leadId = generateLeadId(lead);
    console.warn(`[Conversion Tracker] Generated leadId without KV: ${leadId} (@${lead.username || 'unknown'})`);
    return leadId; // nullではなくleadIdを返す（後で記録可能にする）
  }

  const leadId = generateLeadId(lead);
  const leadData = {
    leadId,
    username: lead.username,
    tweetId: lead.tweetId,
    userId: lead.userId,
    chatId: lead.chatId,
    lang: lead.lang,
    source: lead.source,
    score: lead.score,
    isPerfectMatch: lead.isPerfectMatch,
    keywords: lead.keywords || [],
    telegramLinks: lead.telegramLinks || [],
    discoveredAt: lead.timestamp || new Date().toISOString(),
    vsl1SentAt: null,
    vsl1Sent: false,
    convertedAt: null,
    converted: false,
    membershipId: null,
    planId: null,
    revenue: 0,
  };

  try {
    // リード情報を保存
    await kvClient.set(`lead:${leadId}`, JSON.stringify(leadData), { ex: 90 * 24 * 60 * 60 }); // 90日間保存
    
    // リードIDをインデックスに追加（日付別）
    const dateKey = new Date().toISOString().split('T')[0];
    await kvClient.sadd(`leads:${dateKey}`, leadId);
    
    console.log(`[Conversion Tracker] Lead recorded: ${leadId} (@${lead.username})`);
    return leadId;
  } catch (error) {
    console.error('[Conversion Tracker] Failed to record lead:', error.message);
    return null;
  }
}

/**
 * VSL1送信を記録
 * @param {string} leadId - リードID
 * @returns {Promise<void>}
 */
async function recordVSL1Sent(leadId) {
  if (!kvClient || !leadId) return;

  try {
    const leadDataRaw = await kvClient.get(`lead:${leadId}`);
    if (!leadDataRaw) return;

    // Vercel KVは自動的にJSONをパースする場合があるため、文字列かオブジェクトかをチェック
    const leadData = typeof leadDataRaw === 'string' ? JSON.parse(leadDataRaw) : leadDataRaw;
    leadData.vsl1Sent = true;
    leadData.vsl1SentAt = new Date().toISOString();

    await kvClient.set(`lead:${leadId}`, JSON.stringify(leadData), { ex: 90 * 24 * 60 * 60 });
    console.log(`[Conversion Tracker] VSL1 sent recorded for lead: ${leadId}`);
  } catch (error) {
    console.error('[Conversion Tracker] Failed to record VSL1 sent:', error.message);
  }
}

/**
 * Whop購入をリードと紐付ける
 * @param {Object} membership - Whopメンバーシップ情報
 * @param {string} username - Xのユーザー名（オプション）
 * @returns {Promise<string|null>} 紐付けられたリードID
 */
async function linkMembershipToLead(membership, username = null) {
  if (!kvClient) return null;

  try {
    // メンバーシップのメタデータからリードIDを取得
    const metadata = membership.metadata || {};
    const leadId = metadata.leadId || null;

    if (leadId) {
      // リードIDがメタデータにある場合、直接紐付け
      await recordConversion(leadId, membership);
      return leadId;
    }

    // ユーザー名で検索（過去30日間のリードを検索）
    if (username) {
      const leadId = await findLeadByUsername(username);
      if (leadId) {
        await recordConversion(leadId, membership);
        return leadId;
      }
    }

    return null;
  } catch (error) {
    console.error('[Conversion Tracker] Failed to link membership to lead:', error.message);
    return null;
  }
}

/**
 * ユーザー名でリードを検索
 * @param {string} username - Xのユーザー名
 * @returns {Promise<string|null>} リードID
 */
async function findLeadByUsername(username) {
  if (!kvClient) return null;

  try {
    // 過去30日間のリードを検索
    const dates = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    for (const dateKey of dates) {
      const leadIds = await kvClient.smembers(`leads:${dateKey}`);
      if (!leadIds || leadIds.length === 0) continue;

      for (const leadId of leadIds) {
        const leadDataRaw = await kvClient.get(`lead:${leadId}`);
        if (!leadDataRaw) continue;

        // Vercel KVは自動的にJSONをパースする場合があるため、文字列かオブジェクトかをチェック
        const leadData = typeof leadDataRaw === 'string' ? JSON.parse(leadDataRaw) : leadDataRaw;
        if (leadData.username === username) {
          return leadId;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[Conversion Tracker] Failed to find lead by username:', error.message);
    return null;
  }
}

/**
 * 成約を記録
 * @param {string} leadId - リードID
 * @param {Object} membership - Whopメンバーシップ情報
 * @returns {Promise<void>}
 */
async function recordConversion(leadId, membership) {
  if (!kvClient || !leadId) return;

  try {
    const leadDataRaw = await kvClient.get(`lead:${leadId}`);
    if (!leadDataRaw) {
      console.warn(`[Conversion Tracker] Lead not found: ${leadId}`);
      return;
    }

    // Vercel KVは自動的にJSONをパースする場合があるため、文字列かオブジェクトかをチェック
    const leadData = typeof leadDataRaw === 'string' ? JSON.parse(leadDataRaw) : leadDataRaw;
    leadData.converted = true;
    leadData.convertedAt = new Date().toISOString();
    leadData.membershipId = membership.id;
    leadData.planId = membership.plan_id;
    
    // プラン情報から収益を計算
    const plan = membership.plan || {};
    const initialPrice = plan.initial_price || 0;
    const renewalPrice = plan.renewal_price || 0;
    leadData.revenue = initialPrice + renewalPrice; // 簡易計算

    await kvClient.set(`lead:${leadId}`, JSON.stringify(leadData), { ex: 90 * 24 * 60 * 60 });
    
    // 成約をインデックスに追加（日付別）
    const dateKey = new Date().toISOString().split('T')[0];
    await kvClient.sadd(`conversions:${dateKey}`, leadId);
    
    console.log(`[Conversion Tracker] Conversion recorded: ${leadId} (revenue: $${leadData.revenue})`);
  } catch (error) {
    console.error('[Conversion Tracker] Failed to record conversion:', error.message);
  }
}

/**
 * Whop購入を同期（定期的に実行）
 * @returns {Promise<Object>} 同期結果
 */
async function syncWhopPurchases() {
  const stats = {
    checked: 0,
    linked: 0,
    newConversions: 0,
    errors: 0,
  };

  try {
    // 過去7日間のメンバーシップを取得
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const memberships = await listMemberships({
      status: 'active',
      expand: ['plan'],
    });

    stats.checked = memberships.length;

    for (const membership of memberships) {
      try {
        // メタデータからリードIDを取得
        const metadata = membership.metadata || {};
        const leadId = metadata.leadId || null;

        if (leadId) {
          // 既に紐付けられている場合、成約を記録
          const leadDataRaw = await kvClient?.get(`lead:${leadId}`);
          if (leadDataRaw) {
            // Vercel KVは自動的にJSONをパースする場合があるため、文字列かオブジェクトかをチェック
            const leadData = typeof leadDataRaw === 'string' ? JSON.parse(leadDataRaw) : leadDataRaw;
            if (!leadData.converted) {
              await recordConversion(leadId, membership);
              stats.newConversions++;
            }
          }
          stats.linked++;
        } else {
          // ユーザー名で検索（メンバーシップのメタデータから）
          const username = metadata.username || metadata.x_username || null;
          if (username) {
            const linkedLeadId = await linkMembershipToLead(membership, username);
            if (linkedLeadId) {
              stats.linked++;
            }
          }
        }
      } catch (error) {
        console.error('[Conversion Tracker] Error processing membership:', error.message);
        stats.errors++;
      }
    }

    return stats;
  } catch (error) {
    console.error('[Conversion Tracker] Failed to sync Whop purchases:', error.message);
    stats.errors++;
    return stats;
  }
}

/**
 * CVR統計を取得
 * @param {string} startDate - 開始日（YYYY-MM-DD）
 * @param {string} endDate - 終了日（YYYY-MM-DD）
 * @returns {Promise<Object>} CVR統計
 */
async function getCVRStats(startDate, endDate) {
  if (!kvClient) {
    return {
      totalLeads: 0,
      vsl1Sent: 0,
      conversions: 0,
      cvr: 0,
      revenue: 0,
      error: 'KV client not initialized',
    };
  }

  try {
    const stats = {
      totalLeads: 0,
      vsl1Sent: 0,
      conversions: 0,
      revenue: 0,
      perfectMatchLeads: 0,
      perfectMatchConversions: 0,
    };

    // 日付範囲のリードを取得
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    const leadIds = new Set();
    for (const dateKey of dates) {
      const ids = await kvClient.smembers(`leads:${dateKey}`);
      ids.forEach(id => leadIds.add(id));
    }

    stats.totalLeads = leadIds.size;

    // 各リードの詳細を取得
    for (const leadId of leadIds) {
      const leadDataRaw = await kvClient.get(`lead:${leadId}`);
      if (!leadDataRaw) continue;

      // Vercel KVは自動的にJSONをパースする場合があるため、文字列かオブジェクトかをチェック
      const leadData = typeof leadDataRaw === 'string' ? JSON.parse(leadDataRaw) : leadDataRaw;
      
      if (leadData.vsl1Sent) {
        stats.vsl1Sent++;
      }
      
      if (leadData.converted) {
        stats.conversions++;
        stats.revenue += leadData.revenue || 0;
      }

      if (leadData.isPerfectMatch) {
        stats.perfectMatchLeads++;
        if (leadData.converted) {
          stats.perfectMatchConversions++;
        }
      }
    }

    // CVR計算
    stats.cvr = stats.vsl1Sent > 0 ? (stats.conversions / stats.vsl1Sent) * 100 : 0;
    stats.perfectMatchCVR = stats.perfectMatchLeads > 0 
      ? (stats.perfectMatchConversions / stats.perfectMatchLeads) * 100 
      : 0;

    return stats;
  } catch (error) {
    console.error('[Conversion Tracker] Failed to get CVR stats:', error.message);
    return {
      totalLeads: 0,
      vsl1Sent: 0,
      conversions: 0,
      cvr: 0,
      revenue: 0,
      error: error.message,
    };
  }
}

/**
 * 言語別CVR統計を取得
 * @param {string} startDate - 開始日（YYYY-MM-DD）
 * @param {string} endDate - 終了日（YYYY-MM-DD）
 * @returns {Promise<Object>} 言語別CVR統計
 */
async function getCVRStatsByLanguage(startDate, endDate) {
  if (!kvClient) {
    return {
      byLanguage: {},
      error: 'KV client not initialized',
    };
  }

  try {
    const byLanguage = {
      en: { totalLeads: 0, vsl1Sent: 0, conversions: 0, revenue: 0, perfectMatchLeads: 0, perfectMatchConversions: 0 },
      es: { totalLeads: 0, vsl1Sent: 0, conversions: 0, revenue: 0, perfectMatchLeads: 0, perfectMatchConversions: 0 },
      'pt-br': { totalLeads: 0, vsl1Sent: 0, conversions: 0, revenue: 0, perfectMatchLeads: 0, perfectMatchConversions: 0 },
      ar: { totalLeads: 0, vsl1Sent: 0, conversions: 0, revenue: 0, perfectMatchLeads: 0, perfectMatchConversions: 0 },
      ja: { totalLeads: 0, vsl1Sent: 0, conversions: 0, revenue: 0, perfectMatchLeads: 0, perfectMatchConversions: 0 },
      ko: { totalLeads: 0, vsl1Sent: 0, conversions: 0, revenue: 0, perfectMatchLeads: 0, perfectMatchConversions: 0 },
      other: { totalLeads: 0, vsl1Sent: 0, conversions: 0, revenue: 0, perfectMatchLeads: 0, perfectMatchConversions: 0 },
    };

    // 日付範囲のリードを取得
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    const leadIds = new Set();
    for (const dateKey of dates) {
      const ids = await kvClient.smembers(`leads:${dateKey}`);
      ids.forEach(id => leadIds.add(id));
    }

    // 各リードの詳細を取得して言語別に集計
    for (const leadId of leadIds) {
      const leadDataRaw = await kvClient.get(`lead:${leadId}`);
      if (!leadDataRaw) continue;

      // Vercel KVは自動的にJSONをパースする場合があるため、文字列かオブジェクトかをチェック
      const leadData = typeof leadDataRaw === 'string' ? JSON.parse(leadDataRaw) : leadDataRaw;
      
      const lang = leadData.lang || 'other';
      const langKey = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'].includes(lang) ? lang : 'other';
      
      const langStats = byLanguage[langKey];
      langStats.totalLeads++;
      
      if (leadData.vsl1Sent) {
        langStats.vsl1Sent++;
      }
      
      if (leadData.converted) {
        langStats.conversions++;
        langStats.revenue += leadData.revenue || 0;
      }

      if (leadData.isPerfectMatch) {
        langStats.perfectMatchLeads++;
        if (leadData.converted) {
          langStats.perfectMatchConversions++;
        }
      }
    }

    // CVR計算
    for (const langKey in byLanguage) {
      const langStats = byLanguage[langKey];
      langStats.cvr = langStats.vsl1Sent > 0 ? (langStats.conversions / langStats.vsl1Sent) * 100 : 0;
      langStats.perfectMatchCVR = langStats.perfectMatchLeads > 0 
        ? (langStats.perfectMatchConversions / langStats.perfectMatchLeads) * 100 
        : 0;
    }

    return { byLanguage };
  } catch (error) {
    console.error('[Conversion Tracker] Failed to get CVR stats by language:', error.message);
    return {
      byLanguage: {},
      error: error.message,
    };
  }
}

module.exports = {
  generateLeadId,
  recordLead,
  recordVSL1Sent,
  recordConversion,
  linkMembershipToLead,
  syncWhopPurchases,
  getCVRStats,
  getCVRStatsByLanguage,
};
