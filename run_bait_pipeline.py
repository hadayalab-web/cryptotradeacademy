"""
Run bait offender + BTC influencer pipeline:
  1. (Optional) Run BTC influencer scanner on account data
  2. Merge results into bait_offender_registry
  3. Export for KIBA (sentiment_modifier, top_offenders, timing_signals)

Usage:
  python run_bait_pipeline.py              # merge existing registry + export for KIBA
  python run_bait_pipeline.py --scan      # run btc_influencer_scanner example, then merge + export
"""

import argparse
import json
import sys

# Ensure UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def main():
    import bait_offender_registry as reg
    parser = argparse.ArgumentParser(description="Bait offender + BTC influencer pipeline")
    parser.add_argument("--scan", action="store_true", help="Run BTC influencer scanner example and merge")
    args = parser.parse_args()

    if args.scan:
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
                "narrative_keywords": ["pump", "accumulate", "bullish"],
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
                "narrative_keywords": ["moon", "100x", "pump"],
                "market_correlation_note": "Meme-led volatility spikes",
            },
            {
                "account": "@es_influencer",
                "followers": 110_000,
                "engagement_velocity": 600,
                "btc_correlation_1_15min": 0.36,
                "btc_correlation_n": 4,
                "region": "ES",
                "is_crypto": False,
                "is_meme": False,
                "narrative_keywords": ["bitcoin", "sube", "comprar"],
                "market_correlation_note": "ES session correlation",
            },
            {
                "account": "@cn_insider",
                "followers": 200_000,
                "engagement_velocity": 900,
                "post_timestamps": [1001.0, 1002.0, 5004.0],
                "btc_correlation_1_15min": 0.42,
                "btc_correlation_n": 5,
                "region": "CN",
                "is_crypto": False,
                "is_meme": False,
                "narrative_keywords": ["pump", "bullish", "moon"],
                "market_correlation_note": "CN session; sync with @meme_pump",
            },
        ]
        scan_result = scan(example_accounts)
        reg.merge_new_scan_results(scan_result)
        print("Merged BTC influencer scan results into registry.")

    kiba = reg.export_for_kiba()
    print("--- export_for_kiba() ---")
    print(json.dumps(kiba, ensure_ascii=False, indent=2))
    print("---")
    print("Sentiment modifier:", kiba["sentiment_modifier"])
    print("Offenders in registry:", len(reg.list_offenders()))


if __name__ == "__main__":
    main()
