"""
bait_offender_registry: Store, update, and retrieve data about bait tweet repeat offenders.
Stateless module: all functions load → modify → save. Data persisted in offenders.json and global_insights.json.
"""

import json
import os
from typing import Any, Optional

# Directory for JSON datastore (next to this module)
_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bait_registry_data")
OFFENDERS_PATH = os.path.join(_DATA_DIR, "offenders.json")
GLOBAL_INSIGHTS_PATH = os.path.join(_DATA_DIR, "global_insights.json")

DEFAULT_STRUCTURE = {
    "offenders": [],
    "global_insights": {
        "common_patterns": [],
        "timing_signals": [],
        "recommended_watchlist": [],
    },
}


def _ensure_data_dir() -> None:
    os.makedirs(_DATA_DIR, exist_ok=True)


def _default_offender_entry() -> dict:
    return {
        "account": "",
        "category": "",
        "risk_score": "",
        "behavior_pattern": "",
        "trigger_keywords": [],
        "market_correlation": "",
    }


def _parse_risk_score(value: Any) -> float:
    """Parse risk_score to float for comparison. Empty string or invalid => 0."""
    if value == "" or value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def load_offenders() -> dict:
    """Load full registry from offenders.json and global_insights.json. Returns default structure if missing."""
    _ensure_data_dir()
    offenders = []
    global_insights = DEFAULT_STRUCTURE["global_insights"].copy()
    try:
        with open(OFFENDERS_PATH, "r", encoding="utf-8") as f:
            offenders = json.load(f)
        if not isinstance(offenders, list):
            offenders = []
    except (FileNotFoundError, json.JSONDecodeError):
        offenders = []
    try:
        with open(GLOBAL_INSIGHTS_PATH, "r", encoding="utf-8") as f:
            global_insights = json.load(f)
        if not isinstance(global_insights, dict):
            global_insights = DEFAULT_STRUCTURE["global_insights"].copy()
        for key in ("common_patterns", "timing_signals", "recommended_watchlist"):
            if key not in global_insights or not isinstance(global_insights[key], list):
                global_insights[key] = []
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    return {"offenders": offenders, "global_insights": global_insights}


def save_offenders(data: dict) -> None:
    """Persist offenders list and global_insights to JSON files."""
    _ensure_data_dir()
    offenders = data.get("offenders", [])
    global_insights = data.get("global_insights", DEFAULT_STRUCTURE["global_insights"])
    with open(OFFENDERS_PATH, "w", encoding="utf-8") as f:
        json.dump(offenders, f, ensure_ascii=False, indent=2)
    with open(GLOBAL_INSIGHTS_PATH, "w", encoding="utf-8") as f:
        json.dump(global_insights, f, ensure_ascii=False, indent=2)


def update_offender(entry: dict) -> None:
    """
    Update or append one offender. If account exists: merge (risk_score=max, trigger_keywords=union,
    behavior_pattern/market_correlation append if new). Otherwise append.
    """
    data = load_offenders()
    account = (entry.get("account") or "").strip()
    if not account:
        return
    offenders = data["offenders"]
    existing_idx = next((i for i, o in enumerate(offenders) if (o.get("account") or "").strip() == account), None)
    new_risk = _parse_risk_score(entry.get("risk_score"))
    new_keywords = list(entry.get("trigger_keywords") or []) if isinstance(entry.get("trigger_keywords"), list) else []
    new_pattern = (entry.get("behavior_pattern") or "").strip()
    new_correlation = (entry.get("market_correlation") or "").strip()

    if existing_idx is not None:
        existing = offenders[existing_idx]
        existing_risk = _parse_risk_score(existing.get("risk_score"))
        offenders[existing_idx]["risk_score"] = str(max(existing_risk, new_risk)) if (existing_risk or new_risk) else (existing.get("risk_score") or entry.get("risk_score") or "")
        existing_kw = set(existing.get("trigger_keywords") or [])
        existing_kw.update(new_keywords)
        offenders[existing_idx]["trigger_keywords"] = list(existing_kw)
        if new_pattern and new_pattern not in (existing.get("behavior_pattern") or ""):
            offenders[existing_idx]["behavior_pattern"] = (existing.get("behavior_pattern") or "").strip() + ("; " + new_pattern if (existing.get("behavior_pattern") or "").strip() else new_pattern)
        if new_correlation and new_correlation not in (existing.get("market_correlation") or ""):
            offenders[existing_idx]["market_correlation"] = (existing.get("market_correlation") or "").strip() + ("; " + new_correlation if (existing.get("market_correlation") or "").strip() else new_correlation)
        if entry.get("category"):
            offenders[existing_idx]["category"] = entry.get("category")
    else:
        offenders.append({
            "account": account,
            "category": entry.get("category") or "",
            "risk_score": entry.get("risk_score") or "",
            "behavior_pattern": new_pattern,
            "trigger_keywords": new_keywords,
            "market_correlation": new_correlation,
        })
    save_offenders(data)


def get_offender(account: str) -> Optional[dict]:
    """Return offender dict for account or None."""
    data = load_offenders()
    key = (account or "").strip()
    for o in data["offenders"]:
        if (o.get("account") or "").strip() == key:
            return o
    return None


def get_offender_with_profile(account: str) -> Optional[dict]:
    """Return offender dict with behavior_profile from influencer_behavior_profiler when available."""
    o = get_offender(account)
    if o is None:
        return None
    try:
        from influencer_behavior_profiler import get_profile_for_account
        profile = get_profile_for_account(account)
        if profile:
            return {**o, "behavior_profile": profile}
    except ImportError:
        pass
    return o


