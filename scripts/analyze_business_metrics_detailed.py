import json
import sys
import re
from datetime import datetime
from collections import defaultdict
from urllib.parse import parse_qs

sys.stdout.reconfigure(encoding='utf-8')

SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko']

with open('data/vercel-logs/logs_result (1).json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== ビジネス指標の詳細分析 ===\n")

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
    time_span_hours = 24

# ログメッセージのサンプルを確認
print("=== ログメッセージのサンプル ===\n")

# X投稿関連
x_related = [r for r in data if 'x-quote-repost' in r.get('requestPath', '') or 'x-post' in r.get('requestPath', '')]
print(f"X投稿関連ログ: {len(x_related)}件\n")
for i, req in enumerate(x_related[:5], 1):
    msg = str(req.get('message', ''))[:300]
    print(f"{i}. {req.get('TimeUTC', '')}: {msg}")

print("\n" + "="*60 + "\n")

# 言語別の指標を集計
lang_metrics = defaultdict(lambda: {
    'posts': 0,
    'impressions': 0,
    'engagements': 0,
    'minimal_optins': 0,
    'whop_traffic': 0,
    'regular_conversions': 0,
})

seen_requests = set()

for req in data:
    request_path = req.get('requestPath', '')
    request_query = req.get('requestQueryString', '')
    message = str(req.get('message', ''))
    message_lower = message.lower()
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
    
    # メッセージから言語を推測
    if not lang:
        for l in SUPPORTED_LANGS:
            if f'lang={l}' in message_lower or f'language: {l}' in message_lower:
                lang = l
                break
    
    # 1. X投稿数のカウント
    if any(keyword in message_lower for keyword in [
        'posted successfully', 'posted to x', 'tweet posted', 
        'quote repost posted', 'x post posted', 'successfully posted',
        'tweet id:', 'posted quote repost'
    ]):
        if lang and lang in SUPPORTED_LANGS:
            lang_metrics[lang]['posts'] += 1
        else:
            # 言語が特定できない場合は均等に分割
            for l in SUPPORTED_LANGS:
                lang_metrics[l]['posts'] += 1.0 / len(SUPPORTED_LANGS)
    
    # 2. インプレッション数の抽出
    impression_patterns = [
        r'impressions?[:\s]+(\d+)',
        r'impression[s]?[:\s]+(\d+)',
        r'(\d+)\s+impressions?',
    ]
    for pattern in impression_patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            impressions = int(match.group(1))
            if lang and lang in SUPPORTED_LANGS:
                lang_metrics[lang]['impressions'] += impressions
            else:
                for l in SUPPORTED_LANGS:
                    lang_metrics[l]['impressions'] += impressions / len(SUPPORTED_LANGS)
            break
    
    # 3. エンゲージメント数の抽出
    engagement_patterns = [
        r'engagement[s]?[:\s]+(\d+)',
        r'(\d+)\s+engagement[s]?',
        r'likes?[:\s]+(\d+)',
        r'retweets?[:\s]+(\d+)',
        r'replies?[:\s]+(\d+)',
    ]
    for pattern in engagement_patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            engagements = int(match.group(1))
            if lang and lang in SUPPORTED_LANGS:
                lang_metrics[lang]['engagements'] += engagements
            else:
                for l in SUPPORTED_LANGS:
                    lang_metrics[l]['engagements'] += engagements / len(SUPPORTED_LANGS)
            break
    
    # 4. 無料版オプトイン数のカウント
    if any(keyword in message_lower for keyword in [
        'minimal version', 'free version', 'opt-in', 'started bot',
        'user started', 'telegram start', 'minimal briefing sent',
        'minimal briefing', 'free briefing'
    ]):
        if lang and lang in SUPPORTED_LANGS:
            lang_metrics[lang]['minimal_optins'] += 1
        else:
            for l in SUPPORTED_LANGS:
                lang_metrics[l]['minimal_optins'] += 1.0 / len(SUPPORTED_LANGS)
    
    # 5. Whopトラフィック数のカウント
    if any(keyword in message_lower for keyword in [
        'whop', 'whop.com', 'whop traffic', 'whop referral',
        'whop link', 'whop click'
    ]) or 'whop' in request_path.lower():
        if lang and lang in SUPPORTED_LANGS:
            lang_metrics[lang]['whop_traffic'] += 1
        else:
            for l in SUPPORTED_LANGS:
                lang_metrics[l]['whop_traffic'] += 1.0 / len(SUPPORTED_LANGS)
    
    # 6. 有料版成約数のカウント
    if any(keyword in message_lower for keyword in [
        'regular briefing', 'paid conversion', 'subscription',
        'purchase completed', 'whop purchase', 'conversion',
        'paid user', 'subscription started'
    ]):
        if lang and lang in SUPPORTED_LANGS:
            lang_metrics[lang]['regular_conversions'] += 1
        else:
            for l in SUPPORTED_LANGS:
                lang_metrics[l]['regular_conversions'] += 1.0 / len(SUPPORTED_LANGS)

# Cronジョブのスケジュールから期待値を計算
X_POST_JOBS = {
    '/api/x-quote-repost': {'schedule': '0 0,1,13,14,20,21,22 * * *', 'expected_per_day': 7},
    '/api/x-post-minimal-version-cron': {'schedule': '0 8,20 * * *', 'expected_per_day': 2},
    '/api/vsl1-post': {'schedule': '0 14,20 * * *', 'expected_per_day': 2},
}

MINIMAL_BRIEFING_JOBS = {
    '/api/cron': {'schedule': '*/15 * * * *', 'expected_per_day': 96, 'minimal_per_day': 4},
}

# 結果を表示
print("=== 言語別ビジネス指標（24時間あたり） ===\n")

for lang in SUPPORTED_LANGS:
    expected_posts = (X_POST_JOBS['/api/x-quote-repost']['expected_per_day'] + 
                      X_POST_JOBS['/api/x-post-minimal-version-cron']['expected_per_day'] + 
                      X_POST_JOBS['/api/vsl1-post']['expected_per_day']) / len(SUPPORTED_LANGS)
    
    expected_minimal_optins = MINIMAL_BRIEFING_JOBS['/api/cron']['minimal_per_day']
    
    actual = lang_metrics[lang]
    
    print(f"【{lang.upper()}】")
    print(f"  1. X投稿数:")
    print(f"    期待値（24時間）: {expected_posts:.1f}回")
    if time_span_hours > 0:
        actual_posts_24h = (actual['posts'] / time_span_hours) * 24
        print(f"    実際（24時間換算）: {actual_posts_24h:.2f}回")
    else:
        print(f"    実際: {actual['posts']:.2f}回")
    
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
        print(f"    実際（24時間換算）: {actual_minimal_24h:.2f}回")
    else:
        print(f"    実際: {actual['minimal_optins']:.2f}回")
    
    print(f"  5. Whopトラフィック数:")
    if time_span_hours > 0:
        actual_whop_24h = (actual['whop_traffic'] / time_span_hours) * 24
        print(f"    実際（24時間換算）: {actual_whop_24h:.2f}回")
    else:
        print(f"    実際: {actual['whop_traffic']:.2f}回")
    
    print(f"  6. 有料版（Regular Briefing）成約数:")
    if time_span_hours > 0:
        actual_conversions_24h = (actual['regular_conversions'] / time_span_hours) * 24
        print(f"    実際（24時間換算）: {actual_conversions_24h:.2f}回")
    else:
        print(f"    実際: {actual['regular_conversions']:.2f}回")
    
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
expected_total_minimal = MINIMAL_BRIEFING_JOBS['/api/cron']['minimal_per_day'] * len(SUPPORTED_LANGS)

print(f"1. X投稿数:")
print(f"  期待値（24時間）: {expected_total_posts:.1f}回")
if time_span_hours > 0:
    print(f"  実際（24時間換算）: {(total_posts / time_span_hours) * 24:.2f}回")
else:
    print(f"  実際: {total_posts:.2f}回")

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
    print(f"  実際（24時間換算）: {(total_minimal_optins / time_span_hours) * 24:.2f}回")
else:
    print(f"  実際: {total_minimal_optins:.2f}回")

print(f"\n5. Whopトラフィック数:")
if time_span_hours > 0:
    print(f"  実際（24時間換算）: {(total_whop_traffic / time_span_hours) * 24:.2f}回")
else:
    print(f"  実際: {total_whop_traffic:.2f}回")

print(f"\n6. 有料版（Regular Briefing）成約数:")
if time_span_hours > 0:
    print(f"  実際（24時間換算）: {(total_conversions / time_span_hours) * 24:.2f}回")
else:
    print(f"  実際: {total_conversions:.2f}回")

print("\n=== 期待値の根拠 ===\n")
print("X投稿数:")
print(f"  - x-quote-repost: {X_POST_JOBS['/api/x-quote-repost']['expected_per_day']}回/日")
print(f"  - x-post-minimal-version-cron: {X_POST_JOBS['/api/x-post-minimal-version-cron']['expected_per_day']}回/日")
print(f"  - vsl1-post: {X_POST_JOBS['/api/vsl1-post']['expected_per_day']}回/日")
print(f"  合計: {expected_total_posts}回/日（6言語で均等に分割）")
print(f"\n無料版オプトイン数:")
print(f"  - cron.js（4時間ごとの定期配信）: {MINIMAL_BRIEFING_JOBS['/api/cron']['minimal_per_day']}回/日 × {len(SUPPORTED_LANGS)}言語 = {expected_total_minimal}回/日")
