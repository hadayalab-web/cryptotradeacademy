import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

LOG_FILE = r'c:\Users\chiba\Downloads\logs_result.json'

print("="*80)
print("=== X APIエラー徹底調査 ===")
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

# X APIエラーを抽出
x_api_errors = []
rate_limit_issues = []
post_limit_issues = []

for log_entry in logs:
    message = log_entry.get('message', '')
    time_utc = log_entry.get('TimeUTC', '')
    request_path = log_entry.get('requestPath', '')
    status_code = log_entry.get('responseStatusCode', 0)
    
    # X APIエラー（400）を検索
    if 'X API Error' in message or 'X API' in message:
        if '400' in message or status_code == 400:
            x_api_errors.append({
                'time': time_utc,
                'path': request_path,
                'status': status_code,
                'message': message,
            })
    
    # レート制限関連
    if 'limit' in message.lower() or 'rate' in message.lower():
        rate_limit_issues.append({
            'time': time_utc,
            'path': request_path,
            'message': message,
        })
    
    # 投稿上限関連
    if '/25' in message or '/30' in message or 'Daily post count' in message or 'Hourly post count' in message:
        post_limit_issues.append({
            'time': time_utc,
            'path': request_path,
            'message': message,
        })

print("="*80)
print("=== 1. X APIエラー（400）詳細分析 ===")
print("="*80)
print(f"発見されたエラー数: {len(x_api_errors)}件\n")

if x_api_errors:
    for i, error in enumerate(x_api_errors, 1):
        print(f"【エラー #{i}】")
        print(f"  時刻: {error['time']}")
        print(f"  パス: {error['path']}")
        print(f"  ステータス: {error['status']}")
        print(f"  メッセージ:")
        # メッセージを整形して表示
        msg = error['message']
        if len(msg) > 500:
            print(f"    {msg[:500]}...")
        else:
            print(f"    {msg}")
        print()
        
        # JSONエラーを解析
        if '{"errors":' in msg or '"errors":' in msg:
            try:
                # JSON部分を抽出
                json_start = msg.find('{')
                json_end = msg.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = msg[json_start:json_end]
                    error_data = json.loads(json_str)
                    print(f"  エラー詳細（JSON）:")
                    print(f"    {json.dumps(error_data, indent=4, ensure_ascii=False)}")
                    print()
            except:
                pass
else:
    print("✅ X APIエラー（400）は見つかりませんでした\n")

print("="*80)
print("=== 2. レート制限関連の問題 ===")
print("="*80)
print(f"発見された問題数: {len(rate_limit_issues)}件\n")

if rate_limit_issues:
    for i, issue in enumerate(rate_limit_issues, 1):
        print(f"【問題 #{i}】")
        print(f"  時刻: {issue['time']}")
        print(f"  パス: {issue['path']}")
        print(f"  メッセージ: {issue['message']}")
        print()
else:
    print("✅ レート制限関連の問題は見つかりませんでした\n")

print("="*80)
print("=== 3. 投稿上限の不整合（30/25など） ===")
print("="*80)
print(f"発見された問題数: {len(post_limit_issues)}件\n")

if post_limit_issues:
    # パターンを分析
    limit_patterns = defaultdict(list)
    
    for issue in post_limit_issues:
        msg = issue['message']
        # パターンを抽出
        if 'Daily post count' in msg:
            limit_patterns['daily'].append(issue)
        elif 'Hourly post count' in msg:
            limit_patterns['hourly'].append(issue)
        elif '/25' in msg or '/30' in msg:
            limit_patterns['other'].append(issue)
    
    print("【Daily post count】")
    for issue in limit_patterns['daily']:
        print(f"  {issue['time']}: {issue['message']}")
    print()
    
    print("【Hourly post count】")
    for issue in limit_patterns['hourly']:
        print(f"  {issue['time']}: {issue['message']}")
    print()
    
    print("【その他の上限関連】")
    for issue in limit_patterns['other']:
        print(f"  {issue['time']}: {issue['message']}")
    print()
else:
    print("✅ 投稿上限関連の問題は見つかりませんでした\n")

print("="*80)
print("=== 調査完了 ===")
print("="*80)
