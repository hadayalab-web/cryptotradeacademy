// utils/scheduler.js
// ジッター（揺らぎ）と言語間ウェイトの共通ユーティリティ
// GPT-5.2推奨: maxDuration制約を考慮した実装

/**
 * スリープ関数
 * @param {number} ms - 待機時間（ミリ秒）
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ジッター（揺らぎ）を適用
 * maxDurationが短い関数では上限を下げられるようにする
 * GPT-5.2推奨: maxDuration:60の場合は5-20秒程度に短縮
 * P0-3対応: maxDuration=60sに対して待機が長すぎるため、デフォルトを短縮
 * @param {Object} options - オプション
 * @param {number} options.minMs - 最小待機時間（ミリ秒、デフォルト: 3000 = 3秒）
 * @param {number} options.maxMs - 最大待機時間（ミリ秒、デフォルト: 10000 = 10秒）
 * @param {string} options.label - ログ用ラベル
 * @param {number} options.deadlineMs - デッドライン時刻（ミリ秒、省略時は制限なし）
 * @returns {Promise<void>}
 */
async function applyJitter({ minMs = 3000, maxMs = 10000, label = '', deadlineMs = null } = {}) {
  // P1-3対応: 残り実行時間を考慮
  if (deadlineMs) {
    const remaining = deadlineMs - Date.now();
    if (remaining < minMs + 5000) { // 残り5秒未満ならスキップ
      console.log(`[Jitter] ${label} skipping (insufficient time: ${Math.round(remaining/1000)}s remaining)`);
      return;
    }
    maxMs = Math.min(maxMs, remaining - 5000); // 安全マージン5秒を確保
  }
  
  const jitterMs = Math.floor(minMs + Math.random() * (maxMs - minMs));
  console.log(`[Jitter] ${label} sleeping ${Math.round(jitterMs/1000)}s`);
  await sleep(jitterMs);
}

/**
 * 言語間ウェイトを適用
 * 6言語投稿時に各言語の投稿間に待機時間を追加
 * GPT-5.2推奨: 30-60秒（maxDuration制約を考慮）
 * P0-3対応: maxDuration=60sに対して待機が長すぎるため、デフォルトを短縮（0-3秒）
 * @param {Object} options - オプション
 * @param {number} options.minMs - 最小待機時間（ミリ秒、デフォルト: 0 = 0秒）
 * @param {number} options.maxMs - 最大待機時間（ミリ秒、デフォルト: 3000 = 3秒）
 * @param {string} options.label - ログ用ラベル
 * @param {number} options.deadlineMs - デッドライン時刻（ミリ秒、省略時は制限なし）
 * @returns {Promise<void>}
 */
async function applyLanguageWait({ minMs = 0, maxMs = 3000, label = '', deadlineMs = null } = {}) {
  // P1-3対応: 残り実行時間を考慮
  if (deadlineMs) {
    const remaining = deadlineMs - Date.now();
    if (remaining < minMs + 2000) { // 残り2秒未満ならスキップ
      console.log(`[LangWait] ${label} skipping (insufficient time: ${Math.round(remaining/1000)}s remaining)`);
      return;
    }
    maxMs = Math.min(maxMs, remaining - 2000); // 安全マージン2秒を確保
  }
  
  const waitMs = Math.floor(minMs + Math.random() * (maxMs - minMs));
  if (waitMs > 0) {
    console.log(`[LangWait] ${label} sleeping ${Math.round(waitMs/1000)}s`);
    await sleep(waitMs);
  }
}

module.exports = {
  sleep,
  applyJitter,
  applyLanguageWait,
};
