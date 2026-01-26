import json
import sys
from datetime import datetime
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

# Grok分析結果に基づく補正係数（docs/grok-deep-analysis-2026-01-25.jsonより）
GROK_ADJUSTMENTS = {
    'impressions_multiplier': 0.90,  # -10%: 90k-250k → 80k-220k
    'engagement_rate_min': 0.08,      # 8%
    'engagement_rate_max': 0.15,      # 15%
    'engagement_rate_avg': 0.115,     # 平均11.5%
    'conversion_rate_min': 0.03,      # 3%
    'conversion_rate_max': 0.06,      # 6%
    'conversion_rate_avg': 0.045,     # 平均4.5%（ただしこれは有料版コンバージョン率への影響）
}

# サポートされている言語
SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko']

# ドキュメント（CONVERSION_EXPECTATIONS_2026-01-25.md, SSOT_KPI_FUNNEL_STATUS_2026-01-24.md）から
# 言語別の期待インプレッション数（SSOTより、Grok補正前）
LANG_IMPRESSIONS_BASE = {
    'en': 250000,   # 1日あたり
    'es': 120000,
    'pt-br': 110000,
    'ar': 80000,
    'ko': 100000,
    'ja': 90000,
}

# Grok補正後のインプレッション数
LANG_IMPRESSIONS = {
    lang: int(impressions * GROK_ADJUSTMENTS['impressions_multiplier'])
    for lang, impressions in LANG_IMPRESSIONS_BASE.items()
}

# 言語別の無料版オプトイン率（SSOTより、変更なし）
LANG_OPTIN_RATES = {
    'en': 0.025,    # 2.5%
    'es': 0.022,    # 2.2%
    'pt-br': 0.021, # 2.1%
    'ar': 0.018,    # 1.8%
    'ko': 0.020,    # 2.0%
    'ja': 0.019,    # 1.9%
}

# 言語別の有料版コンバージョン率（SSOTより、Grok補正適用）
# Grok分析: 標準2-5% → 3-6% (平均4.5%の改善)
# ただし、これは全体のコンバージョン率への影響なので、各言語のコンバージョン率に補正を適用
LANG_CONVERSION_RATES_BASE = {
    'en': 0.120,    # 12.0%
    'es': 0.100,    # 10.0%
    'pt-br': 0.095, # 9.5%
    'ar': 0.080,    # 8.0%
    'ko': 0.105,    # 10.5%
    'ja': 0.100,    # 10.0%
}

# Grok補正: コンバージョン率を1.5倍（2-5% → 3-6%の改善を反映）
CONVERSION_RATE_MULTIPLIER = GROK_ADJUSTMENTS['conversion_rate_avg'] / 0.035  # 4.5% / 3.5% = 1.286

LANG_CONVERSION_RATES = {
    lang: min(rate * CONVERSION_RATE_MULTIPLIER, 1.0)  # 最大100%に制限
    for lang, rate in LANG_CONVERSION_RATES_BASE.items()
}

# エンゲージメント率（Grok補正後: 8-15%、平均11.5%）
ENGAGEMENT_RATE = GROK_ADJUSTMENTS['engagement_rate_avg']  # 11.5%

# 投稿パターン（CONVERSION_EXPECTATIONS_2026-01-25.mdより、Grok補正適用）
POST_PATTERNS_BASE = {
    'quote_reposts': {'count': 10, 'impressions': 1511000, 'has_links': False},
    'free_reports': {'count': 5, 'impressions': 755500, 'has_links': True},
    'minimal_version': {'count': 1, 'impressions': 855500, 'has_links': True},
}

POST_PATTERNS = {
    key: {
        **value,
        'impressions': int(value['impressions'] * GROK_ADJUSTMENTS['impressions_multiplier'])
    }
    for key, value in POST_PATTERNS_BASE.items()
}

# コンバージョン率（CONVERSION_EXPECTATIONS_2026-01-25.mdより、変更なし）
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

print("="*80)
print("=== 24時間で期待されるビジネス指標（Grok分析結果に基づく補正版） ===")
print("="*80)
print("\n📊 Grok補正係数:")
print(f"   - インプレッション数: -10% (×{GROK_ADJUSTMENTS['impressions_multiplier']})")
print(f"   - エンゲージメント率: 8-15% (平均{ENGAGEMENT_RATE*100:.1f}%)")
print(f"   - コンバージョン率: 3-6% (平均{GROK_ADJUSTMENTS['conversion_rate_avg']*100:.1f}%)")
print(f"   - 補正理由: Sideways低ボラで市場静観、Xデータ欠損でバズ低。Fear高でコアファン維持も新規流入減。")
print(f"   - 補正理由: 逆張り機会訴求で有料レポートCV向上。リスク警戒で質の高いリード獲得。")
print("\n" + "="*80 + "\n")

