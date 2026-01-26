import json
import sys
from collections import defaultdict
from datetime import datetime
import re

sys.stdout.reconfigure(encoding='utf-8')

LOG_FILE = r'c:\Users\chiba\Downloads\logs_result (2).json'

print("="*80)
print("=== デプロイ後8時間ログ徹底検証 ===")
print("="*80)
print(f"\n📁 ログファイル: {LOG_FILE}\n")

# ログファイルを読み込む
try:
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        logs = json.load(f)
    print(f"✅ ログファイル読み込み完了: {len(logs)}件のエントリ\n")
except Exception as e:
    print(f"❌ エラー: {e}")
    sys.exit(1)

# 時間範囲を確認
times = []
for log_entry in logs:
    time_utc = log_entry.get('TimeUTC', '') or log_entry.get('timestamp', '')
    if time_utc:
        try:
            if isinstance(time_utc, str):
                time_utc = time_utc.replace('Z', '+00:00')
            times.append(datetime.fromisoformat(time_utc))
        except:
            pass

if times:
    min_time = min(times)
    max_time = max(times)
    duration = max_time - min_time
    print(f"📅 ログの時間範囲:")
    print(f"   開始: {min_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"   終了: {max_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"   期間: {duration}")
    print()

# 1. X APIエラー400の検証
print("="*80)
print("=== 1. X APIエラー400の検証 ===")
print("="*80)
x_api_400_errors = []
x_api_errors = []

for log_entry in logs:
    message = str(log_entry.get('message', '') or log_entry.get('text', '')).lower()
    status_code = log_entry.get('responseStatusCode', 0)
    time_utc = log_entry.get('TimeUTC', '') or log_entry.get('timestamp', '')
    
    # X APIエラー400を検出
    if 'x api error: 400' in message or ('400' in message and 'x api' in message):
        x_api_400_errors.append({
            'time': time_utc,
            'status': status_code,
            'message': log_entry.get('message', '')[:500],
            'path': log_entry.get('requestPath', ''),
        })
    
    # その他のX APIエラー
    if 'x api error' in message and status_code != 200:
        x_api_errors.append({
            'time': time_utc,
            'status': status_code,
            'message': log_entry.get('message', '')[:500],
            'path': log_entry.get('requestPath', ''),
        })

print(f"\n🔴 X APIエラー400: {len(x_api_400_errors)}件")
if x_api_400_errors:
    print("\n詳細:")
    for i, err in enumerate(x_api_400_errors[:10], 1):
        print(f"  {i}. [{err['time']}] {err['path']}")
        print(f"     メッセージ: {err['message'][:200]}...")
else:
    print("  ✅ X APIエラー400は発生していません（修正が有効）")

print(f"\n⚠️ その他のX APIエラー: {len(x_api_errors)}件")
if x_api_errors:
    for i, err in enumerate(x_api_errors[:5], 1):
        print(f"  {i}. [{err['time']}] Status {err['status']}: {err['path']}")

# 2. Cron Jobs実行状況
print("\n" + "="*80)
print("=== 2. Cron Jobs実行状況 ===")
print("="*80)

EXPECTED_CRON_JOBS = {
    '/api/x-post-free-report': {'schedule': '0 12,13,14,15,18 * * *'},
    '/api/x-post-minimal-version-cron': {'schedule': '0 8,20 * * *'},
    '/api/x-quote-repost': {'schedule': '0 0,1,13,14,20,21,22 * * *'},
    '/api/vsl2-free-users': {'schedule': '0 * * * *'},
    '/api/vsl2-last-call': {'schedule': '0 * * * *'},
    '/api/x-update-influencer-stock': {'schedule': '0 2,6,10,14,18,22 * * *'},
}

cron_executions = defaultdict(lambda: {'count': 0, 'success': 0, 'errors': 0, 'request_ids': set(), 'times': []})

for log_entry in logs:
    request_path = log_entry.get('requestPath', '')
    request_id = log_entry.get('requestId', '')
    status_code = log_entry.get('responseStatusCode', 0)
    time_utc = log_entry.get('TimeUTC', '') or log_entry.get('timestamp', '')
    
    for cron_path, cron_info in EXPECTED_CRON_JOBS.items():
        if cron_path in request_path:
            if request_id and request_id in cron_executions[cron_path]['request_ids']:
                continue
            
            cron_executions[cron_path]['count'] += 1
            cron_executions[cron_path]['request_ids'].add(request_id)
            cron_executions[cron_path]['times'].append(time_utc)
            
            if status_code == 200:
                cron_executions[cron_path]['success'] += 1
            else:
                cron_executions[cron_path]['errors'] += 1
            break

for cron_path, cron_info in EXPECTED_CRON_JOBS.items():
    exec_data = cron_executions[cron_path]
    print(f"\n【{cron_path}】")
    print(f"  スケジュール: {cron_info['schedule']}")
    print(f"  実行回数: {exec_data['count']}回")
    print(f"  成功: {exec_data['success']}回")
    print(f"  エラー: {exec_data['errors']}回")
    if exec_data['times']:
        print(f"  実行時刻（最初の5件）:")
        for time_str in exec_data['times'][:5]:
            print(f"    - {time_str}")

# 3. 投稿成功/失敗の詳細
print("\n" + "="*80)
print("=== 3. 投稿成功/失敗の詳細 ===")
print("="*80)

post_success = []
post_failures = []
reply_success = []
reply_failures = []

for log_entry in logs:
    message = str(log_entry.get('message', '') or log_entry.get('text', '')).lower()
    path = log_entry.get('requestPath', '')
    time_utc = log_entry.get('TimeUTC', '') or log_entry.get('timestamp', '')
    
    # 投稿成功
    if ('tweet posted successfully' in message or 'main tweet posted' in message or 
        'thread posted' in message or 'reply posted successfully' in message):
        if 'reply' in message:
            reply_success.append({'time': time_utc, 'path': path, 'message': log_entry.get('message', '')[:200]})
        else:
            post_success.append({'time': time_utc, 'path': path, 'message': log_entry.get('message', '')[:200]})
    
    # 投稿失敗
    if ('failed to post' in message or 'failed to reply' in message or 
        'error posting' in message or 'error replying' in message):
        if 'reply' in message:
            reply_failures.append({'time': time_utc, 'path': path, 'message': log_entry.get('message', '')[:200]})
        else:
            post_failures.append({'time': time_utc, 'path': path, 'message': log_entry.get('message', '')[:200]})

print(f"\n✅ 投稿成功: {len(post_success)}件")
print(f"✅ リプライ成功: {len(reply_success)}件")
print(f"❌ 投稿失敗: {len(post_failures)}件")
print(f"❌ リプライ失敗: {len(reply_failures)}件")

if post_failures:
    print("\n投稿失敗の詳細（最初の5件）:")
    for i, fail in enumerate(post_failures[:5], 1):
        print(f"  {i}. [{fail['time']}] {fail['path']}")
        print(f"      {fail['message']}")

if reply_failures:
    print("\nリプライ失敗の詳細（最初の5件）:")
    for i, fail in enumerate(reply_failures[:5], 1):
        print(f"  {i}. [{fail['time']}] {fail['path']}")
        print(f"      {fail['message']}")

# 4. レート制限の状況
print("\n" + "="*80)
print("=== 4. レート制限の状況 ===")
print("="*80)

rate_limit_skips = []
for log_entry in logs:
    message = str(log_entry.get('message', '') or log_entry.get('text', '')).lower()
    if 'rate limit' in message or 'post limit' in message or 'skipping' in message:
        rate_limit_skips.append({
            'time': log_entry.get('TimeUTC', '') or log_entry.get('timestamp', ''),
            'path': log_entry.get('requestPath', ''),
            'message': log_entry.get('message', '')[:200],
        })

print(f"\n⏰ レート制限によるスキップ: {len(rate_limit_skips)}件")
if rate_limit_skips:
    print("\n詳細（最初の10件）:")
    for i, skip in enumerate(rate_limit_skips[:10], 1):
        print(f"  {i}. [{skip['time']}] {skip['path']}")
        print(f"      {skip['message']}")

# 5. エラーサマリー
print("\n" + "="*80)
print("=== 5. エラーサマリー ===")
print("="*80)

all_errors = []
for log_entry in logs:
    status_code = log_entry.get('responseStatusCode', 0)
    level = str(log_entry.get('level', '')).lower()
    message = str(log_entry.get('message', '') or log_entry.get('text', '')).lower()
    
    if status_code >= 400 or level == 'error' or 'error' in message:
        all_errors.append({
            'time': log_entry.get('TimeUTC', '') or log_entry.get('timestamp', ''),
            'status': status_code,
            'level': log_entry.get('level', ''),
            'path': log_entry.get('requestPath', ''),
            'message': log_entry.get('message', '')[:300],
        })

print(f"\n❌ 総エラー数: {len(all_errors)}件")
if all_errors:
    print("\nエラーの内訳（ステータスコード別）:")
    status_counts = defaultdict(int)
    for err in all_errors:
        status_counts[err['status']] += 1
    for status, count in sorted(status_counts.items()):
        print(f"  Status {status}: {count}件")
    
    print("\nエラーの詳細（最初の10件）:")
    for i, err in enumerate(all_errors[:10], 1):
        print(f"  {i}. [{err['time']}] Status {err['status']} - {err['path']}")
        print(f"      {err['message'][:150]}...")

# 6. 実績関連のキーワード検索
print("\n" + "="*80)
print("=== 6. 実績関連のキーワード検索 ===")
print("="*80)

keywords = ['impression', 'engagement', 'conversion', 'whop', 'tweet id', 'posted', 'success']
keyword_matches = defaultdict(list)

for log_entry in logs:
    message = str(log_entry.get('message', '') or log_entry.get('text', '')).lower()
    for keyword in keywords:
        if keyword in message:
            keyword_matches[keyword].append({
                'time': log_entry.get('TimeUTC', '') or log_entry.get('timestamp', ''),
                'path': log_entry.get('requestPath', ''),
                'message': log_entry.get('message', '')[:200],
            })

for keyword, matches in keyword_matches.items():
    print(f"\n🔍 '{keyword}': {len(matches)}件のマッチ")
    if matches:
        print(f"  最初の3件:")
        for i, match in enumerate(matches[:3], 1):
            print(f"    {i}. [{match['time']}] {match['path']}")
            print(f"        {match['message'][:100]}...")

print("\n" + "="*80)
print("=== 検証完了 ===")
print("="*80)
