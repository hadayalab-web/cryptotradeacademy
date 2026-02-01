#!/usr/bin/env python3
# scripts/analyze-cron-delivery-logs.py
# /api/cron の Vercel ログを解析し、無料版・有料版配信の成否を分析

import json
import sys
from collections import defaultdict
from datetime import datetime

def analyze_logs(log_file):
    print(f"Loading logs from {log_file}...")
    with open(log_file, 'r', encoding='utf-8') as f:
        logs = json.load(f)
    
    print(f"Total log entries: {len(logs)}\n")
    
    # 504エラー（タイムアウト）の集計
    timeouts = [log for log in logs if log.get('responseStatusCode') == 504]
    print(f"🚨 504 Timeout errors: {len(timeouts)}")
    if timeouts:
        for log in timeouts[:5]:
            print(f"  - {log.get('TimeUTC')} | {log.get('requestPath')}")
    print()
    
    # エラーメッセージの抽出
    errors = [log for log in logs if 'error' in log.get('message', '').lower() or 'failed' in log.get('message', '').lower() or 'エラー' in log.get('message', '')]
    print(f"❌ Error messages: {len(errors)}")
    if errors:
        for log in errors[:10]:
            print(f"  - {log.get('TimeUTC')} | {log.get('message')[:200]}")
    print()
    
    # 配信関連のログ
    delivery_logs = [log for log in logs if any(kw in log.get('message', '') for kw in ['MINIMAL', 'REGULAR', '送信', 'sendMessage', 'Telegram'])]
    print(f"📨 Delivery-related logs: {len(delivery_logs)}")
    
    # 無料版配信
    minimal_logs = [log for log in delivery_logs if 'MINIMAL' in log.get('message', '')]
    print(f"  📧 Minimal Version logs: {len(minimal_logs)}")
    if minimal_logs:
        for log in minimal_logs[:10]:
            msg = log.get('message', '')
            print(f"    - {log.get('TimeUTC')} | {msg[:150]}")
    print()
    
    # 有料版配信
    regular_logs = [log for log in delivery_logs if 'REGULAR' in log.get('message', '')]
    print(f"  📧 Regular Briefing logs: {len(regular_logs)}")
    if regular_logs:
        for log in regular_logs[:10]:
            msg = log.get('message', '')
            print(f"    - {log.get('TimeUTC')} | {msg[:150]}")
    print()
    
    # isRegularSlot / needsLongReport の判定ログ
    slot_logs = [log for log in logs if any(kw in log.get('message', '') for kw in ['isRegularSlot', '定期枠', 'needsLongReport', 'STANDBY_BREAK', 'WATCH'])]
    print(f"🕐 Slot decision logs: {len(slot_logs)}")
    if slot_logs:
        for log in slot_logs[:15]:
            msg = log.get('message', '')
            print(f"  - {log.get('TimeUTC')} | {msg[:200]}")
    print()
    
    # shouldSend / ENABLE_MINIMAL_VERSION チェック
    should_send_logs = [log for log in logs if any(kw in log.get('message', '') for kw in ['shouldSend', 'ENABLE_MINIMAL_VERSION', 'Skipping'])]
    print(f"✅ shouldSend / ENABLE check logs: {len(should_send_logs)}")
    if should_send_logs:
        for log in should_send_logs[:15]:
            msg = log.get('message', '')
            print(f"  - {log.get('TimeUTC')} | {msg[:200]}")
    print()
    
    # 実行時間別の集計（UTC時刻）
    hour_counts = defaultdict(int)
    for log in logs:
        time_utc = log.get('TimeUTC', '')
        if time_utc:
            hour = time_utc.split(' ')[1].split(':')[0] if ' ' in time_utc else '?'
            hour_counts[hour] += 1
    
    print("\n⏰ Execution frequency by hour (UTC):")
    for hour in sorted(hour_counts.keys()):
        print(f"  {hour}:00 UTC - {hour_counts[hour]} log entries")
    
    # 504 の発生時刻
    timeout_hours = defaultdict(int)
    for log in timeouts:
        time_utc = log.get('TimeUTC', '')
        if time_utc:
            hour = time_utc.split(' ')[1].split(':')[0] if ' ' in time_utc else '?'
            timeout_hours[hour] += 1
    
    if timeout_hours:
        print("\n🚨 504 Timeouts by hour:")
        for hour in sorted(timeout_hours.keys()):
            print(f"  {hour}:00 UTC - {timeout_hours[hour]} timeouts")
    
    print("\n" + "="*80)
    print("分析完了")

if __name__ == '__main__':
    log_file = sys.argv[1] if len(sys.argv) > 1 else r'c:\Users\chiba\Downloads\logs_result (1).json'
    analyze_logs(log_file)
