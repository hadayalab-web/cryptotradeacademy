#!/usr/bin/env python3
"""
24時間の期待値検証スクリプト
「Cursor/Composer 1病」対策: 期待値と実際の値を自動比較し、差異を分析

使用方法:
    python scripts/verify_expected_metrics_24h.py --start-date 2026-01-25 --end-date 2026-01-26
"""

import json
import sys
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

# 期待値（Grok補正版）を読み込み
EXPECTED_METRICS = {
    'total_posts': 18,
    'total_impressions': 675000,
    'total_engagements': 77625,
    'total_minimal_optins': 14715,
    'total_whop_traffic': 28998,
    'total_regular_conversions': 2001.5,
    'lang_impressions': {
        'en': 225000,
        'es': 108000,
        'pt-br': 99000,
        'ar': 72000,
        'ko': 90000,
        'ja': 81000,
    },
    'lang_conversions': {
        'en': 867.9,
        'es': 305.5,
        'pt-br': 253.9,
        'ar': 133.3,
        'ko': 243.0,
        'ja': 197.9,
    },
}

# 許容誤差（%）
TOLERANCE_THRESHOLDS = {
    'impressions': 15.0,  # ±15%
    'engagements': 20.0,   # ±20%
    'conversions': 25.0,   # ±25%（コンバージョンは変動が大きい）
    'optins': 20.0,        # ±20%
    'whop_traffic': 20.0,  # ±20%
}

def load_actual_metrics_from_logs(log_file_path):
    """
    Vercelログから実際のメトリクスを抽出
    （実際の実装では、X APIから直接取得する必要がある）
    """
    # TODO: 実際のログファイルからメトリクスを抽出
    # 現在はプレースホルダー
    return {
        'total_posts': 0,
        'total_impressions': 0,
        'total_engagements': 0,
        'total_minimal_optins': 0,
        'total_whop_traffic': 0,
        'total_regular_conversions': 0,
    }

def calculate_variance(expected, actual, metric_name=''):
    """期待値と実際の値の差異を計算"""
    if expected == 0:
        return {
            'variance': 0,
            'variance_pct': 0,
            'status': 'N/A',
        }
    
    variance = actual - expected
    variance_pct = (variance / expected) * 100
    
    threshold = TOLERANCE_THRESHOLDS.get(metric_name, 20.0)
    
    if abs(variance_pct) <= threshold:
        status = '✅ OK'
    elif variance_pct < -threshold:
        status = '🔴 大幅に未達'
    else:
        status = '🟢 大幅に超過'
    
    return {
        'variance': variance,
        'variance_pct': variance_pct,
        'status': status,
        'threshold': threshold,
    }

def analyze_root_causes(expected, actual, variance_data):
    """差異の根本原因を分析"""
    causes = []
    
    # インプレッションが大幅に下回る場合
    if variance_data['variance_pct'] < -TOLERANCE_THRESHOLDS.get('impressions', 15.0):
        causes.append({
            'type': 'impressions_low',
            'possible_reasons': [
                'Cron Jobsの実行失敗',
                'インフルエンサーのパフォーマンス低下',
                'X APIのレート制限',
                '市場状況の変化（予測外の低エンゲージメント）',
            ],
        })
    
    # コンバージョンが大幅に下回る場合
    if variance_data['variance_pct'] < -TOLERANCE_THRESHOLDS.get('conversions', 25.0):
        causes.append({
            'type': 'conversions_low',
            'possible_reasons': [
                'UTMパラメータの設定ミス',
                'Whopトラフィックの減少',
                'コンテンツ品質の問題',
                '市場センチメントの変化',
            ],
        })
    
    return causes

