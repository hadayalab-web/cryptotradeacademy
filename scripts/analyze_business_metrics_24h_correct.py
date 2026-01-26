import json
import sys
from datetime import datetime
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

# サポートされている言語
SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko']

# ドキュメント（CONVERSION_EXPECTATIONS_2026-01-25.md, SSOT_KPI_FUNNEL_STATUS_2026-01-24.md）から
# 言語別の期待インプレッション数（SSOTより）
LANG_IMPRESSIONS = {
    'en': 250000,   # 1日あたり
    'es': 120000,
    'pt-br': 110000,
    'ar': 80000,
    'ko': 100000,
    'ja': 90000,
}

# 言語別の無料版オプトイン率（SSOTより）
LANG_OPTIN_RATES = {
    'en': 0.025,    # 2.5%
    'es': 0.022,    # 2.2%
    'pt-br': 0.021, # 2.1%
    'ar': 0.018,    # 1.8%
    'ko': 0.020,    # 2.0%
    'ja': 0.019,    # 1.9%
}

# 言語別の有料版コンバージョン率（SSOTより）
LANG_CONVERSION_RATES = {
    'en': 0.120,    # 12.0%
    'es': 0.100,    # 10.0%
    'pt-br': 0.095, # 9.5%
    'ar': 0.080,    # 8.0%
    'ko': 0.105,    # 10.5%
    'ja': 0.100,    # 10.0%
}

# エンゲージメント率（X_METRICS_EXPLANATION.mdより）
# 目標: 10%以上のエンゲージメント率
ENGAGEMENT_RATE = 0.10  # 10%

# 投稿パターン（CONVERSION_EXPECTATIONS_2026-01-25.mdより）
POST_PATTERNS = {
    'quote_reposts': {'count': 10, 'impressions': 1511000, 'has_links': False},
    'free_reports': {'count': 5, 'impressions': 755500, 'has_links': True},
    'minimal_version': {'count': 1, 'impressions': 855500, 'has_links': True},
}

# コンバージョン率（CONVERSION_EXPECTATIONS_2026-01-25.mdより）
CONVERSION_RATES = {
    'telegram_click_rate': {
        'conservative': 0.02,   # 2%
        'moderate': 0.035,       # 3.5%
        'optimistic': 0.05,      # 5%
    },
    'whop_click_rate': {
        'conservative': 0.01,   # 1%
        'moderate': 0.02,        # 2%
        'optimistic': 0.03,      # 3%
    },
    'telegram_optin_rate': {
        'conservative': 0.30,   # 30%
        'moderate': 0.40,        # 40%
        'optimistic': 0.50,      # 50%
    },
    'whop_conversion_rate': {
        'conservative': 0.02,   # 2%
        'moderate': 0.035,       # 3.5%
        'optimistic': 0.05,      # 5%
    },
}

print("=== 24時間で期待されるビジネス指標（言語別集計） ===\n")
print("（ドキュメントに基づく正確な計算）\n")

# 言語別の期待値を計算
print("=== 言語別ビジネス指標（24時間あたりの期待値） ===\n")

