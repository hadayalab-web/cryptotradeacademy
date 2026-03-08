#!/usr/bin/env python3
"""
渡された URL 一覧から groups.csv を作るだけ。
使い方:
  # 1行1URL（オプションでタブまたはカンマのあとに言語）
  python urls_to_groups_csv.py --input urls.txt --output ../../data/groups.csv
  python urls_to_groups_csv.py --input urls.txt --output ../../data/groups.csv --lang pt
"""
import argparse
import csv
import re
from pathlib import Path


def normalize_ref(s: str) -> str:
    s = (s or "").strip()
    for prefix in ("https://t.me/", "http://t.me/", "t.me/"):
        if s.lower().startswith(prefix):
            s = s[len(prefix) :].split("?")[0].strip()
            break
    return s.lstrip("@") or s


def main():
    p = argparse.ArgumentParser(description="URL list -> groups.csv")
    p.add_argument("--input", "-i", default="urls.txt", help="Input file: one URL per line (optional tab or comma + lang)")
    p.add_argument("--output", "-o", default="../../data/groups.csv", help="Output groups.csv path")
    p.add_argument("--lang", default="", help="Default language if not in file (e.g. pt)")
    args = p.parse_args()

    inp = Path(args.input)
    if not inp.exists():
        print(f"Not found: {inp}")
        return 1

    seen = set()
    rows = []
    for line in inp.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t", 1) if "\t" in line else line.split(",", 1)
        raw = (parts[0] or "").strip()
        lang = (parts[1].strip() if len(parts) > 1 else "") or args.lang or ""
        ref = normalize_ref(raw)
        if not ref:
            continue
        key = (ref.lower(), lang)
        if key in seen:
            continue
        seen.add(key)
        rows.append((ref, lang))

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["group_ref", "language"])
        w.writerows(rows)
    print(f"Written {len(rows)} groups -> {out}")
    return 0


if __name__ == "__main__":
    exit(main())
