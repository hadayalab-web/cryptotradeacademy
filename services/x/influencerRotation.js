// services/x/influencerRotation.js
// インフルエンサーローテーション管理（70人リストを上手にローテーション）

let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[InfluencerRotation] @vercel/kv not available:', error.message);
}

// KVキーのプレフィックス
const ROTATION_KEY_PREFIX = 'x:influencer_rotation:';
const POSTED_TODAY_KEY_PREFIX = 'x:influencer_posted_today:';

/**
 * 言語別のローテーションキーを生成
 * @param {string} lang - 言語コード
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {string} KVキー
 */
function getRotationKey(lang, dateString) {
  return `${ROTATION_KEY_PREFIX}${lang.toLowerCase()}:${dateString}`;
}

/**
 * 言語別の今日投稿済みキーを生成
 * @param {string} lang - 言語コード
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {string} KVキー
 */
function getPostedTodayKey(lang, dateString) {
  return `${POSTED_TODAY_KEY_PREFIX}${lang.toLowerCase()}:${dateString}`;
}

/**
 * 今日既に投稿したインフルエンサーのユーザー名リストを取得
 * @param {string} lang - 言語コード
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<Set<string>>} 投稿済みインフルエンサーのユーザー名セット
 */
async function getPostedInfluencersToday(lang, dateString = null) {
  if (!kv) {
    console.warn('[InfluencerRotation] KV not available, cannot get posted influencers');
    return new Set();
  }

  try {
    const targetDate = dateString || new Date().toISOString().split('T')[0];
    const key = getPostedTodayKey(lang, targetDate);
    const posted = await kv.get(key);
    
    if (!posted || !Array.isArray(posted)) {
      return new Set();
    }
    
    return new Set(posted);
  } catch (error) {
    console.error(`[InfluencerRotation] Failed to get posted influencers for ${lang}:`, error.message);
    return new Set();
  }
}

/**
 * インフルエンサーを今日の投稿済みリストに追加
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<boolean>} 保存成功時true
 */
async function markInfluencerPosted(lang, username, dateString = null) {
  if (!kv) {
    console.warn('[InfluencerRotation] KV not available, cannot mark influencer as posted');
    return false;
  }

  try {
    const targetDate = dateString || new Date().toISOString().split('T')[0];
    const key = getPostedTodayKey(lang, targetDate);
    
    // 既存のリストを取得
    const posted = await kv.get(key) || [];
    const postedSet = new Set(posted);
    
    // 新しいユーザー名を追加
    if (!postedSet.has(username)) {
      postedSet.add(username);
      const updatedList = Array.from(postedSet);
      
      // KVに保存（TTL: 48時間、日付が変わっても安全に保持）
      await kv.set(key, updatedList, { ex: 48 * 60 * 60 });
      
      console.log(`[InfluencerRotation] ✅ Marked @${username} as posted for ${lang} on ${targetDate} (total: ${updatedList.length})`);
      return true;
    }
    
    return true; // 既に存在する場合も成功として扱う
  } catch (error) {
    console.error(`[InfluencerRotation] Failed to mark influencer as posted for ${lang}:`, error.message);
    return false;
  }
}

/**
 * ローテーションインデックスを取得（次に選ぶべきインフルエンサーの開始位置）
 * @param {string} lang - 言語コード
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<number>} ローテーションインデックス
 */
async function getRotationIndex(lang, dateString = null) {
  if (!kv) {
    return 0;
  }

  try {
    const targetDate = dateString || new Date().toISOString().split('T')[0];
    const key = getRotationKey(lang, targetDate);
    const index = await kv.get(key);
    
    return index !== null && typeof index === 'number' ? index : 0;
  } catch (error) {
    console.error(`[InfluencerRotation] Failed to get rotation index for ${lang}:`, error.message);
    return 0;
  }
}

/**
 * ローテーションインデックスを更新
 * @param {string} lang - 言語コード
 * @param {number} newIndex - 新しいインデックス
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<boolean>} 更新成功時true
 */
