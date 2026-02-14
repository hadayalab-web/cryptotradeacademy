"""
BTC Influencer Scanner: Identify accounts that consistently influence BTC price movements.
Outputs the same JSON structure as bait_offender_registry for merge_new_scan_results().

Criteria:
  1. >100k followers, high engagement velocity, posts correlating with 1–15min BTC micro-moves
  2. Hidden influencers: non-crypto, regional (KR, CN, ES, PT), meme accounts
  3. Coordinated posting: multiple accounts within same 5min window, synchronized narratives
  4. Only statistically significant correlations are returned.
"""

import json
import math
from collections import defaultdict
from typing import Any, Optional

# --- Constants ---
MIN_FOLLOWERS = 100_000
MIN_ENGAGEMENT_VELOCITY = 500  # engagements per hour threshold for "high"
MIN_CORRELATION_SIGNIFICANT = 0.35  # abs(correlation) >= this
MIN_OBSERVATIONS = 3  # min post–BTC move pairs for significance
COORDINATION_WINDOW_MINUTES = 5
REGIONAL_CODES = {"KR", "CN", "ES", "PT"}


def _pearson_correlation(x: list[float], y: list[float]) -> float:
    """Pearson r. Returns 0.0 if insufficient data or zero variance."""
    n = len(x)
    if n != len(y) or n < 2:
        return 0.0
    sx = sum(x)
    sy = sum(y)
    sxx = sum(a * a for a in x)
    syy = sum(b * b for b in y)
    sxy = sum(a * b for a, b in zip(x, y))
    num = n * sxy - sx * sy
    den = math.sqrt(max(0, (n * sxx - sx * sx) * (n * syy - sy * sy)))
    if den == 0:
        return 0.0
    return num / den


def _correlate_posts_with_btc_moves(
    post_timestamps: list[float],
    btc_ts: list[float],
    btc_returns: list[float],
    window_minutes: float = 15.0,
) -> tuple[float, int]:
    """
    For each post time, find BTC return in the next window_minutes.
    Returns (correlation, n_observations). Timestamps in same unit (e.g. Unix seconds).
    """
    window_sec = window_minutes * 60.0
    post_returns: list[float] = []
    for t in post_timestamps:
        # BTC return in [t, t + window]
        returns_in_window = [
            r for ts, r in zip(btc_ts, btc_returns) if t <= ts <= t + window_sec
        ]
        if returns_in_window:
            post_returns.append(sum(returns_in_window))  # or use first/max
        else:
            post_returns.append(0.0)
    if len(post_returns) < 2 or len(btc_returns) < 2:
        return 0.0, len(post_returns)
    # Correlation of (post count / dummy series) with btc: use btc returns aligned by time
    # Simpler: use post_returns as the "impact" series; need same-length btc slice.
    # For same-length: take first len(post_returns) btc returns after each post.
    x = post_returns
    y = []
    for i, t in enumerate(post_timestamps):
        j = next((k for k in range(len(btc_ts)) if btc_ts[k] >= t), None)
        if j is not None and j < len(btc_returns):
            y.append(btc_returns[j])
        else:
            y.append(0.0)
    while len(y) < len(x):
        y.append(0.0)
    y = y[: len(x)]
    return _pearson_correlation(x, y), len(x)


def _in_same_window(ts_list: list[float], window_sec: float) -> list[list[int]]:
    """Group indices of timestamps that fall in the same window. Returns list of index groups."""
    if not ts_list:
        return []
    sorted_idx = sorted(range(len(ts_list)), key=lambda i: ts_list[i])
    groups: list[list[int]] = []
    current: list[int] = [sorted_idx[0]]
    t0 = ts_list[sorted_idx[0]]
    for i in range(1, len(sorted_idx)):
        idx = sorted_idx[i]
        t = ts_list[idx]
        if t <= t0 + window_sec:
            current.append(idx)
        else:
            if len(current) >= 2:
                groups.append(current)
            current = [idx]
            t0 = t
    if len(current) >= 2:
        groups.append(current)
    return groups


def _narrative_overlap(keywords_list: list[list[str]]) -> float:
    """Jaccard-like overlap across multiple keyword sets. 0–1."""
    if not keywords_list:
        return 0.0
    sets_list = [set(k) for k in keywords_list if k]
    if not sets_list:
        return 0.0
    inter = set.intersection(*sets_list) if len(sets_list) > 1 else sets_list[0]
    un = set.union(*sets_list)
    return len(inter) / len(un) if un else 0.0


