// services/x/quoteFunnelRotation.js
// 引用リポストの Minimal / Regular 導線ローテーション（Grok×Gemini 分析統合）
// ルール: インフルエンサーごとに「前回の導線タイプ」を記録し、次は逆を出す（初回は Minimal）

const { kv } = require('../../utils/kv');

const FUNNEL_KEY_PREFIX = 'x:quote_funnel:';
const TYPES = { MINIMAL_OPTIN: 'minimal_optin', REGULAR_OPTIN: 'regular_optin' };

function getFunnelKey(lang, influencerUsername) {
  const n = (lang || 'en').toLowerCase().replace('_', '-');
  const u = (influencerUsername || '').trim() || 'unknown';
  return `${FUNNEL_KEY_PREFIX}${n}:${u}`;
}

/**
 * 次に使う導線タイプを取得（前回の逆。初回は minimal_optin）
 * @param {string} lang - 言語コード
 * @param {string} influencerUsername - インフルエンサーの @ なしユーザー名
 * @returns {Promise<{ nextType: 'minimal_optin'|'regular_optin', previousType: string|null }>}
 */
async function getNextQuoteFunnelType(lang, influencerUsername) {
  if (!kv) {
    return { nextType: TYPES.MINIMAL_OPTIN, previousType: null };
  }
  try {
    const key = getFunnelKey(lang, influencerUsername);
    const previousType = await kv.get(key);
    const nextType =
      previousType === TYPES.MINIMAL_OPTIN ? TYPES.REGULAR_OPTIN : TYPES.MINIMAL_OPTIN;
    return { nextType, previousType: previousType || null };
  } catch (err) {
    console.warn('[QuoteFunnelRotation] getNextQuoteFunnelType failed:', err.message);
    return { nextType: TYPES.MINIMAL_OPTIN, previousType: null };
  }
}

/**
 * 使用した導線タイプを記録（次回の逆が出るようにする）
 * @param {string} lang - 言語コード
 * @param {string} influencerUsername - インフルエンサーの @ なしユーザー名
 * @param {string} usedType - 'minimal_optin' | 'regular_optin'
 */
async function recordQuoteFunnelType(lang, influencerUsername, usedType) {
  if (!kv || !usedType) return;
  try {
    const key = getFunnelKey(lang, influencerUsername);
    await kv.set(key, usedType);
  } catch (err) {
    console.warn('[QuoteFunnelRotation] recordQuoteFunnelType failed:', err.message);
  }
}

module.exports = {
  TYPES,
  getNextQuoteFunnelType,
  recordQuoteFunnelType,
};
