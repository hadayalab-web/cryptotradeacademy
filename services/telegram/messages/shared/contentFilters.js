// Shared content filters for all language message templates
// services/telegram/messages/shared/contentFilters.js

/**
 * Check if text contains Japanese characters
 * @param {string} text - Text to check
 * @returns {boolean} True if Japanese characters are found
 */
function hasJapanese(text) {
  if (!text || typeof text !== 'string') return false;
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}

/**
 * Filter Japanese characters from array of strings
 * @param {string[]} items - Array of strings to filter
 * @returns {string[]} Filtered array without Japanese content
 */
function filterJapaneseFromArray(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => !hasJapanese(item));
}

/**
 * Clean timing information by removing parentheses explanations
 * @param {string[]} timings - Array of timing strings
 * @returns {string[]} Cleaned timing strings (UTC time only)
 */
function cleanTimingInfo(timings) {
  if (!Array.isArray(timings)) return [];
  return timings
    .map(timing => {
      if (!timing || typeof timing !== 'string') return null;
      // Remove Japanese characters
      if (hasJapanese(timing)) return null;
      // Remove parentheses explanations
      return timing
        .replace(/\s*\([^)]*\).*$/, '')
        .replace(/\s*（[^）]*）.*$/, '')
        .trim();
    })
    .filter(timing => timing !== null && timing.length > 0);
}

/**
 * Check if psychologicalInsights object contains Japanese anywhere
 * @param {Object} insights - Psychological insights object
 * @returns {boolean} True if Japanese is found anywhere in the object
 */
function hasJapaneseInPsychologicalInsights(insights) {
  if (!insights || typeof insights !== 'object') return false;
  try {
    return hasJapanese(JSON.stringify(insights));
  } catch (e) {
    return false;
  }
}

/**
 * Format viral potential score with emoji and label
 * @param {number} score - Viral potential score (0-100)
 * @param {Object} labels - Language-specific labels {high, medium, low}
 * @returns {Object} {emoji, label, score}
 */
function formatViralScore(score, labels = { high: '[HIGH]', medium: '[MEDIUM]', low: '[LOW]' }) {
  const rounded = Math.round(score);
  const emoji = rounded >= 70 ? '🔥' : rounded >= 50 ? '⚡' : '💡';
  const label = rounded >= 70 ? labels.high : rounded >= 50 ? labels.medium : labels.low;
  return { emoji, label, score: rounded };
}

module.exports = {
  hasJapanese,
  filterJapaneseFromArray,
  cleanTimingInfo,
  hasJapaneseInPsychologicalInsights,
  formatViralScore,
};
