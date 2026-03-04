#!/usr/bin/env python3
"""
発見 → 抽出 → 分類 を一括実行（顧客獲得エンジン）
1. discover_groups.py で groups.json / groups.txt を生成
2. scrape_members.py で各グループから Admin/KOL/Active を抽出し targets.json を生成

使い方:
  cd scripts/telegram_scout
  # シードで発見 → 抽出（200通マトリックス）
  python run_pipeline.py --source seed --seed-file seed_groups.txt --cap-per-lang 5,5,10

  # API で発見 → 抽出（要 TELEGRAM_INDEX_RAPIDAPI_KEY）
  python run_pipeline.py --source api --cap-per-lang 5,5,10

  # 発見だけスキップ（既存 groups.txt で抽出のみ）
  python run_pipeline.py --skip-discover --groups-file ../../data/groups.txt --cap-per-lang 5,5,10
"""
import os
import sys
import argparse
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "../../data"))


def run(cmd: list, cwd: str = SCRIPT_DIR) -> bool:
    r = subprocess.run(cmd, cwd=cwd)
    return r.returncode == 0


def main():
    parser = argparse.ArgumentParser(description="Run discover -> scrape pipeline")
    parser.add_argument("--source", choices=["api", "seed"], default="seed", help="Discover: api or seed")
    parser.add_argument("--seed-file", default="seed_groups.txt", help="Seed file for --source seed")
    parser.add_argument("--skip-discover", action="store_true", help="Skip discovery; use existing groups.txt")
    parser.add_argument("--groups-file", default=None, help="Path to groups.txt when --skip-discover (default data/groups.txt)")
    parser.add_argument("--output-dir", default=DATA_DIR)
    parser.add_argument("--cap-per-lang", default="5,5,10", metavar="A,K,M", help="Per-lang cap: Admin,KOL,Active (e.g. 5,5,10 => 200 total for 10 langs)")
    parser.add_argument("--max-per-group", type=int, default=500)
    parser.add_argument("--delay", type=float, default=15.0, help="Delay between discover requests")
    parser.add_argument("--dry-run", action="store_true", help="Print commands only, do not run (safe check)")
    args = parser.parse_args()

    groups_txt = args.groups_file or os.path.join(args.output_dir, "groups.txt")
    targets_json = os.path.join(args.output_dir, "telegram-scout-targets.json")
    targets_csv = os.path.join(args.output_dir, "telegram-scout-targets.csv")

    if args.dry_run:
        print("(dry-run: no commands will be executed)\n")
    if not args.skip_discover:
        discover_cmd = [
            sys.executable,
            os.path.join(SCRIPT_DIR, "discover_groups.py"),
            "--source", args.source,
            "--output-dir", args.output_dir,
            "--delay", str(args.delay),
        ]
        if args.source == "seed":
            discover_cmd += ["--seed-file", os.path.join(SCRIPT_DIR, args.seed_file)]
        print("[1/2] Discover groups...")
        if args.dry_run:
            print("  ", " ".join(discover_cmd))
        elif not run(discover_cmd):
            print("Discover failed.")
            sys.exit(1)
    else:
        if not os.path.isfile(groups_txt):
            print(f"Groups file not found: {groups_txt}")
            sys.exit(1)
        print("[1/2] Skip discover; using", groups_txt)

    scrape_cmd = [
        sys.executable,
        os.path.join(SCRIPT_DIR, "scrape_members.py"),
        "--groups", groups_txt,
        "--all-members",
        "--cap-per-lang", args.cap_per_lang,
        "--max-per-group", str(args.max_per_group),
        "--output", targets_json,
        "--csv", targets_csv,
    ]
    print("[2/2] Scrape members (Admin/KOL/Active)...")
    if args.dry_run:
        print("  ", " ".join(scrape_cmd))
        print("\nDone (dry-run). Remove --dry-run to execute.")
        return
    if not run(scrape_cmd):
        print("Scrape failed.")
        sys.exit(1)

    print("Done. Targets:", targets_json, "| CSV:", targets_csv)


if __name__ == "__main__":
    main()