async function updateRotationIndex(lang, newIndex, dateString = null) {
  if (!kv) {
    return false;
  }

  try {
    const targetDate = dateString || new Date().toISOString().split('T')[0];
    const key = getRotationKey(lang, targetDate);
    
    // KVに保存（TTL: 48時間）
    await kv.set(key, newIndex, { ex: 48 * 60 * 60 });
    
    return true;
  } catch (error) {
    console.error(`[InfluencerRotation] Failed to update rotation index for ${lang}:`, error.message);
    return false;
  }
}

/**
 * インフルエンサーリストから、ローテーションを考慮して選択
 * 今日既に投稿した人を除外し、ローテーション順に選択
 * @param {Array} influencers - インフルエンサー配列
 * @param {string} lang - 言語コード
 * @param {number} count - 選択する人数
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<Array>} 選択されたインフルエンサー配列
 */
async function selectInfluencersWithRotation(influencers, lang, count, dateString = null) {
  if (!influencers || influencers.length === 0) {
    return [];
  }

  const targetDate = dateString || new Date().toISOString().split('T')[0];
  
  // 今日既に投稿したインフルエンサーを取得
  const postedToday = await getPostedInfluencersToday(lang, targetDate);
  
  // 投稿済みを除外
  const availableInfluencers = influencers.filter(inf => {
    const username = inf.username || inf.userId || inf.id;
    return username && !postedToday.has(username);
  });
  
  // 利用可能なインフルエンサーが不足している場合、投稿済みも含める（ローテーションをリセット）
  if (availableInfluencers.length < count) {
    console.log(`[InfluencerRotation] ⚠️ Only ${availableInfluencers.length} available influencers for ${lang}, resetting rotation`);
    // 投稿済みリストをクリア（新しい日付で自動的にリセットされるが、念のため）
    if (kv) {
      try {
        const key = getPostedTodayKey(lang, targetDate);
        await kv.del(key);
      } catch (error) {
        console.warn(`[InfluencerRotation] Failed to reset posted list:`, error.message);
      }
    }
    // 全インフルエンサーを使用
    const allInfluencers = influencers;
    
    // ローテーションインデックスを取得
    const rotationIndex = await getRotationIndex(lang, targetDate);
    
    // ローテーション順に選択（循環）
    const selected = [];
    for (let i = 0; i < count && i < allInfluencers.length; i++) {
      const index = (rotationIndex + i) % allInfluencers.length;
      selected.push(allInfluencers[index]);
    }
    
    // ローテーションインデックスを更新
    const newIndex = (rotationIndex + count) % allInfluencers.length;
    await updateRotationIndex(lang, newIndex, targetDate);
    
    console.log(`[InfluencerRotation] ✅ Selected ${selected.length} influencers with rotation (index: ${rotationIndex} → ${newIndex})`);
    return selected;
  }
  
  // 利用可能なインフルエンサーが十分ある場合
  // ローテーションインデックスを取得
  const rotationIndex = await getRotationIndex(lang, targetDate);
  
  // ローテーション順に選択（循環）
  const selected = [];
  for (let i = 0; i < count && i < availableInfluencers.length; i++) {
    const index = (rotationIndex + i) % availableInfluencers.length;
    selected.push(availableInfluencers[index]);
  }
  
  // ローテーションインデックスを更新
  const newIndex = (rotationIndex + count) % availableInfluencers.length;
  await updateRotationIndex(lang, newIndex, targetDate);
  
  console.log(`[InfluencerRotation] ✅ Selected ${selected.length} influencers with rotation (available: ${availableInfluencers.length}, index: ${rotationIndex} → ${newIndex})`);
  return selected;
}

/**
 * 今日の投稿統計を取得
 * @param {string} lang - 言語コード
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<Object>} 投稿統計 {postedCount, totalInfluencers, rotationIndex}
 */
async function getRotationStats(lang, dateString = null) {
  const targetDate = dateString || new Date().toISOString().split('T')[0];
  
  const postedToday = await getPostedInfluencersToday(lang, targetDate);
  const rotationIndex = await getRotationIndex(lang, targetDate);
  
  return {
    postedCount: postedToday.size,
    postedInfluencers: Array.from(postedToday),
    rotationIndex,
    date: targetDate,
  };
}

module.exports = {
  getPostedInfluencersToday,
  markInfluencerPosted,
  getRotationIndex,
  updateRotationIndex,
  selectInfluencersWithRotation,
  getRotationStats,
};
