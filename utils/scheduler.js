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
 * 範囲を正規化（maxMs <= minMs対策）
 * @param {number} minMs - 最小値
 * @param {number} maxMs - 最大値
 * @returns {{min: number, max: number}} 正規化された範囲
 */
function clampRange(minMs, maxMs) {
  const min = Math.max(0, Number(minMs) || 0);
  const max = Math.max(0, Number(maxMs) || 0);
  if (max <= min) return { min, max: min }; // 固定 or 0
  return { min, max };
}

/**
 * デッドラインを正規化（P0 FIX: GPT-5.2レビュー対応）
 * deadlineAtMs: 絶対時刻（Date.now() + ...で生成）
 * deadlineMs: 残り時間（ミリ秒、非推奨）
 * @param {Object} options - オプション
 * @param {number} options.deadlineAtMs - デッドライン時刻（ミリ秒）
 * @param {number} options.deadlineMs - 残り時間（ミリ秒、非推奨）
 * @returns {number|null} 正規化されたデッドライン時刻、またはnull
 */
function normalizeDeadline({ deadlineAtMs = null, deadlineMs = null } = {}) {
  // 両方指定されている場合は警告（本番では投稿を止めない）
  if (deadlineAtMs != null && deadlineMs != null) {
    console.warn('[Scheduler] Both deadlineAtMs and deadlineMs specified, using deadlineAtMs');
    const v = Number(deadlineAtMs);
    // P0 FIX: バリデーション追加（GPT-5.2レビュー対応）
    if (!Number.isFinite(v) || v < 946684800000) { // 2000年以前は無効
      console.warn('[Scheduler] Invalid deadlineAtMs, ignoring');
      return null;
    }
    return v;
  }
  
  // deadlineAtMsが指定されている場合は絶対時刻として扱う
  if (deadlineAtMs != null) {
    const v = Number(deadlineAtMs);
    // P0 FIX: バリデーション追加（GPT-5.2レビュー対応）
    if (!Number.isFinite(v) || v < 946684800000) { // 2000年以前は無効
      console.warn('[Scheduler] Invalid deadlineAtMs, ignoring');
      return null;
    }
    return v;
  }
  
  // deadlineMsが指定されている場合は残り時間として扱う（後方互換性）
  if (deadlineMs != null) {
    const v = Number(deadlineMs);
    // P0 FIX: バリデーション追加（GPT-5.2レビュー対応）
    if (!Number.isFinite(v) || v < 0) {
      console.warn('[Scheduler] Invalid deadlineMs, ignoring');
      return null;
    }
    return Date.now() + v;
  }
  
  return null;
}

/**
 * ジッター（揺らぎ）を適用
 * maxDurationが短い関数では上限を下げられるようにする
 * GPT-5.2推奨: maxDuration:60の場合は5-20秒程度に短縮
 * P0-3対応: maxDuration=60sに対して待機が長すぎるため、デフォルトを短縮
 * P0 FIX: maxMs <= minMs対策、例外処理を追加
 * P0 FIX: deadlineAtMsに改名（GPT-5.2レビュー対応）、乱数の非包含性を修正
 * @param {Object} options - オプション
 * @param {number} options.minMs - 最小待機時間（ミリ秒、デフォルト: 3000 = 3秒）
 * @param {number} options.maxMs - 最大待機時間（ミリ秒、デフォルト: 10000 = 10秒）
 * @param {string} options.label - ログ用ラベル
 * @param {number} options.deadlineAtMs - デッドライン時刻（ミリ秒、Date.now() + ...で生成、省略時は制限なし）
 * @param {number} options.deadlineMs - 後方互換性のため残す（非推奨: deadlineAtMsを使用）
 * @returns {Promise<void>}
 */
async function applyJitter({ minMs = 3000, maxMs = 10000, label = '', deadlineAtMs = null, deadlineMs = null } = {}) {
  try {
    // P0 FIX: デッドライン判定前にminMs/maxMsを正規化（GPT-5.2レビュー対応）
    const { min: normalizedMinMs, max: normalizedMaxMs } = clampRange(minMs, maxMs);
    minMs = normalizedMinMs;
    maxMs = normalizedMaxMs;
    
    // P0 FIX: デッドラインを正規化（GPT-5.2レビュー対応 - 自動判定を廃止し明確化）
    const deadline = normalizeDeadline({ deadlineAtMs, deadlineMs });
    
    // P1-3対応: 残り実行時間を考慮
    if (deadline) {
      const remaining = deadline - Date.now();
      const margin = 5000; // 安全マージン5秒
      // 「min + margin」すら無理ならスキップ（正規化後のminMsを使用）
      if (remaining <= minMs + margin) {
        const logLevel = process.env.LOG_LEVEL || 'info';
        if (logLevel === 'debug') {
          console.log(`[Jitter] ${label} skipping (remaining=${Math.round(remaining/1000)}s)`);
        }
        return;
      }
      // P1 FIX: 明示的に0以上に制限（GPT-5.2レビュー対応）
      maxMs = Math.max(0, Math.min(maxMs, remaining - margin));
    }
    
    // P0 FIX: 範囲は既に正規化済み（maxMs <= minMs対策）
    const { min, max } = { min: minMs, max: maxMs };
    // P1 FIX: 設定ミスの警告（GPT-5.2レビュー対応）
    if (max <= min && (process.env.LOG_LEVEL === 'debug')) {
      console.warn(`[Jitter] ${label} invalid range min=${minMs}ms max=${maxMs}ms, clamped to ${min}ms`);
    }
    // P1 FIX: 乱数の非包含性を修正（maxを含むように）（GPT-5.2レビュー対応）
    const jitterMs = (max === min) ? min : Math.floor(min + Math.random() * (max - min + 1));
    
    if (jitterMs <= 0) {
      const logLevel = process.env.LOG_LEVEL || 'info';
      if (logLevel === 'debug') {
        console.log(`[Jitter] ${label} skipping (jitterMs=${jitterMs}ms)`);
      }
      return;
    }
    
    // P1 FIX: ログをデフォルトで抑制（GPT-5.2レビュー対応）
    const logLevel = process.env.LOG_LEVEL || 'info';
    if (logLevel === 'debug') {
      console.log(`[Jitter] ${label} sleeping ${Math.round(jitterMs/1000)}s (min=${Math.round(min/1000)}s, max=${Math.round(max/1000)}s, remaining=${deadline ? Math.round((deadline - Date.now())/1000) : 'N/A'}s)`);
    } else if (jitterMs >= 1000) {
      // 通常時は1秒以上の待機のみログ（ノイズ削減）
      console.log(`[Jitter] ${label} sleeping ${Math.round(jitterMs/1000)}s`);
    }
    await sleep(jitterMs);
  } catch (error) {
    // P0 FIX: 待機は"ベストエフォート"にして握りつぶす（ログは残す）
    console.warn(`[Jitter] ${label} failed (non-fatal):`, error?.message || error);
  }
}

