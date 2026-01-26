import json
import sys
from datetime import datetime
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

# Cronジョブの設定（vercel.jsonから）
CRON_JOBS = {
    '/api/cron': {'schedule': '*/15 * * * *', 'expected_per_hour': 4, 'name': 'Cron (15分ごと)'},
    '/api/weekly-report': {'schedule': '0 0 * * 0', 'expected_per_hour': 0, 'name': 'Weekly Report (毎週日曜)'},
    '/api/vsl1-post': {'schedule': '0 14,20 * * *', 'expected_per_hour': 0, 'name': 'VSL1 Post (14:00, 20:00 UTC)'},
    '/api/vsl2-free-users': {'schedule': '0 * * * *', 'expected_per_hour': 1, 'name': 'VSL2 Free Users (毎時)'},
    '/api/vsl1-reminder': {'schedule': '0 */12 * * *', 'expected_per_hour': 0, 'name': 'VSL1 Reminder (12時間ごと)'},
    '/api/vsl2-last-call': {'schedule': '0 * * * *', 'expected_per_hour': 1, 'name': 'VSL2 Last Call (毎時)'},
    '/api/promo-stock-monitor': {'schedule': '*/15 * * * *', 'expected_per_hour': 4, 'name': 'Promo Stock Monitor (15分ごと)'},
    '/api/monthly-engagement-report': {'schedule': '0 0 1 * *', 'expected_per_hour': 0, 'name': 'Monthly Report (毎月1日)'},
    '/api/x-post-free-report': {'schedule': '0 12,13,14,15,18 * * *', 'expected_per_hour': 0, 'name': 'X Post Free Report (12,13,14,15,18時)'},
    '/api/x-post-minimal-version-cron': {'schedule': '0 8,20 * * *', 'expected_per_hour': 0, 'name': 'X Post Minimal (8:00, 20:00 UTC)'},
    '/api/x-quote-repost': {'schedule': '0 0,1,13,14,20,21,22 * * *', 'expected_per_hour': 0, 'name': 'X Quote Repost (0,1,13,14,20,21,22時)'},
    '/api/x-update-influencer-stock': {'schedule': '0 2,6,10,14,18,22 * * *', 'expected_per_hour': 0, 'name': 'X Update Influencer Stock (2,6,10,14,18,22時)'},
    '/api/x-quote-repost-metrics': {'schedule': '0 1 * * *', 'expected_per_hour': 0, 'name': 'X Quote Repost Metrics (毎日1時)'},
    '/api/x-engagement-metrics': {'schedule': '0 0 * * *', 'expected_per_hour': 1, 'name': 'X Engagement Metrics (毎日0時)'},
    '/api/x-post-performance-analysis': {'schedule': '0 1 * * *', 'expected_per_hour': 0, 'name': 'X Post Performance Analysis (毎日1時)'},
    '/api/x-influencer-report': {'schedule': '0 9 * * 1', 'expected_per_hour': 0, 'name': 'X Influencer Report (毎週月曜9時)'},
    '/api/x-algorithm-analysis': {'schedule': '0 10 * * 1', 'expected_per_hour': 0, 'name': 'X Algorithm Analysis (毎週月曜10時)'},
}