for lang in SUPPORTED_LANGS:
    impressions = LANG_IMPRESSIONS.get(lang, 0)
    optin_rate = LANG_OPTIN_RATES.get(lang, 0)
    conversion_rate = LANG_CONVERSION_RATES.get(lang, 0)
    
    # 1. X投稿数
    # Quote Reposts: 10投稿/日（言語別に分割されない）
    # Free Reports: 5投稿/日（6言語で分割）
    # Minimal Version: 1投稿/日（6言語で分割）
    expected_posts = (POST_PATTERNS['quote_reposts']['count'] / len(SUPPORTED_LANGS) + 
                      POST_PATTERNS['free_reports']['count'] / len(SUPPORTED_LANGS) + 
                      POST_PATTERNS['minimal_version']['count'] / len(SUPPORTED_LANGS))
    
    # 2. インプレッション数
    expected_impressions = impressions
    
    # 3. エンゲージメント数
    expected_engagements = impressions * ENGAGEMENT_RATE
    
    # 4. 無料版（Minimal Version）オプトイン数
    # SSOTより: インプレッション数 × オプトイン率
    expected_minimal_optins = impressions * optin_rate
    
    # 5. Whopトラフィック数
    # CONVERSION_EXPECTATIONSより: Free Reports + Minimal Versionのインプレッション数から計算
    # SSOTでは言語別のインプレッション数（750,000合計）が定義されている
    # これはFree Reports + Minimal Versionの合計（Quote Repostsは別）
    # したがって、言語別のインプレッション数がそのままFree Reports + Minimal Versionのインプレッション数
    # Whopクリック数（中程度シナリオ）
    expected_whop_traffic = impressions * CONVERSION_RATES['whop_click_rate']['moderate']
    
    # 6. 有料版（Regular Briefing）成約数
    # SSOTより: 無料版オプトイン数 × コンバージョン率
    expected_regular_conversions = expected_minimal_optins * conversion_rate
    
    print(f"【{lang.upper()}】")
    print(f"  1. X投稿数:")
    print(f"    期待値（24時間）: {expected_posts:.2f}回")
    
    print(f"  2. インプレッション数:")
    print(f"    期待値（24時間）: {expected_impressions:,.0f}")
    
    print(f"  3. エンゲージメント数:")
    print(f"    期待値（24時間）: {expected_engagements:,.0f}")
    print(f"    （エンゲージメント率: {ENGAGEMENT_RATE*100:.0f}%）")
    
    print(f"  4. 無料版（Minimal Version）オプトイン数:")
    print(f"    期待値（24時間）: {expected_minimal_optins:,.0f}人")
    print(f"    （オプトイン率: {optin_rate*100:.1f}%）")
    
    print(f"  5. Whopトラフィック数:")
    print(f"    期待値（24時間）: {expected_whop_traffic:,.0f}クリック")
    print(f"    （Whopクリック率: {CONVERSION_RATES['whop_click_rate']['moderate']*100:.1f}%）")
    
    print(f"  6. 有料版（Regular Briefing）成約数:")
    print(f"    期待値（24時間）: {expected_regular_conversions:.1f}人")
    print(f"    （コンバージョン率: {conversion_rate*100:.1f}%）")
    
    print()

# 全体サマリー
print("\n=== 全体サマリー（全言語合計） ===\n")

total_impressions = sum(LANG_IMPRESSIONS.values())
total_engagements = total_impressions * ENGAGEMENT_RATE
total_minimal_optins = sum(LANG_IMPRESSIONS[lang] * LANG_OPTIN_RATES[lang] for lang in SUPPORTED_LANGS)
total_whop_traffic = (POST_PATTERNS['free_reports']['impressions'] + POST_PATTERNS['minimal_version']['impressions']) * CONVERSION_RATES['whop_click_rate']['moderate']
total_conversions = sum(LANG_IMPRESSIONS[lang] * LANG_OPTIN_RATES[lang] * LANG_CONVERSION_RATES[lang] for lang in SUPPORTED_LANGS)

total_posts = (POST_PATTERNS['quote_reposts']['count'] + 
               POST_PATTERNS['free_reports']['count'] + 
               POST_PATTERNS['minimal_version']['count'])

print(f"1. X投稿数:")
print(f"  期待値（24時間）: {total_posts:.0f}回")
print(f"  - Quote Reposts: {POST_PATTERNS['quote_reposts']['count']}回/日")
print(f"  - Free Reports: {POST_PATTERNS['free_reports']['count']}回/日")
print(f"  - Minimal Version: {POST_PATTERNS['minimal_version']['count']}回/日")

print(f"\n2. インプレッション数:")
print(f"  期待値（24時間）: {total_impressions:,.0f}")
print(f"  - Quote Reposts: {POST_PATTERNS['quote_reposts']['impressions']:,.0f}")
print(f"  - Free Reports: {POST_PATTERNS['free_reports']['impressions']:,.0f}")
print(f"  - Minimal Version: {POST_PATTERNS['minimal_version']['impressions']:,.0f}")

print(f"\n3. エンゲージメント数:")
print(f"  期待値（24時間）: {total_engagements:,.0f}")
print(f"  （エンゲージメント率: {ENGAGEMENT_RATE*100:.0f}%）")

print(f"\n4. 無料版（Minimal Version）オプトイン数:")
print(f"  期待値（24時間）: {total_minimal_optins:,.0f}人")
print(f"  （平均オプトイン率: {(total_minimal_optins/total_impressions)*100:.2f}%）")