def generate_verification_report(expected, actual, start_date, end_date):
    """検証レポートを生成"""
    report = {
        'verification_period': {
            'start': start_date,
            'end': end_date,
        },
        'summary': {},
        'detailed_comparison': {},
        'root_cause_analysis': [],
        'recommendations': [],
    }
    
    # 各メトリクスの比較
    metrics_to_check = [
        ('total_impressions', 'impressions'),
        ('total_engagements', 'engagements'),
        ('total_minimal_optins', 'optins'),
        ('total_whop_traffic', 'whop_traffic'),
        ('total_regular_conversions', 'conversions'),
    ]
    
    for metric_key, metric_name in metrics_to_check:
        expected_val = expected.get(metric_key, 0)
        actual_val = actual.get(metric_key, 0)
        variance_data = calculate_variance(expected_val, actual_val, metric_name)
        
        report['detailed_comparison'][metric_key] = {
            'expected': expected_val,
            'actual': actual_val,
            'variance': variance_data['variance'],
            'variance_pct': variance_data['variance_pct'],
            'status': variance_data['status'],
            'threshold': variance_data['threshold'],
        }
        
        # 根本原因分析
        if variance_data['status'] != '✅ OK':
            causes = analyze_root_causes(expected_val, actual_val, variance_data)
            report['root_cause_analysis'].extend(causes)
    
    # サマリー
    total_ok = sum(1 for m in report['detailed_comparison'].values() if m['status'] == '✅ OK')
    total_metrics = len(report['detailed_comparison'])
    
    report['summary'] = {
        'total_metrics_checked': total_metrics,
        'metrics_ok': total_ok,
        'metrics_failed': total_metrics - total_ok,
        'overall_status': '✅ PASS' if total_ok == total_metrics else '⚠️ NEEDS_ATTENTION',
    }
    
    # 推奨事項
    if report['summary']['overall_status'] != '✅ PASS':
        report['recommendations'] = [
            'Cron Jobsの実行ログを確認',
            'X APIのエラーログを確認',
            'インフルエンサーのパフォーマンスを確認',
            '市場状況の変化を確認',
            'UTMパラメータの設定を確認',
        ]
    
    return report

def print_report(report):
    """レポートを出力"""
    print("="*80)
    print("=== 24時間期待値検証レポート ===")
    print("="*80)
    print(f"\n📅 検証期間: {report['verification_period']['start']} ～ {report['verification_period']['end']}")
    print(f"\n📊 サマリー:")
    print(f"   総メトリクス数: {report['summary']['total_metrics_checked']}")
    print(f"   ✅ OK: {report['summary']['metrics_ok']}")
    print(f"   ⚠️ 要確認: {report['summary']['metrics_failed']}")
    print(f"   全体ステータス: {report['summary']['overall_status']}")
    
    print(f"\n📈 詳細比較:")
    for metric_key, data in report['detailed_comparison'].items():
        print(f"\n   {metric_key}:")
        print(f"     期待値: {data['expected']:,.0f}")
        print(f"     実際の値: {data['actual']:,.0f}")
        print(f"     差異: {data['variance']:,.0f} ({data['variance_pct']:+.1f}%)")
        print(f"     ステータス: {data['status']}")
        print(f"     許容誤差: ±{data['threshold']:.1f}%")
    
    if report['root_cause_analysis']:
        print(f"\n🔍 根本原因分析:")
        for i, cause in enumerate(report['root_cause_analysis'], 1):
            print(f"\n   {i}. {cause['type']}:")
            for reason in cause['possible_reasons']:
                print(f"      - {reason}")
    
    if report['recommendations']:
        print(f"\n💡 推奨事項:")
        for i, rec in enumerate(report['recommendations'], 1):
            print(f"   {i}. {rec}")
    
    print("\n" + "="*80)

def main():
    parser = argparse.ArgumentParser(description='24時間の期待値検証')
    parser.add_argument('--start-date', type=str, required=True, help='開始日 (YYYY-MM-DD)')
    parser.add_argument('--end-date', type=str, required=True, help='終了日 (YYYY-MM-DD)')
    parser.add_argument('--log-file', type=str, help='Vercelログファイルのパス')
    parser.add_argument('--output', type=str, help='レポート出力先JSONファイル')
    
    args = parser.parse_args()
    
    # 実際のメトリクスを取得（TODO: 実装が必要）
    if args.log_file:
        actual_metrics = load_actual_metrics_from_logs(args.log_file)
    else:
        print("⚠️  警告: 実際のメトリクスを取得するには、--log-fileオプションが必要です")
        print("   現在は期待値のみを表示します。\n")
        actual_metrics = {}
    
    # 検証レポートを生成
    report = generate_verification_report(
        EXPECTED_METRICS,
        actual_metrics,
        args.start_date,
        args.end_date,
    )
    
    # レポートを出力
    print_report(report)
    
    # JSONファイルに保存
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\n✅ レポートを保存しました: {args.output}")
    
    # 終了コード（0: OK, 1: 要確認）
    if report['summary']['overall_status'] != '✅ PASS':
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()