# 言語別の期待値を計算
print("=== 言語別ビジネス指標（24時間あたりの期待値・Grok補正後） ===\n")

for lang in SUPPORTED_LANGS:
    impressions_base = LANG_IMPRESSIONS_BASE.get(lang, 0)
    impressions = LANG_IMPRESSIONS.get(lang, 0)
    optin_rate = LANG_OPTIN_RATES.get(lang, 0)
    conversion_rate_base = LANG_CONVERSION_RATES_BASE.get(lang, 0)
    conversion_rate = LANG_CONVERSION_RATES.get(lang, 0)
    
    # 1. X投稿数（変更なし）
    expected_posts = (POST_PATTERNS['quote_reposts']['count'] / len(SUPPORTED_LANGS) + 
                      POST_PATTERNS['free_reports']['count'] / len(SUPPORTED_LANGS) + 
                      POST_PATTERNS['minimal_version']['count'] / len(SUPPORTED_LANGS))
    
    # 2. インプレッション数（Grok補正後）
    expected_impressions = impressions
    
    # 3. エンゲージメント数（Grok補正後）
    expected_engagements = impressions * ENGAGEMENT_RATE
    
    # 4. 無料版（Minimal Version）オプトイン数（変更なし）
    expected_minimal_optins = impressions * optin_rate
    
    # 5. Whopトラフィック数（Grok補正後）
    expected_whop_traffic = impressions * CONVERSION_RATES['whop_click_rate']['moderate']
    
    # 6. 有料版（Regular Briefing）成約数（Grok補正後）
    expected_regular_conversions = expected_minimal_optins * conversion_rate
    
    print(f"【{lang.upper()}】")
    print(f"  1. X投稿数:")
    print(f"    期待値（24時間）: {expected_posts:.2f}回")
    
    print(f"  2. インプレッション数:")
    print(f"    補正前: {impressions_base:,.0f}")
    print(f"    補正後: {expected_impressions:,.0f} (補正: -{impressions_base - expected_impressions:,.0f})")
    
    print(f"  3. エンゲージメント数:")
    print(f"    補正前: {impressions_base * 0.10:,.0f} (10%)")
    print(f"    補正後: {expected_engagements:,.0f} (エンゲージメント率: {ENGAGEMENT_RATE*100:.1f}%)")
    
    print(f"  4. 無料版（Minimal Version）オプトイン数:")
    print(f"    期待値（24時間）: {expected_minimal_optins:,.0f}人")
    print(f"    （オプトイン率: {optin_rate*100:.1f}%）")
    
    print(f"  5. Whopトラフィック数:")
    print(f"    補正前: {impressions_base * CONVERSION_RATES['whop_click_rate']['moderate']:,.0f}クリック")
    print(f"    補正後: {expected_whop_traffic:,.0f}クリック")
    print(f"    （Whopクリック率: {CONVERSION_RATES['whop_click_rate']['moderate']*100:.1f}%）")
    
    print(f"  6. 有料版（Regular Briefing）成約数:")
    print(f"    補正前: {impressions_base * optin_rate * conversion_rate_base:.1f}人")
    print(f"    補正後: {expected_regular_conversions:.1f}人")
    print(f"    （コンバージョン率: {conversion_rate*100:.1f}%）")
    
    print()

# 全体サマリー
print("\n=== 全体サマリー（全言語合計・Grok補正後） ===\n")

