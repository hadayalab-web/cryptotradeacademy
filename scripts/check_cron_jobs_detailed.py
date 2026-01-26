import json
import sys
from collections import defaultdict
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

LOG_FILE = r'c:\Users\chiba\Downloads\logs_result.json'

print("="*80)
print("=== Cron Jobs詳細分析（実行時間範囲確認） ===")
print("="*80)
print()

# ログファイルを読み込む
try:
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        logs = json.load(f)
    print(f"✅ ログファイル読み込み完了: {len(logs)}件のエントリ\n")
except Exception as e:
    print(f"❌ エラー: {e}")
    sys.exit(1)

# 実行時間範囲を確認
times = []
for log_entry in logs:
    time_utc = log_entry.get('TimeUTC', '')
    if time_utc:
        try:
            times.append(datetime.fromisoformat(time_utc.replace('Z', '+00:00')))
        except:
            pass

if times:
    min_time = min(times)
    max_time = max(times)
    print(f"📅 ログの時間範囲:")
    print(f"   開始: {min_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"   終了: {max_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    duration = max_time - min_time
    print(f"   期間: {duration}")
    print()

# Cron Jobsの実行時間を詳細に表示
EXPECTED_CRON_JOBS = {
    '/api/x-post-free-report': {'schedule': '0 12,13,14,15,18 * * *'},
    '/api/x-post-minimal-version-cron': {'schedule': '0 8,20 * * *'},
    '/api/x-quote-repost': {'schedule': '0 0,1,13,14,20,21,22 * * *'},
    '/api/x-update-influencer-stock?lang=en': {'schedule': '0 2 * * *'},
    '/api/x-update-influencer-stock?lang=es': {'schedule': '0 6 * * *'},
    '/api/x-update-influencer-stock?lang=pt-br': {'schedule': '0 10 * * *'},
    '/api/x-update-influencer-stock?lang=ar': {'schedule': '0 14 * * *'},
    '/api/x-update-influencer-stock?lang=ja': {'schedule': '0 18 * * *'},
    '/api/x-update-influencer-stock?lang=ko': {'schedule': '0 22 * * *'},
}

cron_executions = defaultdict(list)

for log_entry in logs:
    request_path = log_entry.get('requestPath', '')
    request_id = log_entry.get('requestId', '')
    status_code = log_entry.get('responseStatusCode', 0)
    message = log_entry.get('message', '')
    time_utc = log_entry.get('TimeUTC', '')
    duration_ms = log_entry.get('durationMs', 0)
    
    for cron_path in EXPECTED_CRON_JOBS.keys():
        if cron_path in request_path:
            cron_executions[cron_path].append({
                'time': time_utc,
                'status': status_code,
                'request_id': request_id,
                'duration_ms': duration_ms,
                'message': message[:100] if message else ''
            })
            break

print("="*80)
print("=== 各Cron Jobの実行詳細 ===")
print("="*80)
print()

for cron_path, cron_info in EXPECTED_CRON_JOBS.items():
    executions = cron_executions[cron_path]
    
    print(f"【{cron_path}】")
    print(f"  スケジュール: {cron_info['schedule']}")
    print(f"  実行回数: {len(executions)}回")
    
    if executions:
        print(f"  実行時刻:")
        for i, exec_data in enumerate(executions, 1):
            time_str = exec_data['time']
            status = exec_data['status']
            duration = exec_data['duration_ms']
            print(f"    {i}. {time_str} - Status: {status}, 実行時間: {duration}ms")
            if exec_data['message']:
                print(f"       メッセージ: {exec_data['message']}")
    else:
        print(f"  ⚠️ 実行されていません")
    
    print()

# インフルエンサーストック更新が実行されていない理由を調査
print("="*80)
print("=== インフルエンサーストック更新の調査 ===")
print("="*80)
print()

# x-update-influencer-stockを含むすべてのリクエストを検索
influencer_stock_logs = []
for log_entry in logs:
    request_path = log_entry.get('requestPath', '')
    if 'x-update-influencer-stock' in request_path.lower():
        influencer_stock_logs.append({
            'path': request_path,
            'time': log_entry.get('TimeUTC', ''),
            'status': log_entry.get('responseStatusCode', 0),
            'method': log_entry.get('requestMethod', ''),
            'query': log_entry.get('requestQueryString', ''),
        })

if influencer_stock_logs:
    print(f"✅ インフルエンサーストック更新関連のログが見つかりました: {len(influencer_stock_logs)}件")
    for log in influencer_stock_logs:
        print(f"  - {log['time']}: {log['path']}?{log['query']} (Status: {log['status']}, Method: {log['method']})")
else:
    print("❌ インフルエンサーストック更新関連のログが見つかりませんでした")
    print("   理由の可能性:")
    print("   1. ログの時間範囲が、ストック更新のスケジュール時刻（UTC 2,6,10,14,18,22時）をカバーしていない")
    print("   2. ストック更新のCron Jobが実際に実行されていない")
    print("   3. パスが異なる可能性（例: /api/x-update-influencer-stock のみで、クエリパラメータが別）")

print()