/**
 * 言語間ウェイトを適用
 * 6言語投稿時に各言語の投稿間に待機時間を追加
 * GPT-5.2推奨: 30-60秒（maxDuration制約を考慮）
 * P0-3対応: maxDuration=60sに対して待機が長すぎるため、デフォルトを短縮（0-3秒）
 * P0 FIX: maxMs <= minMs対策、例外処理を追加
 * P0 FIX: deadlineAtMsに改名（GPT-5.2レビュー対応）、乱数の非包含性を修正
 * @param {Object} options - オプション
 * @param {number} options.minMs - 最小待機時間（ミリ秒、デフォルト: 0 = 0秒）
 * @param {number} options.maxMs - 最大待機時間（ミリ秒、デフォルト: 3000 = 3秒）
 * @param {string} options.label - ログ用ラベル
 * @param {number} options.deadlineAtMs - デッドライン時刻（ミリ秒、Date.now() + ...で生成、省略時は制限なし）
 * @param {number} options.deadlineMs - 後方互換性のため残す（非推奨: deadlineAtMsを使用）
 * @returns {Promise<void>}
 */
async function applyLanguageWait({ minMs = 0, maxMs = 3000, label = '', deadlineAtMs = null, deadlineMs = null } = {}) {
  try {
    // P0 FIX: デッドライン判定前にminMs/maxMsを正規化（GPT-5.2レビュー対応）
    const { min: normalizedMinMs, max: normalizedMaxMs } = clampRange(minMs, maxMs);
    minMs = normalizedMinMs;
    maxMs = normalizedMaxMs;
    
    // P0 FIX: デッドラインを正規化（GPT-5.2レビュー対応 - 自動判定を廃止し明確化）
    const deadline = normalizeDeadline({ deadlineAtMs, deadlineMs });
    
    // P1-3対応: 残り実行時間を考慮
    if (deadline) {
      const remaining = deadline - Date.now();
      const margin = 2000; // 安全マージン2秒
      // 「min + margin」すら無理ならスキップ（正規化後のminMsを使用）
      if (remaining < minMs + margin) {
        const logLevel = process.env.LOG_LEVEL || 'info';
        if (logLevel === 'debug') {
          console.log(`[LangWait] ${label} skipping (remaining=${Math.round(remaining/1000)}s)`);
        }
        return;
      }
      // P1 FIX: 明示的に0以上に制限（GPT-5.2レビュー対応）
      maxMs = Math.max(0, Math.min(maxMs, remaining - margin));
    }
    
    // P0 FIX: 範囲は既に正規化済み（maxMs <= minMs対策）
    const { min, max } = { min: minMs, max: maxMs };
    // P1 FIX: 設定ミスの警告（GPT-5.2レビュー対応）
    if (max <= min && (process.env.LOG_LEVEL === 'debug')) {
      console.warn(`[LangWait] ${label} invalid range min=${minMs}ms max=${maxMs}ms, clamped to ${min}ms`);
    }
    // P1 FIX: 乱数の非包含性を修正（maxを含むように）（GPT-5.2レビュー対応）
    const waitMs = (max === min) ? min : Math.floor(min + Math.random() * (max - min + 1));
    
    if (waitMs <= 0) {
      return; // 0秒以下なら待機しない
    }
    
    // P0 FIX: ログをデフォルトで抑制（GPT-5.2レビュー対応）
    // debug時のみ詳細ログ、または待機時間が1秒以上のときのみログ
    const logLevel = process.env.LOG_LEVEL || 'info';
    if (logLevel === 'debug') {
      console.log(`[LangWait] ${label} sleeping ${Math.round(waitMs/1000)}s (min=${Math.round(min/1000)}s, max=${Math.round(max/1000)}s, remaining=${deadline ? Math.round((deadline - Date.now())/1000) : 'N/A'}s)`);
    } else if (waitMs >= 1000) {
      // 通常時は1秒以上の待機のみログ（ノイズ削減）
      console.log(`[LangWait] ${label} sleeping ${Math.round(waitMs/1000)}s`);
    }
    await sleep(waitMs);
  } catch (error) {
    // P0 FIX: 待機は"ベストエフォート"にして握りつぶす（ログは残す）
    console.warn(`[LangWait] ${label} failed (non-fatal):`, error?.message || error);
  }
}

module.exports = {
  sleep,
  applyJitter,
  applyLanguageWait,
};