print(f"\n5. Whopトラフィック数:")
print(f"  期待値（24時間）: {total_whop_traffic:,.0f}クリック")
print(f"  （Whopクリック率: {CONVERSION_RATES['whop_click_rate']['moderate']*100:.1f}%）")
print(f"  - 保守的: {(POST_PATTERNS['free_reports']['impressions'] + POST_PATTERNS['minimal_version']['impressions']) * CONVERSION_RATES['whop_click_rate']['conservative']:,.0f}クリック")
print(f"  - 中程度: {total_whop_traffic:,.0f}クリック")
print(f"  - 楽観的: {(POST_PATTERNS['free_reports']['impressions'] + POST_PATTERNS['minimal_version']['impressions']) * CONVERSION_RATES['whop_click_rate']['optimistic']:,.0f}クリック")

print(f"\n6. 有料版（Regular Briefing）成約数:")
print(f"  期待値（24時間）: {total_conversions:.1f}人")
print(f"  （平均コンバージョン率: {(total_conversions/total_minimal_optins)*100:.2f}%）")

# シナリオ別の期待値（CONVERSION_EXPECTATIONSより）
print("\n=== シナリオ別期待値（CONVERSION_EXPECTATIONSより） ===\n")

# 対象インプレッション数（Free Reports + Minimal Version）
target_impressions = POST_PATTERNS['free_reports']['impressions'] + POST_PATTERNS['minimal_version']['impressions']

print("対象インプレッション数（Free Reports + Minimal Version）:")
print(f"  {target_impressions:,.0f}/日\n")

print("無料版オプトイン数:")
for scenario in ['conservative', 'moderate', 'optimistic']:
    telegram_click_rate = CONVERSION_RATES['telegram_click_rate'][scenario]
    optin_rate = CONVERSION_RATES['telegram_optin_rate'][scenario]
    optins = target_impressions * telegram_click_rate * optin_rate
    print(f"  {scenario.capitalize()}: {optins:,.0f}人/日")

print("\nWhopトラフィック数:")
for scenario in ['conservative', 'moderate', 'optimistic']:
    whop_click_rate = CONVERSION_RATES['whop_click_rate'][scenario]
    whop_clicks = target_impressions * whop_click_rate
    print(f"  {scenario.capitalize()}: {whop_clicks:,.0f}クリック/日")

print("\nWhopコンバージョン数:")
for scenario in ['conservative', 'moderate', 'optimistic']:
    whop_click_rate = CONVERSION_RATES['whop_click_rate'][scenario]
    whop_conversion_rate = CONVERSION_RATES['whop_conversion_rate'][scenario]
    whop_clicks = target_impressions * whop_click_rate
    whop_conversions = whop_clicks * whop_conversion_rate
    print(f"  {scenario.capitalize()}: {whop_conversions:,.0f}件/日")

print("\n=== 計算式の根拠 ===\n")
print("1. X投稿数:")
print(f"   Quote Reposts: {POST_PATTERNS['quote_reposts']['count']}回/日")
print(f"   Free Reports: {POST_PATTERNS['free_reports']['count']}回/日（6言語で分割）")
print(f"   Minimal Version: {POST_PATTERNS['minimal_version']['count']}回/日（6言語で分割）")
print(f"   合計: {total_posts}回/日")

print("\n2. インプレッション数:")
print("   SSOT_KPI_FUNNEL_STATUSより言語別の期待値を使用")
for lang in SUPPORTED_LANGS:
    print(f"   {lang.upper()}: {LANG_IMPRESSIONS[lang]:,}")

print("\n3. エンゲージメント数:")
print(f"   計算式: インプレッション数 × エンゲージメント率（{ENGAGEMENT_RATE*100:.0f}%）")

print("\n4. 無料版オプトイン数:")
print("   計算式: インプレッション数 × オプトイン率（SSOTより言語別）")
for lang in SUPPORTED_LANGS:
    print(f"   {lang.upper()}: {LANG_IMPRESSIONS[lang]:,} × {LANG_OPTIN_RATES[lang]*100:.1f}% = {LANG_IMPRESSIONS[lang] * LANG_OPTIN_RATES[lang]:,.0f}人/日")

print("\n5. Whopトラフィック数:")
print(f"   計算式: （Free Reports + Minimal Versionのインプレッション数）× Whopクリック率")
print(f"   対象インプレッション: {target_impressions:,.0f}/日")
print(f"   Whopクリック率（中程度）: {CONVERSION_RATES['whop_click_rate']['moderate']*100:.1f}%")