# --- Input schema (for documentation and validation) ---
# Each account in input can have:
#   account: str
#   followers: int
#   engagement_velocity: float (e.g. engagements per hour)
#   post_timestamps: list[float] (Unix seconds)
#   btc_correlation_1_15min: Optional[float]  (if pre-computed)
#   btc_correlation_n: Optional[int]          (number of observations for correlation)
#   region: Optional[str] (KR, CN, ES, PT, etc.)
#   is_crypto: bool (False => potential hidden influencer)
#   is_meme: bool
#   narrative_keywords: list[str]
#   market_correlation_note: Optional[str]


def scan(
    accounts: list[dict],
    btc_timestamps: Optional[list[float]] = None,
    btc_returns: Optional[list[float]] = None,
    min_followers: int = MIN_FOLLOWERS,
    min_engagement_velocity: float = MIN_ENGAGEMENT_VELOCITY,
    min_correlation: float = MIN_CORRELATION_SIGNIFICANT,
    min_observations: int = MIN_OBSERVATIONS,
) -> dict:
    """
    Scan accounts and return only those with statistically significant BTC correlation.
    Output has the same structure as bait_offender_registry: { "offenders": [...], "global_insights": {...} }.
    """
    offenders: list[dict] = []
    common_patterns: list[str] = []
    timing_signals: list[str] = []
    recommended_watchlist: list[str] = []

    # Optional: compute correlation from time series if not provided per account
    use_btc_series = (
        btc_timestamps is not None
        and btc_returns is not None
        and len(btc_timestamps) == len(btc_returns)
        and len(btc_timestamps) >= 2
    )

    # 1) Filter by followers + engagement velocity and get correlation
    candidates: list[dict] = []
    for a in accounts:
        account = (a.get("account") or "").strip()
        if not account:
            continue
        followers = int(a.get("followers") or 0)
        vel = float(a.get("engagement_velocity") or 0)
        if followers < min_followers or vel < min_engagement_velocity:
            continue
        corr = a.get("btc_correlation_1_15min")
        n_obs = int(a.get("btc_correlation_n") or 0)
        if use_btc_series and (corr is None or n_obs < min_observations):
            posts = a.get("post_timestamps") or []
            if len(posts) >= min_observations:
                corr, n_obs = _correlate_posts_with_btc_moves(
                    posts, btc_timestamps, btc_returns, window_minutes=15.0
                )
        if corr is None:
            corr = 0.0
        corr = float(corr)
        if abs(corr) < min_correlation or n_obs < min_observations:
            continue
        candidates.append({
            "account": account,
            "followers": followers,
            "engagement_velocity": vel,
            "correlation": corr,
            "n_observations": n_obs,
            "region": (a.get("region") or "").strip().upper()[:2],
            "is_crypto": bool(a.get("is_crypto", True)),
            "is_meme": bool(a.get("is_meme", False)),
            "narrative_keywords": list(a.get("narrative_keywords") or []),
            "market_correlation_note": (a.get("market_correlation_note") or "").strip(),
            "post_timestamps": list(a.get("post_timestamps") or []),
        })

    # 2) Categorize: hidden influencer, regional, meme
    for c in candidates:
        categories: list[str] = []
        if not c["is_crypto"]:
            categories.append("HIDDEN_INFLUENCER")
        if c["region"] in REGIONAL_CODES:
            categories.append(f"REGIONAL_{c['region']}")
        if c["is_meme"]:
            categories.append("MEME_VOLATILITY")
        if not categories:
            categories.append("BTC_CORRELATED")

        risk = min(1.0, abs(c["correlation"]) * 1.2)  # 0–1 scale
        behavior = "Posts correlate with 1-15min BTC moves"
        if c["n_observations"]:
            behavior += f" (n={c['n_observations']})"
        offenders.append({
            "account": c["account"],
            "category": "; ".join(categories),
            "risk_score": str(round(risk, 2)),
            "behavior_pattern": behavior,
            "trigger_keywords": c["narrative_keywords"],
            "market_correlation": c["market_correlation_note"] or f"r={round(c['correlation'], 3)}",
        })
        recommended_watchlist.append(c["account"])

    # 3) Coordinated posting: multiple accounts posting within same 5min window
    window_sec = COORDINATION_WINDOW_MINUTES * 60.0
    all_posts: list[tuple[str, float, list[str]]] = []
    for c in candidates:
        for t in c["post_timestamps"]:
            all_posts.append((c["account"], t, c["narrative_keywords"]))
    if all_posts:
        ts_only = [t for _, t, _ in all_posts]
        groups = _in_same_window(ts_only, window_sec)
        for g in groups:
            accs = list({all_posts[i][0] for i in g})
            if len(accs) >= 2:
                common_patterns.append(
                    f"Coordinated posting: {', '.join(sorted(accs))} within {COORDINATION_WINDOW_MINUTES}min"
                )
                kw_list = [all_posts[i][2] for i in g]
                overlap = _narrative_overlap(kw_list)
                if overlap >= 0.2:
                    timing_signals.append(
                        f"Synchronized narratives before pump/dump (overlap={overlap:.2f})"
                    )

    # Deduplicate and add generic timing if we have offenders
    if offenders:
        timing_signals.append("1-15min BTC micro-move correlation")
    common_patterns = list(dict.fromkeys(common_patterns))
    timing_signals = list(dict.fromkeys(timing_signals))
    recommended_watchlist = list(dict.fromkeys(recommended_watchlist))

    return {
        "offenders": offenders,
        "global_insights": {
            "common_patterns": common_patterns,
            "timing_signals": timing_signals,
            "recommended_watchlist": recommended_watchlist,
        },
    }


