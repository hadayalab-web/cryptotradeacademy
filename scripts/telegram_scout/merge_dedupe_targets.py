#!/usr/bin/env python3
"""
複数の telegram-scout-targets.csv をマージし、UserID で重複除去する。
使い方:
  python merge_dedupe_targets.py targets1.csv targets2.csv -o merged.csv
  python merge_dedupe_targets.py targets.csv -o targets_unique.csv   # 1ファイルなら重複除去のみ
"""
import csv
import argparse
from pathlib import Path
from datetime import date


def main():
    parser = argparse.ArgumentParser(description="Merge scout target CSVs and dedupe by UserID")
    parser.add_argument("csvs", nargs="+", help="Input CSV paths (telegram-scout-targets format)")
    parser.add_argument("-o", "--output", required=True, help="Output CSV path")
    parser.add_argument("--with-date", action="store_true", help="Append YYYYMMDD to output filename before .csv")
    args = parser.parse_args()

    seen_ids = set()
    rows = []
    header = None

    for path in args.csvs:
        p = Path(path)
        if not p.exists():
            print(f"Skip (not found): {path}")
            continue
        with open(p, encoding="utf-8-sig", newline="") as f:
            r = csv.DictReader(f)
            if header is None:
                header = r.fieldnames
            for row in r:
                uid = row.get("UserID", "").strip()
                if not uid or uid in seen_ids:
                    continue
                seen_ids.add(uid)
                rows.append(row)

    out = Path(args.output)
    if getattr(args, "with_date", False) and out.suffix.lower() == ".csv":
        out = out.with_stem(f"{out.stem}-{date.today():%Y%m%d}")
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header or ["UserID", "Username", "Name", "Category", "Language", "Bio (Snippet)", "SourceGroup"])
        w.writeheader()
        w.writerows(rows)

    print(f"Written {len(rows)} unique targets to {out} (total rows before dedupe: sum of input files)")


if __name__ == "__main__":
    main()
