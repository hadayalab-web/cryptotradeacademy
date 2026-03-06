#!/usr/bin/env python3
"""
telegram-scout-targets.csv のリストに、Telethon（ユーザーアカウント）で DM を送る。
Bot API は相手が /start していないと送れないため、リストへの一斉送信はこのスクリプトを使う。

除外: --exclude-file で渡したファイルに書かれた UserID/username だけを送信対象から外す。
      誰を除外するかはすべてあなたが指定する。スクリプトは判定しない。

使い方:
  cd scripts/telegram_scout
  python send_dm.py ../../data/telegram-scout-targets.csv --message-file message_pt.txt --exclude-file 除外リスト.txt
  python send_dm.py ../../data/telegram-scout-targets.csv --message "Olá! ..." --limit 5 --dry-run
  # 固定メッセージを見たことを匂わせる個人化（{group_name} をグループ名に置換）
  python send_dm.py ../../data/telegram-scout-targets.csv --template pinned-pt --limit 3 --dry-run
"""
import os
import csv
import argparse
import asyncio
from pathlib import Path

# .env は script 配下のみ
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from telethon import TelegramClient, errors

SESSION_NAME = os.environ.get("SESSION_NAME", "telegram_scout_session")
API_ID = int(os.environ.get("API_ID", "0"))
API_HASH = os.environ.get("API_HASH", "")

# デフォルト文案（PT・アフィリエイト招待の例。--message や --message-file で上書き）
DEFAULT_MESSAGE_PT = """Olá! Temos um programa de afiliados para uma plataforma de trading/cripto. Se tiver interesse em parceria ou divulgação, responda aqui ou acesse o link no nosso canal.

Obrigado!"""

# 「固定メッセージを見た」を匂わせる個人化テンプレート（解析力をチラつかせて断れない提案）
MESSAGE_PINNED_PT = """Olá! Vi o pin do seu grupo «{group_name}» — ótima moderação.

Temos uma proposta de parceria/afiliados para uma plataforma de trading/cripto. Se tiver interesse em divulgação ou colaboração, responda aqui.

Obrigado!"""


def load_exclude_set(exclude_file: str | None):
    """除外ファイルを読み、UserID の set と username の set（小文字）を返す。1行1件、# はコメント。"""
    exclude_ids = set()
    exclude_usernames = set()
    if not exclude_file:
        return exclude_ids, exclude_usernames
    p = Path(exclude_file)
    if not p.exists():
        return exclude_ids, exclude_usernames
    for line in p.read_text(encoding="utf-8").splitlines():
        s = line.split("#")[0].strip()
        if not s:
            continue
        if s.lstrip("@").isdigit():
            exclude_ids.add(int(s))
        else:
            exclude_usernames.add(s.lstrip("@").lower())
    return exclude_ids, exclude_usernames


def load_targets(csv_path: str, exclude_ids: set = None, exclude_usernames: set = None):
    """CSV から UserID, Username, Name, SourceGroup を読み、送信対象リストを返す。exclude に含まれる行は除く。"""
    exclude_ids = exclude_ids or set()
    exclude_usernames = exclude_usernames or set()
    rows = []
    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        for row in r:
            uid = (row.get("UserID") or "").strip()
            if not uid or not uid.isdigit():
                continue
            uid_int = int(uid)
            username = (row.get("Username") or "").strip() or ""
            if uid_int in exclude_ids:
                continue
            if username and username.lower() in exclude_usernames:
                continue
            name = (row.get("Name") or "").strip() or ""
            group_name = (row.get("SourceGroup") or "").strip() or ""
            rows.append({
                "user_id": uid_int,
                "username": username or None,
                "name": name,
                "group_name": group_name,
            })
    return rows


def apply_template(text: str, target: dict) -> str:
    """メッセージ内の {group_name}, {name}, {username} を対象ごとに置換。"""
    return text.replace("{group_name}", target.get("group_name") or "o grupo").replace(
        "{name}", target.get("name") or ""
    ).replace("{username}", target.get("username") or "")


