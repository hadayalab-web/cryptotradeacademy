#!/usr/bin/env python3
"""
Telegram グループ発見（母集団の自動サンプリング）
- ステップ1: キーワードで検索するか、シードリストを検証して groups.json / groups.txt を出力
- 次のステップ: scrape_members.py が groups.txt を読んでターゲット抽出

ソース:
  api  … 第三者API（Telegram Index 等）でキーワード検索。要 TELEGRAM_INDEX_RAPIDAPI_KEY
  seed … シードファイルを Telethon で解決し、人数・メガグループでフィルタ

使い方:
  # API で検索（RapidAPI の Telegram Index など）
  TELEGRAM_INDEX_RAPIDAPI_KEY=xxx python discover_groups.py --source api --output-dir ../../data

  # シードリストを検証（1行 = @username または t.me/xxx、任意で \\t言語）
  python discover_groups.py --source seed --seed-file seed_groups.txt --output-dir ../../data
"""
import os
import re
import json
import time
import argparse
import asyncio
from pathlib import Path
from urllib.parse import urlencode

# 10カ国キーワード（仮想通貨・トレード・信号）
# グループの「鮮度」を上げたい場合は "2026", "New" などを各言語に追加すると、
# 現在進行形で動いているグループがヒットしやすい（API 検索時）。
# 複数キーワードで同じグループがヒットしても、(link, lang) で重複排除済み。
SEARCH_KEYWORDS = {
    "ja": ["ビットコイン", "仮想通貨", "FX 配信", "クジラ", "トレード"],
    "ko": ["비트코인", "선물거래", "알트코인", "바이ナンス", "코인 시그널"],
    "vi": ["Trade Coin VN", "Kèo Crypto", "Kiếm tiền online", "Crypto Vietnam"],
    "ar": ["تداول", "عملات رقمية", "بيتكوين مباشر", "تداول عملات"],
    "en": ["Crypto Signals", "Binance Pump", "Whale Alert", "P2P Trading", "BTC signals"],
    "hi": ["Crypto India", "Bitcoin signals", "Trading group"],
    "pt": ["Sinais Cripto", "Cripto Brasil", "Binance Brasil", "Trade crypto"],
    "es": ["Señales Cripto", "Bitcoin España", "Trading Latino", "Cripto LATAM"],
    "id": ["Crypto Indonesia", "Trading crypto", "Sinyal kripto"],
    "th": ["Crypto Thailand", "Bitcoin Thai", "เทรดคริปโต"],
}

# 品質フィルタ（人数）
DEFAULT_MIN_MEMBERS = 500
DEFAULT_MAX_MEMBERS = 50_000

# Telegram Index (RapidAPI) のホスト
RAPIDAPI_HOST = "telegram-index-api.p.rapidapi.com"


def normalize_ref(link_or_username: str) -> str:
    s = (link_or_username or "").strip()
    if s.startswith("https://t.me/"):
        s = s.replace("https://t.me/", "").split("?")[0]
    if s.startswith("joinchat/"):
        return s
    return s.lstrip("@") or link_or_username


def discover_via_api(
    api_key: str,
    keywords_per_lang: dict,
    min_members: int,
    max_members: int,
    delay_sec: float,
    max_per_keyword: int,
) -> list[dict]:
    """第三者APIでキーワード検索。RapidAPI の Telegram Index 想定。"""
    try:
        import urllib.request
    except ImportError:
        import urllib.request  # noqa

    seen = set()
    out = []
    for lang, keywords in keywords_per_lang.items():
        for kw in keywords:
            time.sleep(delay_sec)
            url = (
                "https://" + RAPIDAPI_HOST + "/search?"
                + urlencode({
                    "query": kw,
                    "type": "group",
                    "min_members": min_members,
                    "max_members": max_members,
                    "page": 1,
                    "sort": "rlvn",
                })
            )
            req = urllib.request.Request(url, headers={"X-RapidAPI-Key": api_key, "X-RapidAPI-Host": RAPIDAPI_HOST})
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode())
            except Exception as e:
                print(f"  Skip API query '{kw}': {e}")
                continue
            results = (data or {}).get("results") or (data or {}).get("data") or []
            added = 0
            for i, r in enumerate(results):
                if i >= max_per_keyword:
                    break
                link = (r.get("link") or r.get("username") or "").strip()
                if not link:
                    continue
                if "t.me/" not in link and not link.startswith("@"):
                    link = "t.me/" + link
                key = (link.lower(), lang)
                if key in seen:
                    continue
                members = int(r.get("members") or r.get("participants_count") or 0)
                if not (min_members <= members <= max_members):
                    continue
                seen.add(key)
                out.append({
                    "id": r.get("id") or link,
                    "title": (r.get("title") or "").strip() or link,
                    "username": link.replace("https://t.me/", "").lstrip("@"),
                    "participants_count": members,
                    "language": lang,
                    "group_ref": normalize_ref(link),
                    "link": link if link.startswith("http") else f"https://t.me/{link}",
                })
                added += 1
            print(f"  {lang} / '{kw}' -> +{added} groups")
    return out


