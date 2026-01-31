// services/savedLoss.js
// 次のフェーズ戦略: 「回避された損失（Saved Loss）」の可視化。無料で拡散→有料で解説するフローの土台。

const { getLexiconShortLabels } = require('../config/lexicon');
const { getKV } = require('../utils/kv');

const SAVED_LOSS_KEY_PREFIX = 'saved_loss:last_briefing:';
const NOTIONAL_USD = 10000; // 想定ポジション規模（USD）で回避損失を推定

/**
 * 前回配信時の価格・シグナルを保存（cron で定期/緊急配信後に呼ぶ）
 * @param {number} priceUsd - BTC 価格（USD）
 * @param {string} signal - シグナル（STANDBY, AVOID_LONG, AVOID_SHORT 等）
 * @param {string} lang - 言語
 */
async function saveLastBriefingSignal(priceUsd, signal, lang) {
  if (priceUsd == null || !signal || !lang) return;
  try {
    const kv = getKV();
    if (!kv) return;
    const key = `${SAVED_LOSS_KEY_PREFIX}${(lang || 'en').toLowerCase()}`;
    await kv.set(
      key,
      { priceUsd: Number(priceUsd), signal: String(signal), ts: Date.now() },
      { ex: 86400 * 7 }
    ); // 7日TTL
  } catch (e) {
    console.warn('[SavedLoss] saveLastBriefingSignal failed:', e.message);
  }
}

/**
 * 回避された損失の推定値を取得（前回シグナル・価格と現在価格から算出）
 * @param {string} lang - 言語
 * @param {number} currentPriceUsd - 現在の BTC 価格（USD）
 * @returns {Promise<{ amountUsd: number, percent: number }|null>}
 */
async function getSavedLossEstimate(lang, currentPriceUsd) {
  if (currentPriceUsd == null || !Number.isFinite(currentPriceUsd)) return null;
  try {
    const kv = getKV();
    if (!kv) return null;
    const key = `${SAVED_LOSS_KEY_PREFIX}${(lang || 'en').toLowerCase()}`;
    const last = await kv.get(key);
    if (!last || last.priceUsd == null || !last.signal) return null;
    const lastPrice = Number(last.priceUsd);
    const current = Number(currentPriceUsd);
    const signal = String(last.signal).toUpperCase();
    // 24時間以上前のデータは使わない
    if (Date.now() - (last.ts || 0) > 86400 * 1000) return null;

    let savedUsd = 0;
    if ((signal === 'STANDBY' || signal === 'AVOID_LONG') && current < lastPrice) {
      savedUsd = NOTIONAL_USD * ((lastPrice - current) / lastPrice);
    } else if (signal === 'AVOID_SHORT' && current > lastPrice) {
      savedUsd = NOTIONAL_USD * ((current - lastPrice) / lastPrice);
    }
    if (savedUsd <= 0) return null;
    const percent = ((savedUsd / NOTIONAL_USD) * 100).toFixed(2);
    return { amountUsd: Math.round(savedUsd), percent: parseFloat(percent) };
  } catch (e) {
    console.warn('[SavedLoss] getSavedLossEstimate failed:', e.message);
    return null;
  }
}

/**
 * 無料版用「Saved Loss」Quote 投稿テキスト（1行）
 * 例: "Dopamine-Trap avoided: $5K saved 🔥 Reply with your number. #BTC #TrapDefence"
 * @param {string} lang - 言語
 * @param {number} amountUsd - 回避した金額（USD）
 * @returns {string}
 */
function formatSavedLossQuote(lang, amountUsd) {
  const labels = getLexiconShortLabels(lang);
  const amountStr =
    amountUsd >= 1000 ? `$${(amountUsd / 1000).toFixed(1)}K` : `$${Math.round(amountUsd)}`;
  const templates = {
    en: `Dopamine-Trap avoided: ${amountStr} saved 🔥 Reply with your number. #BTC #TrapDefence`,
    ja: `Dopamine-Trap回避: ${amountStr} 回避 🔥 あなたの数字をリプライで。 #BTC #TrapDefence`,
    es: `Dopamine-Trap evitado: ${amountStr} ahorrado 🔥 Responde con tu número. #BTC #TrapDefence`,
    'pt-br': `Dopamine-Trap evitado: ${amountStr} economizado 🔥 Responda com seu número. #BTC #TrapDefence`,
    ar: `تجنبت Dopamine-Trap: ${amountStr} وفرت 🔥 رد برقمك. #BTC #TrapDefence`,
    ko: `Dopamine-Trap 회피: ${amountStr} 절약 🔥 답글로 숫자 보내줘. #BTC #TrapDefence`,
  };
  const normalized = (lang || 'en').toLowerCase();
  return templates[normalized] || templates.en;
}

/**
 * Saved Loss をレポート本文に挿入する短文（有料版スレッド用）
 * @param {string} lang - 言語
 * @param {number} amountUsd - 回避した金額（USD）
 * @returns {string}
 */
function formatSavedLossSnippet(lang, amountUsd) {
  const amountStr =
    amountUsd >= 1000 ? `$${(amountUsd / 1000).toFixed(1)}K` : `$${Math.round(amountUsd)}`;
  const templates = {
    en: `💎 Saved Loss this session: ${amountStr} (by following standby/avoid).`,
    ja: `💎 今回の回避損失: ${amountStr}（見送り・回避に従った結果）。`,
    es: `💎 Saved Loss esta sesión: ${amountStr} (siguiendo standby/avoid).`,
    'pt-br': `💎 Saved Loss nesta sessão: ${amountStr} (seguindo standby/avoid).`,
    ar: `💎 Saved Loss هذه الجلسة: ${amountStr} (باتباع standby/avoid).`,
    ko: `💎 이번 세션 Saved Loss: ${amountStr} (대기·회피 준수).`,
  };
  const normalized = (lang || 'en').toLowerCase();
  return templates[normalized] || templates.en;
}

module.exports = {
  saveLastBriefingSignal,
  getSavedLossEstimate,
  formatSavedLossQuote,
  formatSavedLossSnippet,
};
