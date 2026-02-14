"""
influencer_onchain_alert_engine: Detect suspicious influencer activity, cross-check with on-chain/market data, generate KIBA-ready alerts.
Integrates market_influencer_registry, mock on-chain verification, volatility/microstructure checks, KIBA alert scoring.
Stateless except for influencer_alerts.json; all functions load -> modify -> save where needed.
"""

import json
import os
from datetime import datetime, timezone
from typing import Any, Optional

_ROOT = os.path.dirname(os.path.abspath(__file__))
_DATA_DIR = os.path.join(_ROOT, "data", "influencers")
_ALERTS_PATH = os.path.join(_ROOT, "influencer_alert_data", "influencer_alerts.json")

ALLOWED_CORRELATION_TYPES = {"Pre-pump", "Pre-dump", "Volatility amplifier"}


def _ensure_alerts_dir() -> None:
    os.makedirs(os.path.dirname(_ALERTS_PATH), exist_ok=True)


def _empty_alert() -> dict:
    return {
        "account": "",
        "language": "",
        "trigger_time": "",
        "influence_score": "",
        "correlation_type": "",
        "timing_pattern": "",
        "lag_time_seconds": "",
        "onchain_confirmation": "",
        "flow_signal": "",
        "liquidity_signal": "",
        "sentiment_signal": "",
        "kiba_alert_score": "",
        "status": "",
    }


# ---------------------------------------------------------------------------
# 1. load_alerts / 2. save_alerts
# ---------------------------------------------------------------------------


