// utils/timezone.js
// タイムゾーン補正ユーティリティ
// Grok CSO+CFO推奨: タイミング判定にタイムゾーン補正追加

/**
 * UTC時刻をJST（日本標準時）に変換
 * @param {Date} utcDate - UTC時刻のDateオブジェクト
 * @returns {Date} JST時刻のDateオブジェクト
 */
function utcToJST(utcDate) {
  const jstOffset = 9 * 60 * 60 * 1000; // JSTはUTC+9時間
  return new Date(utcDate.getTime() + jstOffset);
}

/**
 * JST（日本標準時）をUTC時刻に変換
 * @param {Date} jstDate - JST時刻のDateオブジェクト
 * @returns {Date} UTC時刻のDateオブジェクト
 */
function jstToUTC(jstDate) {
  const jstOffset = 9 * 60 * 60 * 1000; // JSTはUTC+9時間
  return new Date(jstDate.getTime() - jstOffset);
}

/**
 * 現在時刻をUTCで取得
 * @returns {Date} UTC時刻のDateオブジェクト
 */
function getCurrentUTC() {
  return new Date();
}

/**
 * 現在時刻をJSTで取得
 * @returns {Date} JST時刻のDateオブジェクト
 */
function getCurrentJST() {
  return utcToJST(getCurrentUTC());
}

/**
 * 指定された時間（ミリ秒）が経過したかどうかを判定（UTC基準）
 * @param {Date|string} startTime - 開始時刻（ISO 8601文字列またはDateオブジェクト）
 * @param {number} hours - 経過時間（時間単位）
 * @returns {boolean} 指定時間が経過した場合true
 */
function hasTimePassed(startTime, hours) {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const now = getCurrentUTC();
  const elapsedMs = now.getTime() - start.getTime();
  const requiredMs = hours * 60 * 60 * 1000;
  return elapsedMs >= requiredMs;
}

/**
 * 指定された時間範囲内かどうかを判定（UTC基準）
 * @param {Date|string} startTime - 開始時刻
 * @param {number} minHours - 最小経過時間（時間単位）
 * @param {number} maxHours - 最大経過時間（時間単位）
 * @returns {boolean} 時間範囲内の場合true
 */
function isWithinTimeRange(startTime, minHours, maxHours) {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const now = getCurrentUTC();
  const elapsedMs = now.getTime() - start.getTime();
  const minMs = minHours * 60 * 60 * 1000;
  const maxMs = maxHours * 60 * 60 * 1000;
  return elapsedMs >= minMs && elapsedMs < maxMs;
}

/**
 * 経過時間を時間単位で取得（UTC基準）
 * @param {Date|string} startTime - 開始時刻
 * @returns {number} 経過時間（時間単位、小数点以下2桁）
 */
function getElapsedHours(startTime) {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const now = getCurrentUTC();
  const elapsedMs = now.getTime() - start.getTime();
  return Math.round((elapsedMs / (60 * 60 * 1000)) * 100) / 100;
}

module.exports = {
  utcToJST,
  jstToUTC,
  getCurrentUTC,
  getCurrentJST,
  hasTimePassed,
  isWithinTimeRange,
  getElapsedHours,
};
