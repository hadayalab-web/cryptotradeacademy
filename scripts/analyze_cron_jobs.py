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

print("=== CRON JOBS ANALYSIS ===\n")

# 各cronジョブのリクエストを抽出
cron_requests = defaultdict(list)
for req in data:
    request_path = req.get('requestPath', '')
    for cron_path in CRON_JOBS.keys():
        if cron_path in request_path:
            cron_requests[cron_path].append(req)
            break

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
    time_span_hours = 24  # デフォルト値

print("=== CRON JOB EXECUTION STATUS ===\n")

for cron_path, config in CRON_JOBS.items():
    requests = cron_requests[cron_path]
    name = config['name']
    schedule = config['schedule']
    expected_per_hour = config['expected_per_hour']
    
    print(f"【{name}】")
    print(f"  パス: {cron_path}")
    print(f"  スケジュール: {schedule}")
    print(f"  実行回数: {len(requests)}")
    
    if time_span_hours > 0:
        actual_per_hour = len(requests) / time_span_hours
        print(f"  実際の実行頻度: {actual_per_hour:.2f}回/時間")
        
        if expected_per_hour > 0:
            expected_total = expected_per_hour * time_span_hours
            print(f"  期待される実行回数: {expected_total:.1f}回")
            print(f"  実行率: {len(requests)/expected_total*100:.1f}%")
            
            if len(requests) < expected_total * 0.8:
                print(f"  ⚠️  警告: 期待される実行回数より少ないです")
            elif len(requests) > expected_total * 1.2:
                print(f"  ⚠️  警告: 期待される実行回数より多いです")
            else:
                print(f"  ✅ 正常範囲内")
    
    # ステータスコード分析
    status_counts = defaultdict(int)
    for req in requests:
        status = req.get('responseStatusCode', 'N/A')
        status_counts[status] += 1
    
    if status_counts:
        print(f"  ステータスコード:")
        for status, count in sorted(status_counts.items()):
            percentage = count / len(requests) * 100
            print(f"    {status}: {count} ({percentage:.1f}%)")
    
    # エラー率
    error_count = sum(count for status, count in status_counts.items() if status >= 400)
    if error_count > 0:
        error_rate = error_count / len(requests) * 100
        print(f"  ⚠️  エラー率: {error_rate:.1f}% ({error_count}/{len(requests)})")
    
    print()

# 時間別の実行状況
print("\n=== EXECUTION BY HOUR (UTC) ===\n")
hour_breakdown = defaultdict(lambda: defaultdict(int))
for cron_path, requests in cron_requests.items():
    for req in requests:
        time_str = req.get('TimeUTC', '')
        if time_str:
            try:
                dt = datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
                hour = dt.hour
                hour_breakdown[hour][cron_path] += 1
            except:
                pass

for hour in sorted(hour_breakdown.keys()):
    print(f"UTC {hour:02d}:00")
    for cron_path, count in sorted(hour_breakdown[hour].items()):
        name = CRON_JOBS[cron_path]['name']
        print(f"  {name}: {count}回")
    print()

# 実行されていないcronジョブの確認
print("\n=== MISSING CRON JOBS ===\n")
missing_jobs = []
for cron_path, config in CRON_JOBS.items():
    if cron_path not in cron_requests or len(cron_requests[cron_path]) == 0:
        missing_jobs.append((cron_path, config['name']))

if missing_jobs:
    for cron_path, name in missing_jobs:
        print(f"⚠️  {name} ({cron_path}): 実行記録が見つかりません")
else:
    print("✅ すべてのcronジョブに実行記録があります")

# 予期しないリクエストパスの確認
print("\n=== UNEXPECTED REQUEST PATHS ===\n")
all_paths = set()
for req in data:
    path = req.get('requestPath', '')
    if '/api/' in path:
        all_paths.add(path)

expected_paths = set(CRON_JOBS.keys())
unexpected = []
for path in all_paths:
    is_expected = any(cron_path in path for cron_path in expected_paths)
    if not is_expected and '/api/' in path:
        unexpected.append(path)

if unexpected:
    print("予期しないAPIパスが見つかりました:")
    for path in sorted(set(unexpected))[:20]:  # 最初の20個まで
        count = len([r for r in data if r.get('requestPath', '') == path])
        print(f"  {path}: {count}回")
else:
    print("✅ 予期しないAPIパスは見つかりませんでした")
