#!/usr/bin/env python3
"""
Telegram ターゲットリスト抽出（Telethon）
- 5フィルタ: 権限 / アクティブ時間 / Bioキーワード / Username有無 / ボット排除
- 三層分類: Admin, KOL, ActiveMember
- 出力: JSON（Node で KV 投入・目視用 API 用）、オプションで CSV

使い方:
  pip install -r requirements.txt
  cp .env.example .env   # API_ID, API_HASH, PHONE を設定
  cp groups.txt.example groups.txt   # 1行: group_ref または group_ref\\t言語コード
  python scrape_members.py [--output ../../data/telegram-scout-targets.json]
  python scrape_members.py --all-members --max-per-group 300 --output out.json  # KOL/Active も抽出
初回はログイン用のコード入力が求められます。
"""
import os
import re
import json
import csv
import argparse
import asyncio
from pathlib import Path

from telethon import TelegramClient, errors
from telethon.tl.types import (
    ChannelParticipantsAdmins,
    UserStatusOnline,
    UserStatusRecently,
)
from telethon.tl.functions.users import GetFullUserRequest

SESSION_NAME = os.environ.get("SESSION_NAME", "telegram_scout_session")
API_ID = int(os.environ.get("API_ID", "0"))
API_HASH = os.environ.get("API_HASH", "")

# ----- 10カ国統合ビジネスキーワード（Bio で KOL 判定） -----
BUSINESS_KEYWORDS = [
    # 英語・共通 (IN, NG, UAE 等)
    "business", "promo", "collab", "marketing", "contact", "manager", "admin", "owner",
    "official", "ads", "paid", "partnership", "dm me", "inquiry", "youtube", "twitter",
    "x.com", "instagram", "vip", "promo", "collaboration",
    # 日本 (JP)
    "ビジネス", "案件", "dm開放", "問い合わせ", "公式", "副業", "宣伝",
    # 韓国 (KO)
    "비즈니스", "문의", "협업", "광고", "제휴", "오픈카톡", "공식",
    # ベトナム (VN)
    "hợp tác", "công việc", "liên hệ", "quảng cáo", "chính thức",
    # アラブ (AR)
    "للإعلان", "للتواصل", "تسويق", "رسمي", "تعاون", "مدير", "تنسيق",
    # ポルトガル語 (PT)
    "parcerias", "divulgação", "anúncios", "comercial", "dono", "equipe", "adm",
    # スペイン語 (ES)
    "publicidad", "negocios", "contacto", "promoción", "dueño", "colaboraciones",
    "gestión", "oficial", "inversión", "chamba", "info aquí",
]

# 除外ワード（Bio に含まれる場合はリストから除外）
EXCLUSION_KEYWORDS = [
    "scam", "free btc", "airdrop hunter", "no dm", "don't message me", "don't dm",
    "개인적인", "solo personal", "personal only", "no business",
]

# Bio 内 URL パターン（KOL 判定の補助）
BIO_URL_PATTERN = re.compile(
    r"https?://(t\.me/|twitter\.com|x\.com|youtube\.com|instagram\.com)",
    re.I,
)
# 外部SNSリンク（t.me 以外）→ 無条件で KOL 格上げ（媒体持ち＝拡散力あり）
EXTERNAL_SNS_URL_PATTERN = re.compile(
    r"https?://(?!t\.me)(twitter\.com|x\.com|youtube\.com|instagram\.com)[^\s]*",
    re.I,
)


def load_groups(path: str):
    """groups.txt を読む。1行 = group_ref または group_ref\\t言語コード"""
    with open(path, "r", encoding="utf-8") as f:
        rows = []
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("\t")
            group_ref = parts[0].strip()
            language = (parts[1].strip() if len(parts) > 1 else "") or ""
            rows.append((group_ref, language))
        return rows


def parse_group_id(s: str):
    s = s.strip()
    if re.match(r"^-?\d+$", s):
        return int(s)
    if s.startswith("https://t.me/"):
        s = s.replace("https://t.me/", "").split("?")[0]
    if s.startswith("joinchat/"):
        return s
    return s.lstrip("@")


def is_recently_online(user) -> bool:
    """UserStatusOnline または UserStatusRecently か"""
    if not getattr(user, "status", None):
        return False
    return isinstance(user.status, (UserStatusOnline, UserStatusRecently))


def bio_has_exclusion(bio: str) -> bool:
    if not bio:
        return False
    lower = bio.lower()
    return any(kw in lower for kw in EXCLUSION_KEYWORDS)


def bio_is_kol(bio: str) -> bool:
    """ビジネスキーワードまたは SNS URL があれば KOL とみなす。外部SNS（t.me以外）はリンク優先で無条件KOL。"""
    if not bio:
        return False
    # リンク優先: YouTube/X/Instagram 等の媒体持ちは無条件で KOL
    if EXTERNAL_SNS_URL_PATTERN.search(bio):
        return True
    lower = bio.lower()
    if any(kw in lower for kw in BUSINESS_KEYWORDS):
        return True
    if BIO_URL_PATTERN.search(bio):
        return True
    return False


