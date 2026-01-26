import json
import sys
from datetime import datetime
from collections import defaultdict
from urllib.parse import parse_qs, urlparse

sys.stdout.reconfigure(encoding='utf-8')

# サポートされている言語
SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko']

# Cronジョブの設定（vercel.jsonから）
CRON_JOBS = {
    '/api/cron': {'schedule': '*/15 * * * *', 'expected_per_day': 96, 'name': 'Cron (15分ごと)'},
    '/api/weekly-report': {'schedule': '0 0 * * 0', 'expected_per_day': 0.14, 'name': 'Weekly Report (毎週日曜)'},
    '/api/vsl1-post': {'schedule': '0 14,20 * * *', 'expected_per_day': 2, 'name': 'VSL1 Post'},
    '/api/vsl2-free-users': {'schedule': '0 * * * *', 'expected_per_day': 24, 'name': 'VSL2 Free Users'},
    '/api/vsl1-reminder': {'schedule': '0 */12 * * *', 'expected_per_day': 2, 'name': 'VSL1 Reminder'},
    '/api/vsl2-last-call': {'schedule': '0 * * * *', 'expected_per_day': 24, 'name': 'VSL2 Last Call'},
    '/api/promo-stock-monitor': {'schedule': '*/15 * * * *', 'expected_per_day': 96, 'name': 'Promo Stock Monitor'},
    '/api/monthly-engagement-report': {'schedule': '0 0 1 * *', 'expected_per_day': 0.033, 'name': 'Monthly Report'},
    '/api/x-post-free-report': {'schedule': '0 12,13,14,15,18 * * *', 'expected_per_day': 5, 'name': 'X Post Free Report'},
    '/api/x-post-minimal-version-cron': {'schedule': '0 8,20 * * *', 'expected_per_day': 2, 'name': 'X Post Minimal'},
    '/api/x-quote-repost': {'schedule': '0 0,1,13,14,20,21,22 * * *', 'expected_per_day': 7, 'name': 'X Quote Repost'},
    '/api/x-update-influencer-stock': {'schedule': '0 2,6,10,14,18,22 * * *', 'expected_per_day': 6, 'name': 'X Update Influencer Stock', 'lang_specific': True},
    '/api/x-quote-repost-metrics': {'schedule': '0 1 * * *', 'expected_per_day': 1, 'name': 'X Quote Repost Metrics'},
    '/api/x-engagement-metrics': {'schedule': '0 0 * * *', 'expected_per_day': 1, 'name': 'X Engagement Metrics'},
    '/api/x-post-performance-analysis': {'schedule': '0 1 * * *', 'expected_per_day': 1, 'name': 'X Post Performance Analysis'},
    '/api/x-influencer-report': {'schedule': '0 9 * * 1', 'expected_per_day': 0.14, 'name': 'X Influencer Report'},
    '/api/x-algorithm-analysis': {'schedule': '0 10 * * 1', 'expected_per_day': 0.14, 'name': 'X Algorithm Analysis'},
}

# 言語別のスケジュール（vercel.jsonから）
LANG_SCHEDULES = {
    'en': {'schedule': '0 2 * * *', 'expected_per_day': 1},
    'es': {'schedule': '0 6 * * *', 'expected_per_day': 1},
    'pt-br': {'schedule': '0 10 * * *', 'expected_per_day': 1},
    'ar': {'schedule': '0 14 * * *', 'expected_per_day': 1},
    'ja': {'schedule': '0 18 * * *', 'expected_per_day': 1},
    'ko': {'schedule': '0 22 * * *', 'expected_per_day': 1},
}

