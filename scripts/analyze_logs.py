import json
import sys

# UTF-8出力を強制
sys.stdout.reconfigure(encoding='utf-8')

with open('data/vercel-logs/logs_result (1).json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# x-quote-repostのリクエストを抽出
x_quote_requests = [x for x in data if 'x-quote-repost' in x.get('requestPath', '')]

print(f"Total x-quote-repost requests: {len(x_quote_requests)}")
print(f"\n=== Response Status Codes ===")
status_counts = {}
for req in x_quote_requests:
    status = req.get('responseStatusCode', 'N/A')
    status_counts[status] = status_counts.get(status, 0) + 1
for status, count in sorted(status_counts.items()):
    print(f"  {status}: {count}")

print(f"\n=== Skipped Requests ===")
skipped = []
for req in x_quote_requests:
    message = str(req.get('message', '')).lower()
    if 'skipped' in message or 'skipping' in message or 'not quote repost peak time' in message or 'hourly_limit_reached' in message or 'daily post limit' in message:
        skipped.append(req)

print(f"Total skipped: {len(skipped)}")
for i, req in enumerate(skipped[:30], 1):
    print(f"\n{i}. Time: {req.get('TimeUTC', 'N/A')}")
    print(f"   Status: {req.get('responseStatusCode', 'N/A')}")
    msg = str(req.get('message', ''))[:400].replace('\n', ' ')
    print(f"   Message: {msg}")

print(f"\n=== Successfully Posted Requests ===")
posted = []
for req in x_quote_requests:
    message = str(req.get('message', '')).lower()
    if 'posted' in message or 'success' in message or 'quote repost' in message:
        if 'skipped' not in message and 'skipping' not in message:
            posted.append(req)

print(f"Total posted (estimated): {len(posted)}")
for i, req in enumerate(posted[:20], 1):
    print(f"\n{i}. Time: {req.get('TimeUTC', 'N/A')}")
    print(f"   Status: {req.get('responseStatusCode', 'N/A')}")
    msg = str(req.get('message', ''))[:300].replace('\n', ' ')
    print(f"   Message: {msg}")

print(f"\n=== Summary ===")
print(f"Total requests: {len(x_quote_requests)}")
print(f"Skipped: {len(skipped)}")
print(f"Posted (estimated): {len(posted)}")
print(f"Unknown: {len(x_quote_requests) - len(skipped) - len(posted)}")
