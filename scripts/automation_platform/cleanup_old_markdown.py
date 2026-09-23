#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
2026年に更新されていないMarkdownファイルを削除
cryptosignal-aiフォルダ内のファイルは除外
"""

import os
from pathlib import Path
from datetime import datetime

def main():
    project_root = Path(__file__).parent.parent
    cryptosignal_ai_path = project_root / "cryptosignal-ai"
    
    # 2026年1月1日 00:00:00
    cutoff_date = datetime(2026, 1, 1, 0, 0, 0)
    
    print("=== 古いMarkdownファイル削除スクリプト ===")
    print(f"除外フォルダ: cryptosignal-ai")
    print(f"カットオフ日時: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 除外するフォルダ
    exclude_folders = [
        "cryptosignal-ai",
        "node_modules",
        ".git",
        ".vscode",
        ".cursor",
        "__pycache__",
        ".next",
        "dist",
        "build"
    ]
    
    # すべてのMarkdownファイルを検索
    markdown_files = []
    for md_file in project_root.rglob("*.md"):
        # 除外フォルダ内のファイルはスキップ
        should_exclude = False
        for exclude_folder in exclude_folders:
            exclude_path = project_root / exclude_folder
            try:
                if exclude_path in md_file.parents or md_file.is_relative_to(exclude_path):
                    should_exclude = True
                    break
            except:
                # Python 3.8以前の互換性
                if str(md_file).startswith(str(exclude_path)):
                    should_exclude = True
                    break
        
        if should_exclude:
            continue
        
        markdown_files.append(md_file)
    
    print(f"検出されたMarkdownファイル: {len(markdown_files)} 個")
    print()
    
    # 2026年以前に更新されたファイルを特定
    old_files = []
    for md_file in markdown_files:
        try:
            # 最終更新日時を取得
            mtime = datetime.fromtimestamp(md_file.stat().st_mtime)
            
            if mtime < cutoff_date:
                old_files.append((md_file, mtime))
        except Exception as e:
            print(f"[WARNING] ファイル情報取得失敗: {md_file} - {e}")
    
    # 日付順にソート
    old_files.sort(key=lambda x: x[1])
    
    print(f"2026年以前に更新されたファイル: {len(old_files)} 個")
    print()
    
    if len(old_files) == 0:
        print("削除対象のファイルはありません。")
        return
    
    # 削除対象ファイルを表示（最初の20個）
    print("削除対象ファイル（最初の20個）:")
    for i, (file_path, mtime) in enumerate(old_files[:20], 1):
        relative_path = file_path.relative_to(project_root)
        print(f"  {i}. {relative_path} ({mtime.strftime('%Y-%m-%d %H:%M:%S')})")
    
    if len(old_files) > 20:
        print(f"  ... 他 {len(old_files) - 20} 個")
    
    print()
    
    # 自動削除モード
    print(f"削除対象: {len(old_files)} 個のファイル")
    print("自動削除モード: 削除を実行します...")
    
    # 削除実行
    deleted_count = 0
    failed_count = 0
    
    for file_path, mtime in old_files:
        try:
            file_path.unlink()
            relative_path = file_path.relative_to(project_root)
            print(f"[OK] 削除: {relative_path} ({mtime.strftime('%Y-%m-%d')})")
            deleted_count += 1
        except Exception as e:
            relative_path = file_path.relative_to(project_root)
            print(f"[ERROR] 削除失敗: {relative_path} - {e}")
            failed_count += 1
    
    print()
    print("=== 削除完了 ===")
    print(f"削除成功: {deleted_count} 個")
    print(f"削除失敗: {failed_count} 個")
    
    # 統計情報
    remaining_files = len(markdown_files) - deleted_count
    print(f"残りのMarkdownファイル: {remaining_files} 個")

if __name__ == "__main__":
    main()