with open('data/vercel-logs/logs_result (1).json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== 24時間で期待される実行回数（言語別集計） ===\n")

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

# 言語別の実行回数を集計
lang_stats = defaultdict(lambda: {
    'total_expected': 0,
    'total_actual': 0,
    'success_actual': 0,
    'failed_actual': 0,
    'endpoints': defaultdict(lambda: {'expected': 0, 'actual': 0, 'success': 0, 'failed': 0})
})

# リクエストIDで重複を排除しながら処理
seen_requests = set()

for req in data:
    request_path = req.get('requestPath', '')
    request_query = req.get('requestQueryString', '')
    req_id = req.get('requestId', '')
    
    # リクエストIDで重複を排除
    if req_id:
        if req_id in seen_requests:
            continue
        seen_requests.add(req_id)
    else:
        # リクエストIDがない場合はタイムスタンプとパスで判定
        time_str = req.get('TimeUTC', '')
        unique_key = f"{time_str}_{request_path}"
        if unique_key in seen_requests:
            continue
        seen_requests.add(unique_key)
    
    # 言語を抽出（クエリパラメータまたはパスから）
    lang = None
    if request_query:
        parsed = parse_qs(request_query)
        if 'lang' in parsed:
            lang = parsed['lang'][0]
    
    # パスから言語を抽出（例: /api/x-update-influencer-stock?lang=en）
    if not lang and 'lang=' in request_path:
        try:
            lang = request_path.split('lang=')[1].split('&')[0].split('?')[0]
        except:
            pass
    
    # エンドポイントを特定
    endpoint = None
    for cron_path in CRON_JOBS.keys():
        if cron_path in request_path or request_path.endswith(cron_path):
            endpoint = cron_path
            break
    
    if not endpoint:
        continue
    
    # ステータスコードを確認
    status = req.get('responseStatusCode', 0)
    try:
        status_code = int(status) if status else 0
    except:
        status_code = 0
    
    # 成功/失敗を判定
    is_success = (200 <= status_code < 300) or (status_code == 0)
    
    # 言語が特定できる場合（言語固有のエンドポイント）
    if lang and lang in SUPPORTED_LANGS:
        lang_stats[lang]['total_actual'] += 1
        if is_success:
            lang_stats[lang]['success_actual'] += 1
        else:
            lang_stats[lang]['failed_actual'] += 1
        
        lang_stats[lang]['endpoints'][endpoint]['actual'] += 1
        if is_success:
            lang_stats[lang]['endpoints'][endpoint]['success'] += 1
        else:
            lang_stats[lang]['endpoints'][endpoint]['failed'] += 1
    # 言語が特定できない場合（言語非依存のエンドポイント）
    # すべての言語にカウント（実際には言語非依存なので、これは別の集計方法が必要）
    # ここでは言語非依存のエンドポイントは「all」として集計

# 期待値を計算
for lang in SUPPORTED_LANGS:
    # 言語固有のエンドポイント（x-update-influencer-stock）
    if lang in LANG_SCHEDULES:
        lang_stats[lang]['total_expected'] += LANG_SCHEDULES[lang]['expected_per_day']
        lang_stats[lang]['endpoints']['/api/x-update-influencer-stock']['expected'] = LANG_SCHEDULES[lang]['expected_per_day']
    
    # 言語非依存のエンドポイントは、各言語で実行される可能性があるが、
    # 実際には1回だけ実行されるので、ここでは言語別の期待値には含めない

# 結果を表示
print("=== 言語別実行回数（24時間あたりの期待値） ===\n")

for lang in SUPPORTED_LANGS:
    stats = lang_stats[lang]
    expected = stats['total_expected']
    actual = stats['total_actual']
    success = stats['success_actual']
    failed = stats['failed_actual']
    
    # ログ期間を24時間に換算した期待値
    expected_24h = expected  # 既に24時間あたりの期待値
    
    print(f"【{lang.upper()}】")
    print(f"  期待される実行回数（24時間）: {expected_24h:.1f}回")
    
    # ログ期間中の実際の実行回数を24時間に換算
    if time_span_hours > 0:
        actual_24h = (actual / time_span_hours) * 24
        success_24h = (success / time_span_hours) * 24
        failed_24h = (failed / time_span_hours) * 24
        
        print(f"  実際の実行回数（ログ期間中）: {actual}回")
        print(f"  24時間に換算した実行回数: {actual_24h:.1f}回")
        print(f"  成功（24時間換算）: {success_24h:.1f}回")
        print(f"  失敗（24時間換算）: {failed_24h:.1f}回")
        
        if actual > 0:
            success_rate = (success / actual) * 100
            print(f"  成功率: {success_rate:.1f}%")
        
        # 期待値との比較
        if expected_24h > 0:
            execution_rate = (actual_24h / expected_24h) * 100
            print(f"  実行率（期待値に対する）: {execution_rate:.1f}%")
    else:
        print(f"  実際の実行回数: {actual}回")
        print(f"  成功: {success}回")
        print(f"  失敗: {failed}回")
    
    # エンドポイント別の詳細
    if stats['endpoints']:
        print(f"  エンドポイント別:")
        for endpoint, ep_stats in stats['endpoints'].items():
            ep_name = CRON_JOBS.get(endpoint, {}).get('name', endpoint)
            print(f"    - {ep_name}:")
            print(f"      期待（24時間）: {ep_stats['expected']:.1f}回")
            if time_span_hours > 0:
                ep_actual_24h = (ep_stats['actual'] / time_span_hours) * 24
                print(f"      実際（24時間換算）: {ep_actual_24h:.1f}回")
            else:
                print(f"      実際: {ep_stats['actual']}回")
            print(f"      成功: {ep_stats['success']}回")
            print(f"      失敗: {ep_stats['failed']}回")
    
    print()

# 全体のサマリー
print("\n=== 全体サマリー ===\n")
total_expected = sum(stats['total_expected'] for stats in lang_stats.values())
total_actual = sum(stats['total_actual'] for stats in lang_stats.values())
total_success = sum(stats['success_actual'] for stats in lang_stats.values())
total_failed = sum(stats['failed_actual'] for stats in lang_stats.values())

print(f"全言語合計（24時間あたり）:")
print(f"  期待される実行回数: {total_expected:.1f}回")
print(f"  実際の実行回数: {total_actual}回")
print(f"  成功: {total_success}回")
print(f"  失敗: {total_failed}回")

if total_actual > 0:
    overall_success_rate = (total_success / total_actual) * 100
    print(f"  成功率: {overall_success_rate:.1f}%")

# 言語別の期待実行回数の内訳
print("\n=== 言語別期待実行回数の内訳 ===\n")
print("各言語は1日1回実行されるスケジュール:")
for lang, schedule_info in LANG_SCHEDULES.items():
    print(f"  {lang.upper()}: {schedule_info['schedule']} (期待: {schedule_info['expected_per_day']}回/日)")
