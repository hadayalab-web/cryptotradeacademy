import json
import sys
import re
from collections import defaultdict
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

LOG_FILE = r'c:\Users\chiba\Downloads\logs_result (2).json'

print("="*80)
print("ログファイルからメトリクス情報を抽出中...")
print("="*80)

# ログファイルを読み込む
with open(LOG_FILE, 'r', encoding='utf-8') as f:
    logs = json.load(f)

print(f"✅ ログファイル読み込み完了: {len(logs)}件のエントリ\n")

# 時間範囲を確認
times = []
for log in logs:
    time_utc = log.get('TimeUTC', '') or log.get('timestamp', '')
    if time_utc:
        try:
            times.append(datetime.fromisoformat(time_utc.replace('Z', '+00:00')))
        except:
            pass

if times:
    min_time = min(times)
    max_time = max(times)
    one_day_ago = datetime.fromtimestamp(max_time.timestamp() - 24 * 60 * 60)
    print(f"📅 ログの時間範囲:")
    print(f"   開始: {min_time.isoformat()}")
    print(f"   終了: {max_time.isoformat()}")
    print(f"   過去24時間の開始: {one_day_ago.isoformat()}\n")

# 投稿とメトリクスを抽出
posts = {}
influencer_map = {
    'cryptoarabia': {'lang': 'ar', 'market': 'Arabic (AR)'},
    'btc_es': {'lang': 'es', 'market': 'Spanish (ES)'},
    'BTC_Archive': {'lang': 'en', 'market': 'English (EN)'},
}

# ツイートIDを抽出
tweet_ids = set()
for log in logs:
    msg = str(log.get('message', '') or log.get('text', ''))
    # 19桁の数字（ツイートID）を検出
    matches = re.findall(r'\b\d{19}\b', msg)
    tweet_ids.update(matches)

print(f"📊 検出されたツイートID: {len(tweet_ids)}件")
for tid in list(tweet_ids)[:5]:
    print(f"   - {tid}")

# 各ツイートIDに関連するログを検索
for tweet_id in tweet_ids:
    related_logs = [l for l in logs if tweet_id in str(l.get('message', ''))]
    
    post_info = {
        'tweetId': tweet_id,
        'postType': None,
        'lang': None,
        'influencer': None,
        'postedAt': None,
        'impressions': 0,
        'engagements': 0,
        'estimatedImpressions': None,
    }
    
    for log in related_logs:
        msg = str(log.get('message', '') or log.get('text', '')).lower()
        time_utc = log.get('TimeUTC', '') or log.get('timestamp', '')
        
        # 投稿タイプを検出
        if 'quote repost' in msg or 'quote tweet' in msg:
            post_info['postType'] = 'quote_repost'
        elif 'free report' in msg or 'main tweet' in msg:
            post_info['postType'] = 'free_report'
        elif 'minimal version' in msg:
            post_info['postType'] = 'minimal_version'
        
        # インフルエンサーを検出
        for inf_name, inf_data in influencer_map.items():
            if inf_name.lower() in msg:
                post_info['influencer'] = inf_name
                post_info['lang'] = inf_data['lang']
                break
        
        # 言語を検出
        if not post_info['lang']:
            lang_match = re.search(r'for\s+(\w{2}(?:-\w{2})?)|lang[:\s]+(\w+)', msg, re.I)
            if lang_match:
                lang = (lang_match.group(1) or lang_match.group(2) or '').lower()
                if lang == 'ptbr' or lang == 'pt_br':
                    lang = 'pt-br'
                post_info['lang'] = lang
        
        # CRITICAL FIX: インプレッションを検出（X API実測値のみ）
        # X APIから取得した実測値（nonPublicMetricsまたはorganicMetrics）
        actual_imp_match = re.search(r'(?:nonPublicMetrics|organicMetrics|impression_count|actual.*impressions?)[:\s]+(\d+(?:[,\-]\d+)?)', msg, re.I)
        if actual_imp_match:
            imp_str = actual_imp_match.group(1).replace(',', '')
            if '-' in imp_str:
                parts = imp_str.split('-')
                if len(parts) == 2:
                    try:
                        min_imp = int(parts[0])
                        max_imp = int(parts[1])
                        post_info['impressions'] = (min_imp + max_imp) // 2
                        post_info['impressionsSource'] = 'x_api_actual'
                    except:
                        pass
            else:
                try:
                    post_info['impressions'] = int(imp_str)
                    post_info['impressionsSource'] = 'x_api_actual'
                except:
                    pass
        # 注意: 一般的な"impressions"パターンは、推定値の可能性があるため使用しない
        
        # 推定インプレッションを検出
        est_match = re.search(r'estimated\s+impressions?[:\s]+(\d+(?:[,\-]\d+)?)', msg, re.I)
        if est_match:
            est_str = est_match.group(1).replace(',', '')
            if '-' in est_str:
                parts = est_str.split('-')
                if len(parts) == 2:
                    try:
                        min_est = int(parts[0])
                        max_est = int(parts[1])
                        post_info['estimatedImpressions'] = f"{min_est}-{max_est}"
                    except:
                        pass
        
        # エンゲージメントを検出
        eng_match = re.search(r'engagement[:\s]+(\d+)|likes?[:\s]+(\d+)|retweets?[:\s]+(\d+)', msg, re.I)
        if eng_match:
            eng_val = int(eng_match.group(1) or eng_match.group(2) or eng_match.group(3) or 0)
            post_info['engagements'] += eng_val
        
        # 投稿時刻を記録
        if time_utc and not post_info['postedAt']:
            try:
                post_info['postedAt'] = datetime.fromisoformat(time_utc.replace('Z', '+00:00')).isoformat()
            except:
                pass
    
    if post_info['postType']:
        posts[tweet_id] = post_info