print("\n6. 有料版成約数:")
print("   計算式: 無料版オプトイン数 × コンバージョン率（SSOTより言語別）")
for lang in SUPPORTED_LANGS:
    optins = LANG_IMPRESSIONS[lang] * LANG_OPTIN_RATES[lang]
    conversions = optins * LANG_CONVERSION_RATES[lang]
    print(f"   {lang.upper()}: {optins:,.0f} × {LANG_CONVERSION_RATES[lang]*100:.1f}% = {conversions:.1f}人/日")

print("\n=== 詳細投稿スケジュール（UTC時刻別） ===\n")
print("（どの時間に、どの言語の、どのインフルエンサーに、どんな投稿をする予定）\n")

# 投稿スケジュール定義（vercel.jsonとGROK_X_POSTING_SCHEDULE_CONFIRMATIONより）
POSTING_SCHEDULE = {
    '00:00': {
        'type': 'quote_repost',
        'langs': ['ar', 'ja'],
        'count_per_lang': 2,
        'influencer_selection': {
            'ar': {'stock_count': 10, 'target_impressions': {'min': 30000, 'max': 80000}, 'select_count': 2},
            'ja': {'stock_count': 10, 'target_impressions': {'min': 30000, 'max': 80000}, 'select_count': 2},
        },
        'content': 'Grok APIが動的に生成（引用リポスト、140文字以内）',
    },
    '01:00': {
        'type': 'quote_repost',
        'langs': ['ko'],
        'count_per_lang': 2,
        'influencer_selection': {
            'ko': {'stock_count': 10, 'target_impressions': {'min': 50000, 'max': 100000}, 'select_count': 2},
        },
        'content': 'Grok APIが動的に生成（引用リポスト、140文字以内）',
    },
    '08:00': {
        'type': 'minimal_version',
        'langs': ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'],
        'count_per_lang': 1,
        'content': 'スレッド形式（1メイン + 3リプライ、AR/JAは単一投稿）',
    },
    '12:00': {
        'type': 'free_report',
        'langs': ['ja'],
        'count_per_lang': 1,
        'content': 'スレッド形式（1メイン + 3リプライ）',
    },
    '13:00': {
        'type': 'free_report',
        'langs': ['ko'],
        'count_per_lang': 1,
        'content': 'スレッド形式（1メイン + 3リプライ）',
    },
    '14:00': {
        'type': 'free_report',
        'langs': ['en', 'pt-br'],
        'count_per_lang': 1,
        'content': 'スレッド形式（1メイン + 3リプライ）',
    },
    '15:00': {
        'type': 'free_report',
        'langs': ['es'],
        'count_per_lang': 1,
        'content': 'スレッド形式（1メイン + 3リプライ）',
    },
    '18:00': {
        'type': 'free_report',
        'langs': ['ar'],
        'count_per_lang': 1,
        'content': 'スレッド形式（1メイン + 3リプライ）',
    },
    '20:00': {
        'type': 'quote_repost',
        'langs': ['en', 'pt-br'],
        'count_per_lang': 2,
        'influencer_selection': {
            'en': {'stock_count': 20, 'target_impressions': {'min': 100000, 'max': 200000}, 'select_count': 4},
            'pt-br': {'stock_count': 10, 'target_impressions': {'min': 50000, 'max': 100000}, 'select_count': 2},
        },
        'content': 'Grok APIが動的に生成（引用リポスト、140文字以内）',
        'additional': 'Minimal Versionも同時投稿（EN, PT-BR各1回）',
    },
    '21:00': {
        'type': 'quote_repost',
        'langs': ['es'],
        'count_per_lang': 2,
        'influencer_selection': {
            'es': {'stock_count': 10, 'target_impressions': {'min': 50000, 'max': 100000}, 'select_count': 2},
        },
        'content': 'Grok APIが動的に生成（引用リポスト、140文字以内）',
    },
}

# 言語別の投稿数集計
lang_post_counts = {lang: {'quote_repost': 0, 'free_report': 0, 'minimal_version': 0} for lang in SUPPORTED_LANGS}

for time_str, schedule in POSTING_SCHEDULE.items():
    post_type = schedule['type']
    for lang in schedule['langs']:
        count = schedule.get('count_per_lang', 1)
        if post_type == 'quote_repost':
            lang_post_counts[lang]['quote_repost'] += count
        elif post_type == 'free_report':
            lang_post_counts[lang]['free_report'] += count
        elif post_type == 'minimal_version':
            lang_post_counts[lang]['minimal_version'] += count

