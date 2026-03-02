/**
 * Xリプライ直販運用の設定値
 */

const X_REPLY_SALES_LANGS = ["en", "ar", "es", "pt", "ja", "ko"];
const X_REPLY_SALES_REGION_LANGS = ["ar", "es", "pt", "ja", "ko"];

// リスト取得: 1言語1回あたりのページ数（1リクエスト=1ページ）。X API Per App 450/15min に合わせてデフォルト450
const X_REPLY_LIST_PAGES = Math.max(1, Number(process.env.X_REPLY_LIST_PAGES || 450) || 450);
const X_REPLY_MAX_RESULTS_PER_PAGE = Math.min(
  100,
  Math.max(10, Number(process.env.X_REPLY_MAX_RESULTS_PER_PAGE || 100))
);
// 検索の時間窓（分）。15分ローテで各言語は90分ごとにリスト取得するため、窓は90分に統一
// ボリューム不足なら X_REPLY_SEARCH_WINDOW_MINUTES / X_REPLY_SEARCH_WINDOW_REGIONS_MINUTES で延長可
const X_REPLY_SEARCH_WINDOW_MINUTES = Math.max(
  15,
  Number(process.env.X_REPLY_SEARCH_WINDOW_MINUTES || 90)
);
const X_REPLY_SEARCH_WINDOW_REGIONS_MINUTES = Math.max(
  60,
  Number(process.env.X_REPLY_SEARCH_WINDOW_REGIONS_MINUTES || 90)
);

// strict優先、低ヒット時のみbalancedへ
const X_REPLY_LOW_HIT_BALANCED_THRESHOLD = Math.max(
  0,
  Number(process.env.X_REPLY_LOW_HIT_BALANCED_THRESHOLD || 0)
);
const X_REPLY_BALANCED_FALLBACK_ENABLED = process.env.X_REPLY_BALANCED_FALLBACK_ENABLED === "1";

// 1言語あたりのキュー保存上限（15件）。15分ローテ×300ページ運用用
const X_REPLY_QUEUE_CAP_PER_LANG = Math.max(
  1,
  Number(process.env.X_REPLY_QUEUE_CAP_PER_LANG || 15)
);
// リプライ直販の在庫は積み増し。既存キューを残し、新規取得分をマージする。
// （削除対象はアフィリエイター在庫のみ。本キューは引き継ぐ）
const X_REPLY_RETAIN_PREVIOUS_QUEUE = process.env.X_REPLY_RETAIN_PREVIOUS_QUEUE !== "0";
// 旧フォーマット在庫を安全に捨てるためのバージョン
const X_REPLY_QUEUE_VERSION = Math.max(1, Number(process.env.X_REPLY_QUEUE_VERSION || 2));

// 送信ペーシング（10秒間隔 + 15試行/15分。300秒枠でunfollow＋送信に収める）
const X_REPLY_ATTEMPT_CAP_PER_15MIN = Math.max(
  1,
  Number(process.env.X_REPLY_ATTEMPT_CAP_PER_15MIN || 15)
);
const X_REPLY_MAX_ATTEMPTS_PER_RUN = Math.max(
  1,
  Number(process.env.X_REPLY_MAX_ATTEMPTS_PER_RUN || 15)
);
const X_REPLY_SEND_DELAY_MS = Math.max(0, Number(process.env.X_REPLY_SEND_DELAY_MS || 10000));
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

// 送信前にフォロー（リプライ/DM 403 突破のため）。デフォルトオン。0=オフにする場合のみ指定
const X_REPLY_FOLLOW_BEFORE_SEND = process.env.X_REPLY_FOLLOW_BEFORE_SEND !== "0";
const X_REPLY_FOLLOW_CAP_PER_DAY = Math.max(
  0,
  Math.min(400, Number(process.env.X_REPLY_FOLLOW_CAP_PER_DAY || 100))
);
const X_REPLY_FOLLOW_DELAY_MS = Math.max(0, Number(process.env.X_REPLY_FOLLOW_DELAY_MS || 1500));

// フォロー解除: フォローから何日後に解除するか。0=解除しない。72時間≈3日で解除しないとフォロー数が膨らむためデフォルト3日
const X_REPLY_UNFOLLOW_DAYS = Math.max(0, Math.min(30, Number(process.env.X_REPLY_UNFOLLOW_DAYS || 3)));

// リプライ試行をスキップし、フォロー→DMのみにする。リプライが通った実績がないためデフォルト true。0 でリプライ試行あり
const X_REPLY_SKIP_REPLY_ATTEMPT = process.env.X_REPLY_SKIP_REPLY_ATTEMPT !== "0";

module.exports = {
  X_REPLY_SALES_LANGS,
  X_REPLY_SALES_REGION_LANGS,
  X_REPLY_LIST_PAGES,
  X_REPLY_MAX_RESULTS_PER_PAGE,
  X_REPLY_SEARCH_WINDOW_MINUTES,
  X_REPLY_SEARCH_WINDOW_REGIONS_MINUTES,
  X_REPLY_LOW_HIT_BALANCED_THRESHOLD,
  X_REPLY_BALANCED_FALLBACK_ENABLED,
  X_REPLY_QUEUE_CAP_PER_LANG,
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
  X_REPLY_PROMO_CODE,
  X_REPLY_FOLLOW_BEFORE_SEND,
  X_REPLY_FOLLOW_CAP_PER_DAY,
  X_REPLY_FOLLOW_DELAY_MS,
  X_REPLY_UNFOLLOW_DAYS,
  X_REPLY_SKIP_REPLY_ATTEMPT
};
