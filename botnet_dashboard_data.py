"""
Trap Defence OS — BotNet Detection ダッシュボード用データ集約。
botnet_detection_log.json を読み込み、クラスタ数・レイド検出数・ボット疑惑アカウント数を集計。
"""

import json
import os
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

_ROOT = os.path.dirname(os.path.abspath(__file__))
_LOG_PATH = os.path.join(_ROOT, "botnet_data", "botnet_detection_log.json")


def _load_log() -> List[Dict[str, Any]]:
    try:
        with open(_LOG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return list(data.get("entries") or [])
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def get_botnet_dashboard_snapshot(days: int = 30) -> Dict[str, Any]:
    """
    ダッシュボード用スナップショットを返す。
    - total_detections: 検出回数
    - raid_count: レイド検出回数
    - total_clusters: クラスタ総数
    - top_bot_suspects: ボット疑惑スコア上位アカウント
    - by_post: 投稿別サマリ（直近 N 日）
    """
    entries = _load_log()
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=days)).isoformat()[:10]
    recent = [e for e in entries if (e.get("timestamp") or "")[:10] >= cutoff]

    raid_count = sum(1 for e in recent if e.get("raid_detected"))
    total_clusters = sum(len(e.get("cluster_events") or []) for e in recent)

    suspect_scores: Dict[str, float] = defaultdict(float)
    for e in recent:
        for s in e.get("bot_suspects") or []:
            acc = (s.get("account") or "").strip()
            if acc:
                suspect_scores[acc] = max(suspect_scores[acc], float(s.get("score") or 0))

    top_suspects = sorted(suspect_scores.items(), key=lambda x: -x[1])[:20]

    by_post = [
        {
            "post_id": e.get("post_id"),
            "clusters": len(e.get("cluster_events") or []),
            "raid_detected": e.get("raid_detected"),
            "boost_factor": e.get("initial_boost_factor"),
            "suspects_count": len(e.get("bot_suspects") or []),
        }
        for e in recent[-50:]
    ]

    return {
        "total_detections": len(recent),
        "raid_count": raid_count,
        "total_clusters": total_clusters,
        "top_bot_suspects": dict(top_suspects),
        "by_post": by_post,
        "recent_days": days,
    }


def export_botnet_dashboard_json(snapshot: Dict[str, Any]) -> str:
    """スナップショットを JSON 文字列で返す。"""
    return json.dumps(snapshot, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    s = get_botnet_dashboard_snapshot(days=30)
    print(export_botnet_dashboard_json(s))
