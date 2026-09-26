"""
Run Bait & BotNet Pipeline (CQS Architecture).
Declarative unidirectional pipeline:
  [Adapter: fetch] -> [Query: detect_all] -> [Contract: partition/validate] -> [Command: export]

Failed records are isolated into `rejected.jsonl`, valid records are exported to `detections.jsonl`.
BAN-04 compliant: no subjective vocabulary in keys or text.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any, Dict, List, Mapping, Optional, Tuple

import hadayalab_contract as contract
from hadayalab_contract import Envelope
import botnet_detector

# Ensure UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

_ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DETECTIONS_PATH = os.path.join(_ROOT, "detections.jsonl")
DEFAULT_REJECTED_PATH = os.path.join(_ROOT, "rejected.jsonl")


# ============================================================================
# 1. Adapter: fetch
# ============================================================================

def fetch_bait_feed(
    scan_influencers: bool = False,
    custom_records: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Adapter: 外部ソース・サンプルデータ・レジストリ等からパイプライン入力用レコードを取得する。
    """
    if custom_records is not None:
        return list(custom_records)

    feed_records: List[Dict[str, Any]] = []

    if scan_influencers:
        try:
            import bait_offender_registry as reg
            from btc_influencer_scanner import scan
            example_accounts = [
                {
                    "account": "@crypto_whale_btc",
                    "followers": 450_000,
                    "engagement_velocity": 1200,
                    "post_timestamps": [1000.0, 2000.0, 3000.0],
                    "btc_correlation_1_15min": 0.52,
                    "btc_correlation_n": 5,
                    "region": "",
                    "is_crypto": True,
                    "is_meme": False,
                    "narrative_keywords": ["surge", "accumulate", "expansion"],
                    "market_correlation_note": "Posts precede 0.1-0.3% moves",
                },
                {
                    "account": "@kr_trader",
                    "followers": 180_000,
                    "engagement_velocity": 800,
                    "btc_correlation_1_15min": 0.41,
                    "btc_correlation_n": 4,
                    "region": "KR",
                    "is_crypto": False,
                    "is_meme": False,
                    "narrative_keywords": ["bitcoin", "up"],
                    "market_correlation_note": "KR session volatility",
                },
                {
                    "account": "@meme_pump",
                    "followers": 320_000,
                    "engagement_velocity": 2500,
                    "post_timestamps": [1000.0, 1060.0, 1120.0],
                    "btc_correlation_1_15min": 0.38,
                    "btc_correlation_n": 6,
                    "region": "",
                    "is_crypto": False,
                    "is_meme": True,
                    "narrative_keywords": ["surge", "100x", "breakout"],
                    "market_correlation_note": "High engagement volatility spikes",
                },
            ]
            scan_result = scan(example_accounts)
            reg.merge_new_scan_results(scan_result)
        except Exception:
            pass

    # デフォルトの検証用・実稼働用エンゲージメントレコード群
    feed_records = [
        {
            "post_id": "feed_post_alpha_001",
            "timestamp": "2026-09-26T03:00:00Z",
            "asset_class": "crypto",
            "account_metadata": {
                "bot_alpha_1": {"account_age_days": 10, "follower_follow_ratio": 0.05},
                "bot_alpha_2": {"account_age_days": 12, "follower_follow_ratio": 0.02},
            },
            "engagement_events": [
                {"account": "bot_alpha_1", "type": "rt", "timestamp": "2026-09-26T03:00:01Z"},
                {"account": "bot_alpha_2", "type": "like", "timestamp": "2026-09-26T03:00:01Z"},
                {"account": "bot_alpha_3", "type": "rt", "timestamp": "2026-09-26T03:00:02Z"},
                {"account": "bot_alpha_4", "type": "reply", "timestamp": "2026-09-26T03:00:02Z"},
                {"account": "bot_alpha_5", "type": "rt", "timestamp": "2026-09-26T03:00:02Z"},
            ],
        },
        {
            "post_id": "feed_post_beta_002",
            "timestamp": "2026-09-26T03:10:00Z",
            "asset_class": "crypto",
            "account_metadata": {},
            "engagement_events": [
                {"account": f"raid_bot_{i}", "type": "rt", "timestamp": f"2026-09-26T03:10:0{i % 8}Z"}
                for i in range(120)
            ],
        },
        {
            "post_id": "feed_post_gamma_003",
            "timestamp": "2026-09-26T03:20:00Z",
            "asset_class": "crypto",
            "account_metadata": {},
            "engagement_events": [
                {"account": "organic_user_1", "type": "like", "timestamp": "2026-09-26T03:20:05Z"},
                {"account": "organic_user_2", "type": "reply", "timestamp": "2026-09-26T03:20:45Z"},
            ],
        },
    ]

    return feed_records


