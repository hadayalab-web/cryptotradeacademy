"""
Trap Defence OS — BotNet Detection MVP（応用フェーズ A）.
釣り師の"影の軍勢"（ボットクラスタ）を可視化し、初動ブースト・レイドを検出する。
BuzzWeave/KIBA と独立したモジュールとして追加。後で統合可能な構造。
"""

import json
import os
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

_ROOT = os.path.dirname(os.path.abspath(__file__))
_LOG_PATH = os.path.join(_ROOT, "botnet_data", "botnet_detection_log.json")

# trap_defence_structural_data 準拠（get_baseline_engagement_per_second で取得、fallback=1/3）
BURST_WINDOW_SECONDS = 3.0
BURST_ANOMALY_MIN = 10   # 10-50x (bot_amplification_effect)
BURST_ANOMALY_MAX = 50
RAID_FACTOR_MIN = 50     # 50-200x (raid_or_cycle_effect)
CLUSTER_MIN_SIZE = 5
RAID_RT_THRESHOLD = 100
RAID_WINDOW_SECONDS = 10
RAID_CONSECUTIVE_CLUSTERS = 3


def _parse_ts(ts: str) -> Optional[float]:
    """ISO timestamp を秒（epoch）に変換。"""
    if not ts:
        return None
    try:
        s = ts.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()
    except (ValueError, TypeError):
        return None


def _cluster_events(
    events: List[Dict[str, Any]],
    window_seconds: float = 3.0,
    min_size: int = CLUSTER_MIN_SIZE,
) -> List[Dict[str, Any]]:
    """
    3秒スライディングウィンドウでクラスタを検出。
    events は { account, type, timestamp } のリスト。timestamp は ISO 文字列または epoch 秒。
    """
    if not events:
        return []
    # timestamp を秒に正規化
    rows = []
    for e in events:
        ts = e.get("timestamp")
        if isinstance(ts, (int, float)):
            t = float(ts)
        else:
            t = _parse_ts(str(ts) if ts else "")
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
            clusters.append({
                "accounts": list({g["account"] for g in group if g["account"]}),
                "window_seconds": int(window_seconds),
                "event_count": len(group),
                "start_sec": t0,
                "end_sec": end_sec,
            })
    return clusters


def _get_expected_engagement_for_window(
    window_seconds: float = BURST_WINDOW_SECONDS,
    asset_class: Optional[str] = None,
) -> float:
    """INFLUENCE_METRICS 準拠。baseline_engagement_per_second × window で expected を算出。"""
    try:
        from trap_defence_structural_data import get_baseline_engagement_per_second
        rate = get_baseline_engagement_per_second(asset_class)
    except ImportError:
        rate = 1.0 / 3.0
    return max(0.1, rate * window_seconds)


def _compute_burst_factor(
    cluster_size: int,
    window_seconds: float = BURST_WINDOW_SECONDS,
    asset_class: Optional[str] = None,
) -> float:
    """burst_factor = cluster_size / expected (INFLUENCE_METRICS 準拠)."""
    expected = _get_expected_engagement_for_window(window_seconds, asset_class)
    return cluster_size / expected


