#!/usr/bin/env python3
"""
目標達成可能性分析スクリプト
ログファイルから実際の実行状況を分析し、期待値との比較を行う
"""

import json
import sys
from datetime import datetime
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

# 期待値（Grok補正版）
EXPECTED_METRICS = {
    'total_posts': 18,
    'total_impressions': 675000,
    'total_engagements': 77625,
    'total_minimal_optins': 14715,
    'total_whop_traffic': 28998,
    'total_regular_conversions': 2001.5,
}

# Cron Jobsの期待実行回数
EXPECTED_CRON_EXECUTIONS = {
    '/api/x-post-free-report': 5,
    '/api/x-post-minimal-version-cron': 2,
    '/api/x-quote-repost': 7,
    '/api/x-update-influencer-stock': 6,  # 各言語1回
}

def load_logs(log_file_path):
    """ログファイルを読み込む"""
    try:
        with open(log_file_path, 'r', encoding='utf-8') as f:
            # JSON Lines形式またはJSON配列形式に対応
            content = f.read().strip()
            if content.startswith('['):
                return json.loads(content)
            else:
                # JSON Lines形式
                logs = []
                for line in content.split('\n'):
                    if line.strip():
                        try:
                            logs.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue
                return logs
    except Exception as e:
        print(f"❌ ログファイルの読み込みに失敗: {e}")
        return []

def analyze_cron_executions(logs):
    """Cron Jobsの実行状況を分析"""
    cron_stats = defaultdict(lambda: {'count': 0, 'success': 0, 'errors': 0, 'skipped': 0})
    unique_requests = set()
    
    for log in logs:
        request_path = log.get('requestPath', '')
        function_path = log.get('function', '')
        request_id = log.get('requestId', '')
        status_code = log.get('responseStatusCode', 0)
        message = log.get('message', '').lower()
        
        # パスを正規化（/api/以降を抽出）
        normalized_path = None
        if '/api/' in request_path:
            normalized_path = '/api/' + request_path.split('/api/')[1].split('?')[0]
        elif function_path:
            normalized_path = function_path
        
        # Cron Jobsのパスをチェック
        cron_paths = [
            '/api/x-post-free-report',
            '/api/x-post-minimal-version-cron',
            '/api/x-quote-repost',
            '/api/x-update-influencer-stock',
        ]
        
        matched_path = None
        for cron_path in cron_paths:
            if normalized_path and cron_path in normalized_path:
                matched_path = cron_path
                break
        
        if matched_path:
            # 重複排除（同じrequestIdは1回のみカウント）
            if request_id and request_id in unique_requests:
                continue
            unique_requests.add(request_id)
            
            cron_stats[matched_path]['count'] += 1
            
            if status_code == 200:
                cron_stats[matched_path]['success'] += 1
            elif status_code >= 400:
                cron_stats[matched_path]['errors'] += 1
            
            # スキップされた投稿を検出
            if 'skipping' in message or 'skip' in message or 'limit reached' in message:
                cron_stats[matched_path]['skipped'] += 1
    
    return cron_stats

def analyze_errors(logs):
    """エラーを分析"""
    errors = {
        'x_api_400': 0,
        'rate_limit': 0,
        'other_errors': 0,
        'x_api_400_details': [],
    }
    
    for log in logs:
        message = log.get('message', '').lower()
        status_code = log.get('responseStatusCode', 0)
        request_path = log.get('requestPath', '')
        function_path = log.get('function', '')
        
        if 'x api error: 400' in message or ('400' in message and 'api' in message):
            errors['x_api_400'] += 1
            errors['x_api_400_details'].append({
                'path': request_path or function_path,
                'message': log.get('message', '')[:200],
                'timestamp': log.get('TimeUTC', ''),
            })
        elif 'rate limit' in message or '429' in str(status_code):
            errors['rate_limit'] += 1
        elif status_code >= 400:
            errors['other_errors'] += 1
    
    return errors

def calculate_achievement_probability(cron_stats, errors, log_count):
    """達成可能性を計算"""
    issues = []
    probability_score = 100.0
    
    # 1. Cron Jobsの実行状況をチェック
    total_expected_executions = sum(EXPECTED_CRON_EXECUTIONS.values())
    total_actual_executions = sum(stats['count'] for stats in cron_stats.values())
    
    execution_rate = (total_actual_executions / total_expected_executions * 100) if total_expected_executions > 0 else 0
    
    if execution_rate < 80:
        issues.append(f"❌ Cron Jobsの実行率が低い: {execution_rate:.1f}% (期待値: 100%)")
        probability_score -= 30
    
    # 2. エラー率をチェック
    total_errors = errors['x_api_400'] + errors['rate_limit'] + errors['other_errors']
    error_rate = (total_errors / log_count * 100) if log_count > 0 else 0
    
    if error_rate > 5:
        issues.append(f"❌ エラー率が高い: {error_rate:.1f}%")
        probability_score -= 20
    
    # 3. X APIエラー（400）をチェック
    if errors['x_api_400'] > 0:
        issues.append(f"❌ X APIエラー（400）が発生: {errors['x_api_400']}件")
        probability_score -= 15
    
    # 4. レート制限をチェック
    if errors['rate_limit'] > 0:
        issues.append(f"⚠️ レート制限が発生: {errors['rate_limit']}件")
        probability_score -= 10
    
    # 5. スキップされた投稿をチェック
    total_skipped = sum(stats['skipped'] for stats in cron_stats.values())
    if total_skipped > 0:
        issues.append(f"⚠️ スキップされた投稿: {total_skipped}件")
        probability_score -= 5
    
    return {
        'probability_score': max(0, probability_score),
        'execution_rate': execution_rate,
        'error_rate': error_rate,
        'issues': issues,
        'cron_stats': cron_stats,
        'errors': errors,
    }

