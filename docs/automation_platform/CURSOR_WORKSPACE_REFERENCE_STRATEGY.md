# Cursorワークスペース参照戦略

**作成日**: 2025-01-XX  
**目的**: Notion LP実装時のCursorワークスペース参照フォルダの最適化

---

## 🎯 検討事項

### 質問
**NotionのLP実装計画を進めるとき、Cursorで参照するフォルダは現在の `hadayalab-automation-platform` のままで良いか、`hadayalab-website-dev` を参照した方が良いか？**

---

## 📊 現状分析

### 現在の参照フォルダ
**`C:\Users\chiba\hadayalab-automation-platform`**

### LP実装関連ファイルの配置

| ファイル・フォルダ | 配置場所 | アクセス方法 |
|------------------|---------|-------------|
| **LP実装ドキュメント** | `hadayalab-website-dev/cryptotradeacademy-lp-dev/docs/` | 相対パスで参照可能 |
| **LP実装コード** | `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/` | 相対パスで参照可能 |
| **Notion MCPサーバー** | `scripts/notion-mcp-server.js` | 親フォルダから直接参照 |
| **共通スクリプト** | `scripts/` | 親フォルダから直接参照 |
| **環境変数** | `.env` (親フォルダ) | 親フォルダから直接参照 |
| **共通ドキュメント** | `docs/` | 親フォルダから直接参照 |

---

## 🔍 比較分析

### オプション1: 現状維持（親フォルダ参照）

**参照フォルダ**: `hadayalab-automation-platform`

#### ✅ メリット
1. **Notion MCPサーバーへの直接アクセス**
   - `scripts/notion-mcp-server.js` が直接参照可能
   - MCPサーバーの修正・デバッグが容易

2. **共通リソースへのアクセス**
   - 環境変数（`.env`）への直接アクセス
   - 共通スクリプト（`scripts/`）への直接アクセス
   - 共通ドキュメント（`docs/`）への直接アクセス

3. **プロジェクト全体の文脈**
   - 他のプロジェクト（cryptosignal-ai、hadayalab-knowledge-base）も参照可能
   - プロジェクト間の連携を考慮した実装が可能

4. **相対パスでLP実装ファイルにアクセス可能**
   - `hadayalab-website-dev/cryptotradeacademy-lp-dev/` は相対パスで参照可能

#### ⚠️ デメリット
1. **ファイルパスが長い**
   - LP実装ファイルへのパス: `hadayalab-website-dev/cryptotradeacademy-lp-dev/...`
   - タイプ量が増える

2. **検索範囲が広い**
   - プロジェクト全体が検索対象になる
   - 関連性の低いファイルも検索結果に含まれる可能性

3. **コンテキストが大きい**
   - プロジェクト全体のコンテキストがCursorに読み込まれる
   - メモリ使用量が増える可能性

---

### オプション2: hadayalab-website-dev参照（推奨⭐）

**参照フォルダ**: `hadayalab-website-dev`

#### ✅ メリット
1. **LP実装ファイルへの直接アクセス**
   - `cryptotradeacademy-lp-dev/docs/` が直接参照可能
   - `cryptotradeacademy-lp-dev/orientation-lp/` が直接参照可能
   - パスが短く、タイプ量が減る

2. **検索範囲が絞られる**
   - ウェブサイト・LP関連ファイルのみが検索対象
   - 関連性の高いファイルのみが検索結果に含まれる

3. **コンテキストが最適化される**
   - LP実装に必要なコンテキストのみが読み込まれる
   - メモリ使用量が減る可能性

4. **フォーカスが明確**
   - LP実装作業に集中できる
   - 他のプロジェクトのファイルが視界に入らない

#### ⚠️ デメリット
1. **Notion MCPサーバーへの間接アクセス**
   - `../scripts/notion-mcp-server.js` で相対パス参照が必要
   - MCPサーバーの修正は親フォルダで行う必要がある

2. **環境変数への間接アクセス**
   - `../.env` で相対パス参照が必要
   - 環境変数の管理は親フォルダで行う

3. **共通リソースへの間接アクセス**
   - 共通スクリプト・ドキュメントは相対パス参照が必要

---

### オプション3: マルチルートワークスペース（高度）