def _compute_bot_score(
    account: str,
    clusters: List[Dict[str, Any]],
    account_metadata: Optional[Dict[str, Dict[str, Any]]] = None,
    raid_detected: bool = False,
    asset_class: Optional[str] = None,
) -> tuple[int, List[str]]:
    """
    ボット疑惑スコア 0-100 を算出。
    重み: 同時RT/いいね +20, アカウント若い +10, フォロワー比異常 +10, 類似投稿 +20, burst高 +20, レイド参加 +20
    account_metadata は recommended: 無い場合は該当スコア項目を 0 とする。
    """
    score = 0
    reasons: List[str] = []
    meta = (account_metadata or {}).get((account or "").strip().lower()) or {}

    # クラスタ参加
    in_cluster = any(
        (account or "").strip().lower() in [a.lower() for a in c.get("accounts") or []]
        for c in clusters
    )
    if in_cluster:
        score += 20
        reasons.append("cluster_member")

    # burst_factor が高いクラスタに参加
    for c in clusters:
        if (account or "").strip().lower() in [a.lower() for a in c.get("accounts") or []]:
            bf = _compute_burst_factor(
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

    return min(100, score), reasons


def _compute_cluster_activation_score(
    clusters: List[Dict[str, Any]],
    cluster_events_out: List[Dict[str, Any]],
) -> float:
    """クラスタ数・burst_factor から活性度スコア 0-1 を算出（v4.2）"""
    if not clusters or not cluster_events_out:
        return 0.0
    n = len(clusters)
    bursts = [e.get("burst_factor") or 0 for e in cluster_events_out]
    avg_burst = sum(bursts) / len(bursts) if bursts else 0
    activation = min(1.0, (n / 5.0) * 0.5 + min(1.0, avg_burst / 80) * 0.5)
    return round(activation, 2)


def _compute_botnet_coherence_score(clusters: List[Dict[str, Any]]) -> float:
    """クラスタ間のアカウント重複から一貫性スコア 0-1 を算出（v4.2）"""
    if len(clusters) < 2:
        return 0.5
    account_lists = [set((a or "").lower() for a in (c.get("accounts") or []) if a) for c in clusters]
    total_accounts = set().union(*account_lists)
    if not total_accounts:
        return 0.0
    overlaps = sum(1 for acc in total_accounts if sum(1 for s in account_lists if acc in s) >= 2)
    coherence = min(1.0, overlaps / max(1, len(total_accounts)) * 2.0)
    return round(coherence, 2)


def _compute_burst_factor_v42(
    initial_boost: float,
    cluster_activation: float,
    botnet_coherence: float,
    historical_similarity: float,
    language_phase: float,
) -> float:
    """v4.2: burst_factor = w1*initial_boost + w2*cluster_activation + ... """
    w1, w2, w3, w4, w5 = 0.5, 0.2, 0.15, 0.1, 0.05
    bf = (
        w1 * min(100, initial_boost)
        + w2 * cluster_activation * 80
        + w3 * botnet_coherence * 60
        + w4 * historical_similarity * 40
        + w5 * language_phase * 40
    )
    return round(max(initial_boost, bf), 1)


def detect_botnet(
    post_id: str,
    timestamp: str,
    engagement_events: List[Dict[str, Any]],
    account_metadata: Optional[Dict[str, Dict[str, Any]]] = None,
    asset_class: Optional[str] = None,
) -> Dict[str, Any]:
    """
    ボットクラスタ・初動ブースト・レイドを検出し、BotnetDetectionResult を返す。

    入力:
      - post_id: 投稿ID
      - timestamp: 投稿の ISO タイムスタンプ
      - engagement_events: [ { account, type(like/rt/reply), timestamp } ]
      - account_metadata: recommended。{ account_lower: { account_age_days, follower_follow_ratio, post_similarity_pct } }
        無い場合は該当スコア項目を 0 とする。
      - asset_class: crypto/equities/commodities/fx/etf。burst_factor の expected 算出に使用。

    出力: BotnetDetectionResult (dict)
    """
    clusters = _cluster_events(
        engagement_events,
        window_seconds=BURST_WINDOW_SECONDS,
        min_size=CLUSTER_MIN_SIZE,
    )
    cluster_accounts = set()
    cluster_events_out: List[Dict[str, Any]] = []
    max_burst = 0.0

    for i, c in enumerate(clusters):
        bf = _compute_burst_factor(
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

    # 初動ブースト: 最大クラスタの burst_factor
    initial_boost_factor = round(max_burst, 1) if max_burst > 0 else 0.0

    # レイド検出: 10秒以内に RT 100+ かつ burst_factor >= 50 かつ 連続クラスタ 3+
    post_ts = _parse_ts(timestamp)
    rt_count_10s = 0
    if post_ts is not None:
        for e in engagement_events:
            t = _parse_ts(str(e.get("timestamp") or ""))
            if t is not None and 0 <= t - post_ts <= RAID_WINDOW_SECONDS:
                if (e.get("type") or "").lower() in ("rt", "retweet"):
                    rt_count_10s += 1

    consecutive_count = 0
    if clusters:
        prev_end = -999
        for c in clusters:
            start = c.get("start_sec", 0)
            if prev_end >= 0 and start - prev_end <= 5:
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

    # v4.2: burst_factor 拡張特徴量
    cluster_activation_score = _compute_cluster_activation_score(clusters, cluster_events_out)
    botnet_coherence_score = _compute_botnet_coherence_score(clusters)
    historical_burst_similarity = 0.5
    language_cycle_phase = 0.5
    burst_factor_v42 = _compute_burst_factor_v42(
        initial_boost_factor,
        cluster_activation_score,
        botnet_coherence_score,
        historical_burst_similarity,
        language_cycle_phase,
    )

    # ボット疑惑スコア
    all_accounts = set((e.get("account") or "").strip().lower() for e in engagement_events if (e.get("account") or "").strip())
    bot_suspects: List[Dict[str, Any]] = []
    for acc in all_accounts:
        score, reasons = _compute_bot_score(
            acc, clusters, account_metadata, raid_detected, asset_class
        )
        if score > 0:
            bot_suspects.append({
                "account": acc if acc.startswith("@") else f"@{acc}",
                "score": score,
                "reasons": reasons,
            })
    bot_suspects.sort(key=lambda x: -x["score"])

    # 構造要約（lang非依存。ダッシュボードはそのまま表示、BuzzWeave は言語テンプレに流し込み）
    # 例: "clusters=3 / burst=80x / suspects=12 (max=60) | RT 120 in 10s / raid_factor=80x"
    summary_parts = []
    summary_parts.append(f"clusters={len(clusters)} / burst={initial_boost_factor}x / suspects={len(bot_suspects)}")
    if bot_suspects:
        summary_parts[0] += f" (max={bot_suspects[0]['score']})"
    if raid_detected and post_ts is not None:
        summary_parts.append(f"RT {rt_count_10s} in 10s / raid_factor={raid_factor}x")
    summary = " | ".join(summary_parts) if summary_parts else "no_significant_activity"

    # v4.3: botnet_cluster_id（最大 burst クラスタ）, botnet_density, botnet_coherence
    primary_cluster = max(cluster_events_out, key=lambda c: c.get("burst_factor") or 0) if cluster_events_out else None
    botnet_cluster_id = primary_cluster.get("cluster_id") if primary_cluster else None
    total_accounts = len(all_accounts) or 1
    botnet_density = round(min(1.0, len(bot_suspects) / total_accounts * 2.0), 2)

    return {
        "post_id": post_id,
        "bot_suspects": bot_suspects,
        "cluster_events": cluster_events_out,
        "initial_boost_factor": initial_boost_factor,
        "raid_detected": raid_detected,
        "raid_factor": raid_factor,
        "summary": summary,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "cluster_activation_score": cluster_activation_score,
        "botnet_coherence_score": botnet_coherence_score,
        "historical_burst_similarity": historical_burst_similarity,
        "language_cycle_phase": language_cycle_phase,
        "burst_factor_v42": burst_factor_v42,
        "botnet_cluster_id": botnet_cluster_id,
        "botnet_density": botnet_density,
    }


def generate_botnet_demo(
    post_id: str,
    detection_result: Dict[str, Any],
    lang: str = "en",
) -> Dict[str, Any]:
    """
    BuzzWeave v3 テンプレ構造に完全準拠した BotNetAlert 用 dict を生成。
    hook / bullets / structure_note / data_sources / cta / hashtags / visual_payload を含む。
    """
    r = detection_result
    clusters = r.get("cluster_events") or []
    boost = r.get("initial_boost_factor") or 0
    raid = r.get("raid_detected") or False
    raid_f = r.get("raid_factor") or 0
    suspects = r.get("bot_suspects") or []
    summary = r.get("summary") or ""

    # hook（質問・返信誘発）
    if lang == "ja":
        hook = "ボットクラスタ検出。構造が示すのは:"
    else:
        hook = "Bot cluster detected. Structure says:"

    # bullets
    bullets = [
        f"• Clusters: {len(clusters)}",
        f"• Initial boost: {boost}x",
        f"• Bot suspects: {len(suspects)}",
    ]
    if raid:
        bullets.append(f"• Raid factor: {raid_f}x")

    # structure_note（ボット増幅の構造的説明）
    try:
        from trap_defence_structural_data import INFLUENCE_METRICS
        amp = INFLUENCE_METRICS.get("bot_amplification_effect", "10-50x multiplier")
    except ImportError:
        amp = "10-50x multiplier"
    if lang == "ja":
        structure_note = f"ボット増幅（{amp[:30]}...）の兆候。初動の異常ブーストはアルゴに誤認識させる。"
    else:
        structure_note = f"Bot amplification ({amp[:40]}...) — artificial virality pushes into ForYou."

    # data_sources
    try:
        from buzzweave_templates import DATA_SOURCES_LABEL
        data_sources = [DATA_SOURCES_LABEL]
    except ImportError:
        data_sources = ["Data: Dune / Glassnode / CryptoQuant (structure only, no prediction)."]

    # cta
    try:
        from buzzweave_templates import CTA_BY_LANG
        cta = CTA_BY_LANG.get(lang) or CTA_BY_LANG.get("en") or "RT to save someone. What do you think?"
    except ImportError:
        cta = "RT to save someone. What do you think?"

    # hashtags
    try:
        from buzzweave_templates import GLOBAL_HASHTAG, HASHTAGS_BY_LANG
        base = HASHTAGS_BY_LANG.get(lang) or HASHTAGS_BY_LANG.get("en") or "#Bitcoin #Crypto"
        hashtags = [base, "#BotNetAlert", GLOBAL_HASHTAG]
    except ImportError:
        hashtags = ["#Bitcoin", "#Crypto", "#BotNetAlert", "#TrapDefence"]

    # 互換用の単一テキスト
    if lang == "ja":
        structural_text_ja = f"【BotNet検出】{len(clusters)}クラスタ・初動ブースト{boost}x" + (f"・レイド{raid_f}x" if raid else "") + f". ボット疑惑{len(suspects)}件."
        structural_text_en = f"[BotNet] {len(clusters)} cluster(s), boost {boost}x" + (f", raid {raid_f}x" if raid else "") + f". {len(suspects)} suspect(s)."
    else:
        structural_text_en = f"[BotNet] {len(clusters)} cluster(s), boost {boost}x" + (f", raid {raid_f}x" if raid else "") + f". {len(suspects)} suspect(s)."
        structural_text_ja = f"【BotNet検出】{len(clusters)}クラスタ・初動ブースト{boost}x" + (f"・レイド{raid_f}x" if raid else "") + f". ボット疑惑{len(suspects)}件."

    # psychology_tag 動的: raid_detected または burst が高い場合は RAID、それ以外は BOTNET（CSO Enhanced）
    psychology_tag = "RAID" if (raid or (boost >= 50)) else "BOTNET"

    return {
        "post_id": post_id,
        "classification": "BOTNET_ALERT",
        "mode": "botnet",
        "hook": hook,
        "bullets": bullets,
        "structure_note": structure_note,
        "data_sources": data_sources,
        "cta": cta,
        "cta_core": cta,
        "hashtags": hashtags,
        "visual_payload": r,
        "psychology_tag": psychology_tag,
        "structural_text_ja": structural_text_ja,
        "structural_text_en": structural_text_en,
        "kiba_data": {
            "flow_signal": "none",
            "liquidity_signal": "neutral",
            "sentiment_signal": "BOTNET",
            "onchain_confirmation": "FALSE",
            "botnet_clusters": len(clusters),
            "botnet_boost_factor": boost,
            "botnet_raid_factor": raid_f if raid else 0,
        },
        "attach_visual": True,
        "detection_result": r,
    }


def publish_botnet_alert(
    post_id: str,
    detection_result: Dict[str, Any],
    lang: str = "en",
    save_result: bool = True,
) -> None:
    """
    BotNetAlert を BuzzWeave 経由で投稿（ログ記録）。
    generate_botnet_demo で構造的説明文を生成し、publish_quote に渡す。
    """
    demo = generate_botnet_demo(post_id, detection_result, lang)
    text = demo.get("structural_text_ja") if lang == "ja" else demo.get("structural_text_en")
    text = text or demo.get("structural_text_en") or demo.get("structural_text_ja") or str(detection_result.get("summary", ""))
    if save_result:
        save_detection_result(detection_result)
    try:
        from buzzweave_engine import publish_quote
        from buzzweave_templates import GLOBAL_HASHTAG, HASHTAGS_BY_LANG
        post = {"post_id": post_id, "account": "", "language": lang}
        base = HASHTAGS_BY_LANG.get(lang) or HASHTAGS_BY_LANG.get("en") or "#Bitcoin #Crypto"
        hashtag = f"{base} #BotNetAlert {GLOBAL_HASHTAG}".strip()
        publish_quote(
            post=post,
            generated_text=text,
            classification="BOTNET_ALERT",
            kiba_snapshot=demo.get("kiba_data", {}),
            attach_visual=True,
            hashtag=hashtag,
        )
    except ImportError:
        if save_result:
            save_detection_result(detection_result)


def save_detection_result(result: Dict[str, Any]) -> None:
    """検出結果を botnet_data/botnet_detection_log.json に追記。"""
    os.makedirs(os.path.dirname(_LOG_PATH), exist_ok=True)
    try:
        with open(_LOG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        data = {"entries": []}
    if "entries" not in data or not isinstance(data["entries"], list):
        data["entries"] = []
    data["entries"].append(result)
    with open(_LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    # 疑似データで動作確認
    events = [
        {"account": "u1", "type": "rt", "timestamp": "2026-02-14T12:00:00Z"},
        {"account": "u2", "type": "like", "timestamp": "2026-02-14T12:00:01Z"},
        {"account": "u3", "type": "rt", "timestamp": "2026-02-14T12:00:02Z"},
        {"account": "u4", "type": "reply", "timestamp": "2026-02-14T12:00:02Z"},
        {"account": "u5", "type": "rt", "timestamp": "2026-02-14T12:00:02Z"},
    ]
    res = detect_botnet("test_post_1", "2026-02-14T12:00:00Z", events)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    demo = generate_botnet_demo("test_post_1", res, "ja")
    print("\n--- Demo for BuzzWeave ---")
    print(json.dumps({"structural_text_ja": demo["structural_text_ja"], "classification": demo["classification"]}, ensure_ascii=False))