def list_offenders() -> list:
    """Return list of all offenders."""
    return load_offenders()["offenders"]


def list_offenders_with_profiles() -> list:
    """Return list of offenders with behavior_profile attached (from influencer_behavior_profiler)."""
    offenders = list_offenders()
    try:
        from influencer_behavior_profiler import load_profiles
        profiles_list = load_profiles()
        profile_by_acc = {}
        for p in profiles_list:
            acc = (p.get("account") or "").strip().lower().lstrip("@")
            if acc:
                profile_by_acc[acc] = p
        out = []
        for o in offenders:
            acc = (o.get("account") or "").strip().lower().lstrip("@")
            if acc and acc in profile_by_acc:
                out.append({**o, "behavior_profile": profile_by_acc[acc]})
            else:
                out.append(o)
        return out
    except ImportError:
        return offenders


def merge_new_scan_results(new_json: dict) -> None:
    """
    Merge Grok scan output into registry. Updates existing offenders (risk_score=max, keywords=union,
    behavior_pattern/market_correlation append). Merges global_insights lists (union/append).
    """
    data = load_offenders()
    new_offenders = new_json.get("offenders")
    if isinstance(new_offenders, list):
        for entry in new_offenders:
            if isinstance(entry, dict) and (entry.get("account") or "").strip():
                update_offender(entry)
    # Re-load after updates so we have latest offenders before merging insights
    data = load_offenders()
    new_insights = new_json.get("global_insights")
    if isinstance(new_insights, dict):
        gi = data["global_insights"]
        for key in ("common_patterns", "timing_signals", "recommended_watchlist"):
            existing = set(gi.get(key) or [])
            new_list = new_insights.get(key)
            if isinstance(new_list, list):
                existing.update(new_list)
            gi[key] = list(existing)
        save_offenders(data)


def compute_sentiment_modifier() -> float:
    """
    Return a numeric modifier in [0, 20] based on:
    - average risk_score of top offenders,
    - number of offenders (active in registry),
    - presence of MANIPULATOR or BAIT_FARMER categories.
    """
    data = load_offenders()
    offenders = data["offenders"]
    if not offenders:
        return 0.0

    # Top offenders: by risk_score descending, take up to 10
    with_scores = [(_parse_risk_score(o.get("risk_score")), o) for o in offenders]
    with_scores.sort(key=lambda x: x[0], reverse=True)
    top = with_scores[:10]
    avg_risk = sum(s for s, _ in top) / len(top) if top else 0.0

    # Component 1: average risk of top (scale 0–10, assume risk in 0..1 or 0..100)
    risk_norm = min(avg_risk, 1.0) if avg_risk <= 1.0 else min(avg_risk / 100.0, 1.0)
    from_risk = risk_norm * 10.0

    # Component 2: number of offenders (0–5, cap at e.g. 20 offenders)
    count = len(offenders)
    from_count = min(count / 4.0, 5.0)

    # Component 3: MANIPULATOR or BAIT_FARMER present (0–5)
    high_risk_cats = {"MANIPULATOR", "BAIT_FARMER"}
    has_high = any((o.get("category") or "").upper().strip() in high_risk_cats for o in offenders)
    from_cat = 5.0 if has_high else 0.0

    modifier = from_risk + from_count + from_cat
    return round(min(max(modifier, 0.0), 20.0), 2)


def export_for_kiba() -> dict:
    """
    Return compact object for KIBA Sentiment/Algo:
    { "sentiment_modifier": <number>, "top_offenders": [...], "timing_signals": [...] }
    """
    data = load_offenders()
    offenders = data["offenders"]
    with_scores = [(_parse_risk_score(o.get("risk_score")), o) for o in offenders]
    with_scores.sort(key=lambda x: x[0], reverse=True)
    top_offenders = [o for _, o in with_scores[:10]]
    timing_signals = list(data["global_insights"].get("timing_signals") or [])
    sentiment_modifier = compute_sentiment_modifier()
    return {
        "sentiment_modifier": sentiment_modifier,
        "top_offenders": top_offenders,
        "timing_signals": timing_signals,
    }


if __name__ == "__main__":
    # Example usage

    grok_output_json = {
        "offenders": [
            {
                "account": "@bait_user_1",
                "category": "BAIT_FARMER",
                "risk_score": "0.85",
                "behavior_pattern": "Pump then dump",
                "trigger_keywords": ["100x", "moon", "gem"],
                "market_correlation": "Peaks before dumps",
            },
            {
                "account": "@bait_user_2",
                "category": "MANIPULATOR",
                "risk_score": "0.6",
                "behavior_pattern": "Fake urgency",
                "trigger_keywords": ["last chance", "don't miss"],
                "market_correlation": "Spikes on low volume",
            },
        ],
        "global_insights": {
            "common_patterns": ["Coordinated timing", "Copy-paste narratives"],
            "timing_signals": ["Pre-market spike", "Weekend pump"],
            "recommended_watchlist": ["@bait_user_1", "@bait_user_2"],
        },
    }

    merge_new_scan_results(grok_output_json)
    print("Merged scan results.")

    export_data = export_for_kiba()
    print("export_for_kiba():", json.dumps(export_data, ensure_ascii=False, indent=2))

    print("list_offenders():", len(list_offenders()), "offenders")
    print("get_offender('@bait_user_1'):", get_offender("@bait_user_1"))
    print("compute_sentiment_modifier():", compute_sentiment_modifier())