def print_analysis(log_file_path):
    """分析結果を出力"""
    print("="*80)
    print("=== 目標達成可能性分析 ===")
    print("="*80)
    print(f"\n📁 ログファイル: {log_file_path}")
    
    # ログを読み込む
    logs = load_logs(log_file_path)
    if not logs:
        print("❌ ログファイルが空か、読み込めませんでした。")
        return
    
    print(f"📊 総ログ数: {len(logs)}件\n")
    
    # Cron Jobsの実行状況を分析
    cron_stats = analyze_cron_executions(logs)
    
    print("📋 Cron Jobsの実行状況:")
    print("-"*80)
    for path, expected_count in EXPECTED_CRON_EXECUTIONS.items():
        stats = cron_stats.get(path, {'count': 0, 'success': 0, 'errors': 0, 'skipped': 0})
        execution_rate = (stats['count'] / expected_count * 100) if expected_count > 0 else 0
        
        status = "✅" if execution_rate >= 80 else "⚠️" if execution_rate >= 50 else "❌"
        print(f"{status} {path}:")
        print(f"   期待実行回数: {expected_count}回")
        print(f"   実際の実行回数: {stats['count']}回 ({execution_rate:.1f}%)")
        print(f"   成功: {stats['success']}回")
        print(f"   エラー: {stats['errors']}回")
        print(f"   スキップ: {stats['skipped']}回")
        print()
    
    # エラーを分析
    errors = analyze_errors(logs)
    
    print("🔍 エラー分析:")
    print("-"*80)
    print(f"   X APIエラー（400）: {errors['x_api_400']}件")
    if errors['x_api_400'] > 0:
        print("   ⚠️ 詳細:")
        for i, detail in enumerate(errors['x_api_400_details'][:5], 1):  # 最初の5件のみ表示
            print(f"      {i}. {detail['path']}")
            print(f"         時刻: {detail['timestamp']}")
            print(f"         メッセージ: {detail['message'][:100]}...")
    print(f"   レート制限: {errors['rate_limit']}件")
    print(f"   その他のエラー: {errors['other_errors']}件")
    print()
    
    # 達成可能性を計算
    analysis = calculate_achievement_probability(cron_stats, errors, len(logs))
    
    print("📈 達成可能性評価:")
    print("-"*80)
    print(f"   達成可能性スコア: {analysis['probability_score']:.1f}/100")
    print(f"   Cron Jobs実行率: {analysis['execution_rate']:.1f}%")
    print(f"   エラー率: {analysis['error_rate']:.1f}%")
    print()
    
    if analysis['issues']:
        print("⚠️ 発見された問題:")
        for issue in analysis['issues']:
            print(f"   {issue}")
        print()
    
    # 期待値との比較
    print("🎯 期待値との比較:")
    print("-"*80)
    print(f"   期待投稿数: {EXPECTED_METRICS['total_posts']}回")
    print(f"   期待インプレッション数: {EXPECTED_METRICS['total_impressions']:,}")
    print(f"   期待エンゲージメント数: {EXPECTED_METRICS['total_engagements']:,}")
    print(f"   期待コンバージョン数: {EXPECTED_METRICS['total_regular_conversions']:.1f}人")
    print()
    
    # 実際の投稿数を推定
    actual_posts_estimate = sum(stats['success'] for stats in cron_stats.values())
    expected_posts = EXPECTED_METRICS['total_posts']
    posts_achievement_rate = (actual_posts_estimate / expected_posts * 100) if expected_posts > 0 else 0
    
    print("📊 投稿数推定:")
    print("-"*80)
    print(f"   期待投稿数: {expected_posts}回")
    print(f"   推定実際の投稿数: {actual_posts_estimate}回 ({posts_achievement_rate:.1f}%)")
    print()
    
    # 結論
    print("="*80)
    if analysis['probability_score'] >= 80 and posts_achievement_rate >= 80:
        print("✅ 達成可能性: 高い")
        print("   Cron Jobsが正常に実行されていれば、期待値に近い結果が得られる可能性が高いです。")
    elif analysis['probability_score'] >= 50:
        print("⚠️ 達成可能性: 中程度")
        print("   いくつかの問題がありますが、修正すれば達成可能です。")
        if errors['x_api_400'] > 0:
            print(f"   ⚠️ X APIエラー（400）が{errors['x_api_400']}件発生しています。実装の欠陥が原因の可能性が高いです。")
    else:
        print("❌ 達成可能性: 低い")
        print("   重大な問題が複数発見されました。実装の欠陥が原因の可能性が高いです。")
        if errors['x_api_400'] > 0:
            print(f"   ❌ X APIエラー（400）が{errors['x_api_400']}件発生しています。これは実装の欠陥（引数順序エラーなど）が原因です。")
    print("="*80)

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='目標達成可能性分析')
    parser.add_argument('log_file', nargs='?', default=r'c:\Users\chiba\Downloads\logs_result (1).json', help='ログファイルのパス')
    
    args = parser.parse_args()
    
    print_analysis(args.log_file)
