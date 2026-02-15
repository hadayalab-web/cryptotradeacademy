#!/usr/bin/env python3
"""v4.2 chain mode テスト"""
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from buzzweave_engine import build_structured_post
from kiba_chain_integration import kiba_chain_fusion

# CHAIN_RAID 発火: burst>=30, oi_spike, trap_score>0.8
detection = {
    "post_id": "t1",
    "initial_boost_factor": 50,
    "burst_factor_v42": 55,
    "cluster_events": [],
    "bot_suspects": [],
}
cq_metrics = {"oi_spike": True, "whale_inflow": True, "long_short_ratio": 2.0}
fusion = kiba_chain_fusion(detection, cq_metrics)
assert fusion["psychology_tag"] == "CHAIN_RAID", f"expected CHAIN_RAID got {fusion['psychology_tag']}"

# BOTNET: burst が足りない
detection_low = {"initial_boost_factor": 10, "burst_factor_v42": 15}
fusion_low = kiba_chain_fusion(detection_low, cq_metrics)
assert fusion_low["psychology_tag"] == "BOTNET", f"expected BOTNET got {fusion_low['psychology_tag']}"

# payload で build_structured_post
payload = {"mode": "chain", "lang": "en", "botnet_result": detection, "cq_metrics": cq_metrics}
result = build_structured_post(payload)
assert result.get("psychology_tag") == "CHAIN_RAID"
assert result.get("cq_timestamp") is None  # cq_metrics に timestamp なし
payload["cq_metrics"] = {**cq_metrics, "timestamp": 1234567890}
result2 = build_structured_post(payload)
assert result2.get("cq_timestamp") == 1234567890

print("OK: v4.2 chain mode tests passed")
