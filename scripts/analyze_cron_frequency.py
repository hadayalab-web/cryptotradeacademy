import json
import sys
from datetime import datetime
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

with open('data/vercel-logs/logs_result (1).json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 実行回数が多いcronジョブを詳しく分析
TARGET_JOBS = ['/api/cron', '/api/promo-stock-monitor', '/api/vsl2-free-users', '/api/vsl2-last-call']

print("=== CRON JOB FREQUENCY ANALYSIS ===\n")

for target_path in TARGET_JOBS:
    requests = [r for r in data if target_path in r.get('requestPath', '')]
    
    if not requests:
        continue
    
    print(f"【{target_path}】")
    print(f"総実行回数: {len(requests)}\n")
    
    # 時間別の実行回数
    time_breakdown = defaultdict(list)
    for req in requests:
        time_str = req.get('TimeUTC', '')
        if time_str:
            try:
                dt = datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
                minute_key = dt.strftime('%H:%M')
                time_breakdown[minute_key].append(req)
            except:
                pass
    
    print("時間別実行回数（上位20件）:")
    for time_key in sorted(time_breakdown.keys())[:20]:
        count = len(time_breakdown[time_key])
        print(f"  {time_key}: {count}回")
    
    # 15分間隔で実行されているか確認
    print("\n15分間隔での実行パターン:")
    minute_counts = defaultdict(int)
    for req in requests:
        time_str = req.get('TimeUTC', '')
        if time_str:
            try:
                dt = datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
                minute = dt.minute
                minute_counts[minute] += 1
            except:
                pass
    
    # 15分間隔（0, 15, 30, 45分）での実行を確認
    expected_minutes = [0, 15, 30, 45]
    for minute in expected_minutes:
        count = minute_counts.get(minute, 0)
        print(f"  {minute:02d}分: {count}回")
    
    # リクエストのUser-Agentを確認（cronか手動実行か）
    print("\nUser-Agent分析:")
    user_agents = defaultdict(int)
    for req in requests:
        ua = req.get('requestUserAgent', 'N/A')
        user_agents[ua] += 1
    
    for ua, count in sorted(user_agents.items(), key=lambda x: x[1], reverse=True):
        percentage = count / len(requests) * 100
        print(f"  {ua}: {count}回 ({percentage:.1f}%)")
    
    # リクエストIDの重複チェック（同じリクエストが複数回ログに記録されている可能性）
    request_ids = defaultdict(int)
    for req in requests:
        req_id = req.get('requestId', 'N/A')
        request_ids[req_id] += 1
    
    duplicates = {rid: count for rid, count in request_ids.items() if count > 1}
    if duplicates:
        print(f"\n⚠️  重複リクエストID: {len(duplicates)}件")
        for rid, count in list(duplicates.items())[:5]:
            print(f"  {rid}: {count}回")
    else:
        print("\n✅ リクエストIDの重複なし")
    
    # 連続実行の確認（短時間に複数回実行されているか）
    print("\n連続実行の分析（1分以内に複数回実行）:")
    sorted_requests = sorted(requests, key=lambda x: x.get('TimeUTC', ''))
    consecutive_count = 0
    for i in range(len(sorted_requests) - 1):
        time1_str = sorted_requests[i].get('TimeUTC', '')
        time2_str = sorted_requests[i+1].get('TimeUTC', '')
        if time1_str and time2_str:
            try:
                dt1 = datetime.strptime(time1_str, '%Y-%m-%d %H:%M:%S')
                dt2 = datetime.strptime(time2_str, '%Y-%m-%d %H:%M:%S')
                diff_seconds = (dt2 - dt1).total_seconds()
                if diff_seconds < 60:
                    consecutive_count += 1
            except:
                pass
    
    if consecutive_count > 0:
        print(f"  ⚠️  1分以内の連続実行: {consecutive_count}回")
    else:
        print("  ✅ 連続実行なし")
    
    print("\n" + "="*60 + "\n")