for time_str in sorted(POSTING_SCHEDULE.keys()):
    schedule = POSTING_SCHEDULE[time_str]
    print(f"【UTC {time_str}】{schedule['type'].upper().replace('_', ' ')}")
    print(f"  対象言語: {', '.join([l.upper() for l in schedule['langs']])}")
    print(f"  各言語の投稿数: {schedule.get('count_per_lang', 1)}回")
    
    if 'influencer_selection' in schedule:
        print(f"  インフルエンサー選択:")
        for lang, selection in schedule['influencer_selection'].items():
            print(f"    {lang.upper()}:")
            print(f"      - ストック数: {selection['stock_count']}人")
            print(f"      - インプレッション目標: {selection['target_impressions']['min']:,}-{selection['target_impressions']['max']:,}/投稿")
            print(f"      - 選択数: {selection['select_count']}人/回")
            print(f"      - 選択方法: インプレッション数でソートして上位を選択（selectInfluencersForImpressionTarget関数）")
    
    print(f"  投稿内容: {schedule['content']}")
    
    if 'additional' in schedule:
        print(f"  追加情報: {schedule['additional']}")
    
    print()

print("\n=== 言語別投稿数サマリー ===\n")
for lang in SUPPORTED_LANGS:
    counts = lang_post_counts[lang]
    total = counts['quote_repost'] + counts['free_report'] + counts['minimal_version']
    print(f"【{lang.upper()}】")
    print(f"  Quote Reposts: {counts['quote_repost']}回")
    print(f"  Free Reports: {counts['free_report']}回")
    print(f"  Minimal Version: {counts['minimal_version']}回")
    print(f"  合計: {total}回/日")
    print()

print("\n=== インフルエンサーストック更新スケジュール ===\n")
STOCK_UPDATE_SCHEDULE = {
    '02:00': 'EN（英語）',
    '06:00': 'ES（スペイン語）',
    '10:00': 'PT-BR（ポルトガル語）',
    '14:00': 'AR（アラビア語）',
    '18:00': 'JA（日本語）',
    '22:00': 'KO（韓国語）',
}
for time_str, lang_name in sorted(STOCK_UPDATE_SCHEDULE.items()):
    print(f"UTC {time_str}: {lang_name}のストック更新（/api/x-update-influencer-stock?lang={lang_name.lower().split('（')[0].lower()}）")

# 出力をファイルにも保存
output_lines = []

def print_and_save(*args, **kwargs):
    """print()と同時にファイルにも出力"""
    line = ' '.join(str(arg) for arg in args)
    print(*args, **kwargs)
    output_lines.append(line)

print("\n" + "="*80)
print("=== JST 21時から24時間の投稿計画（完全版：すべての期待値を含む） ===")
print("="*80 + "\n")
print("（UTC時刻をJST時刻に変換: UTC + 9時間 = JST）\n")
output_lines.append("\n" + "="*80)
output_lines.append("=== JST 21時から24時間の投稿計画（完全版：すべての期待値を含む） ===")
output_lines.append("="*80 + "\n")
output_lines.append("（UTC時刻をJST時刻に変換: UTC + 9時間 = JST）\n")

# UTC時刻をJST時刻に変換する関数
def utc_to_jst(utc_hour_str):
    """UTC時刻（HH:MM形式）をJST時刻に変換"""
    utc_hour = int(utc_hour_str.split(':')[0])
    jst_hour = (utc_hour + 9) % 24
    return f"{jst_hour:02d}:00"

# JST時刻からUTC時刻に変換する関数
def jst_to_utc(jst_hour):
    """JST時刻（0-23）をUTC時刻に変換"""
    return (jst_hour - 9) % 24

