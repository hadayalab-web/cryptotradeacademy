#!/usr/bin/env python3
"""
グループリストの作成のみ。URL → groups.csv。グループリストからアカウント抽出は行わない。

使い方:
  cd scripts/telegram_scout
  # URL 一覧から groups.csv を作るだけ（推奨）
  python urls_to_groups_csv.py --input urls.txt --output ../../data/groups.csv --lang pt

  # シードで発見 → groups.csv を生成（抽出はしない）
  python run_pipeline.py --source seed --seed-file seed_groups.txt

  # 既存の groups.csv を確認するだけ
  python run_pipeline.py --skip-discover
"""
import os
import sys
import argparse
import subprocess
from pathlib import Path

# .env は scripts/telegram_scout/.env のみ（ルートはパースエラーでキーが死ぬため読まない）
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "../../data"))


def run(cmd: list, cwd: str = SCRIPT_DIR) -> bool:
    r = subprocess.run(cmd, cwd=cwd)
    return r.returncode == 0


def main():
    parser = argparse.ArgumentParser(description="Create group list only (discover -> groups.csv). No account extraction.")
    parser.add_argument("--source", choices=["api", "seed"], default="seed", help="Discover: api or seed")
    parser.add_argument("--seed-file", default="seed_groups.txt", help="Seed file for --source seed")
    parser.add_argument("--skip-discover", action="store_true", help="Skip discovery; use existing groups.txt")
    parser.add_argument("--groups-file", default=None, help="Path to groups list when --skip-discover (default data/groups.csv)")
    parser.add_argument("--output-dir", default=DATA_DIR)
    parser.add_argument("--cap-per-lang", default=None, metavar="A,K,M", help="Optional: cap extraction per lang (Admin,KOL,Active). Default: no cap (full list); cap is for send phase only.")
    parser.add_argument("--max-per-group", type=int, default=5, metavar="N", help="Max targets per group (default 5). 少量ずつで過密セッションを防ぐ。")
    parser.add_argument("--delay", type=float, default=15.0, help="Delay between discover requests")
    parser.add_argument("--dry-run", action="store_true", help="Print commands only, do not run (safe check)")
    parser.add_argument("--lang", default="", help="Test single language only (e.g. pt for Brazil)")
    parser.add_argument("--merge-existing", action="store_true", help="Append only new targets to existing JSON/CSV (no full overwrite)")
    parser.add_argument("--delay-between-groups", type=float, default=45.0, metavar="SEC", help="Pause between each group (default 45). 過密を防ぐ。")
    parser.add_argument("--delay-full-user", type=float, default=2.0, metavar="SEC", help="Seconds between GetFullUser (bio) per group (default 2). 過密を防ぐ。")
    parser.add_argument("--history-max-users", type=int, default=None, metavar="N", help="Max users to resolve from history in fallback (scrape default 25). Use 5–10 to avoid burst.")
    parser.add_argument("--admin-kol-only", action="store_true", help="Only Admin and KOL; skip ActiveMember (reduces API burst).")
    parser.add_argument("--max-non-admin-for-kol", type=int, default=10, metavar="N", help="With --admin-kol-only: max non-admin to check for KOL per group (default 10).")
    parser.add_argument("--kol-active-only", action="store_true", help="Output only KOL and ActiveMember; exclude Admin (DM 用).")
    parser.add_argument("--unified-member", action="store_true", help="Non-Admin → ActiveMember only (KOL も含む・単純化).")
    parser.add_argument("--history-only", action="store_true", help="Do not fetch member list; only pinned/about + message history.")
    parser.add_argument("--min-messages-in-history", type=int, default=2, metavar="N", help="Only add users with at least N messages in history (default 2).")
    parser.add_argument("--max-groups", type=int, default=20, metavar="N", help="Groups per run (default 20). 0 = no limit (run to completion).")
    parser.add_argument("--max-consecutive-skips", type=int, default=0, metavar="N", help="Stop after N consecutive skips (default 0 = never stop).")
    args = parser.parse_args()

    # グループリストからアカウント抽出は行わない（リスト作成のみ）

    groups_txt = args.groups_file or os.path.join(args.output_dir, "groups.csv")

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
        if args.lang:
            discover_cmd += ["--lang", args.lang]
        print("Discover groups...")
        if args.dry_run:
            print("  ", " ".join(discover_cmd))
        elif not run(discover_cmd):
            print("Discover failed.")
            sys.exit(1)
    else:
        if not os.path.isfile(groups_txt):
            print(f"Groups file not found: {groups_txt}")
            sys.exit(1)
        print("Skip discover; using", groups_txt)

    print("Done. Group list ->", groups_txt)
    print("(Account extraction from group list is disabled. Use urls_to_groups_csv.py to create the list from your URLs.)")


if __name__ == "__main__":
    main()
