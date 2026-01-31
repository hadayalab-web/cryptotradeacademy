#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vercel Logs分析スクリプト
17個のCron JobsとX Webhookのデータを分析
"""

import json
import sys
from collections import defaultdict, Counter
from datetime import datetime
from typing import Dict, List, Any

def load_logs(file_path: str) -> List[Dict[str, Any]]:
    """ログファイルを読み込む（大きなファイルに対応）"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # JSON配列をパース
            return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"JSON解析エラー: {e}")
        # 1行の巨大なJSON配列の場合、手動でパースを試みる
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if content.startswith('[') and content.endswith(']'):
                # カンマで分割して各オブジェクトをパース
                # ただし、これは複雑なので、まずは通常の方法を試す
                pass
        raise

def analyze_logs(logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """ログを分析"""
    results = {
        'cron_jobs': defaultdict(list),
        'webhook': [],
        'errors': [],
        'stats': {
            'total_requests': len(logs),
            'by_function': Counter(),
            'by_status': Counter(),
            'by_path': Counter(),
        }
    }
    
    # Cron Jobsのパスを定義
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
    
    for log in logs:
        path = log.get('requestPath', '')
        function = log.get('function', '')
        status = log.get('responseStatusCode', 0)
        method = log.get('requestMethod', '')
        message = log.get('message', '')
        level = log.get('level', '')
        
        # 統計情報
        if function:
            results['stats']['by_function'][function] += 1
        if status:
            results['stats']['by_status'][status] += 1
        if path:
            results['stats']['by_path'][path] += 1
        
        # Cron Jobsの分類
        is_cron = False
        for cron_path in cron_paths:
            if cron_path in path or cron_path in function:
                results['cron_jobs'][cron_path].append(log)
                is_cron = True
                break
        
        # X Webhookの分類
        if '/api/x-webhook' in path or '/api/x-webhook' in function:
            results['webhook'].append(log)
        
        # エラーの検出
        if level == 'error' or status >= 400 or 'error' in message.lower() or 'Error' in message or 'failed' in message.lower() or 'Failed' in message:
            results['errors'].append({
                'path': path,
                'function': function,
                'status': status,
                'message': message,
                'timestamp': log.get('TimeUTC', ''),
                'requestId': log.get('requestId', '')
            })
    
    return results

def format_analysis(results: Dict[str, Any]) -> str:
    """分析結果をフォーマット"""
    output = []
    output.append("=" * 80)
    output.append("Vercel Logs分析結果")
    output.append("=" * 80)
    output.append("")
    
    # 基本統計
    output.append("## 基本統計")
    output.append(f"総リクエスト数: {results['stats']['total_requests']}")
    output.append("")
    
    # 関数別統計
    output.append("### 関数別リクエスト数")
    for func, count in results['stats']['by_function'].most_common():
        output.append(f"  - {func}: {count}")
    output.append("")
    
    # ステータス別統計
    output.append("### ステータスコード別")
    for status, count in sorted(results['stats']['by_status'].items()):
        output.append(f"  - {status}: {count}")
    output.append("")
    
    # Cron Jobs分析
    output.append("## Cron Jobs分析")
    output.append(f"検出されたCron Jobs数: {len(results['cron_jobs'])}")
    output.append("")
    
    for cron_path, logs in sorted(results['cron_jobs'].items()):
        if logs:
            statuses = Counter(log.get('responseStatusCode', 0) for log in logs)
            errors = [log for log in logs if log.get('level') == 'error' or log.get('responseStatusCode', 0) >= 400]
            
            output.append(f"### {cron_path}")
            output.append(f"  実行回数: {len(logs)}")
            output.append(f"  ステータスコード: {dict(statuses)}")
            if errors:
                output.append(f"  エラー数: {len(errors)}")
                for err in errors[:3]:  # 最初の3つのエラーのみ表示
                    output.append(f"    - [{err.get('TimeUTC', '')}] {err.get('message', 'N/A')[:100]}")
            output.append("")
    
    # X Webhook分析
    output.append("## X Webhook分析")
    output.append(f"総リクエスト数: {len(results['webhook'])}")
    if results['webhook']:
        webhook_statuses = Counter(log.get('responseStatusCode', 0) for log in results['webhook'])
        webhook_methods = Counter(log.get('requestMethod', '') for log in results['webhook'])
        webhook_errors = [log for log in results['webhook'] if log.get('level') == 'error' or log.get('responseStatusCode', 0) >= 400]
        
        output.append(f"  ステータスコード: {dict(webhook_statuses)}")
        output.append(f"  メソッド: {dict(webhook_methods)}")
        if webhook_errors:
            output.append(f"  エラー数: {len(webhook_errors)}")
            for err in webhook_errors[:5]:  # 最初の5つのエラーのみ表示
                output.append(f"    - [{err.get('TimeUTC', '')}] {err.get('message', 'N/A')[:100]}")
        output.append("")
    
    # エラー分析
    output.append("## エラー分析")
    output.append(f"総エラー数: {len(results['errors'])}")
    if results['errors']:
        error_by_path = Counter(err['path'] for err in results['errors'])
        error_by_status = Counter(err['status'] for err in results['errors'])
        
        output.append("### パス別エラー")
        for path, count in error_by_path.most_common(10):
            output.append(f"  - {path}: {count}")
        output.append("")
        
        output.append("### ステータスコード別エラー")
        for status, count in sorted(error_by_status.items()):
            output.append(f"  - {status}: {count}")
        output.append("")
        
        output.append("### 主要エラーメッセージ（最初の10件）")
        for i, err in enumerate(results['errors'][:10], 1):
            output.append(f"{i}. [{err['timestamp']}] {err['path']}")
            output.append(f"   ステータス: {err['status']}")
            output.append(f"   メッセージ: {err['message'][:200]}")
            output.append("")
    
    return "\n".join(output)

def main():
    file_path = r"c:\Users\chiba\Downloads\logs_result (12).json"
    
    print("ログファイルを読み込んでいます...")
    logs = load_logs(file_path)
    print(f"読み込み完了: {len(logs)}件のログ")
    
    print("分析中...")
    results = analyze_logs(logs)
    
    print("結果を出力中...")
    analysis = format_analysis(results)
    
    # 結果をファイルに保存
    output_path = r"c:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy\data\vercel-logs\logs_result_12_analysis.md"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(analysis)
    
    print(f"\n分析完了！結果を {output_path} に保存しました。")
    print("\n" + "=" * 80)
    print(analysis)
    
    return results

if __name__ == "__main__":
    main()