async def get_full_user_with_retry(client, user, delay: float = 0.4):
    """
    GetFullUser を実行。FloodWaitError 時は指定秒数待ってリトライ。
    Returns (about_text or None). 取得失敗時は None を返す。
    """
    while True:
        try:
            full = await client(GetFullUserRequest(user))
            about = getattr(getattr(full, "full_user", None), "about", None) or ""
            return (about or "").strip() or None
        except errors.FloodWaitError as e:
            sec = getattr(e, "seconds", getattr(e, "value", 60))
            print(f"  [FloodWait] Waiting {sec}s...")
            await asyncio.sleep(max(sec, 1))
        except Exception:
            return None
        # 成功時は delay をここでは入れない（呼び出し側で asyncio.sleep）


def build_record(
    user, category: str, group_name, group_id, group_ref: str, language: str, bio_snippet: str,
    group_last_active: str | None = None,
):
    role = "admin" if category == "Admin" else "member"
    rec = {
        "user_id": user.id,
        "username": (user.username or "").strip() or None,
        "first_name": (getattr(user, "first_name", None) or "").strip() or None,
        "last_name": (getattr(user, "last_name", None) or "").strip() or None,
        "category": category,
        "role": role,
        "group_name": group_name,
        "group_id": group_id,
        "group_ref": group_ref,
        "language": language,
        "bio_snippet": (bio_snippet or "")[:200] if bio_snippet else None,
    }
    if group_last_active is not None:
        rec["group_last_active"] = group_last_active
    return rec


def _cap_reached(cap_per_lang, lang_counts: dict, language: str, category: str) -> bool:
    """言語別・レイヤー別キャップに達していれば True。cap_per_lang は (Admin, KOL, ActiveMember) の最大数。"""
    if not cap_per_lang or not language:
        return False
    admin_cap, kol_cap, active_cap = cap_per_lang
    caps = {"Admin": admin_cap, "KOL": kol_cap, "ActiveMember": active_cap}
    cap = caps.get(category, 0)
    if cap <= 0:
        return False
    counts = lang_counts.setdefault(language, {"Admin": 0, "KOL": 0, "ActiveMember": 0})
    return (counts.get(category, 0) or 0) >= cap


