#!/usr/bin/env python3
"""
Thunderbit 等の JSON エクスポート（検索結果URL）を groups.txt 形式に変換する。
使い方:
  python json_to_groups_txt.py path/to/export.json
  python json_to_groups_txt.py path/to/export.json --lang en --output ../../data/groups.txt
"""
import json
import re
import argparse
from pathlib import Path


def normalize_url(url: str) -> str:
    """https://t.me/s/ChannelName?before=xxx -> ChannelName"""
    if not url or not isinstance(url, str):
        return ""
    url = url.strip().split("?")[0]
    for prefix in ("https://t.me/s/", "http://t.me/s/", "https://t.me/", "http://t.me/", "t.me/s/", "t.me/"):
        if url.lower().startswith(prefix):
            url = url[len(prefix):].rstrip("/")
            break
    return url.strip() or ""


def main():
    parser = argparse.ArgumentParser(description="Convert JSON export to groups.txt format")
    parser.add_argument("json_path", help="Path to JSON file (e.g. Thunderbit export)")
    parser.add_argument("--lang", default="", help="Language code for all rows (e.g. en, pt)")
    parser.add_argument("--output", "-o", default="", help="Write to file (default: stdout)")
    args = parser.parse_args()

    path = Path(args.json_path)
    if not path.is_file():
        print(f"File not found: {path}")
        return 1

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        data = [data] if isinstance(data, dict) else []

    seen = set()
    lines = []
    for item in data:
        if not isinstance(item, dict):
            continue
        url = item.get("検索結果URL") or item.get("url") or item.get("link") or item.get("URL") or ""
        ref = normalize_url(url)
        if not ref or ref in seen:
            continue
        seen.add(ref)
        if args.lang:
            lines.append(f"t.me/{ref}\t{args.lang}")
        else:
            lines.append(f"t.me/{ref}")

    out = "\n".join(lines) + "\n"
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(out)
        print(f"Written {len(lines)} groups to {args.output}")
    else:
        print(out, end="")
    return 0


if __name__ == "__main__":
    exit(main())
