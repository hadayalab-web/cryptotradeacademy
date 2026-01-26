import json
import sys
import re
from datetime import datetime
from collections import defaultdict
from urllib.parse import parse_qs, urlparse

sys.stdout.reconfigure(encoding='utf-8')

# サポートされている言語
SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko']

with open('data/vercel-logs/logs_result (1).json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== 24時間で期待されるビジネス指標（言語別集計） ===\n")

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

# 言語別の指標を集計
lang_metrics = defaultdict(lambda: {
    'posts': 0,              # X投稿数
    'impressions': 0,        # インプレッション数
    'engagements': 0,       # エンゲージメント数
    'minimal_optins': 0,    # 無料版オプトイン数
    'whop_traffic': 0,      # Whopトラフィック数
    'regular_conversions': 0,  # 有料版成約数
})

# リクエストIDで重複を排除
seen_requests = set()

for req in data:
    request_path = req.get('requestPath', '')
    request_query = req.get('requestQueryString', '')
    message = str(req.get('message', '')).lower()
    req_id = req.get('requestId', '')
    
    # 重複排除
    if req_id:
        if req_id in seen_requests:
            continue
        seen_requests.add(req_id)
    else:
        time_str = req.get('TimeUTC', '')
        unique_key = f"{time_str}_{request_path}"
        if unique_key in seen_requests:
            continue
        seen_requests.add(unique_key)
    
    # 言語を抽出
    lang = None
    if request_query:
        parsed = parse_qs(request_query)
        if 'lang' in parsed:
            lang = parsed['lang'][0]
    
    if not lang and 'lang=' in request_path:
        try:
            lang = request_path.split('lang=')[1].split('&')[0].split('?')[0]
        except:
            pass
    
    # 言語が特定できない場合は、メッセージから言語を推測
    if not lang:
        # メッセージから言語を推測（例: "posted to X (en)"）
        lang_match = re.search(r'\b(en|es|pt-br|ar|ja|ko)\b', message)
        if lang_match:
            lang = lang_match.group(1)
    
    # 1. X投稿数のカウント
    if any(keyword in message for keyword in [
        'posted successfully', 'posted to x', 'tweet posted', 
        'quote repost posted', 'x post posted', 'successfully posted'
    ]):
        if lang and lang in SUPPORTED_LANGS:
            lang_metrics[lang]['posts'] += 1
        else:
            # 言語が特定できない場合は全言語にカウント（実際には1回だけ）
            for l in SUPPORTED_LANGS:
                lang_metrics[l]['posts'] += 0.17  # 6言語で均等に分割
    
    # 2. インプレッション数の抽出（メッセージから数値を抽出）
    impression_match = re.search(r'impressions?[:\s]+(\d+)', message, re.IGNORECASE)
    if impression_match:
        impressions = int(impression_match.group(1))
        if lang and lang in SUPPORTED_LANGS:
            lang_metrics[lang]['impressions'] += impressions
        else:
            for l in SUPPORTED_LANGS:
                lang_metrics[l]['impressions'] += impressions / 6
    
    # 3. エンゲージメント数の抽出
    engagement_match = re.search(r'engagement[s]?[:\s]+(\d+)', message, re.IGNORECASE)
    if engagement_match:
        engagements = int(engagement_match.group(1))
        if lang and lang in SUPPORTED_LANGS:
            lang_metrics[lang]['engagements'] += engagements
        else:
            for l in SUPPORTED_LANGS:
                lang_metrics[l]['engagements'] += engagements / 6
    
    # 4. 無料版オプトイン数のカウント
    if any(keyword in message for keyword in [
        'minimal version', 'free version', 'opt-in', 'started bot',
        'user started', 'telegram start', 'minimal briefing sent'
    ]):
        if lang and lang in SUPPORTED_LANGS:
            lang_metrics[lang]['minimal_optins'] += 1
        else:
            for l in SUPPORTED_LANGS:
                lang_metrics[l]['minimal_optins'] += 0.17
    
    # 5. Whopトラフィック数のカウント
    if any(keyword in message for keyword in [
        'whop', 'whop.com', 'whop traffic', 'whop referral'
    ]) or 'whop' in request_path.lower():
        if lang and lang in SUPPORTED_LANGS:
            lang_metrics[lang]['whop_traffic'] += 1
        else:
            for l in SUPPORTED_LANGS:
                lang_metrics[l]['whop_traffic'] += 0.17
    
    # 6. 有料版成約数のカウント
    if any(keyword in message for keyword in [
        'regular briefing', 'paid conversion', 'subscription', 
        'purchase completed', 'whop purchase', 'conversion'
    ]):
        if lang and lang in SUPPORTED_LANGS:
            lang_metrics[lang]['regular_conversions'] += 1
        else:
            for l in SUPPORTED_LANGS:
                lang_metrics[l]['regular_conversions'] += 0.17

# Cronジョブのスケジュールから期待値を計算
# X投稿関連のcronジョブ
X_POST_JOBS = {
    '/api/x-quote-repost': {'schedule': '0 0,1,13,14,20,21,22 * * *', 'expected_per_day': 7},
    '/api/x-post-minimal-version-cron': {'schedule': '0 8,20 * * *', 'expected_per_day': 2},
    '/api/vsl1-post': {'schedule': '0 14,20 * * *', 'expected_per_day': 2},
}

# 無料版配信のcronジョブ（cron.js内で多言語配信）
MINIMAL_BRIEFING_JOBS = {
    '/api/cron': {'schedule': '*/15 * * * *', 'expected_per_day': 96, 'minimal_per_day': 4},  # 4時間ごとの定期配信
}

# 結果を表示
print("=== 言語別ビジネス指標（24時間あたりの期待値） ===\n")

# 期待値の計算（スケジュールから）
for lang in SUPPORTED_LANGS:
    # X投稿数の期待値（言語別に配信される場合）
    # x-quote-repostは言語別に実行される可能性があるが、実際には1回だけ
    # 期待値は全投稿数を6言語で分割
    expected_posts = (X_POST_JOBS['/api/x-quote-repost']['expected_per_day'] + 
                      X_POST_JOBS['/api/x-post-minimal-version-cron']['expected_per_day'] + 
                      X_POST_JOBS['/api/vsl1-post']['expected_per_day']) / 6
    
    # 無料版オプトイン数の期待値（4時間ごとの定期配信 × 6言語）
    expected_minimal_optins = MINIMAL_BRIEFING_JOBS['/api/cron']['minimal_per_day']
    
    actual = lang_metrics[lang]
    
    print(f"【{lang.upper()}】")
    print(f"  1. X投稿数:")
    print(f"    期待値（24時間）: {expected_posts:.1f}回")
    if time_span_hours > 0:
        actual_posts_24h = (actual['posts'] / time_span_hours) * 24
        print(f"    実際（24時間換算）: {actual_posts_24h:.1f}回")
    else:
        print(f"    実際: {actual['posts']:.1f}回")
    
    print(f"  2. インプレッション数:")
    if time_span_hours > 0:
        actual_impressions_24h = (actual['impressions'] / time_span_hours) * 24
        print(f"    実際（24時間換算）: {actual_impressions_24h:.0f}")
    else:
        print(f"    実際: {actual['impressions']:.0f}")
    
    print(f"  3. エンゲージメント数:")
    if time_span_hours > 0:
        actual_engagements_24h = (actual['engagements'] / time_span_hours) * 24
        print(f"    実際（24時間換算）: {actual_engagements_24h:.0f}")
    else:
        print(f"    実際: {actual['engagements']:.0f}")
    
    print(f"  4. 無料版（Minimal Version）オプトイン数:")
    print(f"    期待値（24時間）: {expected_minimal_optins:.1f}回")
    if time_span_hours > 0:
        actual_minimal_24h = (actual['minimal_optins'] / time_span_hours) * 24
        print(f"    実際（24時間換算）: {actual_minimal_24h:.1f}回")
    else:
        print(f"    実際: {actual['minimal_optins']:.1f}回")
    
    print(f"  5. Whopトラフィック数:")
    if time_span_hours > 0:
        actual_whop_24h = (actual['whop_traffic'] / time_span_hours) * 24
        print(f"    実際（24時間換算）: {actual_whop_24h:.1f}回")
    else:
        print(f"    実際: {actual['whop_traffic']:.1f}回")
    
    print(f"  6. 有料版（Regular Briefing）成約数:")
    if time_span_hours > 0:
        actual_conversions_24h = (actual['regular_conversions'] / time_span_hours) * 24
        print(f"    実際（24時間換算）: {actual_conversions_24h:.1f}回")
    else:
        print(f"    実際: {actual['regular_conversions']:.1f}回")
    
    print()

# 全体サマリー
print("\n=== 全体サマリー（全言語合計） ===\n")

total_posts = sum(m['posts'] for m in lang_metrics.values())
total_impressions = sum(m['impressions'] for m in lang_metrics.values())
total_engagements = sum(m['engagements'] for m in lang_metrics.values())
total_minimal_optins = sum(m['minimal_optins'] for m in lang_metrics.values())
total_whop_traffic = sum(m['whop_traffic'] for m in lang_metrics.values())
total_conversions = sum(m['regular_conversions'] for m in lang_metrics.values())

expected_total_posts = sum(X_POST_JOBS[job]['expected_per_day'] for job in X_POST_JOBS)
expected_total_minimal = MINIMAL_BRIEFING_JOBS['/api/cron']['minimal_per_day'] * 6

print(f"1. X投稿数:")
print(f"  期待値（24時間）: {expected_total_posts:.1f}回")
if time_span_hours > 0:
    print(f"  実際（24時間換算）: {(total_posts / time_span_hours) * 24:.1f}回")
else:
    print(f"  実際: {total_posts:.1f}回")

print(f"\n2. インプレッション数:")
if time_span_hours > 0:
    print(f"  実際（24時間換算）: {(total_impressions / time_span_hours) * 24:.0f}")
else:
    print(f"  実際: {total_impressions:.0f}")

print(f"\n3. エンゲージメント数:")
if time_span_hours > 0:
    print(f"  実際（24時間換算）: {(total_engagements / time_span_hours) * 24:.0f}")
else:
    print(f"  実際: {total_engagements:.0f}")

print(f"\n4. 無料版（Minimal Version）オプトイン数:")
print(f"  期待値（24時間）: {expected_total_minimal:.1f}回")
if time_span_hours > 0:
    print(f"  実際（24時間換算）: {(total_minimal_optins / time_span_hours) * 24:.1f}回")
else:
    print(f"  実際: {total_minimal_optins:.1f}回")

print(f"\n5. Whopトラフィック数:")
if time_span_hours > 0:
    print(f"  実際（24時間換算）: {(total_whop_traffic / time_span_hours) * 24:.1f}回")
else:
    print(f"  実際: {total_whop_traffic:.1f}回")

print(f"\n6. 有料版（Regular Briefing）成約数:")
if time_span_hours > 0:
    print(f"  実際（24時間換算）: {(total_conversions / time_span_hours) * 24:.1f}回")
else:
    print(f"  実際: {total_conversions:.1f}回")

print("\n=== 注意事項 ===\n")
print("※ ログ期間が短いため、実際の値は24時間に換算した推定値です")
print("※ インプレッション数とエンゲージメント数は、X APIのメトリクスエンドポイントから取得する必要があります")
print("※ 無料版オプトイン数と成約数は、TelegramボットのstartコマンドやWhopのWebhookから取得する必要があります")
