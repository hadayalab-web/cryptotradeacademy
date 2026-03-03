/**
 * Xリプライ直販運用の設定値
 */

const X_REPLY_SALES_LANGS = ["en", "ar", "es", "pt", "ja", "ko"];
const X_REPLY_SALES_REGION_LANGS = ["ar", "es", "pt", "ja", "ko"];

// リスト取得: 1言語1回あたりのページ数。2秒間隔で300秒枠いっぱい＝約75ラウンド
const X_REPLY_LIST_PAGES = Math.max(1, Number(process.env.X_REPLY_LIST_PAGES || 75) || 75);
// 1ラン（1言語1回のリスト取得）で使ってよい検索リクエスト数の上限。当プランは 450/15min のためデフォルト450
const X_REPLY_SEARCH_REQUESTS_PER_RUN = Math.max(
  1,
  Math.min(450, Number(process.env.X_REPLY_SEARCH_REQUESTS_PER_RUN || 450))
);
const X_REPLY_MAX_RESULTS_PER_PAGE = Math.min(
  100,
  Math.max(10, Number(process.env.X_REPLY_MAX_RESULTS_PER_PAGE || 100))
);
// 検索の時間窓（分）。全言語共通。75ラウンドに絞っているので窓は広めで diversity を確保。デフォルト 360 分（6時間）
const X_REPLY_SEARCH_WINDOW_MINUTES = Math.max(
  15,
  Number(process.env.X_REPLY_SEARCH_WINDOW_MINUTES || 360)
);
// 検索リクエスト間の遅延（ms）。ラウンド開始前に1回。2秒間隔で402を避けつつ300秒枠内で回す
const X_REPLY_SEARCH_DELAY_MS = Math.max(0, Number(process.env.X_REPLY_SEARCH_DELAY_MS || 2000));

// strict優先、低ヒット時のみbalancedへ（AR/ES/PT で 0 件になりがちなためデフォルトオン）
const X_REPLY_LOW_HIT_BALANCED_THRESHOLD = Math.max(
  0,
  Number(process.env.X_REPLY_LOW_HIT_BALANCED_THRESHOLD || 0)
);
const X_REPLY_BALANCED_FALLBACK_ENABLED = process.env.X_REPLY_BALANCED_FALLBACK_ENABLED !== "0";

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

// DM送信成功ユーザーのみフォロー。デフォルトオン。0=オフ
const X_REPLY_FOLLOW_AFTER_DM_SENT = process.env.X_REPLY_FOLLOW_AFTER_DM_SENT !== "0";
const X_REPLY_FOLLOW_CAP_PER_DAY = Math.max(
  0,
  Math.min(400, Number(process.env.X_REPLY_FOLLOW_CAP_PER_DAY || 100))
);
const X_REPLY_FOLLOW_DELAY_MS = Math.max(0, Number(process.env.X_REPLY_FOLLOW_DELAY_MS || 1500));

// フォロー解除: フォローから何日後に解除するか。0=解除しない。72時間≈3日で解除しないとフォロー数が膨らむためデフォルト3日
const X_REPLY_UNFOLLOW_DAYS = Math.max(0, Math.min(30, Number(process.env.X_REPLY_UNFOLLOW_DAYS || 3)));

// DM送信前に対象ツイートをいいね（通知で気づいてもらう）。デフォルトオン。0=オフ
const X_REPLY_LIKE_BEFORE_DM = process.env.X_REPLY_LIKE_BEFORE_DM !== "0";

module.exports = {
  X_REPLY_SALES_LANGS,
  X_REPLY_SALES_REGION_LANGS,
  X_REPLY_LIST_PAGES,
  X_REPLY_SEARCH_REQUESTS_PER_RUN,
  X_REPLY_MAX_RESULTS_PER_PAGE,
  X_REPLY_SEARCH_WINDOW_MINUTES,
  X_REPLY_SEARCH_DELAY_MS,
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
  X_REPLY_FOLLOW_AFTER_DM_SENT,
  X_REPLY_FOLLOW_CAP_PER_DAY,
  X_REPLY_FOLLOW_DELAY_MS,
  X_REPLY_UNFOLLOW_DAYS,
  X_REPLY_LIKE_BEFORE_DM
};
