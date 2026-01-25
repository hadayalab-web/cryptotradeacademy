#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import sys
from collections import defaultdict
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

def analyze_cron_test_results(json_file_path):
    """Cron Jobsのテスト結果を分析"""
    
    with open(json_file_path, 'r', encoding='utf-8') as f:
        logs = json.load(f)
    
    # Cron Jobsのエンドポイントを抽出
    cron_endpoints = defaultdict(list)
    error_logs = []
    success_logs = []
    
    for log in logs:
        request_path = log.get('requestPath', '')
        status_code_raw = log.get('responseStatusCode', 0)
        # 型変換: 文字列の場合はintに変換
        try:
            status_code = int(status_code_raw) if status_code_raw else 0
        except (ValueError, TypeError):
            status_code = 0
        message = log.get('message', '')
        time_utc = log.get('TimeUTC', '')
        user_agent = log.get('requestUserAgent', '')
        
        # Cron Jobかどうかを判定（vercel-cron user agent または /api/ パス）
        is_cron = 'vercel-cron' in user_agent.lower() or '/api/' in request_path
        
        if is_cron:
            endpoint = request_path.split('/')[-1] if '/' in request_path else request_path
            cron_endpoints[endpoint].append({
                'time': time_utc,
                'status': status_code,
                'message': message,
                'requestId': log.get('requestId', ''),
                'full_path': request_path
            })
            
            if status_code >= 200 and status_code < 300:
                success_logs.append(log)
            else:
                error_logs.append(log)
    
    # 結果を整理
    results = {}
    total_cron_jobs = 0
    successful_jobs = 0
    failed_jobs = 0
    
    print("=" * 80)
    print("📊 Cron Jobs テスト結果分析")
    print("=" * 80)
    print()
    
    for endpoint, logs_list in sorted(cron_endpoints.items()):
        total_cron_jobs += len(logs_list)
        endpoint_success = sum(1 for l in logs_list if 200 <= l['status'] < 300)
        endpoint_failed = len(logs_list) - endpoint_success
        
        successful_jobs += endpoint_success
        failed_jobs += endpoint_failed
        
        status_icon = "✅" if endpoint_failed == 0 else "❌"
        
        print(f"{status_icon} {endpoint}")
        print(f"   実行回数: {len(logs_list)}")
        print(f"   成功: {endpoint_success} ({endpoint_success/len(logs_list)*100:.1f}%)")
        print(f"   失敗: {endpoint_failed} ({endpoint_failed/len(logs_list)*100:.1f}%)")
        
        # 失敗がある場合、詳細を表示
        if endpoint_failed > 0:
            print("   失敗ログ:")
            for log_entry in logs_list:
                if not (200 <= log_entry['status'] < 300):
                    print(f"     - {log_entry['time']}: Status {log_entry['status']}")
                    if log_entry['message']:
                        print(f"       Message: {log_entry['message'][:200]}")
        
        # 最新の実行時間を表示
        if logs_list:
            latest = max(logs_list, key=lambda x: x['time'])
            print(f"   最新実行: {latest['time']}")
        
        print()
        
        results[endpoint] = {
            'total': len(logs_list),
            'success': endpoint_success,
            'failed': endpoint_failed,
            'success_rate': endpoint_success/len(logs_list)*100 if logs_list else 0
        }
    
    print("=" * 80)
    print("📈 総合統計")
    print("=" * 80)
    print(f"総Cron Jobs実行数: {total_cron_jobs}")
    print(f"成功: {successful_jobs} ({successful_jobs/total_cron_jobs*100:.1f}%)" if total_cron_jobs > 0 else "成功: 0")
    print(f"失敗: {failed_jobs} ({failed_jobs/total_cron_jobs*100:.1f}%)" if total_cron_jobs > 0 else "失敗: 0")
    print(f"ユニークエンドポイント数: {len(cron_endpoints)}")
    print()
    
    # エラー詳細
    if error_logs:
        print("=" * 80)
        print("❌ エラー詳細")
        print("=" * 80)
        for error in error_logs[:10]:  # 最初の10件
            print(f"時間: {error.get('TimeUTC', 'N/A')}")
            print(f"パス: {error.get('requestPath', 'N/A')}")
            print(f"ステータス: {error.get('responseStatusCode', 'N/A')}")
            print(f"メッセージ: {error.get('message', 'N/A')[:200]}")
            print("-" * 80)
    
    # 重要なメッセージを検索
    print("=" * 80)
    print("🔍 重要なメッセージ検索")
    print("=" * 80)
    
    important_keywords = [
        'SUCCESSFULLY POSTED',
        'FAILED TO POST',
        'posted',
        'timeout',
        'error',
        'influencer',
        'stock',
        'quote repost'
    ]
    
    for keyword in important_keywords:
        matches = [log for log in logs if keyword.lower() in str(log.get('message', '')).lower()]
        if matches:
            print(f"\n'{keyword}' を含むログ: {len(matches)}件")
            for match in matches[:3]:  # 最初の3件
                print(f"  - {match.get('TimeUTC', 'N/A')}: {match.get('message', '')[:150]}")
    
    return results

if __name__ == '__main__':
    json_file = r'c:\Users\chiba\Downloads\logs_result (2).json'
    analyze_cron_test_results(json_file)
