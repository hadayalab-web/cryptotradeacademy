#!/usr/bin/env python3
"""
Google Dorking 等で取得した CSV から t.me URL を抜き、groups.txt 形式に変換する。
使い方:
  python csv_to_groups_txt.py path/to/google.csv --lang pt -o ../../data/groups.txt
"""
import csv
import re
import argparse
from pathlib import Path


def normalize_url(url: str) -> str:
    """https://t.me/s/ChannelName?before=xxx -> ChannelName"""
    if not url or not isinstance(url, str):
        return ""
    url = url.strip().split("?")[0]
    for prefix in ("https://www.t.me/s/", "https://t.me/s/", "http://t.me/s/", "https://t.me/", "http://t.me/", "t.me/s/", "t.me/"):
        if url.lower().startswith(prefix):
            url = url[len(prefix):].rstrip("/")
            break
    # /ChannelName/12345 のようなパスがあればチャンネル名だけ
    if "/" in url:
        url = url.split("/")[0]
    return url.strip() or ""


def main():
    parser = argparse.ArgumentParser(description="Convert CSV export to groups.txt format")
    parser.add_argument("csv_path", help="Path to CSV file (e.g. Google/Instant Data Scraper export)")
    parser.add_argument("--lang", default="pt", help="Language code for all rows (default pt)")
    parser.add_argument("--url-column", default="", help="Column name or index (0-based) containing t.me URL (auto-detect if not set)")
    parser.add_argument("--output", "-o", default="", help="Write to file (default: stdout)")
    args = parser.parse_args()

    path = Path(args.csv_path)
    if not path.is_file():
        print(f"File not found: {path}")
        return 1

    with open(path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = list(reader)

    if not rows:
        print("CSV is empty")
        return 1

    header = rows[0]
    # t.me を含む列を探す（ヘッダー名または1行目の値で）
    url_col = None
    if args.url_column:
        try:
            url_col = int(args.url_column)
        except ValueError:
            url_col = next((i for i, h in enumerate(header) if args.url_column in (h or "")), 0)
    else:
        for i, cell in enumerate(header):
            if cell and "href" in cell.lower():
                url_col = i
                break
        if url_col is None:
            for i, cell in enumerate(rows[1] if len(rows) > 1 else header):
                if cell and "t.me" in cell:
                    url_col = i
                    break
        if url_col is None:
            url_col = 0

    seen = set()
    lines = []
    for row in rows[1:]:
        if url_col >= len(row):
            continue
        url = row[url_col].strip().strip('"')
        ref = normalize_url(url)
        if not ref or ref in seen:
            continue
        seen.add(ref)
        lines.append(f"t.me/{ref}\t{args.lang}")

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
