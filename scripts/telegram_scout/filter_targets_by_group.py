#!/usr/bin/env python3
"""
telegram-scout-targets.json から group_name / group_ref でフィルタし、
cross_audience.py 用のグループ別JSONを出力する。

使い方:
  python filter_targets_by_group.py ../../data/telegram-scout-targets.json "Portal do Bitcoin" -o ../../data/portal.json
  python filter_targets_by_group.py ../../data/telegram-scout-targets.json "BombCryptoChannel" --by-ref -o ../../data/bomb.json
  python filter_targets_by_group.py ../../data/telegram-scout-targets.json "Portal|Bitcoin|Signal" --regex -o ../../data/combined.json
"""
import argparse
import json
import re
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Filter targets by group_name or group_ref for cross_audience input")
    parser.add_argument("targets_json", help="Path to telegram-scout-targets.json")
    parser.add_argument("pattern", help="Group name (substring match) or group_ref. Use --regex for regex.")
    parser.add_argument("-o", "--output", required=True, help="Output JSON path")
    parser.add_argument("--by-ref", action="store_true", help="Match group_ref instead of group_name")
    parser.add_argument("--regex", action="store_true", help="Treat pattern as regex (case-insensitive)")
    args = parser.parse_args()

    path = Path(args.targets_json)
    if not path.exists():
        print(f"Not found: {path}")
        return 1
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data if isinstance(data, list) else (data.get("targets") or [])
    if not rows:
        print("No records in JSON")
        return 1

    key = "group_ref" if args.by_ref else "group_name"
    pat = args.pattern.strip()
    if args.regex:
        rx = re.compile(pat, re.IGNORECASE)
        out = [r for r in rows if isinstance(r, dict) and rx.search(str(r.get(key) or ""))]
    else:
        pat_lower = pat.lower()
        out = [r for r in rows if isinstance(r, dict) and (pat_lower in (str(r.get(key) or "").lower()))]
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Filtered: {len(out)} records -> {args.output}")
    return 0


if __name__ == "__main__":
    exit(main())