async def discover_via_seed(
    client,
    seed_path: str,
    min_members: int,
    max_members: int,
    delay_sec: float,
) -> list[dict]:
    """シードファイルを読み、Telethon で解決・GetFullChannel/GetFullChat で人数取得しフィルタ。"""
    from telethon.tl.functions.channels import GetFullChannelRequest
    from telethon.tl.functions.messages import GetFullChatRequest

    with open(seed_path, "r", encoding="utf-8") as f:
        lines = [l.strip() for l in f if l.strip() and not l.strip().startswith("#")]

    out = []
    for line in lines:
        parts = line.split("\t")
        ref = normalize_ref(parts[0])
        lang = (parts[1].strip() if len(parts) > 1 else "") or ""

        try:
            entity = await client.get_entity(ref)
        except Exception as e:
            print(f"  Skip (entity): {ref} - {e}")
            await asyncio.sleep(delay_sec)
            continue

        # ブロードキャストチャンネルは除外（グループのみ欲しい場合）
        if getattr(entity, "broadcast", False):
            print(f"  Skip (broadcast channel): {ref}")
            await asyncio.sleep(delay_sec)
            continue

        try:
            try:
                full = await client(GetFullChannelRequest(entity))
            except Exception:
                # 基本グループ（Chat）の場合は GetFullChat
                full = await client(GetFullChatRequest(getattr(entity, "id", 0)))
            count = getattr(getattr(full, "full_chat", None), "participants_count", None) or 0
        except Exception as e:
            print(f"  Skip (full): {ref} - {e}")
            await asyncio.sleep(delay_sec)
            continue

        if not (min_members <= count <= max_members):
            print(f"  Skip (size {count}): {ref}")
            await asyncio.sleep(delay_sec)
            continue

        title = getattr(entity, "title", None) or ref
        username = getattr(entity, "username", None) or ""
        group_ref = username or str(entity.id)
        out.append({
            "id": entity.id,
            "title": title,
            "username": group_ref,
            "participants_count": count,
            "language": lang,
            "group_ref": group_ref,
            "link": f"https://t.me/{group_ref}" if group_ref and not str(group_ref).startswith("-") else "",
        })
        print(f"  OK: {title} ({count}) [{lang or '?'}]")
        await asyncio.sleep(delay_sec)

    return out


def write_output(groups: list[dict], output_dir: str, groups_json: str, groups_txt: str):
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    json_path = os.path.join(output_dir, groups_json)
    txt_path = os.path.join(output_dir, groups_txt)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(groups, f, ensure_ascii=False, indent=2)
    print(f"Written {len(groups)} groups to {json_path}")

    with open(txt_path, "w", encoding="utf-8") as f:
        for g in groups:
            ref = g.get("group_ref") or g.get("username") or str(g.get("id", ""))
            lang = g.get("language") or ""
            f.write(f"{ref}\t{lang}\n")
    print(f"Written {txt_path} (for scrape_members.py --groups)")


def main():
    parser = argparse.ArgumentParser(description="Discover Telegram groups (API or seed)")
    parser.add_argument("--source", choices=["api", "seed"], default="seed", help="api = Telegram Index API, seed = validate seed file with Telethon")
    parser.add_argument("--seed-file", default="seed_groups.txt", help="Path to seed file (one group per line, optional tab + lang)")
    parser.add_argument("--output-dir", default="../../data", help="Directory for groups.json and groups.txt")
    parser.add_argument("--groups-json", default="groups.json", help="Output JSON filename")
    parser.add_argument("--groups-txt", default="groups.txt", help="Output groups.txt filename (for scraper)")
    parser.add_argument("--min-members", type=int, default=DEFAULT_MIN_MEMBERS)
    parser.add_argument("--max-members", type=int, default=DEFAULT_MAX_MEMBERS)
    parser.add_argument("--delay", type=float, default=15.0, help="Seconds between API requests or between seed validations")
    parser.add_argument("--max-per-keyword", type=int, default=20, help="Max groups per keyword (api source)")
    args = parser.parse_args()

    if args.source == "api":
        api_key = os.environ.get("TELEGRAM_INDEX_RAPIDAPI_KEY", "").strip()
        if not api_key:
            print("Set TELEGRAM_INDEX_RAPIDAPI_KEY for --source api (RapidAPI Telegram Index)")
            return
        groups = discover_via_api(
            api_key,
            SEARCH_KEYWORDS,
            args.min_members,
            args.max_members,
            args.delay,
            args.max_per_keyword,
        )
        write_output(groups, args.output_dir, args.groups_json, args.groups_txt)
        return

    # seed: Telethon
    api_id = int(os.environ.get("API_ID", "0"))
    api_hash = os.environ.get("API_HASH", "")
    if not api_id or not api_hash:
        print("Set API_ID and API_HASH in .env for --source seed")
        return
    if not os.path.isfile(args.seed_file):
        print(f"Seed file not found: {args.seed_file}")
        print("Create it with one group per line: @username or https://t.me/xxx, optional tab + lang (en, ja, ko, ...)")
        return

    from telethon import TelegramClient
    session = os.environ.get("SESSION_NAME", "telegram_scout_session")

    async def run_seed():
        client = TelegramClient(session, api_id, api_hash)
        await client.start(phone=lambda: os.environ.get("PHONE", input("Phone: ")))
        groups = await discover_via_seed(
            client,
            args.seed_file,
            args.min_members,
            args.max_members,
            args.delay,
        )
        await client.disconnect()
        return groups

    groups = asyncio.run(run_seed())
    write_output(groups, args.output_dir, args.groups_json, args.groups_txt)


if __name__ == "__main__":
    main()