with open('data/vercel-logs/logs_result (1).json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== CRON JOBS ACCURATE ANALYSIS ===\n")
print("（リクエストIDで重複を排除した正確な分析）\n")

# 時間範囲を確認
all_times = []
for req in data:
    time_str = req.get('TimeUTC', '')
    if time_str:
        try:
            dt = datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
            all_times.append(dt)
        except:
            pass

if all_times:
    min_time = min(all_times)
    max_time = max(all_times)
    time_span_hours = (max_time - min_time).total_seconds() / 3600
    print(f"ログ期間: {min_time.strftime('%Y-%m-%d %H:%M:%S')} ～ {max_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"期間: {time_span_hours:.1f}時間 ({time_span_hours/24:.1f}日)\n")
else:
    print("時間情報が見つかりません\n")
    time_span_hours = 24

print("=== CRON JOB EXECUTION STATUS ===\n")

for cron_path, config in CRON_JOBS.items():
    # 該当するリクエストを抽出
    requests = [r for r in data if cron_path in r.get('requestPath', '')]
    
    # リクエストIDで重複を排除
    unique_requests = {}
    for req in requests:
        req_id = req.get('requestId', '')
        if req_id and req_id not in unique_requests:
            unique_requests[req_id] = req
        elif not req_id:
            # リクエストIDがない場合はタイムスタンプとパスで判定
            time_str = req.get('TimeUTC', '')
            key = f"{time_str}_{cron_path}"
            if key not in unique_requests:
                unique_requests[key] = req
    
    unique_count = len(unique_requests)
    total_count = len(requests)
    duplicate_count = total_count - unique_count
    
    name = config['name']
    schedule = config['schedule']
    expected_per_hour = config['expected_per_hour']
    
    print(f"【{name}】")
    print(f"  パス: {cron_path}")
    print(f"  スケジュール: {schedule}")
    print(f"  総ログ数: {total_count}件")
    print(f"  重複ログ: {duplicate_count}件")
    print(f"  実際の実行回数: {unique_count}回")
    
    if time_span_hours > 0:
        actual_per_hour = unique_count / time_span_hours
        print(f"  実際の実行頻度: {actual_per_hour:.2f}回/時間")
        
        if expected_per_hour > 0:
            expected_total = expected_per_hour * time_span_hours
            print(f"  期待される実行回数: {expected_total:.1f}回")
            if expected_total > 0:
                execution_rate = unique_count / expected_total * 100
                print(f"  実行率: {execution_rate:.1f}%")
                
                if unique_count < expected_total * 0.8:
                    print(f"  ⚠️  警告: 期待される実行回数より少ないです")
                elif unique_count > expected_total * 1.2:
                    print(f"  ⚠️  警告: 期待される実行回数より多いです")
                else:
                    print(f"  ✅ 正常範囲内")
    
    # ステータスコード分析（重複排除後）
    status_counts = defaultdict(int)
    for req in unique_requests.values():
        status = req.get('responseStatusCode', 'N/A')
        status_counts[status] += 1
    
    if status_counts:
        print(f"  ステータスコード:")
        for status, count in sorted(status_counts.items()):
            percentage = count / unique_count * 100
            print(f"    {status}: {count} ({percentage:.1f}%)")
    
    # エラー率
    error_count = sum(count for status, count in status_counts.items() if isinstance(status, int) and status >= 400)
    if error_count > 0:
        error_rate = error_count / unique_count * 100
        print(f"  ⚠️  エラー率: {error_rate:.1f}% ({error_count}/{unique_count})")
    else:
        print(f"  ✅ エラーなし")
    
    print()

# サマリー
print("\n=== SUMMARY ===\n")
executed_jobs = []
not_executed_jobs = []
problematic_jobs = []

for cron_path, config in CRON_JOBS.items():
    requests = [r for r in data if cron_path in r.get('requestPath', '')]
    unique_requests = {}
    for req in requests:
        req_id = req.get('requestId', '')
        if req_id and req_id not in unique_requests:
            unique_requests[req_id] = req
        elif not req_id:
            time_str = req.get('TimeUTC', '')
            key = f"{time_str}_{cron_path}"
            if key not in unique_requests:
                unique_requests[key] = req
    
    unique_count = len(unique_requests)
    expected_per_hour = config['expected_per_hour']
    
    if unique_count == 0:
        not_executed_jobs.append((config['name'], cron_path))
    elif expected_per_hour > 0:
        expected_total = expected_per_hour * time_span_hours
        if unique_count < expected_total * 0.8 or unique_count > expected_total * 1.2:
            problematic_jobs.append((config['name'], unique_count, expected_total))
        else:
            executed_jobs.append((config['name'], unique_count))
    else:
        executed_jobs.append((config['name'], unique_count))

print(f"✅ 正常に実行されているcronジョブ: {len(executed_jobs)}件")
for name, count in executed_jobs[:10]:
    print(f"  - {name}: {count}回")

if problematic_jobs:
    print(f"\n⚠️  実行回数に問題があるcronジョブ: {len(problematic_jobs)}件")
    for name, actual, expected in problematic_jobs:
        print(f"  - {name}: 実際{actual}回 / 期待{expected:.1f}回")

if not_executed_jobs:
    print(f"\n⚠️  ログ期間中に実行されていないcronジョブ: {len(not_executed_jobs)}件")
    print("  （スケジュール上、この時間帯に実行されない可能性があります）")
    for name, path in not_executed_jobs[:10]:
        print(f"  - {name}")
