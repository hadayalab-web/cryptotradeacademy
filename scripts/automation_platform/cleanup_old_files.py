#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
古いファイル削除スクリプト（cryptosignal-ai以外）
"""

import os
import shutil
from pathlib import Path

def main():
    project_root = Path(__file__).parent.parent
    cryptosignal_ai_path = project_root / "cryptosignal-ai"
    
    print("=== 古いファイル削除スクリプト ===")
    print(f"除外フォルダ: cryptosignal-ai")
    print()
    
    items_to_delete = []
    
    # 1. アーカイブフォルダ
    archive_path = project_root / "_archive"
    if archive_path.exists():
        items_to_delete.append(archive_path)
        print(f"[削除対象] アーカイブフォルダ: _archive")
    
    # 2. 一時リポジトリ
    temp_repo_path = project_root / "temp-database-repo"
    if temp_repo_path.exists():
        items_to_delete.append(temp_repo_path)
        print(f"[削除対象] 一時リポジトリ: temp-database-repo")
    
    # 3. ルートディレクトリの一時ファイル
    root_temp_files = [
        "execute_organize.py",
        "execute.bat",
        "organize_workspaces.py",
        "run_organize.py",
        "setup_cursor_only.py",
        "setup_cursor.bat",
        "PROJECT_STRUCTURE_ANALYSIS.md",
        "PROJECT_STRUCTURE_CHECK_REPORT.md",
        "PROJECT_STRUCTURE.md"
    ]
    
    for file in root_temp_files:
        file_path = project_root / file
        if file_path.exists():
            items_to_delete.append(file_path)
            print(f"[削除対象] 一時ファイル: {file}")
    
    # 4. docs/cryptosignal-ai/archive フォルダ
    docs_archive_path = project_root / "docs" / "cryptosignal-ai" / "archive"
    if docs_archive_path.exists():
        items_to_delete.append(docs_archive_path)
        print(f"[削除対象] ドキュメントアーカイブ: docs/cryptosignal-ai/archive")
    
    print()
    print(f"削除対象: {len(items_to_delete)} 個")
    print()
    
    # 確認（自動実行モード）
    print("自動削除モード: 削除を実行します...")
    
    # 削除実行
    deleted_count = 0
    failed_count = 0
    
    for item in items_to_delete:
        try:
            if item.exists():
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()
                print(f"[OK] 削除: {item}")
                deleted_count += 1
        except Exception as e:
            print(f"[ERROR] 削除失敗: {item} - {e}")
            failed_count += 1
    
    print()
    print("=== 削除完了 ===")
    print(f"削除成功: {deleted_count} 個")
    print(f"削除失敗: {failed_count} 個")

if __name__ == "__main__":
    main()
