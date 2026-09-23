# Cursor リソース消費状況リサーチレポート

**作成日**: 2026-01-09  
**目的**: Cursor IDEのリソース消費状況を包括的に調査し、最適化方法をまとめる

---

## 📊 エグゼクティブサマリー

### 一般的なリソース消費状況

Cursor IDEのリソース消費は、設定や使用状況によって大きく異なります：

| リソース | 正常範囲 | 問題のある範囲 | 備考 |
|---------|---------|--------------|------|
| **メモリ（RAM）** | 200MB - 1GB | 3GB以上 | 拡張機能や大規模プロジェクトで増加 |
| **CPU（アイドル時）** | 5%以下 | 40%以上 | バックグラウンド処理が原因 |
| **CPU（アクティブ時）** | 15%以下 | 60%以上 | AI生成時は一時的に増加 |
| **ディスク** | 500MB - 2GB | 5GB以上 | キャッシュやログファイルの蓄積 |

### プロジェクトの現在の状態

✅ **最適化済み**: このプロジェクトは既に多くの最適化が実施されており、良好な状態です。

---

## 🔍 詳細なリソース消費分析

### 1. メモリ（RAM）消費

#### 一般的な使用量

- **基本使用量**: 約200MB（VS Codeと同等）
- **拡張機能込み**: 500MB - 1GB
- **大規模プロジェクト**: 1GB - 3GB
- **問題のある状態**: 3GB以上（メモリリークの可能性）

#### メモリ消費の主な原因

1. **拡張機能**
   - 各拡張機能が個別のプロセスで動作
   - GitLens、ESLint、Prettierなどがメモリを消費
   - 複数のNode.jsプロセスが並列実行される

2. **コンテキストウィンドウ**
   - 多くのファイルをコンテキストに含めると急激に増加
   - コンテキストウィンドウが100%になると3GB以上に達する可能性

3. **AI機能**
   - コード生成時に一時的にメモリが増加
   - 大規模コードベースの処理で最大30%増加

4. **ファイル監視**
   - 大規模プロジェクトでのファイル変更監視
   - インデックス作成による一時的な増加

#### このプロジェクトでの対策

✅ **実施済み**:
- `.cursorignore`で不要なファイルを除外
- `.cursorindexingignore`でインデックス対象を制限
- GitLensのCode Lensを無効化（メモリ使用量0%）
- Extension Monitorで監視中

**現在の状態**: すべてのユーザー拡張機能が0%のリソース使用

---

### 2. CPU消費

#### 一般的な使用量

- **アイドル時**: 5%以下（正常）
- **アクティブ時**: 15%以下（正常）
- **問題のある状態**: 
  - アイドル時40%以上
  - アクティブ時60%以上

#### CPU消費の主な原因

1. **バックグラウンド処理**
   - ファイル監視（File Watcher）
   - インデックス作成
   - 拡張機能のバックグラウンド処理
   - Git操作の自動実行

2. **AI機能**
   - コード生成時の処理
   - コンテキスト解析
   - 大規模コードベースでの処理で最大30%増加

3. **拡張機能**
   - GitLensのCode Lens（無効化済み）
   - ESLintのリアルタイムチェック
   - Prettierの自動フォーマット

4. **SSH接続**
   - リモートサーバーへのSSH接続時にCPU負荷が急増
   - プロセスが自動終了されるケースも報告

#### このプロジェクトでの対策

✅ **実施済み**:
- GitLensのCode Lens無効化（CPU使用量0%）
- 拡張機能の最適化
- Extension Monitorで監視中

**現在の状態**: Extension Host CPU使用率9.8%（正常範囲）

---

### 3. ディスク消費

#### 一般的な使用量

- **基本インストール**: 約500MB
- **拡張機能込み**: 1GB - 2GB
- **キャッシュ・ログ**: 追加で500MB - 3GB
- **問題のある状態**: 5GB以上

#### ディスク消費の主な原因

1. **キャッシュファイル**
   - `%APPDATA%\Cursor\Cache`（Windows）
   - `~/Library/Application Support/Cursor/Cache`（macOS）
   - `~/.config/Cursor/Cache`（Linux）

2. **ログファイル**
   - 開発者ツールのログ
   - 拡張機能のログ
   - エラーログ

3. **インデックスファイル**
   - コードベースのインデックス
   - 検索インデックス

4. **拡張機能**
   - 各拡張機能のインストールファイル
   - 拡張機能のキャッシュ

#### このプロジェクトでの対策

✅ **推奨アクション**:
- 定期的にキャッシュをクリア（`%APPDATA%\Cursor\Cache`）
- `.history/`ディレクトリを除外（実施済み）
- 不要な拡張機能の削除

---

## 🚨 報告されている問題

### 1. メモリリーク

**症状**:
- 長時間使用するとメモリ使用量が7GB以上に達する
- クラッシュが頻発する
- プロセスが自動終了される