def load_alerts() -> dict:
    """Load influencer_alerts.json. Initialize with empty alerts if missing."""
    _ensure_alerts_dir()
    try:
        with open(_ALERTS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            data = {"alerts": []}
        if "alerts" not in data or not isinstance(data["alerts"], list):
            data["alerts"] = []
        return data
    except (FileNotFoundError, json.JSONDecodeError):
        return {"alerts": []}


def save_alerts(data: dict) -> None:
    """Save updated alerts to influencer_alerts.json."""
    _ensure_alerts_dir()
    alerts = data.get("alerts", [])
    with open(_ALERTS_PATH, "w", encoding="utf-8") as f:
        json.dump({"alerts": alerts}, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Mock: recent post check (to be replaced with real API)
# ---------------------------------------------------------------------------


def check_recent_post(account: str) -> bool:
    """Mock: return True if account recently posted. Replace with real API later."""
    # For demo: treat accounts with length > 5 as "recently posted"
    a = (account or "").strip().lower()
    return len(a) > 3  # most real handles qualify


# ---------------------------------------------------------------------------
# 3. detect_suspicious_influencer_activity
# ---------------------------------------------------------------------------


def _utc_now_in_timing_window(timing_pattern: str) -> bool:
    """Return True if current UTC time falls inside timing_pattern window. Format: 'HH:MM-HH:MM' (24h) or '*' for any."""
    if not timing_pattern or (timing_pattern or "").strip() == "*":
        return True
    s = (timing_pattern or "").strip()
    if not s or "-" not in s:
        return True
    try:
        left, right = s.split("-", 1)
        left = left.strip()
        right = right.strip()
        now = datetime.now(timezone.utc).time()
        from datetime import time as dt_time
        h1, m1 = int(left.split(":")[0]), int((left.split(":") + ["0"])[1])
        h2, m2 = int(right.split(":")[0]), int((right.split(":") + ["0"])[1])
        t1 = dt_time(h1, m1)
        t2 = dt_time(h2, m2)
        tn = now
        if t1 <= t2:
            return t1 <= tn <= t2
        return tn >= t1 or tn <= t2
    except Exception:
        return True


def detect_suspicious_influencer_activity(influencer_entry: dict) -> Optional[dict]:
    """
    Input: influencer entry from market_influencer_registry (account, language, influence_score, optional correlation_type, timing_pattern).
    Conditions: correlation_type in [Pre-pump, Pre-dump, Volatility amplifier], current UTC in timing_pattern, recently posted.
    Output: preliminary alert object (status='pending_verification') or None.
    """
    account = (influencer_entry.get("account") or "").strip()
    if not account:
        return None
    correlation_type = (influencer_entry.get("correlation_type") or "").strip()
    timing_pattern = (influencer_entry.get("timing_pattern") or "").strip()
    if correlation_type not in ALLOWED_CORRELATION_TYPES:
        return None
    if timing_pattern and not _utc_now_in_timing_window(timing_pattern):
        return None
    if not check_recent_post(account):
        return None
    influence_score = influencer_entry.get("influence_score")
    if influence_score is None:
        influence_score = 50.0
    try:
        influence_score = float(influence_score)
    except (TypeError, ValueError):
        influence_score = 50.0
    language = (influencer_entry.get("language") or "").strip()
    trigger_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "account": account,
        "language": language,
        "trigger_time": trigger_time,
        "influence_score": str(influence_score),
        "correlation_type": correlation_type,
        "timing_pattern": timing_pattern or "*",
        "lag_time_seconds": "",
        "onchain_confirmation": "",
        "flow_signal": "",
        "liquidity_signal": "",
        "sentiment_signal": "",
        "kiba_alert_score": "",
        "status": "pending_verification",
    }


# ---------------------------------------------------------------------------
# 4. crosscheck_onchain (mock functions; replace with real API later)
# ---------------------------------------------------------------------------


def check_whale_flow() -> str:
    """Mock on-chain: whale flow. Returns 'strong' | 'weak' | 'none'."""
    return "strong"


def check_exchange_flow() -> str:
    """Mock: exchange netflow. Returns 'strong' | 'weak' | 'none'."""
    return "weak"


def check_liquidity_clusters() -> str:
    """Mock: liquidity map. Returns 'clustered' | 'thin' | 'neutral'."""
    return "clustered"


def check_sentiment_spike() -> str:
    """Mock: sentiment shift. Returns 'FOMO' | 'FUD' | 'neutral'."""
    return "FOMO"


def crosscheck_onchain(alert: dict) -> dict:
    """
    Perform mock on-chain checks; set onchain_confirmation (TRUE/FALSE), flow_signal, liquidity_signal, sentiment_signal.
    Structure allows real API integration later.
    """
    flow = check_whale_flow()
    _ = check_exchange_flow()
    liquidity = check_liquidity_clusters()
    sentiment = check_sentiment_spike()
    alert = dict(alert)
    alert["flow_signal"] = flow
    alert["liquidity_signal"] = liquidity
    alert["sentiment_signal"] = sentiment
    confirmed = flow in ("strong", "weak") and liquidity in ("clustered", "thin", "neutral")
    alert["onchain_confirmation"] = "TRUE" if confirmed else "FALSE"
    return alert


# ---------------------------------------------------------------------------
# 5. compute_kiba_alert_score
# ---------------------------------------------------------------------------


def compute_kiba_alert_score(alert: dict) -> dict:
    """
    Base = influence_score / 4.
    +10 if onchain_confirmation == TRUE, +5 flow_signal==strong, +5 liquidity_signal==clustered, +5 sentiment in [FOMO,FUD].
    Cap at 100. Set alert.kiba_alert_score.
    """
    alert = dict(alert)
    try:
        base = float(alert.get("influence_score") or 0) / 4.0
    except (TypeError, ValueError):
        base = 0.0
    score = base
    if (alert.get("onchain_confirmation") or "").upper() == "TRUE":
        score += 10
    if (alert.get("flow_signal") or "").lower() == "strong":
        score += 5
    if (alert.get("liquidity_signal") or "").lower() == "clustered":
        score += 5
    if (alert.get("sentiment_signal") or "").upper() in ("FOMO", "FUD"):
        score += 5
    # 行動パターン補正: trap_density / peak_trap_hours で +0〜5
    try:
        from influencer_behavior_profiler import get_behavior_correction
        from datetime import datetime, timezone
        acc = (alert.get("account") or "").strip()
        if acc:
            score += get_behavior_correction(acc, datetime.now(timezone.utc).hour)
    except ImportError:
        pass
    score = min(100.0, max(0.0, score))
    alert["kiba_alert_score"] = str(round(score, 1))
    return alert


# ---------------------------------------------------------------------------
# 6. finalize_alert
# ---------------------------------------------------------------------------


def finalize_alert(alert: dict) -> None:
    """
    If kiba_alert_score >= 65 -> status ELEVATED; >= 75 -> HIGH; >= 85 -> CRITICAL.
    Save to influencer_alerts.json.
    """
    alert = dict(alert)
    try:
        s = float(alert.get("kiba_alert_score") or 0)
    except (TypeError, ValueError):
        s = 0.0
    if s >= 85:
        alert["status"] = "CRITICAL"
    elif s >= 75:
        alert["status"] = "HIGH"
    elif s >= 65:
        alert["status"] = "ELEVATED"
    else:
        alert["status"] = "pending_verification"
    data = load_alerts()
    data["alerts"].append(alert)
    save_alerts(data)


# ---------------------------------------------------------------------------
# 7. export_for_kiba
# ---------------------------------------------------------------------------


def export_for_kiba() -> dict:
    """
    Return compact object:
    { active_alerts: [...], critical_signals: [...], regional_distribution: [...], kiba_modifier: <number> }
    """
    data = load_alerts()
    alerts = data.get("alerts", [])
    active = [a for a in alerts if (a.get("status") or "").upper() in ("ELEVATED", "HIGH", "CRITICAL")]
    critical = [a for a in alerts if (a.get("status") or "").upper() == "CRITICAL"]
    regional: list[dict] = []
    by_lang: dict[str, int] = {}
    for a in active:
        lang = (a.get("language") or "unknown").strip() or "unknown"
        by_lang[lang] = by_lang.get(lang, 0) + 1
    for lang, count in sorted(by_lang.items(), key=lambda x: -x[1]):
        regional.append({"language": lang, "count": count})
    try:
        kiba_modifier = min(100.0, sum(float(a.get("kiba_alert_score") or 0) for a in active) / max(1, len(active)))
    except (TypeError, ValueError):
        kiba_modifier = 0.0
    kiba_modifier = round(kiba_modifier, 1)
    return {
        "active_alerts": active,
        "critical_signals": critical,
        "regional_distribution": regional,
        "kiba_modifier": kiba_modifier,
    }


# ---------------------------------------------------------------------------
# 8. run_influencer_alert_pipeline
# ---------------------------------------------------------------------------


def run_influencer_alert_pipeline(use_enriched_influencers: bool = True) -> dict:
    """
    Load influencers from market_influencer_registry; for each, detect suspicious -> crosscheck -> compute score -> finalize.
    Return export_for_kiba().
    """
    try:
        from market_influencer_registry import list_influencers
    except ImportError:
        list_influencers = lambda enriched=False: []
    influencers = list_influencers(enrich_for_alerts=use_enriched_influencers)
    if not use_enriched_influencers:
        for inf in influencers[:5]:
            inf["correlation_type"] = "Volatility amplifier"
            inf["timing_pattern"] = "*"
    for inf in influencers:
        preliminary = detect_suspicious_influencer_activity(inf)
        if preliminary is None:
            continue
        alert = crosscheck_onchain(preliminary)
        alert = compute_kiba_alert_score(alert)
        finalize_alert(alert)
    return export_for_kiba()


# ---------------------------------------------------------------------------
# Example usage
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # from market_influencer_registry import list_influencers
    # run_influencer_alert_pipeline()
    # export_for_kiba()
    result = run_influencer_alert_pipeline(use_enriched_influencers=False)  # True when data/influencers/influencer_alert_hints.json exists
    print(json.dumps(result, ensure_ascii=False, indent=2))
