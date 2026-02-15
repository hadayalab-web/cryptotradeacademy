#!/usr/bin/env python3
"""chain モードの動作確認"""
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from buzzweave_engine import build_structured_post

detection = {
    "post_id": "test1",
    "initial_boost_factor": 85,
    "cluster_events": [{}],
    "bot_suspects": [],
    "raid_detected": False
}
payload = {"mode": "chain", "lang": "en", "botnet_result": detection}
result = build_structured_post(payload)
out = json.dumps({k: v for k, v in result.items() if k != "visual_payload"}, ensure_ascii=False, indent=2)
sys.stdout.buffer.write(out.encode("utf-8"))
