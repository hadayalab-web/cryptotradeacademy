#!/usr/bin/env python3
"""
telegram-scout-discovered-links.txt を data/groups.txt にマージ（重複除去）。
Deep Message Scanner で拾った t.me リンクを「二次スキャン」用に groups に投入する。

使い方:
  cd scripts/telegram_scout
  python merge_discovered_links.py
  python merge_discovered_links.py --links ../../data/telegram-scout-discovered-links.txt --groups ../../data/groups.txt --lang pt
"""
import argparse
import re
from pathlib import Path


def norm_ref(s: str) -> str:
    s = (s or "").strip().lower()
    for prefix in ("https://t.me/", "http://t.me/", "t.me/"):
        if s.startswith(prefix):
            s = s[len(prefix) :].split("?")[0].strip()
            break
    return s.lstrip("@") or s


def main():
    parser = argparse.ArgumentParser(description="Merge discovered-links.txt into groups.txt")
    parser.add_argument("--links", default="../../data/telegram-scout-discovered-links.txt", help="Discovered links file (one ref per line)")
    parser.add_argument("--groups", default="../../data/groups.txt", help="Existing groups.txt to merge into")
    parser.add_argument("--lang", default="pt", help="Language for new rows")
    args = parser.parse_args()

    base = Path(__file__).resolve().parent
    links_path = (base / args.links).resolve() if not Path(args.links).is_absolute() else Path(args.links)
    groups_path = (base / args.groups).resolve() if not Path(args.groups).is_absolute() else Path(args.groups)

    if not links_path.exists():
        print(f"Links file not found: {links_path}. Run pipeline first to populate it.")
        return 1

    lines = [ln.strip() for ln in links_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    new_refs = set()
    for ln in lines:
        ref = norm_ref(ln.split("\t")[0])
        if ref and not ref.startswith("http"):
            new_refs.add(ref)

    if not new_refs:
        print("No valid refs in links file.")
        return 0

    seen = set()
    out_lines = []
    if groups_path.exists():
        for ln in groups_path.read_text(encoding="utf-8").strip().splitlines():
            if not ln.strip():
                continue
            ref = ln.split("\t")[0].strip()
            key = norm_ref(ref)
            if key and key not in seen:
                seen.add(key)
                out_lines.append(ln if "\t" in ln else f"{ref}\t{args.lang}")
    added = 0
    for ref in sorted(new_refs):
        if ref in seen:
            continue
        seen.add(ref)
        out_lines.append(f"t.me/{ref}\t{args.lang}")
        added += 1

    groups_path.parent.mkdir(parents=True, exist_ok=True)
    groups_path.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    print(f"Merged: {len(out_lines)} groups total. Added from discovered links: {added}.")
    return 0


if __name__ == "__main__":
    exit(main())