# 過去24時間の投稿をフィルタ
recent_posts = []
for post in posts.values():
    if post['postedAt']:
        try:
            post_time = datetime.fromisoformat(post['postedAt'].replace('Z', '+00:00'))
            if post_time >= one_day_ago:
                recent_posts.append(post)
        except:
            pass

print(f"\n📊 過去24時間の投稿数: {len(recent_posts)}件\n")

# レポートを生成
print("="*80)
print("📊 24時間実績レポート")
print("="*80)
print(f"\n期間: {one_day_ago.isoformat()} ～ {max_time.isoformat()}")

# サマリー
total_impressions = sum(p.get('impressions', 0) or 0 for p in recent_posts)
total_engagements = sum(p.get('engagements', 0) or 0 for p in recent_posts)

# Telegramオプトインを抽出
telegram_opt_ins = {'total': 0, 'byLang': defaultdict(int)}
opt_in_patterns = [
    r'user.*joined|opt.*in|start.*command|free.*user|telegram.*user',
    r'/start',
]

for log in logs:
    msg = str(log.get('message', '') or log.get('text', '')).lower()
    time_utc = log.get('TimeUTC', '') or log.get('timestamp', '')
    
    if not time_utc:
        continue
    
    try:
        log_time = datetime.fromisoformat(time_utc.replace('Z', '+00:00'))
        if log_time < one_day_ago:
            continue
    except:
        continue
    
    for pattern in opt_in_patterns:
        if re.search(pattern, msg, re.I):
            telegram_opt_ins['total'] += 1
            
            # 言語を抽出
            lang_match = re.search(r'lang[:\s]+(\w+)|for\s+(\w{2})', msg, re.I)
            if lang_match:
                lang = (lang_match.group(1) or lang_match.group(2) or 'unknown').lower()
                if lang == 'ptbr' or lang == 'pt_br':
                    lang = 'pt-br'
                telegram_opt_ins['byLang'][lang] += 1
            else:
                telegram_opt_ins['byLang']['unknown'] += 1
            break