**原因**:
- バージョン2.0.43の`workbench.editor.showTabs`設定の問題
- 破損した設定ファイル
- 拡張機能のメモリリーク

**解決策**:
- `workbench.editor.showTabs`を`"multiple"`に変更
- 設定ファイルをリセット
- 拡張機能を無効化してテスト

### 2. 高CPU使用率（アイドル時）

**症状**:
- アイドル時に40%以上のCPU使用率
- システムの電力消費が増加
- ファンが常に回転

**原因**:
- Cursor Helperプラグインの過剰な処理
- バックグラウンドでのファイル監視
- 複数のNode.jsプロセスの並列実行

**解決策**:
- 拡張機能を無効化してテスト
- ファイル監視の除外設定を追加
- Cursorを再起動

### 3. SSH接続時の問題

**症状**:
- SSH接続時にCPU負荷が急増
- メモリ使用量が急増
- Ubuntuでプロセスが自動終了

**原因**:
- リモートファイルの監視処理
- ネットワーク遅延による処理の重複

**解決策**:
- リモートファイルの監視を制限
- SSH接続の設定を最適化

---

## ✅ このプロジェクトでの最適化状況

### 実施済みの最適化

#### 1. コンテキスト管理の最適化

✅ **`.cursorignore`の設定**:
```
# SpecStory derived-cursor-rules.mdc backup files
/ai_rules_backups/*
.specstory/ai_rules_backups/*

# History files (exclude from Cursor context to reduce context usage)
.history/
**/.history/

# Large documentation directories
cryptotradeacademy-lp-dev/docs/

# Projects template
projects-temlate/
```

✅ **`.cursorindexingignore`の設定**:
```
# Don't index SpecStory auto-save files
.specstory/**

# History files (exclude from indexing)
.history/
**/.history/

# Large documentation directories
cryptotradeacademy-lp-dev/docs/
```

**効果**: コンテキスト使用量を100%から20-30%以下に削減

#### 2. 拡張機能の最適化

✅ **GitLensの最適化**:
- Code Lens無効化
- Current Line無効化
- リソース使用量: 0%

✅ **インストール済み拡張機能**:
- Error Lens
- Path Intellisense
- Auto Rename Tag
- ESLint
- Prettier
- GitLens（最適化済み）
- Project Manager
- Code Runner
- Bookmarks
- Todo Tree
- Thunder Client
- Import Cost

**効果**: すべてのユーザー拡張機能が0%のリソース使用

#### 3. Extension Monitorの有効化

✅ **監視状況**:
- Extension Host: 99.57%（正常、ランタイムの使用）
- CPU使用率: 9.8%（正常範囲）
- メモリ使用量: 0 KB（拡張機能はアイドル状態）

#### 4. LLM設定の最適化

✅ **推奨設定**:
- Composer 1のみに固定
- Auto切り替えを無効化
- 一貫性のある動作を確保

**効果**: パフォーマンスの一貫性向上

---

## 🎯 最適化のベストプラクティス

### 1. コンテキスト管理

#### ✅ 推奨方法

- **小さいファイル**: 直接読み込む
- **大きいファイル/ディレクトリ**: `@`で参照
- **履歴ファイル**: `.specstory/history/`から必要なものだけ参照

#### ❌ 避けるべき方法

- すべてのファイルをコンテキストに含める
- `.cursorignore`で除外しない
- 大量の履歴ファイルを自動読み込み

### 2. 拡張機能の管理

#### ✅ 推奨方法

- 必要な拡張機能のみをインストール
- 重複機能を削除
- Extension Monitorで定期的に監視
- リソース使用量の高い拡張機能を無効化

#### ❌ 避けるべき方法

- 不要な拡張機能をインストールし続ける
- リソース使用量を監視しない
- 自動更新を有効にしたまま放置

### 3. ファイル処理の最適化

#### ✅ 推奨方法

- 大きなデータは分割処理
- ストリーミング処理を優先
- バッチサイズを適切に設定
- タイムアウトを設定

#### ❌ 避けるべき方法

- 大きなファイルを一度に読み込む
- 全データを一度に処理
- タイムアウトなしの処理

### 4. メモリ管理

#### ✅ 推奨方法

- 定期的にCursorを再起動
- キャッシュを定期的にクリア
- メモリ使用量を監視
- 不要なプロセスを終了

#### ❌ 避けるべき方法

- 長時間使用し続ける
- キャッシュをクリアしない
- メモリ使用量を監視しない

---

## 🔧 トラブルシューティング

### 問題1: メモリ使用量が高い

**症状**: メモリ使用量が3GB以上

**解決策**:
1. Extension Monitorでリソース使用量を確認
2. リソース使用量の高い拡張機能を無効化
3. `.cursorignore`で不要なファイルを除外
4. Cursorを再起動
5. キャッシュをクリア（`%APPDATA%\Cursor\Cache`）

### 問題2: CPU使用率が高い

**症状**: アイドル時に40%以上のCPU使用率

