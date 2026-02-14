"""
influencer_behavior_profiler: ログからインフルエンサーごとの Trap 行動パターンを集計（集計ベースの学習）。
BuzzWeave/KIBA が「誰が・いつ・どんな文脈で・どの分類か」を蓄積し、Trap を先読みしやすくする。

データソース:
  - influencer_alert_data/influencer_alerts.json
  - bait_registry_data/offenders.json
  - buzzweave_trap_data/buzzweave_trap_post_log.json
"""

import json
import os
import re
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

_ROOT = os.path.dirname(os.path.abspath(__file__))
_PROFILES_PATH = os.path.join(_ROOT, "buzzweave_trap_data", "influencer_behavior_profiles.json")
_ALERTS_PATH = os.path.join(_ROOT, "influencer_alert_data", "influencer_alerts.json")
_OFFENDERS_PATH = os.path.join(_ROOT, "bait_registry_data", "offenders.json")
_POST_LOG_PATH = os.path.join(_ROOT, "buzzweave_trap_data", "buzzweave_trap_post_log.json")

TRAP_CLASSIFICATIONS = {"BAIT_NO_FLOW", "HYPE_WITH_FLOW", "FEAR_WITH_FLOW"}
RECENCY_DAYS = 30  # 直近 N 日をフル重み、それ以降は減衰
TRAP_DENSITY_NORMALIZER = 10.0  # 加重観測数がこれで 1.0 に正規化


def _norm_account(account: str) -> str:
    return (account or "").strip().lower().lstrip("@") or ""


def _parse_utc_hour(ts: str) -> Optional[int]:
    """Parse ISO timestamp to UTC hour (0-23)."""
    if not ts or len(ts) < 13:
        return None
    try:
        return int(ts[11:13])
    except (ValueError, TypeError):
        return None


def _parse_ts_to_days_ago(ts: str) -> Optional[float]:
    """ISO timestamp から「何日前か」を返す。パース失敗は None。"""
    if not ts or len(ts) < 10:
        return None
    try:
        # "2026-02-14T12:47:01Z"
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - dt
        return delta.total_seconds() / 86400.0
    except (ValueError, TypeError):
        return None


def _recency_weight(days_ago: Optional[float]) -> float:
    """直近 RECENCY_DAYS は 1.0、以降は線形減衰。"""
    if days_ago is None:
        return 1.0
    if days_ago <= RECENCY_DAYS:
        return 1.0
    return max(0.0, 1.0 - (days_ago - RECENCY_DAYS) / 60.0)


def _score_weight(kiba_score: float) -> float:
    """KIBA スコアが高い観測ほど重くする。0-100 → 1.0〜2.0 程度。"""
    return 1.0 + (kiba_score / 100.0)


