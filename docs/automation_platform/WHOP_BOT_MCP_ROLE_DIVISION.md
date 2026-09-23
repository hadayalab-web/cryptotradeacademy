# Whop Bot と Whop MCP 役割分担 再定義

## 📋 概要

Whop Bot（公式Access Manager）とWhop MCPの役割分担を公式リファレンスに基づいて再定義しました。

**関連ドキュメント**: 
- `docs/WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md` - **3つの基本原則**（重要）
  - 原則3: **Whop BotがユーザーのTelegramチャットグループ管理を担当**

## 🔍 公式リファレンス調査結果

### Whop Bot（公式Access Manager）

**公式ドキュメント**: https://whop.com/apps/app_Hult2DfiNkAhMp/

**役割**:
- ✅ **Telegramチャットグループへの自動アクセス管理**
  - メンバーシップ有効化 → 自動的にTelegramチャットグループに追加
  - メンバーシップキャンセル → 自動的にTelegramチャットグループから削除
  - メンバーシップ状態に応じた自動アクセス制御

**設定方法**:
1. Whop Dashboard → Products → [Product選択]
2. Settings → Experiences
3. "Connect Telegram" を選択
4. Telegramチャンネル/グループを接続
5. Whop Bot（Access Manager）が自動的にアクセス管理

**特徴**:
- ✅ **完全自動化**: メンバーシップ状態に応じて自動的にアクセス管理
- ✅ **6言語対応**: 各言語別のTelegramチャットグループに対応
- ✅ **公式サポート**: Whop公式が提供する機能

### Whop MCP（カスタム拡張）

**役割**:
- ✅ **プロダクト管理**: 製品・プランの作成・更新・削除
- ✅ **カスタマー対応**: メンバーシップ管理、返金処理、支払い履歴
- ✅ **アフィリエイト管理**: アフィリエイトリンク生成、コミッション追跡
- ✅ **Experiences管理**: Telegram Experienceの設定・管理（Whop Botの補完）
- ✅ **Entries管理**: エントリーの作成・承認・拒否・削除（手動制御）

## 🎯 役割分担の再定義

### Whop Bot（公式Access Manager）の役割

#### 1. ユーザー入退会の自動管理
- **メンバーシップ有効化時**: 自動的にTelegramチャットグループに追加
- **メンバーシップキャンセル時**: 自動的にTelegramチャットグループから削除
- **メンバーシップ延長時**: 自動的にアクセス継続

**自動化レベル**: ⭐⭐⭐⭐⭐（完全自動）

#### 2. 6言語別のTelegramチャットグループ管理
- **AR**: アラビア語チャットグループ
- **EN**: 英語チャットグループ
- **ES**: スペイン語チャットグループ
- **JA**: 日本語チャットグループ
- **KO**: 韓国語チャットグループ
- **PT-BR**: ポルトガル語（ブラジル）チャットグループ

**設定**: Whop Dashboardで各プロダクトにTelegram Experienceを設定

### Whop MCP（カスタム拡張）の役割

#### 1. プロダクト管理（完全制御）
- ✅ 製品の作成・更新・削除
- ✅ プランの作成・更新・削除
- ✅ 価格設定
- ✅ 公開設定

**自動化レベル**: ⭐⭐⭐⭐（MCP経由で自動化可能）

#### 2. カスタマー対応（完全制御）
- ✅ メンバーシップ延長・更新・一時停止
- ✅ 返金処理（全額・一部）
- ✅ 支払い履歴確認
- ✅ メンバー情報更新

**自動化レベル**: ⭐⭐⭐⭐（MCP経由で自動化可能）

#### 3. アフィリエイト管理（完全制御）
- ✅ アフィリエイトリンク生成
- ✅ コミッション追跡
- ✅ アフィリエイト統計

**自動化レベル**: ⭐⭐⭐⭐（MCP経由で自動化可能）

#### 4. Experiences管理（Whop Botの補完）
- ✅ Experienceの作成・更新・削除
- ✅ Telegram Experienceの設定
- ✅ 自動承認設定

**自動化レベル**: ⭐⭐⭐⭐（MCP経由で自動化可能）

**補完的役割**: Whop Botが自動管理するが、設定変更や手動制御が必要な場合に使用

#### 5. Entries管理（手動制御）
- ✅ エントリーの作成（手動アクセスリクエスト）
- ✅ エントリーの承認・拒否（手動承認）
- ✅ エントリーの削除（手動削除）

**自動化レベル**: ⭐⭐⭐（手動制御が必要な場合に使用）

**補完的役割**: Whop Botが自動管理するが、特別なケースで手動制御が必要な場合に使用

## 🔄 ワークフロー例

### 標準的なユーザー入退会フロー（Whop Bot自動管理）

```
1. ユーザーがWhopでメンバーシップ取得
   ↓
2. Whop Bot（Access Manager）が自動検知
   ↓
3. Whop Botが自動的にTelegramチャットグループに追加
   ↓
4. ユーザーがTelegramチャットグループに参加完了
```

**Whop MCPの関与**: なし（完全自動）

### 特別なケース（Whop MCP手動制御）