**複数フォルダを同時参照**

#### ✅ メリット
1. **両方のメリットを享受**
   - LP実装ファイルへの直接アクセス
   - Notion MCPサーバーへの直接アクセス

#### ⚠️ デメリット
1. **Cursorの設定が複雑**
   - マルチルートワークスペースの設定が必要
   - デフォルトではサポートされていない可能性

2. **管理が複雑**
   - どのフォルダで作業しているか意識する必要がある

---

## 💡 推奨事項

### 🏆 推奨: オプション2（hadayalab-website-dev参照）

**理由**:
1. **LP実装作業が主目的**
   - Notion LP実装計画を進める際は、LP関連ファイルへのアクセス頻度が高い
   - 直接アクセスできる方が作業効率が良い

2. **検索・コンテキストの最適化**
   - 関連性の高いファイルのみが検索対象になる
   - Cursorのコンテキストウィンドウが最適化される

3. **フォーカスの維持**
   - LP実装作業に集中できる
   - 他のプロジェクトのファイルが視界に入らない

4. **相対パスで親フォルダリソースにアクセス可能**
   - Notion MCPサーバー: `../scripts/notion-mcp-server.js`
   - 環境変数: `../.env`
   - 必要に応じて参照可能

---

## 🔄 作業パターン別の推奨

### パターン1: LP実装作業が主（推奨⭐）

**参照フォルダ**: `hadayalab-website-dev`

**作業内容**:
- LP実装ドキュメントの作成・編集
- LP実装コードの作成・編集
- Notionページの作成・編集（Notion MCPサーバー使用）

**参照方法**:
- LP実装ファイル: 直接参照
- Notion MCPサーバー: 相対パス `../scripts/notion-mcp-server.js` または親フォルダで別途参照

---

### パターン2: MCPサーバー開発・デバッグが主

**参照フォルダ**: `hadayalab-automation-platform`

**作業内容**:
- Notion MCPサーバーの開発・デバッグ
- 共通スクリプトの開発・デバッグ
- 環境変数の管理

---

### パターン3: プロジェクト全体の統合作業

**参照フォルダ**: `hadayalab-automation-platform`

**作業内容**:
- プロジェクト間の連携設計
- 共通リソースの管理
- 全体のアーキテクチャ設計

---

## 📋 実装手順

### hadayalab-website-devを参照フォルダに設定

1. **Cursorでワークスペースを開く**
   - File → Open Folder
   - `C:\Users\chiba\hadayalab-automation-platform\hadayalab-website-dev` を選択

2. **Notion MCPサーバーへのアクセス確認**
   - 相対パスでアクセス可能: `../scripts/notion-mcp-server.js`
   - 必要に応じて親フォルダで別途開く

3. **環境変数の参照**
   - 相対パスでアクセス可能: `../.env`
   - または、`hadayalab-website-dev/.env` を作成して必要な環境変数のみコピー

---

## ⚠️ 注意事項

### 1. 環境変数の管理

**推奨方法**:
- 親フォルダの `.env` を共有する（推奨）
- または、`hadayalab-website-dev/.env` を作成して必要な環境変数のみコピー

### 2. Notion MCPサーバーの使用

**推奨方法**:
- LP実装作業時は `hadayalab-website-dev` を参照
- MCPサーバーの開発・デバッグ時は親フォルダを参照
- または、親フォルダで別ウィンドウを開く

### 3. ファイルパスの意識

**hadayalab-website-dev参照時**:
- LP実装ファイル: `cryptotradeacademy-lp-dev/...`
- 親フォルダリソース: `../scripts/...`, `../docs/...`

---

## 🎯 結論

### 推奨: **hadayalab-website-devを参照フォルダに設定**

**理由**:
- ✅ LP実装作業が主目的の場合、直接アクセスできる方が効率的
- ✅ 検索・コンテキストが最適化される
- ✅ フォーカスが維持される
- ✅ 親フォルダリソースは相対パスでアクセス可能

**実装**:
1. Cursorで `hadayalab-website-dev` をワークスペースとして開く
2. LP実装作業を進める
3. Notion MCPサーバーが必要な場合は、親フォルダで別ウィンドウを開くか、相対パスで参照

---

**最終更新**: 2025-01-XX

