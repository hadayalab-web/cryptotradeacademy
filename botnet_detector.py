"""
Trap Defence OS — BotNet Detection MVP (CQS Rewrite).
Deterministic Query functions for botnet cluster, initial boost, and raid detection.
No I/O, no global side-effects, full BAN-04 compliance.
All detection outputs are structured via hadayalab_contract.make_envelope.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Mapping, Optional

from hadayalab_contract import Envelope, make_envelope

RULE_ID_BOTNET = "BOT.CLUSTER.TEMPORAL.v1"

BURST_WINDOW_SECONDS = 3.0
BURST_ANOMALY_MIN = 10   # 10-50x (bot_amplification_effect)
BURST_ANOMALY_MAX = 50
RAID_FACTOR_MIN = 50     # 50-200x (raid_or_cycle_effect)
CLUSTER_MIN_SIZE = 5
RAID_RT_THRESHOLD = 100
RAID_WINDOW_SECONDS = 10
RAID_CONSECUTIVE_CLUSTERS = 3


def parse_timestamp(ts: Any) -> Optional[float]:
    """ISO timestamp を秒（epoch）に変換する純粋関数。"""
    if ts is None:
        return None
    if isinstance(ts, (int, float)):
        return float(ts)
    s = str(ts).strip()
    if not s:
        return None
    try:
        s_clean = s.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s_clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()
    except (ValueError, TypeError):
        return None


def cluster_events(
    events: List[Dict[str, Any]],
    window_seconds: float = BURST_WINDOW_SECONDS,
    min_size: int = CLUSTER_MIN_SIZE,
) -> List[Dict[str, Any]]:
    """
    純粋関数: 3秒スライディングウィンドウでクラスタを検出。
    events は { account, type, timestamp } のリスト。
    """
    if not events:
        return []
    rows = []
    for e in events:
        t = parse_timestamp(e.get("timestamp"))
        if t is None:
            continue
        rows.append({
            "account": (e.get("account") or "").strip(),
            "type": (e.get("type") or "like").strip().lower(),
            "timestamp_sec": t,
        })
    if not rows:
        return []
    rows.sort(key=lambda x: x["timestamp_sec"])
    clusters = []
    used = set()
    for i, r in enumerate(rows):
        if i in used:
            continue
        t0 = r["timestamp_sec"]
        group = [r]
        used.add(i)
        for j, r2 in enumerate(rows):
            if j <= i or j in used:
                continue
            if r2["timestamp_sec"] - t0 <= window_seconds:
                group.append(r2)
                used.add(j)
        if len(group) >= min_size:
            end_sec = max(g["timestamp_sec"] for g in group)
            accounts = sorted(list({g["account"] for g in group if g["account"]}))
            clusters.append({
                "accounts": accounts,
                "window_seconds": int(window_seconds),
                "event_count": len(group),
                "start_sec": t0,
                "end_sec": end_sec,
            })
    return clusters


def get_expected_engagement_for_window(
    window_seconds: float = BURST_WINDOW_SECONDS,
    asset_class: Optional[str] = None,
) -> float:
    """純粋計算: baseline_engagement_per_second * window から expected を算出。"""
    try:
        from trap_defence_structural_data import get_baseline_engagement_per_second
        rate = get_baseline_engagement_per_second(asset_class)
    except ImportError:
        rate = 1.0 / 3.0
    return max(0.1, rate * window_seconds)


def compute_burst_factor(
    cluster_size: int,
    window_seconds: float = BURST_WINDOW_SECONDS,
    asset_class: Optional[str] = None,
) -> float:
    """純粋計算: burst_factor = cluster_size / expected。"""
    expected = get_expected_engagement_for_window(window_seconds, asset_class)
    return cluster_size / expected


def compute_bot_score(
    account: str,
    clusters: List[Dict[str, Any]],
    account_metadata: Optional[Dict[str, Dict[str, Any]]] = None,
    raid_detected: bool = False,
    asset_class: Optional[str] = None,
) -> tuple[int, List[str]]:
    """
    純粋計算: ボット疑惑スコア 0-100 を算出。
    BAN-04準拠: 主観的語彙（心理、感情、意図）を排除した構造的ルール。
    """
    score = 0
    reasons: List[str] = []
    acc_clean = (account or "").strip().lower()
    meta = (account_metadata or {}).get(acc_clean) or {}

    # クラスタ参加
    in_cluster = any(
        acc_clean in [a.lower() for a in c.get("accounts") or []]
        for c in clusters
    )
    if in_cluster:
        score += 20
        reasons.append("cluster_member")

    # burst_factor が高いクラスタに参加
    for c in clusters:
        if acc_clean in [a.lower() for a in c.get("accounts") or []]:
            bf = compute_burst_factor(
                c.get("event_count", 0),
                window_seconds=c.get("window_seconds", BURST_WINDOW_SECONDS),
                asset_class=asset_class,
            )
            if bf >= BURST_ANOMALY_MIN:
                score += 20
                reasons.append("high_burst_factor")
                break

    # レイド参加
    if raid_detected and in_cluster:
        score += 20
        reasons.append("raid_participant")

    # アカウント年齢（metadata がある場合）
    age_days = meta.get("account_age_days")
    if age_days is not None and age_days < 30:
        score += 10
        reasons.append("account_age_under_30d")

    # フォロワー/フォロー比（metadata がある場合）
    ratio = meta.get("follower_follow_ratio")
    if ratio is not None and (ratio < 0.1 or ratio > 10):
        score += 10
        reasons.append("follower_follow_ratio_anomaly")

    # 類似投稿（metadata がある場合）
    similarity = meta.get("post_similarity_pct")
    if similarity is not None and similarity >= 80:
        score += 20
        reasons.append("similar_posts_80pct")

    return min(100, score), sorted(reasons)


def compute_cluster_activation_score(
    clusters: List[Dict[str, Any]],
    cluster_events_out: List[Dict[str, Any]],
) -> float:
    """純粋計算: クラスタ数・burst_factor から活性度スコア 0-1 を算出。"""
    if not clusters or not cluster_events_out:
        return 0.0
    n = len(clusters)
    bursts = [e.get("burst_factor") or 0.0 for e in cluster_events_out]
    avg_burst = sum(bursts) / len(bursts) if bursts else 0.0
    activation = min(1.0, (n / 5.0) * 0.5 + min(1.0, avg_burst / 80.0) * 0.5)
    return round(activation, 2)


def compute_botnet_coherence_score(clusters: List[Dict[str, Any]]) -> float:
    """純粋計算: クラスタ間のアカウント重複から一貫性スコア 0-1 を算出。"""
    if len(clusters) < 2:
        return 0.5
    account_lists = [set((a or "").lower() for a in (c.get("accounts") or []) if a) for c in clusters]
    total_accounts = set().union(*account_lists)
    if not total_accounts:
        return 0.0
    overlaps = sum(1 for acc in total_accounts if sum(1 for s in account_lists if acc in s) >= 2)
    coherence = min(1.0, overlaps / max(1, len(total_accounts)) * 2.0)
    return round(coherence, 2)


def compute_burst_factor_v42(
    initial_boost: float,
    cluster_activation: float,
    botnet_coherence: float,
    historical_similarity: float,
    language_phase: float,
) -> float:
    """純粋計算: v4.2重み付け合算 burst_factor。"""
    w1, w2, w3, w4, w5 = 0.5, 0.2, 0.15, 0.1, 0.05
    bf = (
        w1 * min(100.0, initial_boost)
        + w2 * cluster_activation * 80.0
        + w3 * botnet_coherence * 60.0
        + w4 * historical_similarity * 40.0
        + w5 * language_phase * 40.0
    )
    return round(max(initial_boost, bf), 1)


def detect_botnet(
    post_id: str,
    timestamp: str,
    engagement_events: List[Dict[str, Any]],
    account_metadata: Optional[Dict[str, Dict[str, Any]]] = None,
    asset_class: Optional[str] = None,
) -> Envelope:
    """
    CQS Query: ボットクラスタ・初動ブースト・レイドを決定論的に検出し、
    hadayalab_contract の Envelope 形式で返却する。
    I/O・大域状態の変更は一切行わない。
    """
    clusters = cluster_events(
        engagement_events,
        window_seconds=BURST_WINDOW_SECONDS,
        min_size=CLUSTER_MIN_SIZE,
    )
    cluster_accounts = set()
    cluster_events_out: List[Dict[str, Any]] = []
    max_burst = 0.0

    for i, c in enumerate(clusters):
        bf = compute_burst_factor(
            c.get("event_count", 0),
            window_seconds=c.get("window_seconds", BURST_WINDOW_SECONDS),
            asset_class=asset_class,
        )
        cluster_events_out.append({
            "cluster_id": f"{post_id}_c{i}",
            "accounts": c.get("accounts", []),
            "burst_factor": round(bf, 1),
            "window_seconds": c.get("window_seconds", 3),
        })
        cluster_accounts.update(a.lower() for a in (c.get("accounts") or []) if a)
        if bf > max_burst:
            max_burst = bf

    initial_boost_factor = round(max_burst, 1) if max_burst > 0 else 0.0

    post_ts = parse_timestamp(timestamp)
    rt_count_10s = 0
    if post_ts is not None:
        for e in engagement_events:
            t = parse_timestamp(e.get("timestamp"))
            if t is not None and 0 <= t - post_ts <= RAID_WINDOW_SECONDS:
                if (e.get("type") or "").lower() in ("rt", "retweet"):
                    rt_count_10s += 1

    consecutive_count = 0
    if clusters:
        prev_end = -999.0
        for c in clusters:
            start = c.get("start_sec", 0.0)
            if prev_end >= 0 and start - prev_end <= 5.0:
                consecutive_count += 1
            else:
                consecutive_count = 1
            prev_end = c.get("end_sec", start)

    raid_detected = (
        rt_count_10s >= RAID_RT_THRESHOLD
        and max_burst >= RAID_FACTOR_MIN
        and consecutive_count >= RAID_CONSECUTIVE_CLUSTERS
    )
    raid_factor = round(max_burst, 1) if raid_detected else 0.0

    cluster_activation_score = compute_cluster_activation_score(clusters, cluster_events_out)
    botnet_coherence_score = compute_botnet_coherence_score(clusters)
    historical_burst_similarity = 0.5
    language_cycle_phase = 0.5
    burst_factor_v42 = compute_burst_factor_v42(
        initial_boost_factor,
        cluster_activation_score,
        botnet_coherence_score,
        historical_burst_similarity,
        language_cycle_phase,
    )

    all_accounts = sorted(list(set(
        (e.get("account") or "").strip().lower()
        for e in engagement_events
        if (e.get("account") or "").strip()
    )))
    bot_suspects: List[Dict[str, Any]] = []
    for acc in all_accounts:
        score, reasons = compute_bot_score(
            acc, clusters, account_metadata, raid_detected, asset_class
        )
        if score > 0:
            bot_suspects.append({
                "account": acc if acc.startswith("@") else f"@{acc}",
                "score": score,
                "reasons": reasons,
            })
    bot_suspects.sort(key=lambda x: -x["score"])

    # 構造要約（BAN-04準拠）
    summary_parts = [
        f"clusters={len(clusters)} / burst={initial_boost_factor}x / suspects={len(bot_suspects)}"
    ]
    if bot_suspects:
        summary_parts[0] += f" (max={bot_suspects[0]['score']})"
    if raid_detected and post_ts is not None:
        summary_parts.append(f"RT {rt_count_10s} in 10s / raid_factor={raid_factor}x")
    summary = " | ".join(summary_parts) if summary_parts else "no_significant_activity"

    primary_cluster = max(cluster_events_out, key=lambda c: c.get("burst_factor") or 0) if cluster_events_out else None
    botnet_cluster_id = primary_cluster.get("cluster_id") if primary_cluster else None
    total_accounts_count = len(all_accounts) or 1
    botnet_density = round(min(1.0, len(bot_suspects) / total_accounts_count * 2.0), 2)

    # BAN-04準拠: 客観的構造分類ラベル（RAID or BOTNET）
    danger_label = "RAID" if (raid_detected or (initial_boost_factor >= 50.0)) else "BOTNET"

    observed: Dict[str, Any] = {
        "post_id": post_id,
        "timestamp": timestamp,
        "event_count": len(engagement_events),
        "asset_class": asset_class or "crypto",
        "engagement_events": engagement_events,
    }

    derived: Dict[str, Any] = {
        "post_id": post_id,
        "danger_label": danger_label,
        "bot_suspects": bot_suspects,
        "cluster_events": cluster_events_out,
        "initial_boost_factor": initial_boost_factor,
        "raid_detected": raid_detected,
        "raid_factor": raid_factor,
        "summary": summary,
        "cluster_activation_score": cluster_activation_score,
        "botnet_coherence_score": botnet_coherence_score,
        "historical_burst_similarity": historical_burst_similarity,
        "language_cycle_phase": language_cycle_phase,
        "burst_factor_v42": burst_factor_v42,
        "botnet_cluster_id": botnet_cluster_id,
        "botnet_density": botnet_density,
    }

    return make_envelope(
        rule_id=RULE_ID_BOTNET,
        observed=observed,
        derived=derived,
    )


# 後方互換 alias
_parse_ts = parse_timestamp
_cluster_events = cluster_events
_get_expected_engagement_for_window = get_expected_engagement_for_window
_compute_burst_factor = compute_burst_factor
_compute_bot_score = compute_bot_score
_compute_cluster_activation_score = compute_cluster_activation_score
_compute_botnet_coherence_score = compute_botnet_coherence_score
_compute_burst_factor_v42 = compute_burst_factor_v42