def scan_from_json_file(
    path: str,
    btc_series_path: Optional[str] = None,
    **kwargs: Any,
) -> dict:
    """
    Load accounts from a JSON file and optionally BTC series (JSON with timestamps + returns).
    Returns same structure as scan().
    """
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    accounts = data.get("accounts", data) if isinstance(data, dict) else data
    if not isinstance(accounts, list):
        accounts = []
    btc_ts = None
    btc_ret = None
    if btc_series_path:
        with open(btc_series_path, "r", encoding="utf-8") as f:
            btc_data = json.load(f)
        btc_ts = btc_data.get("timestamps", [])
        btc_ret = btc_data.get("returns", [])
    return scan(accounts, btc_ts, btc_ret, **kwargs)


if __name__ == "__main__":
    # Example: accounts with pre-computed correlation and metadata
    example_accounts = [
        {
            "account": "@crypto_whale_btc",
            "followers": 450_000,
            "engagement_velocity": 1200,
            "post_timestamps": [1000.0, 2000.0, 3000.0],
            "btc_correlation_1_15min": 0.52,
            "btc_correlation_n": 5,
            "region": "",
            "is_crypto": True,
            "is_meme": False,
            "narrative_keywords": ["pump", "accumulate", "bullish"],
            "market_correlation_note": "Posts precede 0.1–0.3% moves",
        },
        {
            "account": "@kr_trader",
            "followers": 180_000,
            "engagement_velocity": 800,
            "btc_correlation_1_15min": 0.41,
            "btc_correlation_n": 4,
            "region": "KR",
            "is_crypto": False,
            "is_meme": False,
            "narrative_keywords": ["비트코인", "상승"],
            "market_correlation_note": "KR session volatility",
        },
        {
            "account": "@meme_pump",
            "followers": 320_000,
            "engagement_velocity": 2500,
            "post_timestamps": [1000.0, 1000.0 + 60, 1000.0 + 120],
            "btc_correlation_1_15min": 0.38,
            "btc_correlation_n": 6,
            "region": "",
            "is_crypto": False,
            "is_meme": True,
            "narrative_keywords": ["moon", "100x", "pump"],
            "market_correlation_note": "Meme-led volatility spikes",
        },
        {
            "account": "@es_influencer",
            "followers": 110_000,
            "engagement_velocity": 600,
            "btc_correlation_1_15min": 0.36,
            "btc_correlation_n": 4,
            "region": "ES",
            "is_crypto": False,
            "is_meme": False,
            "narrative_keywords": ["bitcoin", "sube", "comprar"],
            "market_correlation_note": "ES session correlation",
        },
        {
            "account": "@cn_insider",
            "followers": 200_000,
            "engagement_velocity": 900,
            "post_timestamps": [1001.0, 1002.0, 5004.0],
            "btc_correlation_1_15min": 0.42,
            "btc_correlation_n": 5,
            "region": "CN",
            "is_crypto": False,
            "is_meme": False,
            "narrative_keywords": ["pump", "bullish", "moon"],
            "market_correlation_note": "CN session; sync with @meme_pump",
        },
        {
            "account": "@low_follow",
            "followers": 50_000,
            "engagement_velocity": 200,
            "btc_correlation_1_15min": 0.6,
            "btc_correlation_n": 5,
            "region": "",
            "is_crypto": True,
            "is_meme": False,
            "narrative_keywords": [],
            "market_correlation_note": "",
        },
    ]

    result = scan(example_accounts)
    print("Output (same structure as bait_offender_registry):")
    print(json.dumps(result, ensure_ascii=False, indent=2))