# ============================================================================
# 2. Query: detect_all
# ============================================================================

def detect_all(records: List[Dict[str, Any]]) -> List[Envelope]:
    """
    Query: 純粋関数。全入力レコードに対して決定論的検出を行い Envelope リストを生成する。
    I/O・副作用なし。
    """
    envelopes: List[Envelope] = []
    for item in records:
        post_id = str(item.get("post_id") or "")
        timestamp = str(item.get("timestamp") or "")
        events = list(item.get("engagement_events") or [])
        metadata = item.get("account_metadata")
        asset_class = item.get("asset_class")

        env = botnet_detector.detect_botnet(
            post_id=post_id,
            timestamp=timestamp,
            engagement_events=events,
            account_metadata=metadata,
            asset_class=asset_class,
        )
        envelopes.append(env)
    return envelopes


# ============================================================================
# 3. Contract: partition/validate
# ============================================================================

def partition_and_validate(
    envelopes: List[Envelope],
) -> Tuple[List[Envelope], List[Dict[str, Any]]]:
    """
    Contract 検証: 各 Envelope を hadayalab_contract.validate で検査し、
    (合格 Envelope リスト, 不合格隔離リスト) に厳格に分離する。
    不合格レコードには違反理由 errs と raw Envelope 情報を添付する。
    """
    passed: List[Envelope] = []
    rejected: List[Dict[str, Any]] = []

    for env in envelopes:
        errs = contract.validate(env)
        if not errs:
            passed.append(env)
        else:
            rejected.append({
                "contract_errors": errs,
                "envelope": env.to_dict(),
            })

    return passed, rejected


# ============================================================================
# 4. Command: export
# ============================================================================

def export_pipeline_results(
    passed: List[Envelope],
    rejected: List[Dict[str, Any]],
    detections_path: str = DEFAULT_DETECTIONS_PATH,
    rejected_path: str = DEFAULT_REJECTED_PATH,
) -> Tuple[int, int]:
    """
    Command: 結果を JSON Lines ファイルに書き出す。
    合格レコード -> detections.jsonl
    不合格レコード -> rejected.jsonl
    返り値: (合格件数, 不合格件数)
    """
    os.makedirs(os.path.dirname(os.path.abspath(detections_path)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(rejected_path)), exist_ok=True)

    with open(detections_path, "w", encoding="utf-8") as f:
        for env in passed:
            f.write(json.dumps(env.to_dict(), ensure_ascii=False) + "\n")

    with open(rejected_path, "w", encoding="utf-8") as f:
        for item in rejected:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    return len(passed), len(rejected)


# ============================================================================
# Pipeline Runner
# ============================================================================

def run_pipeline(
    scan_influencers: bool = False,
    custom_records: Optional[List[Dict[str, Any]]] = None,
    detections_path: str = DEFAULT_DETECTIONS_PATH,
    rejected_path: str = DEFAULT_REJECTED_PATH,
) -> Dict[str, Any]:
    """
    宣言的一方向パイプラインの実行:
    [Adapter: fetch] -> [Query: detect_all] -> [Contract: partition/validate] -> [Command: export]
    """
    # 1. Adapter: fetch
    raw_feed = fetch_bait_feed(scan_influencers=scan_influencers, custom_records=custom_records)

    # 2. Query: detect_all
    envelopes = detect_all(raw_feed)

    # 3. Contract: partition/validate
    passed, rejected = partition_and_validate(envelopes)

    # 4. Command: export
    n_passed, n_rejected = export_pipeline_results(
        passed,
        rejected,
        detections_path=detections_path,
        rejected_path=rejected_path,
    )

    return {
        "status": "COMPLETED",
        "contract": contract.CONTRACT_ID,
        "total_records": len(raw_feed),
        "passed_count": n_passed,
        "rejected_count": n_rejected,
        "detections_path": detections_path,
        "rejected_path": rejected_path,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run bait & botnet CQS pipeline")
    parser.add_argument("--scan", action="store_true", help="Run BTC influencer scanner and merge")
    parser.add_argument("--detections", default=DEFAULT_DETECTIONS_PATH, help="Path for detections.jsonl")
    parser.add_argument("--rejected", default=DEFAULT_REJECTED_PATH, help="Path for rejected.jsonl")
    args = parser.parse_args()

    result = run_pipeline(
        scan_influencers=args.scan,
        detections_path=args.detections,
        rejected_path=args.rejected,
    )
    # 終了ステータス
    if result["rejected_count"] > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
