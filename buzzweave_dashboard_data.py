"""
BuzzWeave Trap 狩りダッシュボード用データ集約。
buzzweave_trap_post_log.json / KPI / self_restraint / プロファイルを集約し、
言語別・分類別・インフルエンサー別の可視化用 JSON を返す。
"""

import json
import os
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

_ROOT = os.path.dirname(os.path.abspath(__file__))
_LOG_PATH = os.path.join(_ROOT, "buzzweave_trap_data", "buzzweave_trap_post_log.json")
_PROFILES_PATH = os.path.join(_ROOT, "buzzweave_trap_data", "influencer_behavior_profiles.json")


def _load_log() -> List[Dict[str, Any]]:
    try:
        with open(_LOG_PATH, "r", encoding="utf-8") as f:
            log = json.load(f)
        return list(log.get("entries") or [])
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _load_profiles() -> List[Dict[str, Any]]:
    try:
        with open(_PROFILES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return list(data)
        if isinstance(data, dict) and "profiles" in data:
            p = data["profiles"]
            return list(p) if isinstance(p, list) else []
        return []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _infer_lang(entry: Dict[str, Any]) -> str:
    """entry から言語を推測（hashtag や account からは取れないので neutral も許容）。"""
    # ログには language が直接ない場合があるので、hashtag から推測
    tag = (entry.get("hashtag") or "").lower()
    if "ja" in tag or "bitcoinja" in tag:
        return "ja"
    if "ko" in tag or "bitcoinko" in tag:
        return "ko"
    if "es" in tag or "bitcoines" in tag:
        return "es"
    if "pt" in tag or "bitcoinpt" in tag:
        return "pt"
    if "ar" in tag or "bitcoinar" in tag:
        return "ar"
    return "en"


def get_dashboard_snapshot(
    include_profiles: bool = True,
    days: int = 30,
) -> Dict[str, Any]:
    """
    ダッシュボード用スナップショットを返す。
    - log_summary: 総投稿数、今日の投稿数、直近 N 日分
    - by_language: 言語別投稿数
    - by_classification: BAIT_NO_FLOW / HYPE_WITH_FLOW / FEAR_WITH_FLOW 別
    - by_account: インフルエンサー（引用元アカウント）別投稿数（上位）
    - kpi: get_kpi_snapshot() の結果
    - self_restraint: get_self_restraint_protocol() の結果
    - guardrails: get_guardrails() の結果
    - posts_today, effective_cap: 今日の投稿数と実効キャップ（run_buzzweave_trap_cycle と同等ロジック）
    - profiles_count: プロファイル数（include_profiles=True 時）
    """
    entries = _load_log()
    now = datetime.now(timezone.utc)
    today_str = now.date().isoformat()
    cutoff = (now.date() - timedelta(days=days)).isoformat()

    posts_today = sum(1 for e in entries if (e.get("timestamp") or "")[:10] == today_str)
    recent = [e for e in entries if (e.get("timestamp") or "")[:10] >= cutoff]

    by_lang: Dict[str, int] = defaultdict(int)
    by_class: Dict[str, int] = defaultdict(int)
    by_account: Dict[str, int] = defaultdict(int)

    for e in recent:
        lang = _infer_lang(e)
        by_lang[lang] += 1
        cl = (e.get("classification") or "BAIT_NO_FLOW").strip()
        by_class[cl] += 1
        acc = (e.get("account") or "").strip() or "(unknown)"
        by_account[acc] += 1

    # インフルエンサー別は降順で上位 20
    top_accounts = sorted(by_account.items(), key=lambda x: -x[1])[:20]

    try:
        from buzzweave_kpi import get_guardrails, get_kpi_snapshot, get_self_restraint_protocol
        guardrails = get_guardrails()
        kpi = get_kpi_snapshot()
        self_restraint = get_self_restraint_protocol()
        effective_cap = min(
            guardrails.get("max_posts_per_day", 4),
            guardrails.get("emergency_max_posts_per_day", 5),
        )
    except ImportError:
        guardrails = {}
        kpi = {}
        self_restraint = {}
        effective_cap = 4

    out = {
        "log_summary": {
            "total_entries": len(entries),
            "posts_today": posts_today,
            "recent_days": days,
            "recent_count": len(recent),
        },
        "by_language": dict(by_lang),
        "by_classification": dict(by_class),
        "by_account_top20": dict(top_accounts),
        "guardrails": guardrails,
        "self_restraint_protocol": self_restraint,
        "kpi_snapshot": kpi,
        "posts_today": posts_today,
        "effective_cap": effective_cap,
    }

    if include_profiles:
        profiles = _load_profiles()
        out["profiles_count"] = len(profiles)

    return out


def export_dashboard_json(snapshot: Dict[str, Any]) -> str:
    """スナップショットを JSON 文字列で返す（API レスポンス用）。"""
    return json.dumps(snapshot, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    s = get_dashboard_snapshot(include_profiles=True, days=30)
    print(export_dashboard_json(s))
