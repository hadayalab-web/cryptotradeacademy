/**
 * 時間帯別・言語別の予定リプライ数を算出
 * share_ratio と地域ピークに基づく戦略的 UTC→言語 割り当て（均等でない）
 */
const {
  TIME_DISTRIBUTION,
  LANGUAGE_ALLOCATION,
  STRATEGIC_UTC_TO_LANG
} = require("./mlPqtScheduleConfig");

/** 戦略テーブルがあればそれを使い、なければ従来の 4h ブロック（後方互換） */
function getLangByUtcHour(utcHour) {
  const h = Math.floor(Number(utcHour)) % 24;
  if (Array.isArray(STRATEGIC_UTC_TO_LANG) && STRATEGIC_UTC_TO_LANG[h]) {
    return STRATEGIC_UTC_TO_LANG[h];
  }
  const fallback = ["ja", "ko", "en", "es", "pt", "ar"];
  return fallback[Math.floor(h / 4) % fallback.length];
}

/** CMO 推奨: region パラメータ用。asia=ja/ko, latam=es/pt, emea=ar。UTC 時に該当言語を 1 つ返す */
const REGION_LANGS = { asia: ["ja", "ko"], latam: ["es", "pt"], emea: ["ar"] };
function getLangForRegion(region, utcHour) {
  const r = String(region || "").toLowerCase();
  const langs = REGION_LANGS[r];
  if (!langs || !langs.length) return getLangByUtcHour(utcHour);
  const h = Math.floor(Number(utcHour)) % 24;
  const strategic = Array.isArray(STRATEGIC_UTC_TO_LANG) && STRATEGIC_UTC_TO_LANG[h];
  if (strategic && langs.includes(strategic)) return strategic;
  return langs[h % langs.length];
}

/**
 * 環境変数から日次 Run 数・cap/run・KPI を取得（buzzWeaveEngine と同期）
 */
function getScheduleParams() {
  const campaign =
    process.env.CAMPAIGN_PAID_FOCUS === "true" || process.env.CAMPAIGN_PAID_FOCUS === "1";
  const intervalMin = Number(process.env.BUZZWEAVE_RUN_INTERVAL_MINUTES) || (campaign ? 30 : 0);
  const runsPerDay =
    Number(process.env.BUZZWEAVE_RUNS_PER_DAY_FOR_TARGET) ||
    (campaign
      ? intervalMin > 0
        ? Math.min(96, Math.max(24, Math.round(1440 / intervalMin)))
        : 24
      : 8);
  const kpiMin = Number(process.env.BUZZWEAVE_48H_REPLY_KPI_MIN || 1500);
  const kpiMax = Number(process.env.BUZZWEAVE_48H_REPLY_KPI_MAX || 2000);
  const dailyFloor = Math.round(kpiMin / 2);
  const dailyCeiling = Math.round(kpiMax / 2);
  const dailyTargetForCap = Math.min(Math.max(dailyFloor, 0), dailyCeiling || 99999);
  const capPerRun =
    dailyTargetForCap > 0
      ? Math.ceil(dailyTargetForCap / runsPerDay)
      : Math.ceil((dailyFloor || 400) / runsPerDay);
  const capPerRunMax =
    dailyCeiling > 0 ? Math.ceil(dailyCeiling / runsPerDay) : capPerRun;

  return {
    runsPerDay,
    capPerRun,
    capPerRunMax,
    dailyReplyFloor: dailyFloor,
    dailyReplyCeiling: dailyCeiling,
    kpi48h: [kpiMin, kpiMax],
    campaign
  };
}

/**
 * 時間帯別・言語別の予定数を返す
 * @returns {{
 *   byTimeWindow: Array<{ utc_window: string, utc_hours: number[], lang: string, runs: number, replies_min: number, replies_max: number, relative_intensity?: number }>,
 *   byLanguage: Array<{ lang: string, runs_per_day: number, replies_per_day_min: number, replies_per_day_max: number, replies_48h_min: number, replies_48h_max: number, share_ratio?: number }>,
 *   params: object,
 *   summary: { runs_per_day: number, replies_per_day_min: number, replies_per_day_max: number, replies_48h_min: number, replies_48h_max: number }
 * }}
 */
