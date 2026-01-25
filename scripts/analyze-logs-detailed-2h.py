#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import sys
from collections import defaultdict
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

def analyze_logs_detailed(json_file_path):
    """2時間分のログを詳細分析"""
    
    with open(json_file_path, 'r', encoding='utf-8') as f:
        logs = json.load(f)
    
    print("=" * 80)
    print("📊 2時間分のログ詳細分析（最新デプロイ後）")
    print("=" * 80)
    print()
    
    # 時間範囲を確認
    times = [log.get('TimeUTC', '') for log in logs if log.get('TimeUTC')]
    if times:
        print(f"📅 ログ時間範囲: {min(times)} ～ {max(times)}")
        print()
    
    # Cron Jobsのエンドポイントを抽出
    cron_endpoints = defaultdict(list)
    error_logs = []
    success_logs = []
    
    for log in logs:
        request_path = log.get('requestPath', '')
        status_code_raw = log.get('responseStatusCode', 0)
        try:
            status_code = int(status_code_raw) if status_code_raw else 0
        except (ValueError, TypeError):
            status_code = 0
        message = log.get('message', '')
        time_utc = log.get('TimeUTC', '')
        user_agent = log.get('requestUserAgent', '')
        
        # Cron Jobかどうかを判定
        is_cron = 'vercel-cron' in user_agent.lower() or '/api/' in request_path
        
        if is_cron:
            endpoint = request_path.split('/')[-1] if '/' in request_path else request_path
            # クエリパラメータを除去
            if '?' in endpoint:
                endpoint = endpoint.split('?')[0]
            
            cron_endpoints[endpoint].append({
                'time': time_utc,
                'status': status_code,
                'message': message,
                'requestId': log.get('requestId', ''),
                'full_path': request_path
            })
            
            # Status 0は正常終了の可能性があるため、メッセージで判定
            message_lower = str(message).lower()
            if status_code >= 200 and status_code < 300:
                success_logs.append(log)
            elif status_code == 0:
                # Status 0でも成功メッセージがあれば成功とみなす
                if any(keyword in message_lower for keyword in ['success', 'completed', 'posted', 'saved', 'updated', 'skipping']):
                    success_logs.append(log)
                elif any(keyword in message_lower for keyword in ['error', 'failed', 'exception']):
                    error_logs.append(log)
                else:
                    # 不明な場合は成功とみなす（Status 0は正常終了の可能性が高い）
                    success_logs.append(log)
            else:
                error_logs.append(log)
    
    # 結果を整理
    results = {}
    total_cron_jobs = 0
    successful_jobs = 0
    failed_jobs = 0
    
    for endpoint, logs_list in sorted(cron_endpoints.items()):
        total_cron_jobs += len(logs_list)
        
        # Status 0の処理を改善
        endpoint_success = 0
        endpoint_failed = 0
        
        for l in logs_list:
            msg_lower = str(l['message']).lower()
            if 200 <= l['status'] < 300:
                endpoint_success += 1
            elif l['status'] == 0:
                # Status 0でも成功メッセージがあれば成功
                if any(kw in msg_lower for kw in ['success', 'completed', 'posted', 'saved', 'updated', 'skipping', 'remaining stock']):
                    endpoint_success += 1
                elif any(kw in msg_lower for kw in ['error', 'failed', 'exception']):
                    endpoint_failed += 1
                else:
                    # 不明な場合は成功とみなす
                    endpoint_success += 1
            else:
                endpoint_failed += 1
        
        successful_jobs += endpoint_success
        failed_jobs += endpoint_failed
        
        status_icon = "✅" if endpoint_failed == 0 else "⚠️" if endpoint_success > endpoint_failed else "❌"
        
        print(f"{status_icon} {endpoint}")
        print(f"   実行回数: {len(logs_list)}")
        print(f"   成功: {endpoint_success} ({endpoint_success/len(logs_list)*100:.1f}%)")
        print(f"   失敗: {endpoint_failed} ({endpoint_failed/len(logs_list)*100:.1f}%)")
        
        # 失敗がある場合、詳細を表示
        if endpoint_failed > 0:
            print("   失敗ログ:")
            for log_entry in logs_list:
                msg_lower = str(log_entry['message']).lower()
                is_failed = False
                if not (200 <= log_entry['status'] < 300):
                    if log_entry['status'] == 0:
                        if any(kw in msg_lower for kw in ['error', 'failed', 'exception']):
                            is_failed = True
                    else:
                        is_failed = True
                
                if is_failed:
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
    
    # X投稿の成功を確認
    print("=" * 80)
    print("📱 X投稿の成功確認")
    print("=" * 80)
    
    posted_logs = [log for log in logs if 'posted successfully' in str(log.get('message', '')).lower()]
    print(f"X投稿成功: {len(posted_logs)}件")
    for posted in posted_logs[:10]:
        print(f"  - {posted.get('TimeUTC', 'N/A')}: {posted.get('message', '')[:100]}")
    print()
    
    # インフルエンサーストック更新の成功を確認
    print("=" * 80)
    print("👥 インフルエンサーストック更新の成功確認")
    print("=" * 80)
    
    influencer_stock_logs = [log for log in logs if 'influencer stock' in str(log.get('message', '')).lower() or 'influencerstock' in str(log.get('requestPath', '')).lower()]
    success_stock = [log for log in influencer_stock_logs if 'successfully updated' in str(log.get('message', '')).lower()]
    print(f"インフルエンサーストック更新成功: {len(success_stock)}件")
    for stock in success_stock[:5]:
        print(f"  - {stock.get('TimeUTC', 'N/A')}: {stock.get('message', '')[:150]}")
    print()
    
    # 最適化されたCron Jobsの実行確認
    print("=" * 80)
    print("🔄 最適化されたCron Jobsの実行確認")
    print("=" * 80)
    
    optimized_jobs = {
        'x-quote-repost-metrics': '0 1 * * *',  # 1日1回（UTC 1:00）
        'x-algorithm-analysis': '0 10 * * 1',   # 週1回（月曜 UTC 10:00）
    }
    
    for job_name, schedule in optimized_jobs.items():
        job_logs = [log for log in logs if job_name in str(log.get('requestPath', '')).lower()]
        print(f"{job_name}: {len(job_logs)}回実行")
        if job_logs:
            times = sorted(set([log.get('TimeUTC', '')[:13] for log in job_logs if log.get('TimeUTC')]))
            print(f"  実行時刻: {', '.join(times[:5])}")
        print()
    
    return results

if __name__ == '__main__':
    json_file = r'c:\Users\chiba\Downloads\logs_result (5).json'
    analyze_logs_detailed(json_file)
