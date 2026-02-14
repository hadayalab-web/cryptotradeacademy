"""
BuzzWeave KPI — Trap Defence OS 運用指標（Grok 由来）。
期待値レンジ・増幅/制限要因・ガードレール・中立ブースターを一元管理。
"""

from typing import Any, Dict, List

# ---- 期待値レンジ（1k-10k 開始フォロワー想定、一貫運用で Month1 低め → Month3 高め） ----
DAILY_IMPRESSIONS_RANGE = "50,000 - 500,000"
DAILY_ENGAGEMENT_RANGE = "2,500 - 25,000"
ENGAGEMENT_RATE_RANGE = "3% - 7%"
WEEKLY_FOLLOWER_GROWTH = "1,000 - 10,000"

# ---- 増幅要因（BuzzWeave v2 の投稿最適化パラメータに対応） ----
FACTORS_INCREASING_RESULTS = [
    "Quoting ultra-viral hype (>500k imp originals) within 5min: 10x imp multiplier.",
    "Visuals/polls + multi-lang: +30-50% engagement via ForYou algo.",
    "Peak timing + CTA: Boosts RT/bookmarks (key algo signals).",
    "Consistency (2-4/day): Builds momentum; collabs/tag influencers add 20-40%.",
    "Educational virality: Crypto retail shares 'protection' content organically.",
]

# ---- 制限要因（OS の安全装置＝ガードレールとして実装） ----
FACTORS_LIMITING_RESULTS = [
    "Shadowban risk if >5 posts/day or flagged 'negative' (mitigate w/ neutral tone).",
    "Hype scarcity: Low-vol days cap at low end; competition from shillers.",
    "Starting followers <10k: Initial ramp-up slow (2-4 weeks to mid-range).",
    "Algo whims: X prioritizes 'positive' > debunk (offset w/ empathy hooks).",
    "Lang silos: AR/KO/JA slower cross-spread without local seeding.",
]

NOTES = [
    "Ranges assume 1k-10k starting followers; scales exponentially w/ first viral hit (e.g., 1M+ imp day → 2x growth).",
    "Benchmarks from similar crypto edutainers (@woonomic, @TedPillows): 4-6% avg ER yields 5k/wk growth.",
    "Month 1 low-end, Month 3 high-end w/ consistency; track via X Analytics for iteration.",
    "Real protection impact: 10k eng/day reaches ~50k unique retail exposures.",
]

# ---- ガードレール（制限要因に基づくハード制限） ----
GUARDRAIL_MAX_POSTS_PER_DAY = 4   # 1日5投稿以上 → シャドウバンリスクのため 4 まで
GUARDRAIL_SHADOWBAN_RISK_THRESHOLD = 5  # この本数以上は出さない
RECOMMENDED_MIN_POSTS_PER_DAY = 2
RECOMMENDED_MAX_POSTS_PER_DAY = 4
# 緊急モードでも絶対に超えない上限（downrank 回避: >6投稿/日でインプ -50%）
GUARDRAIL_EMERGENCY_MAX_POSTS_PER_DAY = 5

# ---- アルゴ最適化: ER 閾値と自己抑制プロトコル（Grok 由来） ----
# ER < 2% が続くと 30min でアルゴに deprioritize → ローアラート
ENGAGEMENT_RATE_LOWER_ALERT_PCT = 2.0
# 連続 N 投稿で ER が閾値未満なら「自己抑制」発動: 1日1本に落とし、テーマをポジティブ教育にシフト
SELF_RESTRAINT_CONSECUTIVE_LOW_ER_COUNT = 5
# 自己抑制時の 1 日最大投稿数
SELF_RESTRAINT_MAX_POSTS_PER_DAY = 1

# ---- 中立ブースター（local verifiers: 各言語 2〜3 名タグで検証・拡散側の顔。+20-40% 増幅。要編集） ----
# "Trap を煽る側ではなく、検証・拡散する側" として OS の人格を補強する。
NEUTRAL_BOOSTERS_BY_LANG: Dict[str, List[str]] = {
    "en": ["@woonomic", "@TedPillows"],  # 例: 教育系・構造系で中立
    "es": [],  # 要追加
    "pt": [],  # 要追加
    "ar": [],  # 要追加
    "ko": [],  # 要追加
    "ja": [],  # 要追加
}
# 別名: local verifiers（検証・拡散側のタグ用。OS の顔として 1 言語 1 日 1 本の種まき時に使用）
LOCAL_VERIFIERS_BY_LANG = NEUTRAL_BOOSTERS_BY_LANG


def get_guardrails() -> Dict[str, Any]:
    """現在のガードレールを返す（max_posts_per_day, shadowban_risk_threshold, recommended_min/max, emergency_max, er_threshold, self_restraint)."""
    return {
        "max_posts_per_day": GUARDRAIL_MAX_POSTS_PER_DAY,
        "shadowban_risk_threshold": GUARDRAIL_SHADOWBAN_RISK_THRESHOLD,
        "recommended_min_posts_per_day": RECOMMENDED_MIN_POSTS_PER_DAY,
        "recommended_max_posts_per_day": RECOMMENDED_MAX_POSTS_PER_DAY,
        "emergency_max_posts_per_day": GUARDRAIL_EMERGENCY_MAX_POSTS_PER_DAY,
        "engagement_rate_lower_alert_pct": ENGAGEMENT_RATE_LOWER_ALERT_PCT,
        "self_restraint_consecutive_low_er_count": SELF_RESTRAINT_CONSECUTIVE_LOW_ER_COUNT,
        "self_restraint_max_posts_per_day": SELF_RESTRAINT_MAX_POSTS_PER_DAY,
    }


def get_self_restraint_protocol() -> Dict[str, Any]:
    """
    自己抑制プロトコル（downrank 検知時）: ER < 2% が連続 N 回続いた場合の運用。
    - max_posts_per_day を 1 に制限
    - テーマを「ポジティブ寄りの教育スレッド」に一時シフト
    - 24hr 休止 + コンテンツ監査の推奨
    """
    return {
        "active_when_consecutive_low_er": SELF_RESTRAINT_CONSECUTIVE_LOW_ER_COUNT,
        "max_posts_per_day_under_restraint": SELF_RESTRAINT_MAX_POSTS_PER_DAY,
        "content_shift": "positive_education",
        "pause_recommendation": "24hr break + content audit if ER < 1%",
    }


def get_neutral_boosters_for_lang(lang: str) -> List[str]:
    """指定言語でタグ付けする local verifiers（中立ブースター）2〜3 名（投稿時に cc で使用）。"""
    lang = (lang or "en").strip().lower()
    if lang in ("pt-br", "pt_br"):
        lang = "pt"
    return list(NEUTRAL_BOOSTERS_BY_LANG.get(lang, NEUTRAL_BOOSTERS_BY_LANG.get("en", [])))[:3]


def get_kpi_snapshot() -> Dict[str, Any]:
    """KPI レンジ・要因・ガードレール・自己抑制プロトコルを一括で返す（ダッシュボード/ログ用）。"""
    return {
        "daily_impressions_range": DAILY_IMPRESSIONS_RANGE,
        "daily_engagement_range": DAILY_ENGAGEMENT_RANGE,
        "engagement_rate_range": ENGAGEMENT_RATE_RANGE,
        "weekly_follower_growth": WEEKLY_FOLLOWER_GROWTH,
        "factors_increasing_results": FACTORS_INCREASING_RESULTS,
        "factors_limiting_results": FACTORS_LIMITING_RESULTS,
        "notes": NOTES,
        "guardrails": get_guardrails(),
        "self_restraint_protocol": get_self_restraint_protocol(),
    }