def _load_json(path: str, default: Any = None) -> Any:
    if default is None:
        default = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def build_profiles() -> List[Dict[str, Any]]:
    """
    Three sources を縦に束ね、インフルエンサーごとに集計してプロファイルを返す。
    """
    alerts_data = _load_json(_ALERTS_PATH, {"alerts": []})
    offenders_list = _load_json(_OFFENDERS_PATH, [])
    if isinstance(offenders_list, dict) and "offenders" in offenders_list:
        offenders_list = offenders_list["offenders"]
    post_log = _load_json(_POST_LOG_PATH, {"entries": []})
    entries = post_log.get("entries") or []
    alerts = alerts_data.get("alerts") or []

    # アカウント単位で集計（events = (days_ago, hour, score, classification) で加重 density 用）
    by_account: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "events": [],
        "class_counts": defaultdict(int),
        "keywords": [],
    })

    def _add_keywords(acc: str, text: str) -> None:
        if not text:
            return
        for token in re.split(r"[\s,;:]+", (text or "")):
            t = token.strip().lower()
            if len(t) >= 2 and t.isalnum():
                by_account[acc]["keywords"].append(t)

    # offenders: 1 observation, trigger_keywords + behavior_pattern / market_correlation
    for o in offenders_list:
        if not isinstance(o, dict):
            continue
        acc = _norm_account(o.get("account") or "")
        if not acc:
            continue
        rs = 50.0
        try:
            rs = float(o.get("risk_score") or 50)
        except (TypeError, ValueError):
            pass
        by_account[acc]["events"].append((None, None, rs, None))
        for kw in (o.get("trigger_keywords") or []):
            if kw:
                by_account[acc]["keywords"].append((kw or "").strip().lower())
        _add_keywords(acc, o.get("behavior_pattern") or "")
        _add_keywords(acc, o.get("market_correlation") or "")

    # alerts: trigger_time, kiba_alert_score
    for a in alerts:
        if not isinstance(a, dict):
            continue
        acc = _norm_account(a.get("account") or "")
        if not acc:
            continue
        ts = a.get("trigger_time") or ""
        days_ago = _parse_ts_to_days_ago(ts)
        h = _parse_utc_hour(ts)
        score = 50.0
        try:
            score = float(a.get("kiba_alert_score") or 50)
        except (TypeError, ValueError):
            pass
        by_account[acc]["events"].append((days_ago, h, score, None))

    # post_log: classification, timestamp, kiba_snapshot
    for e in entries:
        if not isinstance(e, dict):
            continue
        acc = _norm_account(e.get("account") or "")
        if not acc:
            continue
        ts = e.get("timestamp") or ""
        days_ago = _parse_ts_to_days_ago(ts)
        h = _parse_utc_hour(ts)
        cls = (e.get("classification") or "").strip()
        if cls in TRAP_CLASSIFICATIONS:
            by_account[acc]["class_counts"][cls] += 1
        score = 50.0
        snap = e.get("kiba_snapshot") or {}
        if isinstance(snap, dict) and snap.get("kiba_alert_score") not in (None, ""):
            try:
                score = float(snap.get("kiba_alert_score"))
            except (TypeError, ValueError):
                pass
        by_account[acc]["events"].append((days_ago, h, score, cls))

    # プロファイルに変換
    profiles: List[Dict[str, Any]] = []
    for acc, data in by_account.items():
        events = data["events"]
        trap_count = len(events)
        # trap_density: 直近30日重み × KIBAスコア加重
        weighted = sum(_recency_weight(e[0]) * _score_weight(e[2]) for e in events)
        trap_density = round(min(1.0, weighted / TRAP_DENSITY_NORMALIZER), 2)
        class_counts = dict(data["class_counts"])
        dominant = "BAIT_NO_FLOW"
        if class_counts:
            dominant = max(class_counts, key=class_counts.get)
        # peak_trap_hours_utc: ヒストグラム + 2h 平滑化
        hour_counts: Dict[int, float] = defaultdict(float)
        for (_do, h, _s, _c) in events:
            if h is not None and 0 <= h <= 23:
                hour_counts[h] += 1.0
        smoothed: Dict[int, float] = {}
        for hi in range(24):
            prev_h = (hi - 1) % 24
            next_h = (hi + 1) % 24
            smoothed[hi] = hour_counts[hi] + 0.5 * (hour_counts.get(prev_h, 0) + hour_counts.get(next_h, 0))
        peak_hours = sorted(smoothed.keys(), key=lambda x: -smoothed[x])[:3]
        # top_keywords: 頻度順（trigger + behavior/market から抽出済み）
        kw_counts = defaultdict(int)
        for kw in data["keywords"]:
            if kw and len(kw) >= 2:
                kw_counts[kw] += 1
        top_keywords = [k for k, _ in sorted(kw_counts.items(), key=lambda x: -x[1])[:10]]
        scores = [e[2] for e in events]
        avg_kiba = round(sum(scores) / len(scores), 1) if scores else 0.0

        profiles.append({
            "account": f"@{acc}" if acc else "",
            "trap_density": trap_density,
            "dominant_pattern": dominant,
            "peak_trap_hours_utc": peak_hours,
            "top_keywords": top_keywords,
            "avg_kiba_score": avg_kiba,
            "trap_count": trap_count,
        })
    profiles.sort(key=lambda p: (p["trap_density"], p["trap_count"]), reverse=True)
    return profiles


def save_profiles(profiles: Optional[List[Dict[str, Any]]] = None) -> None:
    """プロファイルを influencer_behavior_profiles.json に保存。"""
    if profiles is None:
        profiles = build_profiles()
    os.makedirs(os.path.dirname(_PROFILES_PATH), exist_ok=True)
    with open(_PROFILES_PATH, "w", encoding="utf-8") as f:
        json.dump({"profiles": profiles}, f, ensure_ascii=False, indent=2)


def load_profiles() -> List[Dict[str, Any]]:
    """保存済みプロファイルを読み込む。無ければ build して返す。"""
    data = _load_json(_PROFILES_PATH, {})
    profiles = data.get("profiles")
    if isinstance(profiles, list) and profiles:
        return profiles
    return build_profiles()


def get_profile_for_account(account: str) -> Optional[Dict[str, Any]]:
    """アカウントのプロファイルを1件返す。"""
    key = _norm_account(account)
    for p in load_profiles():
        if _norm_account(p.get("account") or "") == key:
            return p
    return None


def get_behavior_correction(account: str, utc_hour: Optional[int] = None) -> float:
    """
    KIBA スコア補正用。行動パターン × 現在時刻に基づき 0〜5 のデルタを返す。
    - trap_density >= 0.3 → +2, >= 0.6 → +1
    - 現在 UTC が peak_trap_hours に含まれる → +2
    最大 5 まで。
    """
    profile = get_profile_for_account(account)
    if not profile:
        return 0.0
    delta = 0.0
    density = float(profile.get("trap_density") or 0)
    if density >= 0.6:
        delta += 3.0
    elif density >= 0.3:
        delta += 2.0
    peak = list(profile.get("peak_trap_hours_utc") or [])
    if utc_hour is None:
        utc_hour = datetime.now(timezone.utc).hour
    if peak and utc_hour in peak:
        delta += 2.0
    return round(min(5.0, delta), 1)


def run_profiler_and_save() -> List[Dict[str, Any]]:
    """集計して保存し、プロファイル一覧を返す。"""
    profiles = build_profiles()
    save_profiles(profiles)
    return profiles


if __name__ == "__main__":
    profiles = run_profiler_and_save()
    print(json.dumps({"profiles": profiles[:5]}, ensure_ascii=False, indent=2))
