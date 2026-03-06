#!/usr/bin/env python3
"""
2つのターゲットJSON/CSVの共通 user_id を抽出（Cross-Audience Analyzer）。
例: Binance公式とシグナル群の両方にいる「濃いユーザー」リストを出力。

使い方:
  python cross_audience.py --file-a ../../data/targets-a.json --file-b ../../data/targets-b.json --output ../../data/overlap.json
  python cross_audience.py --file-a ../../data/telegram-scout-targets.csv --file-b ../../data/other.csv --output ../../data/overlap.csv
"""
import argparse
import csv
import json
from pathlib import Path


def load_targets(path: str):
    """JSON または CSV からレコードのリストと user_id の set を返す。"""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(path)
    text = p.read_text(encoding="utf-8-sig")
    records = []
    if p.suffix.lower() == ".json":
        data = json.loads(text)
        records = data if isinstance(data, list) else (data.get("targets") or [])
    else:
        for row in csv.DictReader(text.splitlines()):
            uid = (row.get("UserID") or "").strip()
            if uid and uid.isdigit():
                row["user_id"] = int(uid)
                records.append(row)
    user_ids = set()
    for r in records:
        uid = r.get("user_id")
        if uid is None and (r.get("UserID") or "").strip().isdigit():
            uid = int(r["UserID"])
        if uid is not None:
            user_ids.add(int(uid))
    return records, user_ids


def main():
    parser = argparse.ArgumentParser(description="Extract common user_id from two target JSON/CSV files")
    parser.add_argument("--file-a", required=True, help="First JSON or CSV (e.g. telegram-scout-targets.json)")
    parser.add_argument("--file-b", required=True, help="Second JSON or CSV")
    parser.add_argument("--output", default=None, help="Output path (JSON or CSV). Default: print count and overlap IDs to stdout")
    parser.add_argument("--format", choices=["json", "csv"], default=None, help="Output format (default: infer from --output extension)")
    args = parser.parse_args()

    recs_a, ids_a = load_targets(args.file_a)
    recs_b, ids_b = load_targets(args.file_b)
    common = ids_a & ids_b
    print(f"File A: {len(recs_a)} records, {len(ids_a)} unique user_id")
    print(f"File B: {len(recs_b)} records, {len(ids_b)} unique user_id")
    print(f"Overlap: {len(common)} user_id")

    if not common:
        return
    if not args.output:
        print("Common user_id (first 20):", sorted(common)[:20])
        return

    out_path = Path(args.output)
    fmt = args.format or ("json" if out_path.suffix.lower() == ".json" else "csv")
    def uid_of(r):
        u = r.get("user_id")
        if u is not None:
            return int(u)
        if (r.get("UserID") or "").strip().isdigit():
            return int(r["UserID"])
        return None
    by_uid_a = {uid_of(r): r for r in recs_a if uid_of(r) is not None}
    overlap_records = [by_uid_a[uid] for uid in common if uid in by_uid_a]

    out_path.parent.mkdir(parents=True, exist_ok=True)
    if fmt == "json":
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(overlap_records, f, ensure_ascii=False, indent=2)
        print(f"Written {len(overlap_records)} records to {out_path}")
    else:
        if overlap_records and isinstance(overlap_records[0], dict):
            keys = list(overlap_records[0].keys())
            if "user_id" in keys and "UserID" not in keys:
                keys = ["UserID" if k == "user_id" else k for k in keys]
            with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
                w = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
                w.writeheader()
                for r in overlap_records:
                    row = dict(r)
                    if "user_id" in row and "UserID" not in row:
                        row["UserID"] = row.pop("user_id", None)
                    w.writerow(row)
        print(f"Written {len(overlap_records)} rows to {out_path}")


if __name__ == "__main__":
    main()