total_impressions_base = sum(LANG_IMPRESSIONS_BASE.values())
total_impressions = sum(LANG_IMPRESSIONS.values())
total_engagements_base = total_impressions_base * 0.10
total_engagements = total_impressions * ENGAGEMENT_RATE
total_minimal_optins = sum(LANG_IMPRESSIONS[lang] * LANG_OPTIN_RATES[lang] for lang in SUPPORTED_LANGS)
total_whop_traffic_base = (POST_PATTERNS_BASE['free_reports']['impressions'] + POST_PATTERNS_BASE['minimal_version']['impressions']) * CONVERSION_RATES['whop_click_rate']['moderate']
total_whop_traffic = (POST_PATTERNS['free_reports']['impressions'] + POST_PATTERNS['minimal_version']['impressions']) * CONVERSION_RATES['whop_click_rate']['moderate']
total_conversions_base = sum(LANG_IMPRESSIONS_BASE[lang] * LANG_OPTIN_RATES[lang] * LANG_CONVERSION_RATES_BASE[lang] for lang in SUPPORTED_LANGS)
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
print(f"  補正前: {total_impressions_base:,.0f}")
print(f"  補正後: {total_impressions:,.0f} (補正: -{total_impressions_base - total_impressions:,.0f}, -{((total_impressions_base - total_impressions) / total_impressions_base * 100):.1f}%)")
print(f"  - Quote Reposts: {POST_PATTERNS['quote_reposts']['impressions']:,.0f}")
print(f"  - Free Reports: {POST_PATTERNS['free_reports']['impressions']:,.0f}")
print(f"  - Minimal Version: {POST_PATTERNS['minimal_version']['impressions']:,.0f}")

print(f"\n3. エンゲージメント数:")
print(f"  補正前: {total_engagements_base:,.0f} (10%)")
print(f"  補正後: {total_engagements:,.0f} (エンゲージメント率: {ENGAGEMENT_RATE*100:.1f}%)")
print(f"  補正差: {total_engagements - total_engagements_base:,.0f}")

print(f"\n4. 無料版（Minimal Version）オプトイン数:")
print(f"  期待値（24時間）: {total_minimal_optins:,.0f}人")
print(f"  （平均オプトイン率: {(total_minimal_optins/total_impressions)*100:.2f}%）")

print(f"\n5. Whopトラフィック数:")
print(f"  補正前: {total_whop_traffic_base:,.0f}クリック")
print(f"  補正後: {total_whop_traffic:,.0f}クリック")
print(f"  （Whopクリック率: {CONVERSION_RATES['whop_click_rate']['moderate']*100:.1f}%）")

print(f"\n6. 有料版（Regular Briefing）成約数:")
print(f"  補正前: {total_conversions_base:.1f}人")
print(f"  補正後: {total_conversions:.1f}人")
print(f"  補正差: +{total_conversions - total_conversions_base:.1f}人 (+{((total_conversions - total_conversions_base) / total_conversions_base * 100):.1f}%)")
print(f"  （平均コンバージョン率: {(total_conversions/total_minimal_optins)*100:.2f}%）")

# JST 21時から24時間の詳細計画（補正版）
print("\n" + "="*80)
print("=== JST 21時から24時間の投稿計画（Grok補正版：すべての期待値を含む） ===")
print("="*80 + "\n")
print("（UTC時刻をJST時刻に変換: UTC + 9時間 = JST）\n")

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

