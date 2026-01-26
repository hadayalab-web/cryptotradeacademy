import json
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

with open('data/vercel-logs/logs_result (1).json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# x-quote-repostのリクエストを抽出
x_quote_requests = [x for x in data if 'x-quote-repost' in x.get('requestPath', '')]

print("=== DETAILED ANALYSIS ===\n")

# 実際に投稿されたかどうかを判定
actually_posted = []
skipped_early = []
skipped_timing = []
skipped_influencer = []
no_influencers = []
metrics_only = []

for req in x_quote_requests:
    message = str(req.get('message', ''))
    time_utc = req.get('TimeUTC', '')
    
    # Metricsエンドポイントは除外
    if 'Quote Repost Metrics' in message:
        metrics_only.append(req)
        continue
    
    # 早期スキップ（ピーク時間外、制限到達など）
    if 'not quote repost peak time' in message.lower() or 'hourly_limit_reached' in message.lower() or 'daily post limit' in message.lower():
        skipped_early.append(req)
        continue
    
    # インフルエンサーが見つからない
    if 'no influencers found' in message.lower() or 'influencers found for' in message.lower() and '0' in message:
        no_influencers.append(req)
        continue
    
    # タイミングでスキップ
    if 'not optimal timing' in message.lower():
        skipped_timing.append(req)
        continue
    
    # 実際に投稿された可能性があるログ
    if any(keyword in message.lower() for keyword in ['posted quote repost', 'successfully posted', 'quote repost posted', 'tweet id', 'x api', 'posting quote repost']):
        if 'skipped' not in message.lower() and 'skipping' not in message.lower():
            actually_posted.append(req)

print(f"Total x-quote-repost requests: {len(x_quote_requests)}")
print(f"\n=== Breakdown ===")
print(f"Metrics endpoint calls: {len(metrics_only)}")
print(f"Early skipped (not peak time/limit): {len(skipped_early)}")
print(f"Skipped (timing): {len(skipped_timing)}")
print(f"No influencers found: {len(no_influencers)}")
print(f"Actually posted (estimated): {len(actually_posted)}")
print(f"Unknown/Other: {len(x_quote_requests) - len(metrics_only) - len(skipped_early) - len(skipped_timing) - len(no_influencers) - len(actually_posted)}")

print(f"\n=== Early Skipped Details (First 10) ===")
for i, req in enumerate(skipped_early[:10], 1):
    print(f"{i}. {req.get('TimeUTC', 'N/A')}: {str(req.get('message', ''))[:200]}")

print(f"\n=== No Influencers Found (First 10) ===")
for i, req in enumerate(no_influencers[:10], 1):
    print(f"{i}. {req.get('TimeUTC', 'N/A')}: {str(req.get('message', ''))[:200]}")

print(f"\n=== Actually Posted (First 20) ===")
for i, req in enumerate(actually_posted[:20], 1):
    print(f"{i}. {req.get('TimeUTC', 'N/A')}: {str(req.get('message', ''))[:300]}")

# UTC時間別の分析
print(f"\n=== Analysis by UTC Hour ===")
hour_breakdown = {}
for req in x_quote_requests:
    time_str = req.get('TimeUTC', '')
    if time_str:
        hour = time_str.split(':')[0] if ':' in time_str else 'unknown'
        if hour not in hour_breakdown:
            hour_breakdown[hour] = {'total': 0, 'posted': 0, 'skipped': 0}
        hour_breakdown[hour]['total'] += 1
        message = str(req.get('message', '')).lower()
        if req in actually_posted:
            hour_breakdown[hour]['posted'] += 1
        elif 'skipped' in message or 'skipping' in message:
            hour_breakdown[hour]['skipped'] += 1

for hour in sorted(hour_breakdown.keys()):
    stats = hour_breakdown[hour]
    print(f"UTC {hour}:00 - Total: {stats['total']}, Posted: {stats['posted']}, Skipped: {stats['skipped']}")