```
1. カスタマーサポートリクエスト受信
   ↓
2. Whop MCP: whop_get_membership でメンバーシップ確認
   ↓
3. Whop MCP: whop_extend_membership で延長処理
   ↓
4. Whop Botが自動的にアクセス継続
```

**Whop MCPの関与**: カスタマー対応の補完

### Experiences設定（Whop MCP管理）

```
1. CPO（GPT-5.2）が新製品仕様書を作成
   ↓
2. Whop MCP: whop_create_product で製品作成
   ↓
3. Whop MCP: whop_create_experience でTelegram Experience作成
   ↓
4. Whop DashboardでWhop Botを設定
   ↓
5. Whop Botが自動的にアクセス管理開始
```

**Whop MCPの関与**: Experiences設定の自動化

## 📊 役割分担マトリックス

| 機能 | Whop Bot（公式） | Whop MCP（カスタム） | 優先度 |
|------|-----------------|---------------------|--------|
| **ユーザー入退会の自動管理** | ✅ 完全自動 | ⚠️ 補完的 | Whop Bot優先 |
| **Telegramチャットグループ管理** | ✅ 完全自動 | ⚠️ 設定管理 | Whop Bot優先 |
| **プロダクト管理** | ❌ | ✅ 完全制御 | Whop MCP |
| **カスタマー対応** | ❌ | ✅ 完全制御 | Whop MCP |
| **アフィリエイト管理** | ❌ | ✅ 完全制御 | Whop MCP |
| **Experiences設定** | ⚠️ Dashboard設定 | ✅ API制御 | 併用 |
| **Entries手動制御** | ❌ | ✅ 完全制御 | Whop MCP |

## 🎯 推奨される使用方法

### Whop Bot（公式）を使用すべき場合

1. **標準的なユーザー入退会管理**
   - メンバーシップ有効化時の自動追加
   - メンバーシップキャンセル時の自動削除
   - **推奨**: Whop Botの自動機能を活用

2. **6言語別のTelegramチャットグループ管理**
   - 各言語別のチャットグループへの自動アクセス管理
   - **推奨**: Whop Dashboardで設定し、Whop Botに任せる

### Whop MCP（カスタム）を使用すべき場合

1. **プロダクト管理**
   - 製品・プランの作成・更新・削除
   - 価格設定の変更
   - **推奨**: Whop MCPで完全制御

2. **カスタマー対応**
   - メンバーシップ延長
   - 返金処理
   - 支払い履歴確認
   - **推奨**: Whop MCPで完全制御

3. **アフィリエイト管理**
   - アフィリエイトリンク生成
   - コミッション追跡
   - **推奨**: Whop MCPで完全制御

4. **Experiences設定の自動化**
   - 新製品作成時の自動Experience設定
   - **推奨**: Whop MCPで自動化

5. **特別なケースの手動制御**
   - エントリーの手動承認・拒否
   - 特別なアクセス制御
   - **推奨**: Whop MCPで手動制御

## 🔧 実装状況

### Whop MCPに追加された機能

#### Experiences管理（7ツール）
- ✅ `whop_get_experiences` - Experiences一覧取得
- ✅ `whop_get_experience` - Experience詳細取得
- ✅ `whop_create_experience` - Experience作成
- ✅ `whop_update_experience` - Experience更新
- ✅ `whop_delete_experience` - Experience削除

#### Entries管理（拡張）
- ✅ `whop_get_entries` - エントリー一覧取得（既存）
- ✅ `whop_get_entry` - エントリー詳細取得（既存）
- ✅ `whop_approve_entry` - エントリー承認（既存）
- ✅ `whop_create_entry` - エントリー作成 ⭐ 新規追加
- ✅ `whop_reject_entry` - エントリー拒否 ⭐ 新規追加
- ✅ `whop_delete_entry` - エントリー削除 ⭐ 新規追加

## 📚 参考情報

### Whop公式ドキュメント
- **Whop Bot**: https://whop.com/apps/app_Hult2DfiNkAhMp/
- **Whop API**: https://dev.whop.com/api-reference/v2
- **Whop MCP**: https://docs.whop.com/developer/guides/ai_and_mcp

### 統合戦略
- **n8n + Whop + Telegram統合**: `docs/Strategy/ssot/n8n-whop-telegram-integration-SSOT.md`

## ✅ 結論

### 役割分担の明確化

**Whop Bot（公式Access Manager）**:
- ✅ **主役**: ユーザー入退会の自動管理
- ✅ **6言語別Telegramチャットグループ管理**: 完全自動
- ✅ **推奨**: 標準的なケースではWhop Botに任せる

**Whop MCP（カスタム拡張）**:
- ✅ **主役**: プロダクト管理、カスタマー対応、アフィリエイト管理
- ✅ **補完**: Experiences設定の自動化、Entries手動制御
- ✅ **推奨**: オペレーション自動化、特別なケースの手動制御

### ハイブリッドアプローチ

- **Whop Bot**: 標準的なユーザー入退会管理（自動）
- **Whop MCP**: プロダクト管理、カスタマー対応、アフィリエイト管理（自動化）
- **連携**: Whop MCPで設定 → Whop Botが自動管理

---

**再定義日**: 2026-01-09  
**再定義者**: COO (Composer 1)  
**参照**: Whop公式リファレンス + 既存実装
