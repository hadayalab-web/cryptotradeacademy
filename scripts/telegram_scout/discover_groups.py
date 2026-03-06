#!/usr/bin/env python3
"""
Telegram グループ発見（母集団の自動サンプリング）
- ステップ1: キーワードで検索するか、シードリストを検証して groups.json / groups.txt を出力
- 次のステップ: scrape_members.py が groups.txt を読んでターゲット抽出

ソース:
  api  … RapidAPI（Telegram Index API / Telegram Data API）でキーワード検索。要 RAPIDAPI_KEY または TELEGRAM_INDEX_RAPIDAPI_KEY
  seed … シードファイルを Telethon で解決し、人数・メガグループでフィルタ

使い方:
  # 全自動・給弾（RapidAPI でキーワードからグループ発掘）
  RAPIDAPI_KEY=xxx python discover_groups.py --source api --output-dir ../../data
  # Telegram Data API を使う場合: TELEGRAM_RAPIDAPI_HOST=telegram-data-api.p.rapidapi.com

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

# 精鋭7言語圏：APIがヒットしやすい「単語単位・スペースなし」に統一
# Telegram Index は「グループ名の一部一致」で探すため、長文・スペース区切りは +0 になりやすい
SEARCH_KEYWORDS = {
    "ja": ["CryptoJP", "仮想通貨", "ビットコイン", "アフィリエイト", "案件", "FX", "配信"],
    "ko": ["코인", "레퍼럴", "바이낸스", "제휴", "인플루언서", "암호화폐"],
    "vi": ["Airdrop", "Affiliate", "Crypto", "Vietnam", "Telegram", "Kèo"],
    "en": ["Affiliate", "Airdrop", "Crypto", "Referral", "KOL", "Signals"],
    "ar": ["تداول", "كريبتو", "إعلان", "شركاء", "بيتكوين"],
    "pt": ["Cripto", "Afiliados", "Divulgação", "Tráfego", "Parcerias", "Brasil", "Sinais"],
    "es": ["Cripto", "Afiliado", "Señales", "Latino", "Binance", "Trading"],
}

# 品質フィルタ（人数）
DEFAULT_MIN_MEMBERS = 500
DEFAULT_MAX_MEMBERS = 50_000

# RapidAPI ホスト（環境変数 TELEGRAM_RAPIDAPI_HOST で上書き可）
# - telegram-search-api.p.rapidapi.com … Telegram Search API（POST、キーワードでチャンネル検索）
# - telegram-index.p.rapidapi.com      … Telegram Index（/search GET）
# - telegram-index-api.p.rapidapi.com  … 別プロバイダの Index API（query, min/max_members）
# - telegram-data-api.p.rapidapi.com   … Telegram Data API（q, type）
RAPIDAPI_HOST_DEFAULT = "telegram-index-api.p.rapidapi.com"


def normalize_ref(link_or_username: str) -> str:
    s = (link_or_username or "").strip()
    if s.startswith("https://t.me/"):
        s = s.replace("https://t.me/", "").split("?")[0]
    if s.startswith("joinchat/"):
        return s
    return s.lstrip("@") or link_or_username


def _parse_members_count(val) -> int:
    """API が '97 members' や 97 で返す場合に対応。"""
    if val is None:
        return 0
    if isinstance(val, int):
        return val
    s = str(val).strip()
    if not s:
        return 0
    # "97 members" や "1,234 subscribers" などから数字だけ抽出
    m = re.search(r"[\d,]+", s)
    if not m:
        return 0
    return int(m.group(0).replace(",", ""))


def discover_via_api(
    api_key: str,
    api_host: str,
    keywords_per_lang: dict,
    min_members: int,
    max_members: int,
    delay_sec: float,
    max_per_keyword: int,
) -> list[dict]:
    """RapidAPI でキーワード検索（Telegram Index / Data / Search API 対応）。"""
    try:
        import urllib.request
    except ImportError:
        import urllib.request  # noqa

    # Telegram Search API は POST + JSON body
    use_post = "telegram-search-api" in api_host
    query_param = "q" if "telegram-data-api" in api_host else "query"
    seen = set()
    out = []
    for lang, keywords in keywords_per_lang.items():
        for kw in keywords:
            time.sleep(delay_sec)
            headers = {"X-RapidAPI-Key": api_key, "X-RapidAPI-Host": api_host}
            if use_post:
                # Telegram Search API: POST。グループのみ欲しい場合は type=group を付与（API が対応していれば）
                path = os.environ.get("TELEGRAM_RAPIDAPI_SEARCH_PATH", "").strip() or "/search_telegram_channels"
                url = "https://" + api_host + path
                post_body = {query_param: kw}
                type_filter = os.environ.get("TELEGRAM_RAPIDAPI_TYPE_FILTER", "group").strip()
                if type_filter:
                    post_body["type"] = type_filter  # group / channel / supergroup など API の仕様に合わせる
                body = json.dumps(post_body).encode("utf-8")
                headers["Content-Type"] = "application/json"
                req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            else:
                # GET /search（Telegram Index）。例では type=channel でヒットするため、group で0件なら channel も使う
                type_val = os.environ.get("TELEGRAM_RAPIDAPI_TYPE_FILTER", "").strip()
                if not type_val and "telegram-index" in api_host:
                    type_val = "channel"
                if not type_val:
                    type_val = "group"
                params = {"type": type_val, query_param: kw}
                if "telegram-index" in api_host:
                    params["page"] = 1
                    params["sort"] = os.environ.get("TELEGRAM_RAPIDAPI_SORT", "rivn").strip() or "rivn"
                if "telegram-index-api" in api_host:
                    params["min_members"] = min_members
                    params["max_members"] = max_members
                url = "https://" + api_host + "/search?" + urlencode(params)
                req = urllib.request.Request(url, headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode())
            except Exception as e:
                print(f"  Skip API query '{kw}': {e}")
                continue
            # 複数のキー・ネストに対応（results / data / channels / data.results など）
            raw = data or {}
            results = raw.get("results") or raw.get("data") or raw.get("channels") or raw.get("items") or []
            if isinstance(results, dict):
                results = results.get("results") or results.get("channels") or results.get("data") or []
            if not results and isinstance(raw.get("data"), list):
                results = raw["data"]
            # 0 件のときだけ API レスポンス構造を表示（DISCOVER_DEBUG=1 で有効）
            if not results and os.environ.get("DISCOVER_DEBUG") == "1" and lang == "ja" and kw == keywords[0]:
                print(f"  [debug] API response keys: {list((data or {}).keys())}")
                for key in ("results", "data", "channels", "items", "list"):
                    val = (data or {}).get(key)
                    if isinstance(val, list):
                        print(f"  [debug] '{key}' length={len(val)}")
                        if val and isinstance(val[0], dict):
                            print(f"  [debug] first item keys: {list(val[0].keys())}")
                    elif isinstance(val, dict):
                        print(f"  [debug] '{key}' (dict) keys: {list(val.keys())[:10]}")
            added = 0
            for i, r in enumerate(results):
                if i >= max_per_keyword:
                    break
                # 用途: グループからメンバー抽出。配信専用チャンネルは除外（type/channel_type が channel のとき）
                rtype = (r.get("type") or r.get("channel_type") or "").lower()
                if rtype in ("channel", "broadcast") and use_post:
                    continue
                link = (r.get("link") or r.get("username") or r.get("channel") or r.get("url") or "").strip()
                if not link:
                    continue
                if isinstance(link, dict):
                    link = link.get("username") or link.get("link") or str(link.get("id", ""))
                if "t.me/" not in str(link) and not str(link).startswith("@"):
                    link = "t.me/" + str(link)
                link = str(link)
                key = (link.lower(), lang)
                if key in seen:
                    continue
                members = _parse_members_count(
                    r.get("members")
                    or r.get("participants_count")
                    or r.get("members_count")
                    or r.get("subscribers")
                    or r.get("member_count")
                    or r.get("size")
                )
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
            kw_display = kw.encode("ascii", errors="replace").decode("ascii")
            print(f"  {lang} / '{kw_display}' -> +{added} groups")
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
    parser.add_argument("--lang", default="", help="Test single language only (e.g. pt for Brazil)")
    args = parser.parse_args()

    if args.source == "api":
        api_key = (
            os.environ.get("TELEGRAM_INDEX_RAPIDAPI_KEY", "").strip()
            or os.environ.get("RAPIDAPI_KEY", "").strip()
        )
        if not api_key:
            print("Set TELEGRAM_INDEX_RAPIDAPI_KEY or RAPIDAPI_KEY for --source api (RapidAPI)")
            return
        api_host = os.environ.get("TELEGRAM_RAPIDAPI_HOST", "").strip() or RAPIDAPI_HOST_DEFAULT
        keywords_subset = {args.lang: SEARCH_KEYWORDS[args.lang]} if (args.lang and args.lang in SEARCH_KEYWORDS) else SEARCH_KEYWORDS
        groups = discover_via_api(
            api_key,
            api_host,
            keywords_subset,
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
