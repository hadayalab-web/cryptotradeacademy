#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vercel Logs詳細分析スクリプト
17個のCron JobsとX Webhookのデータを分析
"""

import json
import sys
from collections import defaultdict, Counter
from datetime import datetime
from typing import Dict, List, Any
import os

def load_logs(file_path: str) -> List[Dict[str, Any]]:
    """ログファイルを読み込む"""
    print(f"ファイルを読み込んでいます: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"読み込み完了: {len(data)}件のログ")
            return data
    except Exception as e:
        print(f"エラー: {e}")
        sys.exit(1)

def analyze_logs(logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """ログを詳細分析"""
    # Cron Jobsのパス定義
    cron_paths = [
        '/api/cron',
        '/api/weekly-report',
        '/api/vsl1-post',
        '/api/vsl2-free-users',
        '/api/vsl1-reminder',
        '/api/vsl2-last-call',
        '/api/promo-stock-monitor',
        '/api/monthly-engagement-report',
        '/api/x-post-minimal-version-cron',
        '/api/x-post-free-report',
        '/api/x-quote-repost',
        '/api/x-quote-repost-metrics',
        '/api/x-engagement-metrics',
        '/api/x-post-performance-analysis',
        '/api/x-influencer-report',
        '/api/x-algorithm-analysis',
        '/api/x-update-influencer-stock'
    ]
    
    results = {
        'cron_jobs': defaultdict(list),
        'webhook': [],
        'errors': [],
        'stats': {
            'total': len(logs),
            'by_function': Counter(),
            'by_status': Counter(),
            'by_path': Counter(),
            'by_region': Counter(),
            'by_hour': Counter(),
            'duration_stats': {'values': [], 'count': 0},
            'memory_stats': {'values': [], 'count': 0}
        }
    }
    
    for log in logs:
        path = log.get('requestPath', '')
        function = log.get('function', '')
        status = log.get('responseStatusCode', 0)
        method = log.get('requestMethod', '')
        message = log.get('message', '')
        level = log.get('level', '')
        time_utc = log.get('TimeUTC', '')
        region = log.get('region', 'unknown')
        duration_ms = log.get('durationMs', '')
        memory_used = log.get('maxMemoryUsed', '')
        
        # 統計情報
        if function:
            results['stats']['by_function'][function] += 1
        if status:
            results['stats']['by_status'][status] += 1
        if path:
            results['stats']['by_path'][path] += 1
        if region:
            results['stats']['by_region'][region] += 1
        
        # 時間帯別統計
        if time_utc:
            try:
                hour = time_utc.split(' ')[1].split(':')[0] if ' ' in time_utc else 'unknown'
                results['stats']['by_hour'][hour] += 1
            except:
                pass
        
        # 実行時間統計
        try:
            if duration_ms and duration_ms != '':
                duration = int(duration_ms)
                if duration > 0:
                    results['stats']['duration_stats']['values'].append(duration)
                    results['stats']['duration_stats']['count'] += 1
        except:
            pass
        
        # メモリ使用量統計
        try:
            if memory_used and memory_used != '':
                memory = int(memory_used)
                if memory > 0:
                    results['stats']['memory_stats']['values'].append(memory)
                    results['stats']['memory_stats']['count'] += 1
        except:
            pass
        
        # Cron Jobsの分類
        for cron_path in cron_paths:
            if cron_path in path or cron_path in function:
                results['cron_jobs'][cron_path].append(log)
                break
        
        # X Webhookの分類
        if '/api/x-webhook' in path or '/api/x-webhook' in function:
            results['webhook'].append(log)
        
        # エラーの検出
        if (level == 'error' or status >= 400 or 
            'error' in message.lower() or 
            'Error' in message or 
            'failed' in message.lower() or 
            'Failed' in message):
            results['errors'].append({
                'path': path,
                'function': function,
                'status': status,
                'message': message[:300],
                'timestamp': time_utc,
                'requestId': log.get('requestId', '')
            })
    
    return results

def format_analysis(results: Dict[str, Any]) -> str:
    """分析結果をフォーマット"""
    output = []
    output.append("=" * 80)
    output.append("Vercel Logs詳細分析結果")
    output.append("=" * 80)
    output.append("")
    
    # 基本統計
    output.append("## 基本統計")
    output.append(f"総リクエスト数: {results['stats']['total']}")
    output.append("")
    
    # リージョン別統計
    if results['stats']['by_region']:
        output.append("### リージョン別リクエスト数")
        for region, count in results['stats']['by_region'].most_common():
            output.append(f"  - {region or 'unknown'}: {count}")
        output.append("")
    
    # 時間帯別統計
    if results['stats']['by_hour']:
        output.append("### 時間帯別リクエスト数（UTC）")
        for hour in sorted(results['stats']['by_hour'].keys(), key=lambda x: int(x) if x.isdigit() else 999):
            count = results['stats']['by_hour'][hour]
            output.append(f"  - {hour}:00 UTC: {count}")
        output.append("")
    
    # 実行時間統計
    if results['stats']['duration_stats']['count'] > 0:
        durations = results['stats']['duration_stats']['values']
        output.append("### 実行時間統計（ms）")
        output.append(f"  - 最小: {min(durations)}")
        output.append(f"  - 最大: {max(durations)}")
        output.append(f"  - 平均: {sum(durations) / len(durations):.2f}")
        output.append(f"  - サンプル数: {len(durations)}")
        output.append("")
    
    # メモリ使用量統計
    if results['stats']['memory_stats']['count'] > 0:
        memories = results['stats']['memory_stats']['values']
        output.append("### メモリ使用量統計（MB）")
        output.append(f"  - 最小: {min(memories) / 1024 / 1024:.2f}")
        output.append(f"  - 最大: {max(memories) / 1024 / 1024:.2f}")
        output.append(f"  - 平均: {sum(memories) / len(memories) / 1024 / 1024:.2f}")
        output.append(f"  - サンプル数: {len(memories)}")
        output.append("")
    
    # 関数別統計
    output.append("### 関数別リクエスト数（上位20件）")
    for func, count in results['stats']['by_function'].most_common(20):
        output.append(f"  - {func}: {count}")
    output.append("")
    
    # ステータス別統計
    output.append("### ステータスコード別")
    for status in sorted(results['stats']['by_status'].keys(), key=lambda x: int(x) if str(x).isdigit() else 999):
        count = results['stats']['by_status'][status]
        output.append(f"  - {status}: {count}")
    output.append("")
    
    # Cron Jobs分析
    output.append("## Cron Jobs分析")
    output.append(f"検出されたCron Jobs数: {len(results['cron_jobs'])}")
    output.append("")
    
    for cron_path in sorted(results['cron_jobs'].keys()):
        logs = results['cron_jobs'][cron_path]
        statuses = Counter()
        errors = []
        durations = []
        memory_usages = []
        
        for log in logs:
            status = log.get('responseStatusCode', 0)
            statuses[status] += 1
            
            try:
                duration = int(log.get('durationMs', 0) or 0)
                if duration > 0:
                    durations.append(duration)
            except:
                pass
            
            try:
                memory = int(log.get('maxMemoryUsed', 0) or 0)
                if memory > 0:
                    memory_usages.append(memory)
            except:
                pass
            
            if log.get('level') == 'error' or status >= 400:
                errors.append(log)
        
        output.append(f"### {cron_path}")
        output.append(f"  実行回数: {len(logs)}")
        output.append(f"  ステータスコード: {dict(statuses)}")
        
        if durations:
            output.append(f"  実行時間: 平均 {sum(durations) / len(durations):.2f}ms (最小: {min(durations)}, 最大: {max(durations)})")
        
        if memory_usages:
            output.append(f"  メモリ使用量: 平均 {sum(memory_usages) / len(memory_usages) / 1024 / 1024:.2f}MB (最小: {min(memory_usages) / 1024 / 1024:.2f}MB, 最大: {max(memory_usages) / 1024 / 1024:.2f}MB)")
        
        if errors:
            output.append(f"  エラー数: {len(errors)}")
            for err in errors[:5]:
                msg = (err.get('message', '') or '')[:150]
                output.append(f"    - [{err.get('TimeUTC', '')}] ステータス: {err.get('responseStatusCode', 'N/A')}")
                if msg:
                    output.append(f"      {msg}")
        output.append("")
    
    # X Webhook分析
    output.append("## X Webhook分析")
    output.append(f"総リクエスト数: {len(results['webhook'])}")
    if results['webhook']:
        webhook_statuses = Counter()
        webhook_methods = Counter()
        webhook_errors = []
        webhook_by_hour = Counter()
        
        for log in results['webhook']:
            status = log.get('responseStatusCode', 0)
            method = log.get('requestMethod', '')
            webhook_statuses[status] += 1
            webhook_methods[method] += 1
            
            if log.get('level') == 'error' or status >= 400:
                webhook_errors.append(log)
            
            time_utc = log.get('TimeUTC', '')
            if time_utc:
                try:
                    hour = time_utc.split(' ')[1].split(':')[0] if ' ' in time_utc else 'unknown'
                    webhook_by_hour[hour] += 1
                except:
                    pass
        
        output.append(f"  ステータスコード: {dict(webhook_statuses)}")
        output.append(f"  メソッド: {dict(webhook_methods)}")
        
        if webhook_errors:
            output.append(f"  エラー数: {len(webhook_errors)}")
            for err in webhook_errors[:5]:
                msg = (err.get('message', '') or '')[:150]
                output.append(f"    - [{err.get('TimeUTC', '')}] {msg}")
        
        output.append(f"\n  ### Webhook詳細（最初の20件）")
        for idx, log in enumerate(results['webhook'][:20], 1):
            output.append(f"  {idx}. [{log.get('TimeUTC', '')}] {log.get('requestMethod', 'N/A')} {log.get('requestPath', 'N/A')}")
            output.append(f"     ステータス: {log.get('responseStatusCode', 'N/A')}")
            if log.get('durationMs'):
                output.append(f"     実行時間: {log.get('durationMs')}ms")
            if log.get('maxMemoryUsed'):
                try:
                    memory_mb = int(log.get('maxMemoryUsed')) / 1024 / 1024
                    output.append(f"     メモリ使用量: {memory_mb:.2f}MB")
                except:
                    pass
            if log.get('requestQueryString'):
                query = log.get('requestQueryString', '')[:100]
                output.append(f"     クエリ: {query}")
            if log.get('message'):
                msg = log.get('message', '')[:200]
                output.append(f"     メッセージ: {msg}")
            output.append("")
        
        if webhook_by_hour:
            output.append(f"  ### Webhook時間帯別分布（UTC）")
            for hour in sorted(webhook_by_hour.keys(), key=lambda x: int(x) if x.isdigit() else 999):
                count = webhook_by_hour[hour]
                output.append(f"    - {hour}:00 UTC: {count}件")
            output.append("")
    
    # エラー分析
    output.append("## エラー分析")
    output.append(f"総エラー数: {len(results['errors'])}")
    if results['errors']:
        error_by_path = Counter()
        error_by_status = Counter()
        error_by_hour = Counter()
        
        for err in results['errors']:
            error_by_path[err['path']] += 1
            error_by_status[err['status']] += 1
            
            timestamp = err.get('timestamp', '')
            if timestamp:
                try:
                    hour = timestamp.split(' ')[1].split(':')[0] if ' ' in timestamp else 'unknown'
                    error_by_hour[hour] += 1
                except:
                    pass
        
        output.append("### パス別エラー（上位10件）")
        for path, count in error_by_path.most_common(10):
            output.append(f"  - {path}: {count}")
        output.append("")
        
        output.append("### ステータスコード別エラー")
        for status in sorted(error_by_status.keys(), key=lambda x: int(x) if str(x).isdigit() else 999):
            count = error_by_status[status]
            output.append(f"  - {status}: {count}")
        output.append("")
        
        output.append("### 主要エラーメッセージ（最初の30件）")
        for idx, err in enumerate(results['errors'][:30], 1):
            output.append(f"{idx}. [{err['timestamp']}] {err['path']}")
            output.append(f"   関数: {err['function'] or 'N/A'}")
            output.append(f"   ステータス: {err['status']}")
            output.append(f"   リクエストID: {err['requestId'] or 'N/A'}")
            output.append(f"   メッセージ: {err['message']}")
            output.append("")
        
        if error_by_hour:
            output.append("### エラー時間帯別分布（UTC）")
            for hour in sorted(error_by_hour.keys(), key=lambda x: int(x) if x.isdigit() else 999):
                count = error_by_hour[hour]
                output.append(f"  - {hour}:00 UTC: {count}件")
            output.append("")
    
    return "\n".join(output)

def main():
    file_path = r"c:\Users\chiba\Downloads\logs_result (12).json"
    
    if not os.path.exists(file_path):
        print(f"エラー: ファイルが見つかりません: {file_path}")
        sys.exit(1)
    
    print("=" * 80)
    print("Vercel Logs詳細分析を開始します")
    print("=" * 80)
    print()
    
    logs = load_logs(file_path)
    results = analyze_logs(logs)
    analysis = format_analysis(results)
    
    # 結果をファイルに保存
    output_dir = r"c:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy\data\vercel-logs"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "logs_result_12_analysis.md")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(analysis)
    
    print(f"\n分析完了！結果を {output_path} に保存しました。")
    print("\n" + "=" * 80)
    print(analysis)
    
    return results

if __name__ == "__main__":
    main()
