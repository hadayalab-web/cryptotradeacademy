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
from collections import defaultdict
from typing import Any, Dict, List, Optional

_ROOT = os.path.dirname(os.path.abspath(__file__))
_PROFILES_PATH = os.path.join(_ROOT, "buzzweave_trap_data", "influencer_behavior_profiles.json")
_ALERTS_PATH = os.path.join(_ROOT, "influencer_alert_data", "influencer_alerts.json")
_OFFENDERS_PATH = os.path.join(_ROOT, "bait_registry_data", "offenders.json")
_POST_LOG_PATH = os.path.join(_ROOT, "buzzweave_trap_data", "buzzweave_trap_post_log.json")

TRAP_CLASSIFICATIONS = {"BAIT_NO_FLOW", "HYPE_WITH_FLOW", "FEAR_WITH_FLOW"}


def _norm_account(account: str) -> str:
    return (account or "").strip().lower().lstrip("@") or ""


def _parse_utc_hour(ts: str) -> Optional[int]:
    """Parse ISO timestamp to UTC hour (0-23)."""
    if not ts or len(ts) < 13:
        return None
    try:
        # "2026-02-14T12:47:01Z" or "2026-02-14T12:47:01.123Z"
        return int(ts[11:13])
    except (ValueError, TypeError):
        return None


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

    # アカウント単位で集計
    by_account: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "trap_count": 0,
        "class_counts": defaultdict(int),
        "kiba_scores": [],
        "hours": [],
        "keywords": [],
    })

    # offenders: 1 observation, trigger_keywords を収集
    for o in offenders_list:
        if not isinstance(o, dict):
            continue
        acc = _norm_account(o.get("account") or "")
        if not acc:
            continue
        by_account[acc]["trap_count"] += 1
        for kw in (o.get("trigger_keywords") or []):
            if kw:
                by_account[acc]["keywords"].append((kw or "").strip())
        rs = o.get("risk_score")
        if rs is not None and rs != "":
            try:
                by_account[acc]["kiba_scores"].append(float(rs))
            except (TypeError, ValueError):
                pass

    # alerts: trigger_time, kiba_alert_score
    for a in alerts:
        if not isinstance(a, dict):
            continue
        acc = _norm_account(a.get("account") or "")
        if not acc:
            continue
        by_account[acc]["trap_count"] += 1
        h = _parse_utc_hour(a.get("trigger_time") or "")
        if h is not None:
            by_account[acc]["hours"].append(h)
        score = a.get("kiba_alert_score")
        if score is not None and score != "":
            try:
                by_account[acc]["kiba_scores"].append(float(score))
            except (TypeError, ValueError):
                pass

    # post_log: classification, timestamp, kiba_snapshot
    for e in entries:
        if not isinstance(e, dict):
            continue
        acc = _norm_account(e.get("account") or "")
        if not acc:
            continue
        by_account[acc]["trap_count"] += 1
        cls = (e.get("classification") or "").strip()
        if cls in TRAP_CLASSIFICATIONS:
            by_account[acc]["class_counts"][cls] += 1
        ts = e.get("timestamp") or ""
        h = _parse_utc_hour(ts)
        if h is not None:
            by_account[acc]["hours"].append(h)
        snap = e.get("kiba_snapshot") or {}
        if isinstance(snap, dict):
            score = snap.get("kiba_alert_score")
            if score is not None and score != "":
                try:
                    by_account[acc]["kiba_scores"].append(float(score))
                except (TypeError, ValueError):
                    pass

    # プロファイルに変換
    profiles: List[Dict[str, Any]] = []
    for acc, data in by_account.items():
        trap_count = data["trap_count"]
        # trap_density: 観測数で正規化（10件以上で 1.0 に近づく）
        trap_density = round(min(1.0, trap_count / 10.0), 2)
        class_counts = dict(data["class_counts"])
        dominant = "BAIT_NO_FLOW"
        if class_counts:
            dominant = max(class_counts, key=class_counts.get)
        # peak_trap_hours_utc: 時間帯のヒストグラムから上位3つ
        hour_counts = defaultdict(int)
        for h in data["hours"]:
            if 0 <= h <= 23:
                hour_counts[h] += 1
        peak_hours = sorted(hour_counts.keys(), key=lambda h: -hour_counts[h])[:3]
        # top_keywords: 頻度順
        kw_counts = defaultdict(int)
        for kw in data["keywords"]:
            if kw:
                kw_counts[kw.lower()] += 1
        top_keywords = [k for k, _ in sorted(kw_counts.items(), key=lambda x: -x[1])[:10]]
        # avg_kiba_score
        scores = data["kiba_scores"]
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
    # trap_density 降順
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


def run_profiler_and_save() -> List[Dict[str, Any]]:
    """集計して保存し、プロファイル一覧を返す。"""
    profiles = build_profiles()
    save_profiles(profiles)
    return profiles


if __name__ == "__main__":
    profiles = run_profiler_and_save()
    print(json.dumps({"profiles": profiles[:5]}, ensure_ascii=False, indent=2))
