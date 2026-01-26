import json
import sys
from collections import defaultdict
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

# ログファイルのパス
LOG_FILE = r'c:\Users\chiba\Downloads\logs_result.json'

# vercel.jsonから期待されるCron Jobs
EXPECTED_CRON_JOBS = {
    '/api/cron': {'schedule': '*/15 * * * *', 'expected_per_day': 96},
    '/api/x-post-free-report': {'schedule': '0 12,13,14,15,18 * * *', 'expected_per_day': 5},
    '/api/x-post-minimal-version-cron': {'schedule': '0 8,20 * * *', 'expected_per_day': 2},
    '/api/x-quote-repost': {'schedule': '0 0,1,13,14,20,21,22 * * *', 'expected_per_day': 7},
    '/api/x-update-influencer-stock?lang=en': {'schedule': '0 2 * * *', 'expected_per_day': 1},
    '/api/x-update-influencer-stock?lang=es': {'schedule': '0 6 * * *', 'expected_per_day': 1},
    '/api/x-update-influencer-stock?lang=pt-br': {'schedule': '0 10 * * *', 'expected_per_day': 1},
    '/api/x-update-influencer-stock?lang=ar': {'schedule': '0 14 * * *', 'expected_per_day': 1},
    '/api/x-update-influencer-stock?lang=ja': {'schedule': '0 18 * * *', 'expected_per_day': 1},
    '/api/x-update-influencer-stock?lang=ko': {'schedule': '0 22 * * *', 'expected_per_day': 1},
}

print("="*80)
print("=== すべてのCron Jobs実行状況チェック ===")
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

# ログエントリの構造を確認
if logs:
    print("📋 ログエントリの構造:")
    sample = logs[0]
    for key in sample.keys():
        print(f"   - {key}")
    print()

# Cron Jobsの実行状況を集計
cron_executions = defaultdict(lambda: {'count': 0, 'success': 0, 'errors': 0, 'request_ids': set(), 'status_codes': defaultdict(int), 'error_messages': []})
all_request_ids = set()

# ログを分析
for log_entry in logs:
    request_path = log_entry.get('requestPath', '')
    request_id = log_entry.get('requestId', '')
    status_code = log_entry.get('responseStatusCode', 0)
    message = log_entry.get('message', '')
    time_utc = log_entry.get('TimeUTC', '')
    
    # requestIdで重複排除
    if request_id:
        all_request_ids.add(request_id)
    
    # Cron Jobsのパスをチェック
    for cron_path, cron_info in EXPECTED_CRON_JOBS.items():
        if cron_path in request_path:
            # requestIdで重複排除
            if request_id and request_id in cron_executions[cron_path]['request_ids']:
                continue
            
            cron_executions[cron_path]['count'] += 1
            cron_executions[cron_path]['request_ids'].add(request_id)
            cron_executions[cron_path]['status_codes'][status_code] += 1
            
            if status_code == 200:
                cron_executions[cron_path]['success'] += 1
            else:
                cron_executions[cron_path]['errors'] += 1
                if message:
                    cron_executions[cron_path]['error_messages'].append({
                        'time': time_utc,
                        'status': status_code,
                        'message': message[:200]  # 最初の200文字のみ
                    })
            break

# 結果を表示
print("="*80)
print("=== Cron Jobs実行状況サマリー ===")
print("="*80)
print()

total_executions = 0
total_success = 0
total_errors = 0

for cron_path, cron_info in EXPECTED_CRON_JOBS.items():
    exec_data = cron_executions[cron_path]
    count = exec_data['count']
    success = exec_data['success']
    errors = exec_data['errors']
    unique_requests = len(exec_data['request_ids'])
    
    total_executions += count
    total_success += success
    total_errors += errors
    
    print(f"【{cron_path}】")
    print(f"  スケジュール: {cron_info['schedule']}")
    print(f"  期待実行回数/日: {cron_info['expected_per_day']}")
    print(f"  実際の実行回数: {count}回（重複排除後: {unique_requests}回）")
    print(f"  成功: {success}回")
    print(f"  エラー: {errors}回")
    
    # ステータスコード別の内訳
    if exec_data['status_codes']:
        print(f"  ステータスコード別:")
        for status, cnt in sorted(exec_data['status_codes'].items()):
            print(f"    {status}: {cnt}回")
    
    # エラーメッセージ（最初の3件まで）
    if exec_data['error_messages']:
        print(f"  エラーメッセージ（最初の3件）:")
        for i, err in enumerate(exec_data['error_messages'][:3], 1):
            print(f"    {i}. [{err['time']}] Status {err['status']}: {err['message']}")
    
    # 実行率の評価
    if count > 0:
        success_rate = (success / count) * 100
        if success_rate >= 95:
            status_icon = "✅"
        elif success_rate >= 80:
            status_icon = "⚠️"
        else:
            status_icon = "❌"
        print(f"  成功率: {status_icon} {success_rate:.1f}%")
    else:
        print(f"  状態: ❌ 実行されていません")
    
    print()

# 全体サマリー
print("="*80)
print("=== 全体サマリー ===")
print("="*80)
print(f"総実行回数: {total_executions}回")
print(f"成功: {total_success}回")
print(f"エラー: {total_errors}回")
if total_executions > 0:
    overall_success_rate = (total_success / total_executions) * 100
    print(f"全体成功率: {overall_success_rate:.1f}%")
print(f"ユニークなrequestId数: {len(all_request_ids)}")
print()

# 実行されていないCron Jobsをチェック
print("="*80)
print("=== 実行されていないCron Jobs ===")
print("="*80)
not_executed = []
for cron_path, cron_info in EXPECTED_CRON_JOBS.items():
    if cron_executions[cron_path]['count'] == 0:
        not_executed.append(cron_path)
        print(f"❌ {cron_path} (スケジュール: {cron_info['schedule']})")

if not not_executed:
    print("✅ すべてのCron Jobsが実行されています")
print()

# エラーが多いCron Jobsをチェック
print("="*80)
print("=== エラーが多いCron Jobs（上位5件） ===")
print("="*80)
error_ranking = sorted(
    [(path, data['errors'], data['count']) for path, data in cron_executions.items() if data['errors'] > 0],
    key=lambda x: x[1],
    reverse=True
)

if error_ranking:
    for i, (path, errors, total) in enumerate(error_ranking[:5], 1):
        error_rate = (errors / total * 100) if total > 0 else 0
        print(f"{i}. {path}")
        print(f"   エラー数: {errors}回 / 総実行数: {total}回 (エラー率: {error_rate:.1f}%)")
else:
    print("✅ エラーはありません")
print()

# 詳細なエラー分析
print("="*80)
print("=== 詳細なエラー分析 ===")
print("="*80)
for cron_path, exec_data in cron_executions.items():
    if exec_data['errors'] > 0:
        print(f"\n【{cron_path}】")
        print(f"  エラー数: {exec_data['errors']}回")
        print(f"  エラーメッセージ（全件）:")
        for i, err in enumerate(exec_data['error_messages'], 1):
            print(f"    {i}. [{err['time']}] Status {err['status']}")
            print(f"       {err['message']}")

print("\n" + "="*80)
print("=== チェック完了 ===")
print("="*80)