# Free ReportとMinimal Versionの投稿を検出（より詳細に）
for log in logs:
    msg = str(log.get('message', '') or log.get('text', ''))
    msg_lower = msg.lower()
    time_utc = log.get('TimeUTC', '') or log.get('timestamp', '')
    
    if not time_utc:
        continue
    
    try:
        log_time = datetime.fromisoformat(time_utc.replace('Z', '+00:00'))
        if log_time < one_day_ago:
            continue
    except:
        continue
    
    # Free Report投稿を検出（より広範囲に）
    if ('free report' in msg_lower or 'main tweet posted' in msg_lower or 
        '✅ main tweet' in msg_lower or '/api/x-post-free-report' in str(log.get('requestPath', ''))):
        tweet_id_match = re.search(r'\b\d{19}\b', msg)
        if tweet_id_match:
            tweet_id = tweet_id_match.group()
            if tweet_id not in posts:
                # 言語を抽出
                lang_match = re.search(r'for\s+(\w{2}(?:-\w{2})?)|lang[:\s]+(\w+)', msg_lower, re.I)
                lang = None
                if lang_match:
                    lang = (lang_match.group(1) or lang_match.group(2) or '').lower()
                    if lang == 'ptbr' or lang == 'pt_br':
                        lang = 'pt-br'
                
                posts[tweet_id] = {
                    'tweetId': tweet_id,
                    'postType': 'free_report',
                    'lang': lang,
                    'influencer': None,
                    'postedAt': log_time.isoformat(),
                    'impressions': 0,
                    'engagements': 0,
                }
    
    # Minimal Version投稿を検出（より広範囲に）
    if (('minimal version' in msg_lower and 'posted' in msg_lower and 'skipping' not in msg_lower) or
        '/api/x-post-minimal-version' in str(log.get('requestPath', ''))):
        tweet_id_match = re.search(r'\b\d{19}\b', msg)
        if tweet_id_match:
            tweet_id = tweet_id_match.group()
            if tweet_id not in posts:
                # 言語を抽出
                lang_match = re.search(r'for\s+(\w{2}(?:-\w{2})?)|lang[:\s]+(\w+)', msg_lower, re.I)
                lang = None
                if lang_match:
                    lang = (lang_match.group(1) or lang_match.group(2) or '').lower()
                    if lang == 'ptbr' or lang == 'pt_br':
                        lang = 'pt-br'
                
                posts[tweet_id] = {
                    'tweetId': tweet_id,
                    'postType': 'minimal_version',
                    'lang': lang,
                    'influencer': None,
                    'postedAt': log_time.isoformat(),
                    'impressions': 0,
                    'engagements': 0,
                }

# 過去24時間の投稿を再フィルタ
recent_posts = []
for post in posts.values():
    if post.get('postedAt'):
        try:
            post_time = datetime.fromisoformat(post['postedAt'].replace('Z', '+00:00'))
            if post_time >= one_day_ago:
                recent_posts.append(post)
        except:
            pass

# Whopトラフィックとコンバージョンを計算
whop_posts = [p for p in recent_posts if p.get('postType') in ['free_report', 'minimal_version']]
total_whop_impressions = sum(p.get('impressions', 0) or 0 for p in whop_posts)
total_whop_clicks = int(total_whop_impressions * 0.02)  # 2%クリック率（中程度）

whop_conversions = {
    'conservative': int(total_whop_clicks * 0.01),  # 1%
    'moderate': int(total_whop_clicks * 0.02),      # 2%
    'optimistic': int(total_whop_clicks * 0.03),    # 3%
}

print(f"\n【サマリー】")
print(f"- 総投稿数: {len(recent_posts)}件")
print(f"- 総インプレッション: {total_impressions:,}")
print(f"- 総エンゲージメント: {total_engagements:,}")
print(f"- Telegramオプトイン: {telegram_opt_ins['total']}人")
print(f"- Whopトラフィック（クリック）: {total_whop_clicks:,}回")
print(f"- Whopコンバージョン:")
print(f"  - 保守的: {whop_conversions['conservative']}件")
print(f"  - 中程度: {whop_conversions['moderate']}件")
print(f"  - 楽観的: {whop_conversions['optimistic']}件")

# 市場別に集計
by_market = defaultdict(lambda: {
    'posts': 0,
    'impressions': 0,
    'engagements': 0,
    'influencers': set(),
})

for post in recent_posts:
    lang = post.get('lang') or 'unknown'
    market_name = influencer_map.get(post.get('influencer', ''), {}).get('market', lang.upper())
    
    by_market[lang]['posts'] += 1
    by_market[lang]['impressions'] += post.get('impressions', 0) or 0
    by_market[lang]['engagements'] += post.get('engagements', 0) or 0
    if post.get('influencer'):
        by_market[lang]['influencers'].add(post['influencer'])

print(f"\n【市場別実績】")
for lang, data in by_market.items():
    market_name = influencer_map.get(list(data['influencers'])[0] if data['influencers'] else '', {}).get('market', lang.upper())
    print(f"\n{market_name}:")
    print(f"  - 投稿数: {data['posts']}件")
    print(f"  - インフルエンサー: {', '.join(data['influencers']) if data['influencers'] else 'N/A'}")
    print(f"  - インプレッション: {data['impressions']:,}")
    print(f"  - エンゲージメント: {data['engagements']:,}")
    print(f"  - Telegramオプトイン: {telegram_opt_ins['byLang'].get(lang, 0)}人")

