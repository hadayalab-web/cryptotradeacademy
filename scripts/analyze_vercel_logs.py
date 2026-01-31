#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vercelログを解析してエラーを特定するスクリプト
"""

import json
import sys
from datetime import datetime

def analyze_logs(log_file_path):
    """ログファイルを解析してエラーを特定"""
    
    print("=" * 80)
    print("Vercelログ解析開始")
    print("=" * 80)
    
    try:
        with open(log_file_path, 'r', encoding='utf-8') as f:
            logs = json.load(f)
        
        print(f"\n📊 総ログ数: {len(logs)}")
        
        # エラーを探す
        errors = []
        cron_logs = []
        status_400_plus = []
        
        for log in logs:
            # /api/cron関連のログ
            if '/api/cron' in log.get('requestPath', '') or log.get('function') == '/api/cron':
                cron_logs.append(log)
            
            # エラーレベルのログ
            if log.get('level') in ['error', 'Error', 'ERROR']:
                errors.append(log)
            
            # 400以上のステータスコード
            status_code = log.get('responseStatusCode', 0)
            if isinstance(status_code, (int, str)) and int(status_code) >= 400:
                status_400_plus.append(log)
        
        print(f"\n🔍 /api/cron関連のログ: {len(cron_logs)}件")
        print(f"❌ エラーログ: {len(errors)}件")
        print(f"⚠️  400以上のステータスコード: {len(status_400_plus)}件")
        
        # /api/cron関連のログを表示
        if cron_logs:
            print("\n" + "=" * 80)
            print("📋 /api/cron関連のログ")
            print("=" * 80)
            for i, log in enumerate(cron_logs[:10], 1):  # 最初の10件
                print(f"\n[{i}] {log.get('TimeUTC', 'N/A')}")
                print(f"    Path: {log.get('requestPath', 'N/A')}")
                print(f"    Function: {log.get('function', 'N/A')}")
                print(f"    Status: {log.get('responseStatusCode', 'N/A')}")
                print(f"    Message: {log.get('message', 'N/A')[:200]}")
                if log.get('level') in ['error', 'Error', 'ERROR']:
                    print(f"    ⚠️  ERROR LEVEL!")
        
        # エラーログを表示
        if errors:
            print("\n" + "=" * 80)
            print("❌ エラーログ")
            print("=" * 80)
            for i, log in enumerate(errors[:20], 1):  # 最初の20件
                print(f"\n[{i}] {log.get('TimeUTC', 'N/A')}")
                print(f"    Function: {log.get('function', 'N/A')}")
                print(f"    Path: {log.get('requestPath', 'N/A')}")
                print(f"    Status: {log.get('responseStatusCode', 'N/A')}")
                print(f"    Level: {log.get('level', 'N/A')}")
                print(f"    Message: {log.get('message', 'N/A')}")
        
        # 400以上のステータスコードを表示
        if status_400_plus:
            print("\n" + "=" * 80)
            print("⚠️  400以上のステータスコード")
            print("=" * 80)
            for i, log in enumerate(status_400_plus[:20], 1):  # 最初の20件
                print(f"\n[{i}] {log.get('TimeUTC', 'N/A')}")
                print(f"    Function: {log.get('function', 'N/A')}")
                print(f"    Path: {log.get('requestPath', 'N/A')}")
                print(f"    Status: {log.get('responseStatusCode', 'N/A')}")
                print(f"    Message: {log.get('message', 'N/A')[:200]}")
        
        # /api/cronの500エラーを特に探す
        cron_500_errors = [log for log in cron_logs if log.get('responseStatusCode') == 500]
        if cron_500_errors:
            print("\n" + "=" * 80)
            print("🚨 /api/cron の500エラー")
            print("=" * 80)
            for i, log in enumerate(cron_500_errors, 1):
                print(f"\n[{i}] {log.get('TimeUTC', 'N/A')}")
                print(f"    Request ID: {log.get('requestId', 'N/A')}")
                print(f"    Message: {log.get('message', 'N/A')}")
                print(f"    Full log: {json.dumps(log, indent=2, ensure_ascii=False)}")
        
        return {
            'total_logs': len(logs),
            'cron_logs': len(cron_logs),
            'errors': len(errors),
            'status_400_plus': len(status_400_plus),
            'cron_500_errors': len(cron_500_errors)
        }
        
    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    log_file = r'c:\Users\chiba\Downloads\logs_result.json'
    if len(sys.argv) > 1:
        log_file = sys.argv[1]
    
    result = analyze_logs(log_file)
    if result:
        print("\n" + "=" * 80)
        print("✅ 解析完了")
        print("=" * 80)
