#!/usr/bin/env python3
"""
StructuredPost を JSON 出力（v4 パイプライン用）。
Node から subprocess で呼び、buildXPost + postToX に渡す。

Usage:
  # trap モード（kiba_snapshot あり）
  python scripts/build_structured_post.py --mode trap --lang en --kiba '{"flow_signal":"strong","sentiment_signal":"FOMO",...}'

  # botnet モード（detection_result あり）
  python scripts/build_structured_post.py --mode botnet --lang ja --post-id xxx --detection '{"post_id":"xxx","cluster_events":[...],...}'

  # chain モード（v4.1: botnet + CQ 統合）
  python scripts/build_structured_post.py --mode chain --lang en --post-id xxx --detection '{"post_id":"xxx","initial_boost_factor":50,...}' [--fetch-cq]

  # 出力は stdout に JSON
"""

import argparse
import json
import os
import sys

# project root を path に追加
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)


def main() -> None:
    ap = argparse.ArgumentParser(description="Build StructuredPost for BuzzDefence v4")
    ap.add_argument("--mode", default="trap", choices=["trap", "botnet", "chain", "macro", "meme"])
    ap.add_argument("--lang", default="en", choices=["en", "es", "pt", "ar", "ko", "ja"])
    ap.add_argument("--kiba", type=str, help="JSON string: kiba_snapshot")
    ap.add_argument("--post-id", type=str, help="For botnet/chain: post_id")
    ap.add_argument("--detection", type=str, help="JSON string: botnet detection_result")
    ap.add_argument("--fetch-cq", action="store_true", help="Chain mode: fetch CQ metrics (fallback when --cq-metrics absent)")
    ap.add_argument("--cq-metrics", type=str, help="Chain mode: JSON string from cq:latest (v4.2: prefer over --fetch-cq)")
    args = ap.parse_args()

    payload = {"mode": args.mode, "lang": args.lang}

    if args.kiba:
        try:
            payload["kiba_snapshot"] = json.loads(args.kiba)
        except json.JSONDecodeError:
            payload["kiba_snapshot"] = {}

    if args.mode in ("botnet", "chain") and args.detection:
        try:
            payload["botnet_result"] = json.loads(args.detection)
            payload["botnet_result"]["post_id"] = args.post_id or payload["botnet_result"].get("post_id", "")
        except json.JSONDecodeError:
            payload["botnet_result"] = {"post_id": args.post_id or "", "cluster_events": [], "bot_suspects": [], "initial_boost_factor": 0}

    if args.mode == "chain":
        if getattr(args, "cq_metrics", None):
            try:
                payload["cq_metrics"] = json.loads(args.cq_metrics)
            except json.JSONDecodeError:
                payload["cq_metrics"] = None
        if payload.get("cq_metrics") is None and getattr(args, "fetch_cq", False):
            from kiba_chain_integration import fetch_cq_btc
            payload["cq_metrics"] = fetch_cq_btc()

    from buzzweave_engine import build_structured_post

    result = build_structured_post(payload)
    # detection_result 等の巨大オブジェクトは visual_payload に含まれる可能性がある。シリアライズする。
    # visual_payload が detection_result 全体だと大きいので、必要なら縮小
    if result.get("visual_payload") and isinstance(result["visual_payload"], dict):
        vp = result["visual_payload"]
        if "cluster_events" in vp or "bot_suspects" in vp:
            result["visual_payload"] = {
                "summary": vp.get("summary"),
                "initial_boost_factor": vp.get("initial_boost_factor"),
                "raid_detected": vp.get("raid_detected"),
                "burst_factor_v42": vp.get("burst_factor_v42"),
                "botnet_cluster_id": vp.get("botnet_cluster_id"),
                "botnet_density": vp.get("botnet_density"),
                "botnet_coherence_score": vp.get("botnet_coherence_score"),
            }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