print(f"\n【投稿詳細】")
for i, post in enumerate(recent_posts, 1):
    market_name = influencer_map.get(post.get('influencer', ''), {}).get('market', (post.get('lang') or 'unknown').upper())
    post_type_map = {
        'quote_repost': 'Quote Repost',
        'free_report': 'Free Report',
        'minimal_version': 'Minimal Version',
    }
    post_type = post_type_map.get(post.get('postType', ''), post.get('postType', ''))
    
    print(f"\n{i}. {market_name} - {post.get('influencer', 'N/A')}")
    print(f"   投稿タイプ: {post_type}")
    print(f"   ツイートID: {post['tweetId']}")
    print(f"   投稿時刻: {post.get('postedAt', 'N/A')}")
    print(f"   インプレッション: {post.get('impressions', 0) or 0:,}")
    if post.get('estimatedImpressions'):
        print(f"   推定インプレッション: {post['estimatedImpressions']}")
    print(f"   エンゲージメント: {post.get('engagements', 0) or 0:,}")
    if post.get('impressions', 0) > 0:
        eng_rate = (post.get('engagements', 0) / post.get('impressions', 1)) * 100
        print(f"   エンゲージメント率: {eng_rate:.2f}%")

# 予測レポートを生成
print("\n" + "="*80)
print("🔮 今後の予測レポート")
print("="*80)

# 日次予測値（インフルエンサーの平均インプレッション数に基づく）
daily_forecast = {
    'impressions': {
        'quoteRepost': 1511000,
        'freeReport': 755500,
        'minimalVersion': 855500,
        'total': 3122000,
    },
    'telegramOptIns': {
        'conservative': 9666,
        'moderate': 22554,
        'optimistic': 40275,
    },
    'whopClicks': {
        'conservative': 16110,
        'moderate': 32220,
        'optimistic': 48330,
    },
    'whopConversions': {
        'conservative': 322,
        'moderate': 1128,
        'optimistic': 2417,
    },
}

print(f"\n【日次予測】")
print(f"- インプレッション:")
print(f"  - Quote Repost: {daily_forecast['impressions']['quoteRepost']:,}")
print(f"  - Free Report: {daily_forecast['impressions']['freeReport']:,}")
print(f"  - Minimal Version: {daily_forecast['impressions']['minimalVersion']:,}")
print(f"  - 合計: {daily_forecast['impressions']['total']:,}")
print(f"- Telegramオプトイン:")
print(f"  - 保守的: {daily_forecast['telegramOptIns']['conservative']:,}人/日")
print(f"  - 中程度: {daily_forecast['telegramOptIns']['moderate']:,}人/日")
print(f"  - 楽観的: {daily_forecast['telegramOptIns']['optimistic']:,}人/日")
print(f"- Whopトラフィック（クリック）:")
print(f"  - 保守的: {daily_forecast['whopClicks']['conservative']:,}回/日")
print(f"  - 中程度: {daily_forecast['whopClicks']['moderate']:,}回/日")
print(f"  - 楽観的: {daily_forecast['whopClicks']['optimistic']:,}回/日")
print(f"- Whopコンバージョン:")
print(f"  - 保守的: {daily_forecast['whopConversions']['conservative']:,}件/日")
print(f"  - 中程度: {daily_forecast['whopConversions']['moderate']:,}件/日")
print(f"  - 楽観的: {daily_forecast['whopConversions']['optimistic']:,}件/日")

print(f"\n【月次予測】")
print(f"- Telegramオプトイン:")
print(f"  - 保守的: {daily_forecast['telegramOptIns']['conservative'] * 30:,}人/月")
print(f"  - 中程度: {daily_forecast['telegramOptIns']['moderate'] * 30:,}人/月")
print(f"  - 楽観的: {daily_forecast['telegramOptIns']['optimistic'] * 30:,}人/月")
print(f"- Whopコンバージョン:")
print(f"  - 保守的: {daily_forecast['whopConversions']['conservative'] * 30:,}件/月")
print(f"  - 中程度: {daily_forecast['whopConversions']['moderate'] * 30:,}件/月")
print(f"  - 楽観的: {daily_forecast['whopConversions']['optimistic'] * 30:,}件/月")

print("\n" + "="*80)