# 各投稿ごとの期待値を計算する関数（Grok補正版）
def calculate_post_expectations(lang, post_type, count_per_lang=1):
    """各投稿ごとの期待値を計算（Grok補正版）"""
    impressions_per_day = LANG_IMPRESSIONS.get(lang, 0)
    optin_rate = LANG_OPTIN_RATES.get(lang, 0)
    conversion_rate = LANG_CONVERSION_RATES.get(lang, 0)
    whop_click_rate = CONVERSION_RATES['whop_click_rate']['moderate']
    
    # 言語別の1日の投稿数を計算
    if lang == 'en':
        daily_quote_posts = 4  # ENは4回/日
    else:
        daily_quote_posts = 2  # その他は2回/日
    
    daily_free_posts = 1  # 各言語1回/日
    daily_minimal_posts = 1  # 各言語1回/日（UTC 8:00のみ、UTC 20:00はEN/PT-BRのみ）
    
    # 投稿タイプに応じてインプレッション数を計算
    total_quote_impressions = POST_PATTERNS['quote_reposts']['impressions']
    total_free_impressions = POST_PATTERNS['free_reports']['impressions']
    total_minimal_impressions = POST_PATTERNS['minimal_version']['impressions']
    total_all_impressions = total_quote_impressions + total_free_impressions + total_minimal_impressions
    
    lang_impressions = LANG_IMPRESSIONS.get(lang, 0)
    
    if post_type == 'quote_repost':
        quote_ratio = total_quote_impressions / total_all_impressions if total_all_impressions > 0 else 0
        lang_quote_impressions = lang_impressions * quote_ratio
        impressions_per_post = lang_quote_impressions / max(daily_quote_posts, 1) if daily_quote_posts > 0 else 0
    elif post_type == 'free_report':
        free_ratio = total_free_impressions / total_all_impressions if total_all_impressions > 0 else 0
        lang_free_impressions = lang_impressions * free_ratio
        impressions_per_post = lang_free_impressions / max(daily_free_posts, 1) if daily_free_posts > 0 else 0
    elif post_type == 'minimal_version':
        minimal_ratio = total_minimal_impressions / total_all_impressions if total_all_impressions > 0 else 0
        lang_minimal_impressions = lang_impressions * minimal_ratio
        impressions_per_post = lang_minimal_impressions / max(daily_minimal_posts, 1) if daily_minimal_posts > 0 else 0
    else:
        impressions_per_post = 0
    
    # この投稿による期待値（投稿数分を考慮、Grok補正済み）
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
        print(f"【投稿 #{post_number}】JST {jst_time}{day_label}（UTC {utc_time}）【Grok補正版】")
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
            print(f"   - ストック更新: UTC 02:00に更新（/api/x-update-influencer-stock?lang={lang}）")
        else:
            print(f"\n👥 インフルエンサー選択: なし（直接投稿）")
        
        # 投稿内容
        print(f"\n📄 投稿内容:")
        print(f"   {schedule['content']}")
        if 'additional' in schedule:
            print(f"   {schedule['additional']}")
        
        # 期待値を計算（Grok補正版）
        expectations = calculate_post_expectations(lang, post_type, count_per_lang)
        
        print(f"\n📈 期待値（この投稿による・Grok補正後）:")
        print(f"   1. インプレッション数: {expectations['impressions']:,.0f}")
        print(f"   2. エンゲージメント数: {expectations['engagements']:,.0f}（エンゲージメント率: {ENGAGEMENT_RATE*100:.1f}%）")
        print(f"   3. 無料版（Minimal Version）オプトイン数: {expectations['minimal_optins']:,.0f}人（オプトイン率: {LANG_OPTIN_RATES.get(lang, 0)*100:.1f}%）")
        print(f"   4. Whopトラフィック数: {expectations['whop_traffic']:,.0f}クリック（Whopクリック率: {CONVERSION_RATES['whop_click_rate']['moderate']*100:.1f}%）")
        print(f"   5. 有料版（Regular Briefing）コンバージョン数: {expectations['regular_conversions']:.1f}人（コンバージョン率: {LANG_CONVERSION_RATES.get(lang, 0)*100:.1f}%）")
        
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
print("=== 24時間の合計期待値（JST 21:00から24時間後まで・Grok補正後） ===")
print("="*80)
print(f"\n📊 合計投稿数: {post_number - 1}回")
print(f"\n📈 合計期待値（Grok補正後）:")
print(f"   1. インプレッション数: {total_24h_impressions:,.0f}")
print(f"   2. エンゲージメント数: {total_24h_engagements:,.0f}（エンゲージメント率: {ENGAGEMENT_RATE*100:.1f}%）")
print(f"   3. 無料版（Minimal Version）オプトイン数: {total_24h_minimal_optins:,.0f}人")
print(f"   4. Whopトラフィック数: {total_24h_whop_traffic:,.0f}クリック")
print(f"   5. 有料版（Regular Briefing）コンバージョン数: {total_24h_regular_conversions:.1f}人")
print()

print("\n=== 補正の根拠（Grok分析結果より） ===\n")
print("📊 市場状況:")
print("   - 価格方向: 横ばい（sideways）")
print("   - 価格レンジ: $87,200 - $89,800")
print("   - Fear & Greed Index: 25 (Extreme Fear)")
print("   - Exchange Inflow: 0（売り圧枯渇）")
print("   - MPI: 0（変化なし）")
print()
print("📉 インプレッション補正理由:")
print("   - Sideways低ボラで市場静観")
print("   - Xデータ欠損でバズ低")
print("   - Fear高でコアファン維持も新規流入減")
print()
print("📈 エンゲージメント補正理由:")
print("   - Fear心理でRT/Reply増も、データ欠損で議論低調")
print("   - 機会強調で回復見込み")
print()
print("💰 コンバージョン補正理由:")
print("   - 逆張り機会訴求で有料レポートCV向上")
print("   - リスク警戒で質の高いリード獲得")
print()

print("\n=== 参照ドキュメント ===\n")
print("- docs/grok-deep-analysis-2026-01-25.json（Grok分析結果）")
print("- docs/gemini-market-prediction-2026-01-25.json（Gemini市況予測）")
print("- docs/CONVERSION_EXPECTATIONS_2026-01-25.md")
print("- docs/SSOT_KPI_FUNNEL_STATUS_2026-01-24.md")