# 各投稿ごとの期待値を計算する関数
def calculate_post_expectations(lang, post_type, count_per_lang=1):
    """各投稿ごとの期待値を計算"""
    impressions_per_day = LANG_IMPRESSIONS.get(lang, 0)
    optin_rate = LANG_OPTIN_RATES.get(lang, 0)
    conversion_rate = LANG_CONVERSION_RATES.get(lang, 0)
    whop_click_rate = CONVERSION_RATES['whop_click_rate']['moderate']
    
    # 言語別の1日の投稿数を計算
    # Quote Reposts: ENは4回/日、その他は2回/日（config/influencerStrategy.jsより）
    # Free Reports: 各言語1回/日
    # Minimal Version: 各言語1回/日（UTC 8:00のみ、UTC 20:00はEN/PT-BRのみ）
    
    if lang == 'en':
        daily_quote_posts = 4  # ENは4回/日
    else:
        daily_quote_posts = 2  # その他は2回/日
    
    daily_free_posts = 1  # 各言語1回/日
    daily_minimal_posts = 1  # 各言語1回/日（UTC 8:00のみ）
    
    # 投稿タイプに応じてインプレッション数を計算
    # SSOTより、言語別のインプレッション数は1日あたりの合計値
    # 各投稿タイプがどの程度のインプレッションを生み出すかを、投稿数に基づいて分配
    
    # 全体のインプレッション数（CONVERSION_EXPECTATIONSより）
    total_quote_impressions = POST_PATTERNS['quote_reposts']['impressions']  # 1,511,000
    total_free_impressions = POST_PATTERNS['free_reports']['impressions']  # 755,500
    total_minimal_impressions = POST_PATTERNS['minimal_version']['impressions']  # 855,500
    total_all_impressions = total_quote_impressions + total_free_impressions + total_minimal_impressions  # 3,122,000
    
    # 言語別のインプレッション数（SSOTより）
    lang_impressions = LANG_IMPRESSIONS.get(lang, 0)
    
    # 各投稿タイプが言語別のインプレッション数のうちどれだけを占めるかを計算
    # 全体の比率を基に、言語別のインプレッション数を分配
    
    if post_type == 'quote_repost':
        # Quote Repostsの比率
        quote_ratio = total_quote_impressions / total_all_impressions if total_all_impressions > 0 else 0
        lang_quote_impressions = lang_impressions * quote_ratio
        # 1回の投稿あたりのインプレッション数
        impressions_per_post = lang_quote_impressions / max(daily_quote_posts, 1) if daily_quote_posts > 0 else 0
    elif post_type == 'free_report':
        # Free Reportsの比率
        free_ratio = total_free_impressions / total_all_impressions if total_all_impressions > 0 else 0
        lang_free_impressions = lang_impressions * free_ratio
        # 1回の投稿あたりのインプレッション数
        impressions_per_post = lang_free_impressions / max(daily_free_posts, 1) if daily_free_posts > 0 else 0
    elif post_type == 'minimal_version':
        # Minimal Versionの比率
        minimal_ratio = total_minimal_impressions / total_all_impressions if total_all_impressions > 0 else 0
        lang_minimal_impressions = lang_impressions * minimal_ratio
        # 1回の投稿あたりのインプレッション数
        impressions_per_post = lang_minimal_impressions / max(daily_minimal_posts, 1) if daily_minimal_posts > 0 else 0
    else:
        impressions_per_post = 0
    
    # この投稿による期待値（投稿数分を考慮）
    total_impressions = impressions_per_post * count_per_lang
    total_engagements = total_impressions * ENGAGEMENT_RATE
    total_minimal_optins = total_impressions * optin_rate
    total_whop_traffic = total_impressions * whop_click_rate
    total_regular_conversions = total_minimal_optins * conversion_rate
    
    return {
        'impressions': total_impressions,
        'engagements': total_engagements,
        'minimal_optins': total_minimal_optins,
        'whop_traffic': total_whop_traffic,
        'regular_conversions': total_regular_conversions,
    }

# JST 21時から24時間の計画を生成
print("【JST 21:00（UTC 12:00）から開始】\n")

# 24時間分のスケジュールを生成（JST時刻順）
jst_schedule = []
for jst_hour in range(21, 21 + 24):
    actual_jst_hour = jst_hour % 24
    utc_hour = jst_to_utc(actual_jst_hour)
    utc_hour_str = f"{utc_hour:02d}:00"
    
    if utc_hour_str in POSTING_SCHEDULE:
        schedule = POSTING_SCHEDULE[utc_hour_str]
        jst_schedule.append({
            'jst_time': f"{actual_jst_hour:02d}:00",
            'utc_time': utc_hour_str,
            'schedule': schedule
        })

# 24時間の合計期待値を初期化
total_24h_impressions = 0
total_24h_engagements = 0
total_24h_minimal_optins = 0
total_24h_whop_traffic = 0
total_24h_regular_conversions = 0

