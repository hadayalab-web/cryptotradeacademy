#!/usr/bin/env python3
"""data/groups.txt（group_ref\\t言語）を CSV に変換する。"""
import argparse
import csv
from pathlib import Path

def main():
    p = argparse.ArgumentParser(description="Convert groups.txt to groups.csv")
    p.add_argument("--input", default="../../data/groups.txt", help="Input groups.txt path")
    p.add_argument("--output", default="../../data/groups.csv", help="Output CSV path")
    args = p.parse_args()

    inp = Path(args.input)
    out = Path(args.output)
    if not inp.exists():
        print(f"Not found: {inp}")
        return 1

    rows = []
    with open(inp, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("\t", 1) if "\t" in line else line.split(",", 1)
            ref = (parts[0] or "").strip()
            lang = (parts[1].strip() if len(parts) > 1 else "") or ""
            if ref:
                rows.append((ref, lang))

    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["group_ref", "language"])
        w.writerows(rows)
    print(f"Written {len(rows)} rows -> {out}")
    return 0

if __name__ == "__main__":
    exit(main())
