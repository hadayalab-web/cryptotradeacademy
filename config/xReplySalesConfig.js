/**
 * Xリプライ直販運用の設定値
 */

const X_REPLY_SALES_LANGS = ["en", "ar", "es", "pt", "ja", "ko"];
const X_REPLY_SALES_REGION_LANGS = ["ar", "es", "pt", "ja", "ko"];

// リスト取得: 1言語1回あたりのページ数。段階的に増やして1440キャパに寄せる（まず2ページから）
const X_REPLY_LIST_PAGES = Math.max(1, Math.min(10, Number(process.env.X_REPLY_LIST_PAGES || 2)));
const X_REPLY_MAX_RESULTS_PER_PAGE = Math.min(
  100,
  Math.max(10, Number(process.env.X_REPLY_MAX_RESULTS_PER_PAGE || 100))
);
const X_REPLY_SEARCH_WINDOW_MINUTES = Math.max(
  15,
  Number(process.env.X_REPLY_SEARCH_WINDOW_MINUTES || 60)
);

// strict優先、低ヒット時のみbalancedへ
const X_REPLY_LOW_HIT_BALANCED_THRESHOLD = Math.max(
  0,
  Number(process.env.X_REPLY_LOW_HIT_BALANCED_THRESHOLD || 0)
);
const X_REPLY_BALANCED_FALLBACK_ENABLED = process.env.X_REPLY_BALANCED_FALLBACK_ENABLED === "1";

// リプライ直販の在庫は積み増し。既存キューを残し、新規取得分をマージする。
// （削除対象はアフィリエイター在庫のみ。本キューは引き継ぐ）
const X_REPLY_RETAIN_PREVIOUS_QUEUE = process.env.X_REPLY_RETAIN_PREVIOUS_QUEUE !== "0";
// 旧フォーマット在庫を安全に捨てるためのバージョン
const X_REPLY_QUEUE_VERSION = Math.max(1, Number(process.env.X_REPLY_QUEUE_VERSION || 2));

// 送信ペーシング（15秒間隔 + 15試行/15分）
const X_REPLY_ATTEMPT_CAP_PER_15MIN = Math.max(
  1,
  Number(process.env.X_REPLY_ATTEMPT_CAP_PER_15MIN || 15)
);
const X_REPLY_MAX_ATTEMPTS_PER_RUN = Math.max(
  1,
  Number(process.env.X_REPLY_MAX_ATTEMPTS_PER_RUN || 15)
);
const X_REPLY_SEND_DELAY_MS = Math.max(0, Number(process.env.X_REPLY_SEND_DELAY_MS || 15000));
const X_REPLY_SEND_RUN_HARD_STOP_MS = Math.max(
  60000,
  Number(process.env.X_REPLY_SEND_RUN_HARD_STOP_MS || 285000)
);
const X_REPLY_ATTEMPT_WINDOW_TTL_SECONDS = Math.max(
  900,
  Number(process.env.X_REPLY_ATTEMPT_WINDOW_TTL_SECONDS || 1200)
);
const X_REPLY_SLOT_LOCK_TTL_SECONDS = Math.max(
  120,
  Number(
    process.env.X_REPLY_SLOT_LOCK_TTL_SECONDS ||
      Math.ceil((X_REPLY_SEND_RUN_HARD_STOP_MS + 60000) / 1000)
  )
);

// KPI・イベント保持
const X_REPLY_EVENT_TTL_SECONDS = Math.max(
  86400,
  Number(process.env.X_REPLY_EVENT_TTL_SECONDS || 86400 * 90)
);
const X_REPLY_EVENT_LIST_MAX = Math.max(50, Number(process.env.X_REPLY_EVENT_LIST_MAX || 1000));

// クーポン表示（文面差し込み）
const X_REPLY_PROMO_CODE = String(process.env.WHOP_PROMO_CODE || "defend50").trim() || "defend50";

module.exports = {
  X_REPLY_SALES_LANGS,
  X_REPLY_SALES_REGION_LANGS,
  X_REPLY_LIST_PAGES,
  X_REPLY_MAX_RESULTS_PER_PAGE,
  X_REPLY_SEARCH_WINDOW_MINUTES,
  X_REPLY_LOW_HIT_BALANCED_THRESHOLD,
  X_REPLY_BALANCED_FALLBACK_ENABLED,
  X_REPLY_RETAIN_PREVIOUS_QUEUE,
  X_REPLY_QUEUE_VERSION,
  X_REPLY_ATTEMPT_CAP_PER_15MIN,
  X_REPLY_MAX_ATTEMPTS_PER_RUN,
  X_REPLY_SEND_DELAY_MS,
  X_REPLY_SEND_RUN_HARD_STOP_MS,
  X_REPLY_ATTEMPT_WINDOW_TTL_SECONDS,
  X_REPLY_SLOT_LOCK_TTL_SECONDS,
  X_REPLY_EVENT_TTL_SECONDS,
  X_REPLY_EVENT_LIST_MAX,
  X_REPLY_PROMO_CODE
};