async def send_one(client: TelegramClient, user_id: int, text: str, delay_after: float) -> bool:
    """1件送信。FloodWait 時は待ってリトライ。"""
    try:
        await client.send_message(user_id, text)
        return True
    except errors.FloodWaitError as e:
        sec = getattr(e, "seconds", 60)
        print(f"  [FloodWait] Waiting {sec}s...")
        await asyncio.sleep(max(sec, 1))
        return await send_one(client, user_id, text, delay_after)
    except errors.UserIsBlockedError:
        print(f"  Skip (blocked): {user_id}")
        return False
    except errors.PeerIdInvalidError:
        print(f"  Skip (invalid peer): {user_id}")
        return False
    except Exception as e:
        print(f"  Error {user_id}: {e}")
        return False
    finally:
        if delay_after > 0:
            await asyncio.sleep(delay_after)


async def main_async(args):
    if not API_ID or not API_HASH:
        print("Set API_ID and API_HASH in .env")
        return

    exclude_ids, exclude_usernames = load_exclude_set(getattr(args, "exclude_file", None))
    if exclude_ids or exclude_usernames:
        print(f"Excluding: {len(exclude_ids)} by UserID, {len(exclude_usernames)} by username (from your exclude file)")

    targets = load_targets(args.csv, exclude_ids=exclude_ids, exclude_usernames=exclude_usernames)
    if not targets:
        print("No targets in", args.csv, "(after exclusions)" if (exclude_ids or exclude_usernames) else "")
        return

    if args.limit and args.limit > 0:
        targets = targets[: args.limit]
    print(f"Targets to send: {len(targets)} (delay {args.delay}s between each)")

    message = args.message
    if args.message_file:
        p = Path(args.message_file)
        if p.exists():
            message = p.read_text(encoding="utf-8").strip()
        else:
            print("Warning: message file not found, using --message or default")

    if not message:
        message = DEFAULT_MESSAGE_PT
    use_template = "{group_name}" in message or "{name}" in message or "{username}" in message
    if use_template:
        print("Personalizing message with {group_name}, {name}, {username} per target")

    if args.dry_run:
        print("[DRY-RUN] Would send the following message to each target:")
        print("-" * 40)
        if use_template and targets:
            print(apply_template(message, targets[0])[:500] + ("..." if len(message) > 500 else ""))
            print("  (template; first target shown)")
        else:
            print(message[:500] + ("..." if len(message) > 500 else ""))
        print("-" * 40)
        for i, t in enumerate(targets):
            print(f"  {i+1}. user_id={t['user_id']} @{t['username'] or '?'}  group={t.get('group_name') or '-'}")
        return

    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start(phone=lambda: os.environ.get("PHONE", input("Phone: ")))

    ok = 0
    for i, t in enumerate(targets):
        msg = apply_template(message, t) if use_template else message
        print(f"[{i+1}/{len(targets)}] Sending to {t['user_id']} (@{t['username'] or '?'})...")
        if await send_one(client, t["user_id"], msg, args.delay):
            ok += 1

    await client.disconnect()
    print(f"Done. Sent: {ok}/{len(targets)}")


def main():
    parser = argparse.ArgumentParser(description="Send DM to telegram-scout-targets CSV list (Telethon)")
    parser.add_argument("csv", help="Path to telegram-scout-targets CSV (UserID, Username, ...)")
    parser.add_argument("--message", default="", help="Message text (overridden by --message-file)")
    parser.add_argument("--message-file", default=None, help="Path to text file with message body")
    parser.add_argument("--delay", type=float, default=45.0, help="Seconds between each send (default 45)")
    parser.add_argument("--limit", type=int, default=None, help="Max number of recipients (default: all)")
    parser.add_argument("--exclude-file", default=None, help="Path to file: one UserID or @username per line (manual-send key users); these are skipped")
    parser.add_argument("--template", choices=["pinned-pt"], default=None, help="Use built-in message: pinned-pt = 'Vi o pin do seu grupo «{group_name}»' (personalized per target)")
    parser.add_argument("--dry-run", action="store_true", help="Only print targets and message, do not send")
    args = parser.parse_args()

    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
