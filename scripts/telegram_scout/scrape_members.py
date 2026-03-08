#!/usr/bin/env python3
"""
Telegram ターゲットリスト抽出（Telethon）
- 5フィルタ: 権限 / アクティブ時間 / Bioキーワード / Username有無 / ボット排除
- 三層分類: Admin, KOL, ActiveMember
- 出力: JSON（Node で KV 投入・目視用 API 用）、オプションで CSV
- **フォールバック:** メンバー一覧が非表示のグループでは、`--fallback-from-history` で「直近メッセージの発言者」から抽出（KOL/ActiveMember のみ。Admin は判定不可）。

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
import sqlite3
import argparse
import asyncio
import time
from datetime import datetime
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


def _normalize_group_ref(s: str) -> str:
    """URL や @ を group_ref に正規化（t.me/xxx または joinchat/xxx）。"""
    s = (s or "").strip()
    if not s:
        return s
    for prefix in ("https://t.me/", "http://t.me/", "t.me/"):
        if s.lower().startswith(prefix):
            s = s[len(prefix):].split("?")[0].strip()
            break
    return s.lstrip("@") or s


def load_groups(path: str):
    """groups.csv または groups.txt を読む。CSV はヘッダー行 group_ref,language。TXT は group_ref\\t言語。重複は排除。"""
    path = Path(path)
    if not path.exists():
        return []
    seen = set()
    rows = []
    if path.suffix.lower() == ".csv":
        with open(path, "r", encoding="utf-8-sig") as f:
            r = csv.reader(f)
            try:
                header = next(r)
            except StopIteration:
                return []
            # group_ref, language の列インデックス（ヘッダーで判定）
            col_ref, col_lang = 0, 1
            if header and len(header) >= 2:
                h = [s.strip().lower() for s in header]
                if "group_ref" in h:
                    col_ref = h.index("group_ref")
                if "language" in h:
                    col_lang = h.index("language")
            for row in r:
                if len(row) <= max(col_ref, col_lang):
                    continue
                raw_ref = (row[col_ref] or "").strip()
                language = (row[col_lang] or "").strip() if col_lang < len(row) else ""
                group_ref = _normalize_group_ref(raw_ref)
                if not group_ref:
                    continue
                key = (group_ref.lower(), language)
                if key in seen:
                    continue
                seen.add(key)
                rows.append((group_ref, language))
        return rows
    # .txt: 1行 = group_ref または group_ref\t言語 または group_ref,言語
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("\t") if "\t" in line else line.split(",", 1)
            raw_ref = parts[0].strip()
            language = (parts[1].strip() if len(parts) > 1 else "") or ""
            group_ref = _normalize_group_ref(raw_ref)
            if not group_ref:
                continue
            key = (group_ref.lower(), language)
            if key in seen:
                continue
            seen.add(key)
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


async def _get_entity_with_flood_wait(client, gid, max_wait_sec: int = 600):
    """
    get_entity を実行。FloodWait 時は max_wait_sec 以下なら待ってリトライ。
    必要待機が max 超の場合は待たずに即 raise（呼び出し側でスキップ→進捗保存→後で再実行）。
    """
    while True:
        try:
            return await client.get_entity(gid)
        except errors.FloodWaitError as e:
            sec = getattr(e, "seconds", getattr(e, "value", 60))
            if sec > max_wait_sec:
                raise
            print(f"  [FloodWait get_entity] Waiting {sec}s...")
            await asyncio.sleep(sec)


async def _admin_hunter(
    client, entity, group_name, group_id, group_ref: str, language: str,
    seen_user_ids: set, out_list: list, lang_counts: dict,
    require_username: bool, cap_per_lang: tuple | None, delay_full_user: float,
    group_last_active: str | None,
    kol_active_only: bool = False,
) -> int:
    """
    メンバー一覧が取れないグループ向け: GetFullChannel/GetFullChat で
    1) 固定メッセージの送信者 2) グループ説明文の @username を抽出し Admin 候補として追加。
    """
    from telethon.tl.functions.channels import GetFullChannelRequest
    from telethon.tl.functions.messages import GetFullChatRequest

    full_chat = None
    try:
        if getattr(entity, "broadcast", None) or getattr(entity, "megagroup", None) or hasattr(entity, "title"):
            full = await client(GetFullChannelRequest(entity))
            full_chat = getattr(full, "full_chat", None)
        else:
            full = await client(GetFullChatRequest(getattr(entity, "id", 0)))
            full_chat = getattr(full, "full_chat", None)
    except Exception:
        return 0
    if not full_chat:
        return 0

    added = 0
    admin_candidates = set()

    # 1) 固定メッセージの送信者
    pinned_msg_id = getattr(full_chat, "pinned_msg_id", None)
    if pinned_msg_id:
        try:
            msgs = await client.get_messages(entity, ids=pinned_msg_id)
            msg = msgs[0] if (isinstance(msgs, list) and msgs) else msgs
            if msg and getattr(msg, "sender_id", None):
                sid = msg.sender_id
                if hasattr(sid, "user_id"):
                    admin_candidates.add(sid.user_id)
                elif isinstance(sid, int):
                    admin_candidates.add(sid)
        except Exception:
            pass

    # 3) 基本グループのみ: GetFullChat の participants から Admin/Creator の user_id を抽出
    try:
        participants_obj = getattr(full_chat, "participants", None)
        if participants_obj and not getattr(participants_obj, "participants", None) is None:
            for p in participants_obj.participants:
                cls = type(p).__name__
                if cls in ("ChatParticipantAdmin", "ChatParticipantCreator"):
                    uid = getattr(p, "user_id", None)
                    if uid is not None:
                        admin_candidates.add(uid)
    except Exception:
        pass

    # 2) グループ説明文（about）から @username を正規表現で抽出
    about = (getattr(full_chat, "about", None) or "").strip()
    if about:
        for m in re.finditer(r"@([a-zA-Z0-9_]{5,32})\b", about):
            username = (m.group(1) or "").strip().lower()
            if not username:
                continue
            try:
                u_entity = await client.get_entity(username)
                if getattr(u_entity, "id", None):
                    admin_candidates.add(u_entity.id)
            except Exception:
                pass

    for uid in admin_candidates:
        if uid in seen_user_ids:
            continue
        if cap_per_lang and _cap_reached(cap_per_lang, lang_counts, language, "Admin"):
            break
        try:
            user = await client.get_entity(uid)
        except Exception:
            continue
        if getattr(user, "bot", False):
            continue
        if require_username and not (getattr(user, "username", None) and user.username.strip()):
            continue
        seen_user_ids.add(user.id)
        bio_snippet = await get_full_user_with_retry(client, user, delay_full_user)
        await asyncio.sleep(delay_full_user)
        if bio_snippet and bio_has_exclusion(bio_snippet):
            seen_user_ids.discard(user.id)
            continue
        if kol_active_only:
            continue
        out_list.append(
            build_record(
                user, "Admin", group_name, group_id, group_ref, language, bio_snippet,
                group_last_active=group_last_active,
            )
        )
        lang_counts.setdefault(language, {"Admin": 0, "KOL": 0, "ActiveMember": 0})["Admin"] = (
            lang_counts[language].get("Admin", 0) + 1
        )
        added += 1
    return added


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


def _sender_id_to_user_id(sid) -> int | None:
    """sender_id (PeerUser / PeerChannel 等) から user_id (int) を返す。ユーザーでなければ None。"""
    if sid is None:
        return None
    if isinstance(sid, int):
        return sid
    if hasattr(sid, "user_id"):
        return getattr(sid, "user_id", None)
    return None


def _message_has_media_or_link(msg) -> bool:
    """メッセージにメディアまたはリンク（entities）があれば True。"""
    if getattr(msg, "media", None) and str(type(msg.media).__name__) != "MessageMediaEmpty":
        return True
    entities = getattr(msg, "entities", None) or []
    for e in entities:
        if e is None:
            continue
        name = type(e).__name__
        if "Url" in name or "TextUrl" in name or "MessageEntity" in name:
            return True
    return False


def _extract_mentions_and_links(text: str):
    """メッセージ本文から @username と t.me/... を抽出。"""
    text = (text or "").strip()
    usernames = set()
    refs = set()
    for m in re.finditer(r"@([a-zA-Z0-9_]{5,32})\b", text):
        usernames.add((m.group(1) or "").strip().lower())
    for m in re.finditer(r"t\.me/(joinchat/[a-zA-Z0-9_-]+|[a-zA-Z0-9_]{4,32})\b", text, re.IGNORECASE):
        refs.add((m.group(1) or "").strip())
    return usernames, refs


async def _extract_from_history(
    client, entity, group_name, group_id, group_ref: str, language: str,
    seen_user_ids: set, out_list: list, lang_counts: dict,
    require_username: bool, cap_per_lang: tuple | None, max_per_group: int,
    delay_full_user: float, group_last_active: str | None,
    history_limit: int,
    history_max_users: int = 25,
    discovered_refs: set | None = None,
    admin_kol_only: bool = False,
    unified_member: bool = False,
    min_messages_in_history: int = 2,
) -> int:
    """
    メンバー一覧が取れない場合のフォールバック。
    1) 本文から @username / t.me を抽出（Deep Message Scanner）
    2) 発言者を発言回数・メディア優先で KOL/ActiveMember として追加。
    min_messages_in_history 未満の発言しかないユーザーは除外（1回だけコメントのサブスクライバーを除く）。
    """
    stats = {}
    all_usernames = set()
    try:
        async for msg in client.iter_messages(entity, limit=history_limit):
            sid = getattr(msg, "sender_id", None)
            uid = _sender_id_to_user_id(sid)
            if uid is not None:
                cnt, media_cnt = stats.get(uid, (0, 0))
                has_ml = _message_has_media_or_link(msg)
                stats[uid] = (cnt + 1, media_cnt + (1 if has_ml else 0))
            text = getattr(msg, "text", None) or getattr(msg, "message", "") or ""
            usernames, refs = _extract_mentions_and_links(str(text))
            all_usernames |= usernames
            if discovered_refs is not None:
                discovered_refs |= refs
    except Exception as e:
        print(f"  [fallback] Skip (iter_messages): {e}")
        return 0
    # 本文 @username の get_entity は件数 cap と間隔を入れ、バースト防止（連打でロックされないよう）
    contact_user_ids = set()
    max_username_resolve = min(15, history_max_users)
    for i, uname in enumerate(list(all_usernames)[:max_username_resolve]):
        if not uname:
            continue
        if i > 0:
            await asyncio.sleep(delay_full_user or 0.5)
        try:
            u = await client.get_entity(uname)
            if getattr(u, "id", None) and not getattr(u, "bot", False):
                contact_user_ids.add(u.id)
        except Exception:
            pass
    # 本文から拾った連絡先を最優先、続けて発言回数順。最低 min_messages 回発言した人だけ（1回だけコメントは除外）
    order = [(uid, (999, 999)) for uid in contact_user_ids]
    order += sorted(
        [
            (uid, t)
            for uid, t in stats.items()
            if uid not in contact_user_ids and t[0] >= min_messages_in_history
        ],
        key=lambda x: (x[1][0], x[1][1]),
        reverse=True,
    )
    order = order[: history_max_users]
    count = 0
    for uid, _ in order:
        if uid in seen_user_ids:
            continue
        if count >= max_per_group:
            break
        try:
            user = await client.get_entity(uid)
        except Exception:
            continue
        if getattr(user, "bot", False):
            continue
        if require_username and not (getattr(user, "username", None) and user.username.strip()):
            continue
        seen_user_ids.add(user.id)
        bio_snippet = await get_full_user_with_retry(client, user, delay_full_user)
        await asyncio.sleep(delay_full_user)
        if bio_snippet and bio_has_exclusion(bio_snippet):
            seen_user_ids.discard(user.id)
            continue
        internal = "KOL" if bio_is_kol(bio_snippet or "") else "ActiveMember"
        if admin_kol_only and internal == "ActiveMember":
            continue
        category = "ActiveMember" if unified_member else internal
        if cap_per_lang and _cap_reached(cap_per_lang, lang_counts, language, category):
            continue
        out_list.append(
            build_record(
                user, category, group_name, group_id, group_ref, language, bio_snippet,
                group_last_active=group_last_active,
            )
        )
        counts = lang_counts.setdefault(language, {"Admin": 0, "KOL": 0, "ActiveMember": 0})
        counts[category] = counts.get(category, 0) + 1
        count += 1
    return count


def _read_skipped_csv(path: Path) -> set:
    """group_ref,language の CSV を読んで (ref_lower, lang) の set を返す。"""
    refs = set()
    with open(path, "r", encoding="utf-8-sig") as f:
        r = csv.reader(f)
        try:
            next(r)  # header
        except StopIteration:
            return refs
        for row in r:
            if len(row) < 2:
                continue
            ref = (row[0] or "").strip().lower()
            lang = (row[1] or "").strip() or "pt"
            if ref:
                refs.add((ref, lang))
    return refs


def _load_floodwait_skipped_refs(output_path: str) -> set:
    """前回以前に FloodWait でスキップした (group_ref_lower, lang) の set。API を叩かずにスキップする用。"""
    parent = Path(output_path).parent
    skip_csv = parent / "groups-floodwait-skipped.csv"
    skip_txt = parent / "groups-floodwait-skipped.txt"
    if skip_csv.exists():
        return _read_skipped_csv(skip_csv)
    if skip_txt.exists():
        refs = set()
        for line in skip_txt.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split("\t", 1)
            ref = (parts[0].strip() or "").lower()
            lang = (parts[1].strip() if len(parts) > 1 else "") or "pt"
            if ref:
                refs.add((ref, lang))
        return refs
    return set()


def _load_progress(output_path: str, groups_file: str):
    """進捗を読み、同じ groups_file なら next_index を返す。違う or なしなら 0。"""
    p = Path(output_path).parent / "telegram-scout-progress.json"
    if not p.exists():
        return 0
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        if (data.get("groups_file") or "") != str(Path(groups_file).resolve()):
            return 0
        return int(data.get("next_index", 0))
    except Exception:
        return 0


def _save_progress(output_path: str, groups_file: str, next_index: int):
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    p = Path(output_path).parent / "telegram-scout-progress.json"
    p.write_text(
        json.dumps({"groups_file": str(Path(groups_file).resolve()), "next_index": next_index}, ensure_ascii=False),
        encoding="utf-8",
    )


def _save_checkpoint(output_path: str, groups_file: str, next_index: int, out_list: list, floodwait_skipped: list, csv_path: str | None = None):
    """スキップ連続時や Ctrl+C 対策: 進捗・JSON・FloodWait 一覧を即保存。既存の skip 一覧はマージする。"""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(out_list, f, ensure_ascii=False, indent=2)
    _save_progress(output_path, groups_file, next_index)
    if floodwait_skipped:
        parent = Path(output_path).parent
        skip_csv = parent / "groups-floodwait-skipped.csv"
        existing = _read_skipped_csv(skip_csv) if skip_csv.exists() else set()
        for ref, lang in floodwait_skipped:
            existing.add((ref.lower(), lang or "pt"))
        with open(skip_csv, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(["group_ref", "language"])
            for ref, lang in sorted(existing):
                w.writerow([ref, lang])
    if csv_path and out_list:
        Path(csv_path).parent.mkdir(parents=True, exist_ok=True)
        with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(["UserID", "Username", "Name", "Category", "Language", "Bio (Snippet)", "SourceGroup"])
            for t in out_list:
                name = " ".join(filter(None, [t.get("first_name"), t.get("last_name") or ""]))
                w.writerow([
                    t.get("user_id"), t.get("username") or "", name,
                    t.get("category") or "", t.get("language") or "",
                    (t.get("bio_snippet") or "")[:300], t.get("group_name") or "",
                ])


def _load_existing_targets(output_path: str):
    """既存の JSON を読み、out_list と lang_counts を復元。存在しなければ ([], {})."""
    p = Path(output_path)
    if not p.exists():
        return [], {}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        out_list = data if isinstance(data, list) else (data.get("targets") if isinstance(data, dict) else [])
        if not out_list or not isinstance(out_list, list):
            return [], {}
        lang_counts = {}
        for r in out_list:
            if not isinstance(r, dict):
                continue
            lang, cat = r.get("language"), r.get("category")
            if not lang or not cat:
                continue
            lang = str(lang).strip()
            cat = str(cat).strip()
            inner = lang_counts.setdefault(lang, {"Admin": 0, "KOL": 0, "ActiveMember": 0})
            inner[cat] = inner.get(cat, 0) + 1
        return out_list, lang_counts
    except Exception as e:
        print(f"Warning: could not load existing {output_path}: {e}")
        return [], {}


def _safe_display(s: str) -> str:
    """Windows cp932 等で print が落ちないよう、非 ASCII を ? に。"""
    return (s or "").encode("ascii", errors="replace").decode("ascii")


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
    fallback_from_history: bool = True,
    history_limit: int = 120,
    history_max_users: int = 25,
    admin_kol_only: bool = False,
    max_non_admin_for_kol: int = 10,
    kol_active_only: bool = False,
    unified_member: bool = False,
    history_only: bool = False,
    min_messages_in_history: int = 2,
    merge_existing: bool = False,
    max_flood_wait: int = 600,
    delay_between_groups: float = 3.0,
    max_groups: int = 0,
    max_consecutive_skips: int = 0,
    resume: bool = True,
):
    groups_full = load_groups(groups_file)
    if not groups_full:
        print("No groups in", groups_file)
        return

    start_index = 0
    if resume:
        start_index = _load_progress(output_path, groups_file)
        if start_index > 0:
            print(f"Resume from index {start_index} ({len(groups_full) - start_index} groups left)")
    if start_index >= len(groups_full):
        print("No groups left to process (progress already at end). Delete telegram-scout-progress.json to start over.")
        return

    # まだ残りがあるので「完了」フラグを消す（再開時用）
    flag_path = Path(output_path).parent / "telegram-scout-complete.flag"
    if flag_path.exists():
        flag_path.unlink()

    slice_end = (start_index + max_groups) if max_groups > 0 else len(groups_full)
    groups = groups_full[start_index:slice_end]
    print(f"This run: {len(groups)} groups (index {start_index}..{start_index + len(groups) - 1})")

    seen_user_ids = set()
    out_list = []
    lang_counts = {}

    if merge_existing:
        out_list, lang_counts = _load_existing_targets(output_path)
        seen_user_ids = {r.get("user_id") for r in out_list if r.get("user_id") is not None}
        if out_list:
            print(f"Merge existing: loaded {len(out_list)} targets from {output_path} (new entries will be added)")

    floodwait_skipped = []
    discovered_refs = set()
    consecutive_skips = 0
    stop_at_local_idx = None  # スキップ連続で打ち切ったとき、この run 内の idx

    # 前回以前に FloodWait でスキップしたグループは API を叩かずにスキップ（同じグループを何度も叩かない）
    floodwait_cooldown_refs = _load_floodwait_skipped_refs(output_path)
    if floodwait_cooldown_refs:
        print(f"FloodWait cooldown list: {len(floodwait_cooldown_refs)} groups (skip without API if hit)")

    for idx, (group_ref, language) in enumerate(groups):
        if max_consecutive_skips > 0 and consecutive_skips >= max_consecutive_skips:
            print(f"Stop: {consecutive_skips} consecutive skips (--max-consecutive-skips {max_consecutive_skips}). Saving progress and exiting.")
            stop_at_local_idx = idx
            break
        if idx > 0 and delay_between_groups > 0:
            await asyncio.sleep(delay_between_groups)
        # FloodWait 済みリストにあれば API を叩かずにスキップ（重複スキャン・再トリガー防止）
        cooldown_key = (group_ref.lower(), language or "pt")
        if cooldown_key in floodwait_cooldown_refs:
            print(f"Skip (FloodWait cooldown, no API): {group_ref}")
            floodwait_skipped.append((group_ref, language or "pt"))
            consecutive_skips += 1
            _save_checkpoint(output_path, groups_file, start_index + idx + 1, out_list, floodwait_skipped, csv_path)
            continue
        gid = parse_group_id(group_ref)
        entity = None
        try:
            entity = await _get_entity_with_flood_wait(client, gid, max_flood_wait)
        except errors.FloodWaitError as e:
            sec = getattr(e, "seconds", getattr(e, "value", 0))
            print(f"Skip (FloodWait too long): {group_ref} - wait {sec}s required (max {max_flood_wait}s). Re-run later for remaining groups.")
            floodwait_skipped.append((group_ref, language or "pt"))
            consecutive_skips += 1
            _save_checkpoint(output_path, groups_file, start_index + idx + 1, out_list, floodwait_skipped, csv_path)
            continue
        except Exception as e:
            # 一過性のエラー対策: 1回だけ 2 秒待ってリトライ（多国籍展開用ベストプラクティス）
            try:
                await asyncio.sleep(2)
                entity = await _get_entity_with_flood_wait(client, gid, max_flood_wait)
            except errors.FloodWaitError as e2:
                sec = getattr(e2, "seconds", getattr(e2, "value", 0))
                print(f"Skip (FloodWait too long, retry): {group_ref} - wait {sec}s (max {max_flood_wait}s)")
                floodwait_skipped.append((group_ref, language or "pt"))
                consecutive_skips += 1
                _save_checkpoint(output_path, groups_file, start_index + idx + 1, out_list, floodwait_skipped, csv_path)
                continue
            except Exception:
                print(f"Skip (cannot get entity): {group_ref} - {e}")
                consecutive_skips += 1
                _save_checkpoint(output_path, groups_file, start_index + idx + 1, out_list, floodwait_skipped, csv_path)
                continue
        consecutive_skips = 0

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

        if history_only:
            # メンバー一覧は取得しない。固定メッセージ/説明文 + 履歴の発言者のみで KOL/ActiveMember を抽出
            print(f"  [history-only] {_safe_display(group_name)}: 固定/説明文→履歴から抽出（メンバー一覧は取得しない）")
            count = await _admin_hunter(
                client, entity, group_name, group_id, group_ref, language,
                seen_user_ids, out_list, lang_counts,
                require_username, cap_per_lang, delay_full_user, group_last_active,
                kol_active_only=kol_active_only,
            )
            count += await _extract_from_history(
                client, entity, group_name, group_id, group_ref, language,
                seen_user_ids, out_list, lang_counts,
                require_username, cap_per_lang, max_per_group,
                delay_full_user, group_last_active, history_limit,
                history_max_users=history_max_users,
                discovered_refs=discovered_refs,
                admin_kol_only=admin_kol_only,
                unified_member=unified_member,
                min_messages_in_history=min_messages_in_history,
            )
            if count > 0:
                print(f"OK: {_safe_display(group_name)} -> {count} (history-only)")
            else:
                print(f"Skip: {_safe_display(group_name)} (history-only yielded 0)")
        elif admins_only:
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
                    if kol_active_only:
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
                print(f"Skip (get participants): {_safe_display(group_name)} - {e}")
                count = 0
            if count == 0 and fallback_from_history and admins_only:
                print(f"  [fallback] {_safe_display(group_name)}: Admin 一覧が空のため、固定/説明文→履歴から抽出...")
                count = await _admin_hunter(
                    client, entity, group_name, group_id, group_ref, language,
                    seen_user_ids, out_list, lang_counts,
                    require_username, cap_per_lang, delay_full_user, group_last_active,
                    kol_active_only=kol_active_only,
                )
                count += await _extract_from_history(
                    client, entity, group_name, group_id, group_ref, language,
                    seen_user_ids, out_list, lang_counts,
                    require_username, cap_per_lang, max_per_group,
                    delay_full_user, group_last_active, history_limit,
                    history_max_users=history_max_users,
                    discovered_refs=discovered_refs,
                    admin_kol_only=admin_kol_only,
                    unified_member=unified_member,
                    min_messages_in_history=min_messages_in_history,
                )
                if count > 0:
                    print(f"OK: {_safe_display(group_name)} -> {count} (pinned/about + history)")
            elif count > 0:
                print(f"OK: {_safe_display(group_name)} -> {count} (admins)")
        else:
            # 全員から三層分類: まず Admin 一覧を取得
            admin_ids = set()
            try:
                async for user in client.iter_participants(entity, filter=ChannelParticipantsAdmins()):
                    admin_ids.add(user.id)
            except Exception as e:
                err_msg = str(e).lower()
                if fallback_from_history and ("admin" in err_msg or "privilege" in err_msg or "permission" in err_msg):
                    print(f"  [fallback] {_safe_display(group_name)}: メンバー一覧の権限なし → 固定メッセージ/説明文からAdmin抽出、続けて履歴から発言者...")
                    count = await _admin_hunter(
                        client, entity, group_name, group_id, group_ref, language,
                        seen_user_ids, out_list, lang_counts,
                        require_username, cap_per_lang, delay_full_user, group_last_active,
                        kol_active_only=kol_active_only,
                    )
                    hist = await _extract_from_history(
                        client, entity, group_name, group_id, group_ref, language,
                        seen_user_ids, out_list, lang_counts,
                        require_username, cap_per_lang, max_per_group,
                        delay_full_user, group_last_active, history_limit,
                        history_max_users=history_max_users,
                        discovered_refs=discovered_refs,
                        admin_kol_only=admin_kol_only,
                        unified_member=unified_member,
                        min_messages_in_history=min_messages_in_history,
                    )
                    count += hist
                    if count > 0:
                        print(f"OK: {_safe_display(group_name)} -> {count} (Admin from pinned/about + history)")
                    else:
                        print(f"Skip: {_safe_display(group_name)} (admin hunter + history yielded 0)")
                else:
                    print(f"Skip (get admins): {_safe_display(group_name)} - {e}")
                consecutive_skips += 1
                continue

            count = 0
            non_admin_checked = 0
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
                    is_admin = user.id in admin_ids
                    if admin_kol_only and not is_admin:
                        non_admin_checked += 1
                        if non_admin_checked > max_non_admin_for_kol:
                            continue
                    seen_user_ids.add(user.id)
                    category = "Admin" if is_admin else None
                    bio_snippet = await get_full_user_with_retry(client, user, delay_full_user)
                    await asyncio.sleep(delay_full_user)
                    if bio_snippet and bio_has_exclusion(bio_snippet):
                        seen_user_ids.discard(user.id)
                        continue
                    if category is None:
                        internal = "KOL" if bio_is_kol(bio_snippet or "") else "ActiveMember"
                        category = "ActiveMember" if unified_member else internal
                        if admin_kol_only and internal == "ActiveMember":
                            seen_user_ids.discard(user.id)
                            continue
                    if kol_active_only and category == "Admin":
                        continue
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
                print(f"Skip (get participants): {_safe_display(group_name)} - {e}")
                count = 0
            if count == 0 and fallback_from_history and not admins_only:
                print(f"  [fallback] {_safe_display(group_name)}: メンバー一覧が空のため、固定/説明文→履歴から抽出...")
                count = await _admin_hunter(
                    client, entity, group_name, group_id, group_ref, language,
                    seen_user_ids, out_list, lang_counts,
                    require_username, cap_per_lang, delay_full_user, group_last_active,
                    kol_active_only=kol_active_only,
                )
                hist = await _extract_from_history(
                    client, entity, group_name, group_id, group_ref, language,
                    seen_user_ids, out_list, lang_counts,
                    require_username, cap_per_lang, max_per_group,
                    delay_full_user, group_last_active, history_limit,
                    history_max_users=history_max_users,
                    discovered_refs=discovered_refs,
                    admin_kol_only=admin_kol_only,
                    unified_member=unified_member,
                    min_messages_in_history=min_messages_in_history,
                )
                count += hist
                if count > 0:
                    print(f"OK: {_safe_display(group_name)} -> {count} (pinned/about + history)")
                else:
                    print(f"Skip: {_safe_display(group_name)} (participants empty, hunter+history yielded 0)")
            elif count > 0:
                print(f"OK: {_safe_display(group_name)} -> {count} (all tiers)")

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(out_list, f, ensure_ascii=False, indent=2)
    print(f"Written {len(out_list)} targets to {output_path}")

    next_index = start_index + (stop_at_local_idx if stop_at_local_idx is not None else len(groups))
    _save_progress(output_path, groups_file, next_index)
    if next_index < len(groups_full):
        print(f"Progress saved: next run starts at index {next_index} ({len(groups_full) - next_index} groups left)")
    else:
        # 全件完了 → フラグを立てる（おれがわかるように）
        flag_path = Path(output_path).parent / "telegram-scout-complete.flag"
        flag_path.write_text(
            f"COMPLETE\n{len(groups_full)} groups\n{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC\ntargets: {len(out_list)}",
            encoding="utf-8",
        )
        print(f"All groups done. Flag written: {flag_path}")

    if floodwait_skipped:
        parent = Path(output_path).parent
        skip_csv = parent / "groups-floodwait-skipped.csv"
        existing_skip = _read_skipped_csv(skip_csv) if skip_csv.exists() else set()
        for ref, lang in floodwait_skipped:
            existing_skip.add((ref.lower(), lang or "pt"))
        with open(skip_csv, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(["group_ref", "language"])
            for ref, lang in sorted(existing_skip):
                w.writerow([ref, lang])
        print(f"Skipped {len(floodwait_skipped)} groups (FloodWait) this run. Total in cooldown list: {len(existing_skip)}. Re-run with same --groups to continue.")

    if discovered_refs:
        link_path = Path(output_path).parent / "telegram-scout-discovered-links.txt"
        existing = set()
        if link_path.exists():
            existing = {ln.strip().split("\t")[0] for ln in link_path.read_text(encoding="utf-8").splitlines() if ln.strip()}
        existing |= discovered_refs
        with open(link_path, "w", encoding="utf-8") as f:
            for ref in sorted(existing):
                f.write(f"{ref}\n")
        print(f"Discovered {len(discovered_refs)} t.me links this run -> {link_path} (total {len(existing)})")

    remaining = groups_full[next_index:]
    if remaining:
        remain_path = Path(output_path).parent / "groups-remaining.csv"
        with open(remain_path, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(["group_ref", "language"])
            for ref, lang in remaining:
                w.writerow([ref, lang or "pt"])
        print(f"Remaining {len(remaining)} groups -> {remain_path}. Next: re-run same command (resume) or --groups {remain_path} --merge-existing")

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
    for attempt in range(5):
        try:
            await client.start(phone=lambda: os.environ.get("PHONE", input("Phone: ")))
            break
        except sqlite3.OperationalError as e:
            if "locked" not in str(e).lower() or attempt >= 4:
                raise
            wait = 3 + attempt * 2
            print(f"Session DB locked (attempt {attempt + 1}/5). Retrying in {wait}s...")
            time.sleep(wait)
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
        fallback_from_history=args.fallback_from_history,
        history_limit=args.history_limit,
        history_max_users=getattr(args, "history_max_users", 25),
        admin_kol_only=getattr(args, "admin_kol_only", False),
        max_non_admin_for_kol=getattr(args, "max_non_admin_for_kol", 10),
        kol_active_only=getattr(args, "kol_active_only", False),
        unified_member=getattr(args, "unified_member", False),
        history_only=getattr(args, "history_only", False),
        min_messages_in_history=getattr(args, "min_messages_in_history", 2),
        merge_existing=getattr(args, "merge_existing", False),
        max_flood_wait=getattr(args, "max_flood_wait", 600),
        delay_between_groups=getattr(args, "delay_between_groups", 3.0),
        max_groups=args.max_groups,
        max_consecutive_skips=args.max_consecutive_skips,
        resume=args.resume,
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
    parser.add_argument(
        "--fallback-from-history",
        action="store_true",
        default=True,
        help="When member list is empty (e.g. Hide Members), extract from recent message senders (default: on)",
    )
    parser.add_argument("--no-fallback-from-history", action="store_false", dest="fallback_from_history")
    parser.add_argument(
        "--history-limit",
        type=int,
        default=120,
        help="Max messages to scan when using fallback-from-history (default 120). Lower = less API, fewer FloodWait.",
    )
    parser.add_argument(
        "--history-max-users",
        type=int,
        default=25,
        metavar="N",
        help="Max users to resolve from history per group in fallback (default 25). Prevents API overload.",
    )
    parser.add_argument(
        "--admin-kol-only",
        action="store_true",
        help="Only add Admin and KOL; skip ActiveMember. Reduces API burst.",
    )
    parser.add_argument(
        "--max-non-admin-for-kol",
        type=int,
        default=10,
        metavar="N",
        help="When --admin-kol-only: max non-admin users to check for KOL per group (default 10).",
    )
    parser.add_argument(
        "--kol-active-only",
        action="store_true",
        help="Output only KOL and ActiveMember; exclude Admin (DM 用: Admin リストは使わない).",
    )
    parser.add_argument(
        "--unified-member",
        action="store_true",
        help="Output non-Admin as ActiveMember only (KOL included in ActiveMember; single category for DM).",
    )
    parser.add_argument(
        "--history-only",
        action="store_true",
        help="Do not fetch member list; only use pinned/about + message history (fewer API calls, no iter_participants).",
    )
    parser.add_argument(
        "--min-messages-in-history",
        type=int,
        default=2,
        metavar="N",
        help="Only add users who sent at least N messages in scanned history (default 2). Excludes one-off commenters.",
    )
    parser.add_argument(
        "--merge-existing",
        action="store_true",
        help="If output JSON exists, load it and append only new UserIDs (no overwrite)",
    )
    parser.add_argument(
        "--max-flood-wait",
        type=int,
        default=600,
        metavar="SEC",
        help="On FloodWait from Telegram, wait up to SEC seconds then retry; skip if required wait > SEC (default 600). Re-run later for skipped groups.",
    )
    parser.add_argument(
        "--delay-between-groups",
        type=float,
        default=3.0,
        metavar="SEC",
        help="Sleep SEC seconds between each group to avoid FloodWait (default 3). Use 5–10 for large lists.",
    )
    parser.add_argument(
        "--max-groups",
        type=int,
        default=100,
        metavar="N",
        help="Process at most N groups per run; progress saved for next run (default 100). Use 0 for no limit.",
    )
    parser.add_argument(
        "--max-consecutive-skips",
        type=int,
        default=5,
        metavar="N",
        help="Stop after N consecutive skips (FloodWait/get entity). Progress saved, re-run to continue (default 5). Use 0 to disable.",
    )
    parser.add_argument("--resume", action="store_true", default=True, help="Resume from last saved progress (default)")
    parser.add_argument("--no-resume", action="store_false", dest="resume", help="Ignore progress file; start from index 0")
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