function getSchedulePlan() {
  const params = getScheduleParams();
  const { runsPerDay, capPerRun, capPerRunMax } = params;

  // 戦略的 UTC→言語（1h 単位）。15 分間隔なら 1h あたり 4 Run なので Run 数 = 時間数 × (runsPerDay/24)
  const runsPerHour = runsPerDay / 24;
  const hourToLang = {};
  const langToRuns = {};
  for (let h = 0; h < 24; h++) {
    const lang = getLangByUtcHour(h);
    hourToLang[h] = lang;
    langToRuns[lang] = (langToRuns[lang] || 0) + 1;
  }
  const langToShare = Object.fromEntries(
    (LANGUAGE_ALLOCATION || []).map((e) => [e.language, e.share_ratio])
  );
  const langOrder = (LANGUAGE_ALLOCATION || []).map((e) => e.language);

  // 時間帯別: 各 UTC ウィンドウ内の「時間→言語」を集計（1 ウィンドウに複数言語あり得る）
  const byTimeWindow = (TIME_DISTRIBUTION || []).map((win) => {
    const [startStr, endStr] = (win.utc_window || "00:00-04:00").split("-").map((s) => s.trim());
    const start = parseInt(startStr, 10) || 0;
    let end = parseInt(endStr, 10);
    if (end === 0 && endStr && endStr.startsWith("00")) end = 24;
    if (!Number.isFinite(end) || end <= start) end = start + 4;
    const utcHours = [];
    const langCountInWindow = {};
    for (let h = start; h < end; h++) {
      utcHours.push(h);
      const l = hourToLang[h] || "en";
      langCountInWindow[l] = (langCountInWindow[l] || 0) + 1;
    }
    const runsInWindow = Math.round(utcHours.length * runsPerHour);
    return {
      utc_window: win.utc_window,
      utc_hours: utcHours,
      lang_breakdown: langCountInWindow,
      runs: runsInWindow,
      replies_min: runsInWindow * capPerRun,
      replies_max: runsInWindow * capPerRunMax,
      relative_intensity: win.relative_intensity
    };
  });

  // 言語別集計（戦略配分: 時間数 × runsPerHour）
  const byLanguage = langOrder.map((lang) => {
    const runsPerLangPerDay = Math.round((langToRuns[lang] || 0) * runsPerHour);
    const repliesPerDayMin = runsPerLangPerDay * capPerRun;
    const repliesPerDayMax = runsPerLangPerDay * capPerRunMax;
    return {
      lang,
      runs_per_day: runsPerLangPerDay,
      replies_per_day_min: repliesPerDayMin,
      replies_per_day_max: repliesPerDayMax,
      replies_48h_min: repliesPerDayMin * 2,
      replies_48h_max: repliesPerDayMax * 2,
      share_ratio: langToShare[lang]
    };
  });

  const repliesPerDayMin = runsPerDay * capPerRun;
  const repliesPerDayMax = runsPerDay * capPerRunMax;

  return {
    byTimeWindow,
    byLanguage,
    params: {
      runsPerDay,
      capPerRun,
      capPerRunMax,
      kpi48h: params.kpi48h,
      campaign: params.campaign
    },
    summary: {
      runs_per_day: runsPerDay,
      replies_per_day_min: repliesPerDayMin,
      replies_per_day_max: repliesPerDayMax,
      replies_48h_min: repliesPerDayMin * 2,
      replies_48h_max: repliesPerDayMax * 2
    }
  };
}

module.exports = { getSchedulePlan, getScheduleParams, getLangByUtcHour, getLangForRegion };