# JST時刻順にソートして表示（各投稿ごとにすべての期待値を出力）
post_number = 1
for item in jst_schedule:
    jst_time = item['jst_time']
    utc_time = item['utc_time']
    schedule = item['schedule']
    
    # 日付表示（JST 0:00-8:59は翌日として表示）
    jst_hour_int = int(jst_time.split(':')[0])
    if jst_hour_int < 9:
        day_label = "（翌日）"
    else:
        day_label = ""
    
    post_type = schedule['type']
    langs = schedule['langs']
    count_per_lang = schedule.get('count_per_lang', 1)
    
    # 各言語ごとに詳細を出力
    for lang in langs:
        print("="*80)
        print(f"【投稿 #{post_number}】JST {jst_time}{day_label}（UTC {utc_time}）")
        print("="*80)
        print(f"📅 時刻: JST {jst_time}{day_label}（UTC {utc_time}）")
        print(f"🌐 言語: {lang.upper()}")
        print(f"📝 投稿タイプ: {post_type.upper().replace('_', ' ')}")
        print(f"📊 投稿数: {count_per_lang}回")
        
        # インフルエンサー情報（詳細）
        if 'influencer_selection' in schedule and lang in schedule['influencer_selection']:
            selection = schedule['influencer_selection'][lang]
            print(f"\n👥 インフルエンサー選択:")
            print(f"   - ストック数: {selection['stock_count']}人（Vercel KVに保存済み）")
            print(f"   - インプレッション目標: {selection['target_impressions']['min']:,}-{selection['target_impressions']['max']:,}/投稿")
            print(f"   - 選択数: {selection['select_count']}人/回")
            print(f"   - 選択方法: selectInfluencersForImpressionTarget()関数により、インプレッション数でソートして上位を選択")
            print(f"   - 選択基準: インプレッション数（降順）、目標インプレッション規模を達成するために最適な組み合わせを選択")
            # ストック更新時刻を取得（UTC 02:00に各言語のストックを更新）
            stock_update_time = "02:00"
            print(f"   - ストック更新: UTC {stock_update_time}に更新（/api/x-update-influencer-stock?lang={lang}）")
        else:
            print(f"\n👥 インフルエンサー選択: なし（直接投稿）")
        
        # 投稿内容
        print(f"\n📄 投稿内容:")
        print(f"   {schedule['content']}")
        if 'additional' in schedule:
            print(f"   {schedule['additional']}")
        
        # 期待値を計算
        expectations = calculate_post_expectations(lang, post_type, count_per_lang)
        
        print(f"\n📈 期待値（この投稿による）:")
        print(f"   1. インプレッション数: {expectations['impressions']:,.0f}")
        print(f"   2. エンゲージメント数: {expectations['engagements']:,.0f}（エンゲージメント率: {ENGAGEMENT_RATE*100:.0f}%）")
        print(f"   3. 無料版（Minimal Version）オプトイン数: {expectations['minimal_optins']:,.0f}人（オプトイン率: {LANG_OPTIN_RATES.get(lang, 0)*100:.1f}%）")
        print(f"   4. Whopトラフィック数: {expectations['whop_traffic']:,.0f}クリック（Whopクリック率: {CONVERSION_RATES['whop_click_rate']['moderate']*100:.1f}%）")
        print(f"   5. 有料版（Regular Briefing）コンバージョン数: {expectations['regular_conversions']:.1f}人（コンバージョン率: {LANG_CONVERSION_RATES.get(lang, 0)*100:.1f}%）")
        
        # 計算根拠を追加
        print(f"\n📐 計算根拠:")
        if post_type == 'quote_repost':
            quote_ratio = POST_PATTERNS['quote_reposts']['impressions'] / (POST_PATTERNS['quote_reposts']['impressions'] + POST_PATTERNS['free_reports']['impressions'] + POST_PATTERNS['minimal_version']['impressions'])
            lang_quote_impressions = LANG_IMPRESSIONS.get(lang, 0) * quote_ratio
            daily_quote_posts = 4 if lang == 'en' else 2
            impressions_per_post = lang_quote_impressions / daily_quote_posts
            print(f"   - 言語別1日インプレッション数: {LANG_IMPRESSIONS.get(lang, 0):,}")
            print(f"   - Quote Reposts比率: {quote_ratio*100:.1f}%")
            print(f"   - Quote Repostsによるインプレッション数: {lang_quote_impressions:,.0f}")
            print(f"   - 1日のQuote Reposts投稿数: {daily_quote_posts}回")
            print(f"   - 1回の投稿あたりのインプレッション数: {impressions_per_post:,.0f}")
            print(f"   - この投稿によるインプレッション数: {impressions_per_post * count_per_lang:,.0f}（投稿数: {count_per_lang}回）")
        elif post_type == 'free_report':
            free_ratio = POST_PATTERNS['free_reports']['impressions'] / (POST_PATTERNS['quote_reposts']['impressions'] + POST_PATTERNS['free_reports']['impressions'] + POST_PATTERNS['minimal_version']['impressions'])
            lang_free_impressions = LANG_IMPRESSIONS.get(lang, 0) * free_ratio
            impressions_per_post = lang_free_impressions / 1
            print(f"   - 言語別1日インプレッション数: {LANG_IMPRESSIONS.get(lang, 0):,}")
            print(f"   - Free Reports比率: {free_ratio*100:.1f}%")
            print(f"   - Free Reportsによるインプレッション数: {lang_free_impressions:,.0f}")
            print(f"   - 1日のFree Reports投稿数: 1回")
            print(f"   - 1回の投稿あたりのインプレッション数: {impressions_per_post:,.0f}")
            print(f"   - この投稿によるインプレッション数: {impressions_per_post * count_per_lang:,.0f}（投稿数: {count_per_lang}回）")
        elif post_type == 'minimal_version':
            minimal_ratio = POST_PATTERNS['minimal_version']['impressions'] / (POST_PATTERNS['quote_reposts']['impressions'] + POST_PATTERNS['free_reports']['impressions'] + POST_PATTERNS['minimal_version']['impressions'])
            lang_minimal_impressions = LANG_IMPRESSIONS.get(lang, 0) * minimal_ratio
            impressions_per_post = lang_minimal_impressions / 1
            print(f"   - 言語別1日インプレッション数: {LANG_IMPRESSIONS.get(lang, 0):,}")
            print(f"   - Minimal Version比率: {minimal_ratio*100:.1f}%")
            print(f"   - Minimal Versionによるインプレッション数: {lang_minimal_impressions:,.0f}")
            print(f"   - 1日のMinimal Version投稿数: 1回")
            print(f"   - 1回の投稿あたりのインプレッション数: {impressions_per_post:,.0f}")
            print(f"   - この投稿によるインプレッション数: {impressions_per_post * count_per_lang:,.0f}（投稿数: {count_per_lang}回）")
        
        # 24時間の合計に加算
        total_24h_impressions += expectations['impressions']
        total_24h_engagements += expectations['engagements']
        total_24h_minimal_optins += expectations['minimal_optins']
        total_24h_whop_traffic += expectations['whop_traffic']
        total_24h_regular_conversions += expectations['regular_conversions']
        
        post_number += 1
        print()

