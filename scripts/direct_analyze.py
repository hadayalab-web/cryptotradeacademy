#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接分析スクリプト - JSONファイルを読み込んで分析結果を生成
"""

import json
import os
from collections import defaultdict, Counter

def analyze_json_file(file_path):
    """JSONファイルを直接分析"""
    print(f"ファイルを読み込んでいます: {file_path}")
    
    # ファイルサイズを確認
    file_size = os.path.getsize(file_path)
    print(f"ファイルサイズ: {file_size / 1024 / 1024:.2f} MB")
    
    # JSONファイルを読み込む
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"読み込み完了: {len(data)}件のログエントリ")
    except Exception as e:
        print(f"エラー: {e}")
        return None
    
    # Cron Jobsのパス定義
    cron_paths = [
        '/api/cron', '/api/weekly-report', '/api/vsl1-post', '/api/vsl2-free-users',
        '/api/vsl1-reminder', '/api/vsl2-last-call', '/api/promo-stock-monitor',
        '/api/monthly-engagement-report', '/api/x-post-minimal-version-cron',
        '/api/x-post-free-report', '/api/x-quote-repost', '/api/x-quote-repost-metrics',
        '/api/x-engagement-metrics', '/api/x-post-performance-analysis',
        '/api/x-influencer-report', '/api/x-algorithm-analysis', '/api/x-update-influencer-stock'
    ]
    
    # 分析結果を格納
    results = {
        'total': len(data),
        'cron_jobs': defaultdict(list),
        'webhook': [],
        'errors': [],
        'stats': {
            'by_function': Counter(),
            'by_status': Counter(),
            'by_region': Counter(),
            'by_hour': Counter()
        }
    }
    
    # 各ログエントリを分析
    print("分析中...")
    for i, log in enumerate(data):
        if i % 1000 == 0:
            print(f"処理中: {i}/{len(data)} ({i*100/len(data):.1f}%)")
        
        path = log.get('requestPath', '')
        function = log.get('function', '')
        # responseStatusCodeを数値に変換（文字列の可能性があるため）
        try:
            status = int(log.get('responseStatusCode', 0) or 0)
        except (ValueError, TypeError):
            status = 0
        method = log.get('requestMethod', '')
        message = log.get('message', '')
        level = log.get('level', '')
        time_utc = log.get('TimeUTC', '')
        region = log.get('region', 'unknown')
        
        # 統計情報
        if function:
            results['stats']['by_function'][function] += 1
        if status:
            results['stats']['by_status'][status] += 1
        if region:
            results['stats']['by_region'][region] += 1
        
        # 時間帯別統計
        if time_utc and ' ' in time_utc:
            try:
                hour = time_utc.split(' ')[1].split(':')[0]
                results['stats']['by_hour'][hour] += 1
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
        
        # エラーの検出（statusは既に数値型に変換済み）
        if (level == 'error' or (isinstance(status, int) and status >= 400) or 
            'error' in str(message).lower() or 
            'Failed' in str(message)):
            results['errors'].append({
                'path': path,
                'function': function,
                'status': status,
                'message': str(message)[:200],
                'timestamp': time_utc,
                'requestId': log.get('requestId', '')
            })
    
    print("分析完了！")
    return results

def generate_report(results):
    """分析結果をレポート形式で生成"""
    report = []
    report.append("=" * 80)
    report.append("Vercel Logs詳細分析レポート")
    report.append("CEO向けサマリー")
    report.append("=" * 80)
    report.append("")
    
    # エグゼクティブサマリー
    report.append("## 📊 エグゼクティブサマリー")
    report.append("")
    report.append(f"- **総リクエスト数**: {results['total']:,}件")
    report.append(f"- **検出されたCron Jobs数**: {len(results['cron_jobs'])}個")
    report.append(f"- **X Webhookリクエスト数**: {len(results['webhook']):,}件")
    report.append(f"- **エラー発生数**: {len(results['errors']):,}件")
    report.append("")
    
    # ステータスコード別サマリー
    report.append("### ステータスコード別サマリー")
    success_count = results['stats']['by_status'].get(200, 0)
    error_count = sum(count for status, count in results['stats']['by_status'].items() if int(status) >= 400)
    report.append(f"- **成功 (200)**: {success_count:,}件 ({success_count*100/results['total']:.1f}%)")
    report.append(f"- **エラー (400+)**: {error_count:,}件 ({error_count*100/results['total']:.1f}%)")
    report.append("")
    
    # Cron Jobs詳細
    report.append("## 🔄 Cron Jobs実行状況（17個）")
    report.append("")
    
    for cron_path in sorted(results['cron_jobs'].keys()):
        logs = results['cron_jobs'][cron_path]
        # responseStatusCodeを数値に変換
        statuses = Counter()
        for log in logs:
            try:
                status = int(log.get('responseStatusCode', 0) or 0)
                statuses[status] += 1
            except (ValueError, TypeError):
                statuses[0] += 1
        errors = []
        for log in logs:
            try:
                status = int(log.get('responseStatusCode', 0) or 0)
                if log.get('level') == 'error' or status >= 400:
                    errors.append(log)
            except (ValueError, TypeError):
                if log.get('level') == 'error':
                    errors.append(log)
        
        success_rate = (statuses.get(200, 0) / len(logs) * 100) if logs else 0
        
        report.append(f"### {cron_path}")
        report.append(f"- **実行回数**: {len(logs):,}回")
        report.append(f"- **成功率**: {success_rate:.1f}%")
        report.append(f"- **ステータス分布**: {dict(statuses)}")
        if errors:
            report.append(f"- **⚠️ エラー数**: {len(errors)}件")
            for err in errors[:3]:
                report.append(f"  - [{err.get('TimeUTC', '')}] {err.get('message', '')[:100]}")
        report.append("")
    
    # X Webhook詳細
    report.append("## 🔗 X Webhook分析")
    report.append("")
    if results['webhook']:
        # responseStatusCodeを数値に変換
        webhook_statuses = Counter()
        for log in results['webhook']:
            try:
                status = int(log.get('responseStatusCode', 0) or 0)
                webhook_statuses[status] += 1
            except (ValueError, TypeError):
                webhook_statuses[0] += 1
        webhook_methods = Counter(log.get('requestMethod', '') for log in results['webhook'])
        webhook_errors = []
        for log in results['webhook']:
            try:
                status = int(log.get('responseStatusCode', 0) or 0)
                if log.get('level') == 'error' or status >= 400:
                    webhook_errors.append(log)
            except (ValueError, TypeError):
                if log.get('level') == 'error':
                    webhook_errors.append(log)
        
        report.append(f"- **総リクエスト数**: {len(results['webhook']):,}件")
        report.append(f"- **ステータスコード**: {dict(webhook_statuses)}")
        report.append(f"- **メソッド**: {dict(webhook_methods)}")
        if webhook_errors:
            report.append(f"- **⚠️ エラー数**: {len(webhook_errors)}件")
        report.append("")
        
        # 時間帯別分析
        webhook_hours = Counter()
        for log in results['webhook']:
            time_utc = log.get('TimeUTC', '')
            if time_utc and ' ' in time_utc:
                try:
                    hour = time_utc.split(' ')[1].split(':')[0]
                    webhook_hours[hour] += 1
                except:
                    pass
        
        if webhook_hours:
            report.append("### Webhook時間帯別分布（UTC）")
            for hour in sorted(webhook_hours.keys(), key=lambda x: int(x) if x.isdigit() else 999):
                report.append(f"- {hour}:00 UTC: {webhook_hours[hour]}件")
            report.append("")
    
    # エラー分析
    report.append("## ⚠️ エラー分析")
    report.append("")
    if results['errors']:
        error_by_path = Counter(err['path'] for err in results['errors'])
        error_by_status = Counter(err['status'] for err in results['errors'])
        
        report.append(f"- **総エラー数**: {len(results['errors']):,}件")
        report.append("")
        report.append("### パス別エラー（上位10件）")
        for path, count in error_by_path.most_common(10):
            report.append(f"- {path}: {count}件")
        report.append("")
        report.append("### ステータスコード別エラー")
        for status in sorted(error_by_status.keys(), key=lambda x: int(x) if str(x).isdigit() else 999):
            report.append(f"- {status}: {error_by_status[status]}件")
        report.append("")
        report.append("### 主要エラー（最初の10件）")
        for i, err in enumerate(results['errors'][:10], 1):
            report.append(f"{i}. [{err['timestamp']}] {err['path']}")
            report.append(f"   ステータス: {err['status']}")
            report.append(f"   メッセージ: {err['message']}")
            report.append("")
    
    # 推奨事項
    report.append("## 💡 推奨事項")
    report.append("")
    
    # エラー率が高いCron Jobsを特定
    high_error_crons = []
    for cron_path, logs in results['cron_jobs'].items():
        errors = []
        for log in logs:
            try:
                status = int(log.get('responseStatusCode', 0) or 0)
                if log.get('level') == 'error' or status >= 400:
                    errors.append(log)
            except (ValueError, TypeError):
                if log.get('level') == 'error':
                    errors.append(log)
        error_rate = len(errors) / len(logs) * 100 if logs else 0
        if error_rate > 5:  # 5%以上のエラー率
            high_error_crons.append((cron_path, error_rate, len(errors)))
    
    if high_error_crons:
        report.append("### 高エラー率のCron Jobs（要確認）")
        for cron_path, error_rate, error_count in sorted(high_error_crons, key=lambda x: x[1], reverse=True):
            report.append(f"- **{cron_path}**: エラー率 {error_rate:.1f}% ({error_count}件)")
        report.append("")
    
    # 実行されていないCron Jobs
    expected_crons = [
        '/api/cron', '/api/weekly-report', '/api/vsl1-post', '/api/vsl2-free-users',
        '/api/vsl1-reminder', '/api/vsl2-last-call', '/api/promo-stock-monitor',
        '/api/monthly-engagement-report', '/api/x-post-minimal-version-cron',
        '/api/x-post-free-report', '/api/x-quote-repost', '/api/x-quote-repost-metrics',
        '/api/x-engagement-metrics', '/api/x-post-performance-analysis',
        '/api/x-influencer-report', '/api/x-algorithm-analysis', '/api/x-update-influencer-stock'
    ]
    
    missing_crons = [cron for cron in expected_crons if cron not in results['cron_jobs']]
    if missing_crons:
        report.append("### 実行されていないCron Jobs（要確認）")
        for cron in missing_crons:
            report.append(f"- {cron}")
        report.append("")
    
    return "\n".join(report)

def main():
    file_path = r"c:\Users\chiba\Downloads\logs_result (12).json"
    
    if not os.path.exists(file_path):
        print(f"エラー: ファイルが見つかりません: {file_path}")
        return
    
    print("=" * 80)
    print("Vercel Logs詳細分析を開始します")
    print("=" * 80)
    print()
    
    results = analyze_json_file(file_path)
    
    if not results:
        print("分析に失敗しました")
        return
    
    report = generate_report(results)
    
    # 結果をファイルに保存
    output_dir = r"c:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy\data\vercel-logs"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "logs_result_12_analysis_ceo_report.md")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print("\n" + "=" * 80)
    print("分析完了！")
    print(f"結果を {output_path} に保存しました。")
    print("=" * 80)
    print()
    print(report)

if __name__ == "__main__":
    main()