**解決策**:
1. Extension MonitorでCPU使用量を確認
2. バックグラウンド処理を確認
3. ファイル監視の除外設定を追加
4. 拡張機能を無効化してテスト
5. Cursorを再起動

### 問題3: クラッシュが頻発

**症状**: Cursorが頻繁にクラッシュする

**解決策**:
1. `workbench.editor.showTabs`を`"multiple"`に変更
2. 設定ファイルをリセット
3. 拡張機能を無効化してテスト
4. Cursorを再インストール

### 問題4: フリーズ

**症状**: Cursorがフリーズする

**解決策**:
1. `workbench.editor.showTabs`を`"multiple"`に変更
2. ハードウェアアクセラレーションを無効化（Linux）
3. 拡張機能を無効化してテスト
4. Cursorを再起動

---

## 📈 パフォーマンス監視

### Extension Monitorの使用方法

1. **有効化**:
   - `Settings` > `Application` > `Experimental`
   - `Extension Monitor: Enabled` をオン

2. **確認**:
   - `Ctrl+Shift+P` → `Developer: Open Extension Monitor`

3. **監視項目**:
   - Ext Host使用率
   - CPU使用率（self/total）
   - メモリ使用量（self/total）
   - Max Blocking時間

### 推奨監視頻度

- **週に1回**: Extension Monitorでリソース使用量を確認
- **月に1回**: キャッシュをクリア
- **四半期に1回**: 不要な拡張機能を削除

---

## 📊 リソース消費の比較

### Cursor vs VS Code

| リソース | Cursor | VS Code | 備考 |
|---------|--------|---------|------|
| **メモリ（基本）** | 200MB | 200MB | 同等 |
| **メモリ（拡張機能込み）** | 500MB - 1GB | 500MB - 1GB | 同等 |
| **CPU（アイドル）** | 5%以下 | 5%以下 | 同等 |
| **CPU（アクティブ）** | 15%以下 | 10%以下 | CursorはAI機能でやや高い |
| **ディスク** | 500MB - 2GB | 300MB - 1GB | Cursorはやや大きい |

### AI機能の影響

- **メモリ**: AI生成時に一時的に10-30%増加
- **CPU**: AI生成時に一時的に20-30%増加
- **レイテンシ**: 大規模コードベースで約25%のタスクでスパイク発生

---

## 🎯 結論と推奨事項

### このプロジェクトの状態

✅ **良好**: 既に多くの最適化が実施されており、良好な状態です。

**現在の状態**:
- すべてのユーザー拡張機能が0%のリソース使用
- Extension Host CPU使用率9.8%（正常範囲）
- コンテキスト使用量が最適化済み
- Extension Monitorで監視中

### 推奨事項

#### 即座に実施（既に実施済み）

- ✅ `.cursorignore`の最適化
- ✅ `.cursorindexingignore`の最適化
- ✅ GitLensの最適化
- ✅ Extension Monitorの有効化

#### 継続的なメンテナンス

- [ ] 週に1回、Extension Monitorでリソース使用量を確認
- [ ] 月に1回、キャッシュをクリア（`%APPDATA%\Cursor\Cache`）
- [ ] 四半期に1回、不要な拡張機能を削除
- [ ] 定期的にCursorを再起動（長時間使用時）

#### 問題が発生した場合

1. Extension Monitorでリソース使用量を確認
2. リソース使用量の高い拡張機能を無効化
3. `.cursorignore`で不要なファイルを除外
4. Cursorを再起動
5. それでも解決しない場合は、設定ファイルをリセット

---

## 📚 参考ドキュメント

### プロジェクト内の関連ドキュメント

- **Extension Monitor分析**: `docs/EXTENSION_MONITOR_ANALYSIS.md`
- **パフォーマンス最適化**: `hadayalab-website-dev/CURSOR_PERFORMANCE_OPTIMIZATION.md`
- **クラッシュ対策**: `cryptosignal-ai/docs/CURSOR_CRASH_PREVENTION.md`
- **拡張機能最適化**: `docs/CURSOR_EXTENSIONS_OPTIMIZATION_RESULTS.md`
- **拡張機能リスト**: `docs/CURSOR_INSTALLED_EXTENSIONS_CURRENT.md`

### 外部リソース

- [Cursor Forum - Performance Issues](https://forum.cursor.com/t/severe-performance-issues-high-cpu-memory-usage/120322)
- [Cursor Forum - Memory Leak](https://forum.cursor.com/t/cursor-memory-leak-7gb-ram-usage-makes-it-unusable-crashes-constantly/60625)
- [Cursor GitHub Issues](https://github.com/cursor/cursor/issues)

---

## 📝 更新履歴

- **2026-01-09**: 初版作成
  - 一般的なリソース消費状況の調査
  - プロジェクト固有の最適化状況の確認
  - ベストプラクティスのまとめ

---

**最終更新**: 2026-01-09  
**ステータス**: ✅ リサーチ完了、最適化状況良好
