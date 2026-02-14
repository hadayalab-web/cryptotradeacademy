"""
market_influencer_registry: Load and list multi-language market influencers from influencers.json (or per-language files).
Stateless; data from data/influencers/ for integration with influencer_onchain_alert_engine.
"""

import json
import os
import glob
from typing import Any, Optional

_ROOT = os.path.dirname(os.path.abspath(__file__))
_DATA_DIR = os.path.join(_ROOT, "data", "influencers")
_INFLUENCERS_JSON = os.path.join(_DATA_DIR, "influencers.json")


def _ensure_list(obj: Any) -> list:
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict) and "influencers" in obj:
        return obj["influencers"]
    return []


def _normalize_account(username: str) -> str:
    u = (username or "").strip()
    return f"@{u}" if u and not u.startswith("@") else u or ""


def _influence_score_from_entry(entry: dict) -> float:
    """Derive 0-400 influence score from followerCount and engagementRate (for alert base = score/4, max 100)."""
    import math
    followers = int(entry.get("followerCount") or entry.get("followers") or 0)
    eng = float(entry.get("engagementRate") or entry.get("engagement_rate") or 0)
    f_score = min(280, math.log10(followers + 1) * 48) if followers else 0  # 100k -> ~192
    e_score = min(120, eng * 600)  # 20% ER -> 120
    return round(min(400.0, f_score + e_score), 1)


def load_influencers_json() -> list[dict]:
    """
    Load all influencers: single influencers.json if present, else merge influencers-<lang>.json.
    Returns flat list of raw entries (each may have lang, username, followerCount, etc.).
    """
    if os.path.isfile(_INFLUENCERS_JSON):
        with open(_INFLUENCERS_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
        return _ensure_list(data)
    out: list[dict] = []
    if not os.path.isdir(_DATA_DIR):
        return out
    for path in sorted(glob.glob(os.path.join(_DATA_DIR, "influencers-*.json"))):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            lang = data.get("lang", "")
            for inf in _ensure_list(data):
                inf = dict(inf)
                if "lang" not in inf and lang:
                    inf["lang"] = lang
                out.append(inf)
        except (json.JSONDecodeError, OSError):
            continue
    return out


def list_influencers(enrich_for_alerts: bool = False) -> list[dict]:
    """
    Return list of influencer entries for use by influencer_onchain_alert_engine.
    Each entry has at least: account, language, influence_score.
    If enrich_for_alerts=True, adds optional correlation_type and timing_pattern from hints file or defaults.
    """
    raw = load_influencers_json()
    hints_path = os.path.join(_DATA_DIR, "influencer_alert_hints.json")
    hints: dict[str, dict] = {}
    if os.path.isfile(hints_path):
        try:
            with open(hints_path, "r", encoding="utf-8") as f:
                hints = json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    result: list[dict] = []
    for inf in raw:
        username = inf.get("username") or inf.get("account") or ""
        account = _normalize_account(username)
        lang = inf.get("lang") or inf.get("language") or ""
        influence_score = inf.get("influence_score")
        if influence_score is None:
            influence_score = _influence_score_from_entry(inf)
        entry = {
            "account": account,
            "language": lang,
            "influence_score": influence_score,
            "username": username,
        }
        if enrich_for_alerts and hints:
            key = account.lstrip("@").lower()
            h = hints.get(key) or hints.get(account)
            if h:
                entry["correlation_type"] = h.get("correlation_type", "")
                entry["timing_pattern"] = h.get("timing_pattern", "")
        result.append(entry)
    return result
