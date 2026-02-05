// services/content/minimalContent.js
// 無料版（Minimal Version）コンテンツ取得の共通ロジック（API・引用リポストで共有）

// フォルダ名は pt-br のためハイフンあり。他は小文字のみ。
const SUPPORTED_LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];

/**
 * 言語コードを正規化（API用: 小文字・ハイフン統一）
 * @param {string} lang
 * @returns {string}
 */
function normalizeLangCode(lang) {
  if (!lang || typeof lang !== "string") return "en";
  return lang.toLowerCase().trim().replace(/_/g, "-");
}

/**
 * 無料版メッセージ用テンプレートを読み込む（フォルダ名は pt-br などそのまま）
 * @param {string} lang - 言語コード（en, es, pt-br, ar, ja, ko）
 * @returns {object} formatMinimalHighQualityBriefing 等を持つオブジェクト
 */
function loadMinimalTemplates(lang) {
  const pathLang = normalizeLangCode(lang);
  try {
    return require("../telegram/messages/user/" + pathLang + "/minimal-high-quality." + pathLang);
  } catch (e) {
    return require("../telegram/messages/user/en/minimal-high-quality.en");
  }
}

/**
 * 無料版メッセージのキーポイントを取得（6言語同一ロジック）
 * @param {string} lang - 言語コード（en, es, pt-br, ar, ja, ko）
 * @param {object|null} reportData - レポートデータ（省略時は null でテンプレートのみ）
 * @returns {Promise<object|null>} { hook, trapScore, dataPoints, drGrokInsight, mentalNote, whatToAvoid } または null
 */
async function getMinimalContentForLang(lang, reportData = null) {
  try {
    const langTemplates = loadMinimalTemplates(lang);
    const formatMinimalBriefing =
      langTemplates.formatMinimalHighQualityBriefing || langTemplates.formatMinimalBriefing;
    if (!formatMinimalBriefing) return null;

    const trapData = reportData?.trapData || {
      trapAlert: null,
      exchangeNetflow: reportData?.exchangeNetflow ?? null,
      whaleRatio: reportData?.whaleRatio ?? null
    };
    const marketData = reportData?.marketData || {
      mpi: reportData?.mpi ?? null,
      priceUsd: reportData?.priceUsd ?? null,
      change24h: reportData?.change24h ?? null
    };
    const sentimentData = reportData?.sentimentData || {
      sentiment: reportData?.sentiment ?? null,
      risk: reportData?.risk ?? null
    };

    const minimalText = formatMinimalBriefing({
      now: new Date(),
      trapScore: reportData?.trapScore ?? null,
      priceUsd: reportData?.priceUsd ?? null,
      change24h: reportData?.change24h ?? null,
      trapData,
      marketData,
      sentimentData,
      lang: lang
    });
    if (!minimalText) return null;

    const keyPoints = {
      hook: null,
      trapScore: null,
      dataPoints: [],
      drGrokInsight: null,
      mentalNote: null,
      whatToAvoid: []
    };

    const hookMatch = minimalText.match(/🚨\s*BREAKING[^\n]*/i) || minimalText.match(/🚨[^\n]*/);
    if (hookMatch) keyPoints.hook = hookMatch[0].trim();

    const trapScoreMatch = minimalText.match(/Trap Score[:\s]*(\d+)\/100/i);
    if (trapScoreMatch) keyPoints.trapScore = parseInt(trapScoreMatch[1], 10);

    const dataMatch = minimalText.match(/Exchange Netflow[^\n]*/i);
    if (dataMatch) keyPoints.dataPoints.push(dataMatch[0].trim());
    const whaleMatch = minimalText.match(/Whale Ratio[^\n]*/i);
    if (whaleMatch) keyPoints.dataPoints.push(whaleMatch[0].trim());

    const insightMatch = minimalText.match(
      /Dr\. Grok['"]?s Quick Insight[^\n]*\n([^\n]+(?:\n[^\n]+)*?)(?=\n━━|$)/is
    );
    if (insightMatch)
      keyPoints.drGrokInsight = insightMatch[1].trim().replace(/^["']|["']$/g, "");

    const mentalNoteMatch = minimalText.match(
      /Mental Note[^\n]*\n([^\n]+(?:\n[^\n]+)*?)(?=\n━━|$)/is
    );
    if (mentalNoteMatch)
      keyPoints.mentalNote = mentalNoteMatch[1].trim().replace(/^["']|["']$/g, "");

    const whatToAvoidMatch = minimalText.match(/What to Avoid[^\n]*\n((?:•[^\n]+\n?)+)/i);
    if (whatToAvoidMatch) {
      const items = whatToAvoidMatch[1]
        .split("\n")
        .filter((line) => line.trim().startsWith("•"));
      keyPoints.whatToAvoid = items.map((item) => item.replace(/^•\s*/, "").trim());
    }

    return keyPoints;
  } catch (err) {
    console.warn("[minimalContent] getMinimalContentForLang failed for", lang, err.message);
    return null;
  }
}

/**
 * 指定言語がサポートされているか
 * @param {string} lang - 正規化前の言語コード
 * @returns {boolean}
 */
function isSupportedLang(lang) {
  const pathLang = normalizeLangCode(lang);
  return SUPPORTED_LANGS.includes(pathLang);
}

module.exports = {
  SUPPORTED_LANGS,
  normalizeLangCode,
  loadMinimalTemplates,
  getMinimalContentForLang,
  isSupportedLang
};