# 24時間の合計期待値を出力
print("="*80)
print("=== 24時間の合計期待値（JST 21:00から24時間後まで） ===")
print("="*80)
print(f"\n📊 合計投稿数: {post_number - 1}回")
print(f"\n📈 合計期待値:")
print(f"   1. インプレッション数: {total_24h_impressions:,.0f}")
print(f"   2. エンゲージメント数: {total_24h_engagements:,.0f}（エンゲージメント率: {ENGAGEMENT_RATE*100:.0f}%）")
print(f"   3. 無料版（Minimal Version）オプトイン数: {total_24h_minimal_optins:,.0f}人")
print(f"   4. Whopトラフィック数: {total_24h_whop_traffic:,.0f}クリック")
print(f"   5. 有料版（Regular Briefing）コンバージョン数: {total_24h_regular_conversions:.1f}人")
print()

print("\n=== 参照ドキュメント ===\n")
print("- docs/CONVERSION_EXPECTATIONS_2026-01-25.md")
print("- docs/SSOT_KPI_FUNNEL_STATUS_2026-01-24.md")
print("- docs/X_METRICS_EXPLANATION.md")
print("- docs/DETAILED_POSTING_SCHEDULE_2026-01-25.md（詳細な投稿スケジュール）")
print("- docs/GROK_X_POSTING_SCHEDULE_CONFIRMATION_2026-01-24.md")
print("- docs/INFLUENCER_EXPECTED_PERFORMANCE_2026-01-25.md")

# 完全な出力をMarkdownファイルに保存
# 出力をファイルにも保存
output_file = 'docs/JST_21H_24H_COMPLETE_PLAN_2026-01-25.md'
print(f"\n完全な計画を {output_file} に保存しました。")
print(f"ファイルを確認してください: {output_file}")
