// utils/common.js
// 共通ユーティリティ関数

/**
 * 文字列をブール値に変換（共通化）
 * @param {*} value - 変換する値
 * @param {boolean} defaultValue - デフォルト値
 * @returns {boolean} ブール値
 */
function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
}

/**
 * 言語コードを正規化（共通化）
 * @param {string} value - 言語コード
 * @param {string[]} supportedLangs - サポートされている言語コードの配列
 * @returns {string|null} 正規化された言語コード、無効な場合はnull
 */
function normalizeLang(value, supportedLangs = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko']) {
  if (!value) return null;
  // P2 FIX: 複数のアンダースコアに対応（replaceAll使用）
  const normalizedBase = String(value).trim().toLowerCase().split('.')[0].replaceAll('_', '-');
  return supportedLangs.includes(normalizedBase) ? normalizedBase : null;
}

module.exports = {
  parseBoolean,
  normalizeLang,
};