async def run(
    client: TelegramClient,
    groups_file: str,
    output_path: str,
    admins_only: bool,
    require_username: bool = True,
    require_recent_for_non_admin: bool = True,
    max_per_group: int = 500,
    csv_path: str | None = None,
    delay_full_user: float = 0.4,
    cap_per_lang: tuple | None = None,
):
    groups = load_groups(groups_file)
    if not groups:
        print("No groups in", groups_file)
        return

    seen_user_ids = set()
    out_list = []
    lang_counts = {}

    for group_ref, language in groups:
        gid = parse_group_id(group_ref)
        try:
            entity = await client.get_entity(gid)
        except Exception as e:
            print(f"Skip (cannot get entity): {group_ref} - {e}")
            continue

        group_name = getattr(entity, "title", None) or str(gid)
        group_id = getattr(entity, "id", None) or gid

        group_last_active = None
        try:
            async for msg in client.iter_messages(entity, limit=1):
                if getattr(msg, "date", None):
                    group_last_active = msg.date.isoformat()
                break
        except Exception:
            pass

        if admins_only:
            # 管理層のみ: Admin/Owner
            filter_type = ChannelParticipantsAdmins()
            count = 0
            try:
                async for user in client.iter_participants(entity, filter=filter_type):
                    if getattr(user, "bot", False):
                        continue
                    if require_username and not (user.username and user.username.strip()):
                        continue
                    if user.id in seen_user_ids:
                        continue
                    seen_user_ids.add(user.id)
                    if cap_per_lang and _cap_reached(cap_per_lang, lang_counts, language, "Admin"):
                        continue
                    bio_snippet = await get_full_user_with_retry(client, user, delay_full_user)
                    await asyncio.sleep(delay_full_user)
                    if bio_snippet and bio_has_exclusion(bio_snippet):
                        continue
                    out_list.append(
                        build_record(
                            user, "Admin", group_name, group_id, group_ref, language, bio_snippet,
                            group_last_active=group_last_active,
                        )
                    )
                    lang_counts.setdefault(language, {"Admin": 0, "KOL": 0, "ActiveMember": 0})["Admin"] = lang_counts[language]["Admin"] + 1
                    count += 1
                    if count >= max_per_group:
                        break
            except Exception as e:
                print(f"Skip (get participants): {group_name} - {e}")
                continue
            print(f"OK: {group_name} -> {count} (admins)")
        else:
            # 全員から三層分類: まず Admin 一覧を取得
            admin_ids = set()
            try:
                async for user in client.iter_participants(entity, filter=ChannelParticipantsAdmins()):
                    admin_ids.add(user.id)
            except Exception as e:
                print(f"Skip (get admins): {group_name} - {e}")
                continue

            count = 0
            try:
                async for user in client.iter_participants(entity):
                    if getattr(user, "bot", False):
                        continue
                    if require_username and not (user.username and user.username.strip()):
                        continue
                    if user.id in seen_user_ids:
                        continue
                    if require_recent_for_non_admin and user.id not in admin_ids:
                        if not is_recently_online(user):
                            continue
                    seen_user_ids.add(user.id)
                    category = "Admin" if user.id in admin_ids else None
                    bio_snippet = await get_full_user_with_retry(client, user, delay_full_user)
                    await asyncio.sleep(delay_full_user)
                    if bio_snippet and bio_has_exclusion(bio_snippet):
                        seen_user_ids.discard(user.id)
                        continue
                    if category is None:
                        category = "KOL" if bio_is_kol(bio_snippet or "") else "ActiveMember"
                    if cap_per_lang and _cap_reached(cap_per_lang, lang_counts, language, category):
                        continue
                    out_list.append(
                        build_record(
                            user, category, group_name, group_id, group_ref, language, bio_snippet,
                            group_last_active=group_last_active,
                        )
                    )
                    lang_counts.setdefault(language, {"Admin": 0, "KOL": 0, "ActiveMember": 0})[category] = lang_counts[language][category] + 1
                    count += 1
                    if count >= max_per_group:
                        break
            except Exception as e:
                print(f"Skip (get participants): {group_name} - {e}")
                continue
            print(f"OK: {group_name} -> {count} (all tiers)")

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(out_list, f, ensure_ascii=False, indent=2)
    print(f"Written {len(out_list)} targets to {output_path}")

    if csv_path:
        Path(csv_path).parent.mkdir(parents=True, exist_ok=True)
        with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(["UserID", "Username", "Name", "Category", "Language", "Bio (Snippet)", "SourceGroup"])
            for t in out_list:
                name = " ".join(filter(None, [t.get("first_name"), t.get("last_name") or ""]))
                w.writerow([
                    t.get("user_id"),
                    t.get("username") or "",
                    name,
                    t.get("category") or "",
                    t.get("language") or "",
                    (t.get("bio_snippet") or "")[:300],
                    t.get("group_name") or "",
                ])
        print(f"Written CSV to {csv_path}")


async def main_async(args, cap_per_lang: tuple | None = None):
    if not API_ID or not API_HASH:
        print("Set API_ID and API_HASH in .env or environment")
        return
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start(phone=lambda: os.environ.get("PHONE", input("Phone: ")))
    await run(
        client,
        args.groups,
        args.output,
        admins_only=not args.all_members,
        require_username=not args.allow_no_username,
        require_recent_for_non_admin=not args.include_inactive,
        max_per_group=args.max_per_group,
        csv_path=args.csv,
        delay_full_user=args.delay,
        cap_per_lang=cap_per_lang,
    )
    await client.disconnect()


def main():
    parser = argparse.ArgumentParser(description="Telegram group targets scraper (Admin/KOL/Active)")
    parser.add_argument("--output", default="../../data/telegram-scout-targets.json", help="Output JSON path")
    parser.add_argument("--groups", default="groups.txt", help="Path to groups.txt (group_ref or group_ref\\tlang)")
    parser.add_argument("--all-members", action="store_true", help="Export all tiers (Admin + KOL + ActiveMember)")
    parser.add_argument("--allow-no-username", action="store_true", help="Include users without @username")
    parser.add_argument("--include-inactive", action="store_true", help="Include users not recently online (non-admin)")
    parser.add_argument("--max-per-group", type=int, default=500, help="Max targets per group (default 500)")
    parser.add_argument("--csv", default=None, help="Also write CSV to this path")
    parser.add_argument("--delay", type=float, default=0.4, help="Seconds between GetFullUser calls (default 0.4)")
    parser.add_argument(
        "--cap-per-lang",
        default=None,
        metavar="ADMIN,KOL,ACTIVE",
        help="Per-language cap e.g. 5,5,10 => 50 Admin + 50 KOL + 100 Active across 10 langs (200 total)",
    )
    args = parser.parse_args()
    cap_per_lang = None
    if args.cap_per_lang:
        parts = [p.strip() for p in args.cap_per_lang.split(",")]
        if len(parts) == 3:
            try:
                cap_per_lang = (int(parts[0]), int(parts[1]), int(parts[2]))
            except ValueError:
                pass
        if cap_per_lang is None:
            print("Warning: --cap-per-lang must be 3 integers e.g. 5,5,10")
    asyncio.run(main_async(args, cap_per_lang=cap_per_lang))


if __name__ == "__main__":
    main()
