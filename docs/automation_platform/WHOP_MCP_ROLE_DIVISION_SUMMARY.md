# Whop Bot と Whop MCP 役割分担 サマリー

## 📋 クイックリファレンス

### Whop Bot（公式Access Manager）

**役割**: ユーザー入退会の自動管理

**機能**:
- ✅ メンバーシップ有効化 → 自動的にTelegramチャットグループに追加
- ✅ メンバーシップキャンセル → 自動的にTelegramチャットグループから削除
- ✅ 6言語別のTelegramチャットグループ管理

**設定**: Whop Dashboard → Products → Experiences → "Connect Telegram"

**自動化レベル**: ⭐⭐⭐⭐⭐（完全自動）

### Whop MCP（カスタム拡張）

**役割**: プロダクト管理、カスタマー対応、アフィリエイト管理

**機能**:
- ✅ プロダクト管理（製品・プランの作成・更新・削除）
- ✅ カスタマー対応（メンバーシップ延長、返金処理、支払い履歴）
- ✅ アフィリエイト管理（リンク生成、コミッション追跡）
- ✅ Experiences管理（Whop Botの補完）
- ✅ Entries管理（手動制御）

**自動化レベル**: ⭐⭐⭐⭐（MCP経由で自動化可能）

## 🎯 使用ガイド

### 標準的なケース → Whop Botを使用

```
ユーザーがメンバーシップ取得
  ↓
Whop Botが自動的にTelegramチャットグループに追加
  ↓
完了（Whop MCPの関与なし）
```

### 特別なケース → Whop MCPを使用

```
カスタマーサポートリクエスト
  ↓
Whop MCP: whop_extend_membership（延長処理）
  ↓
Whop Botが自動的にアクセス継続
```

### プロダクト管理 → Whop MCPを使用

```
新製品を作成
  ↓
Whop MCP: whop_create_product
Whop MCP: whop_create_plan
Whop MCP: whop_create_experience（Telegram設定）
  ↓
Whop DashboardでWhop Botを設定
  ↓
Whop Botが自動的にアクセス管理開始
```

## 📊 ツール一覧

### Whop MCP ツール（合計: 38ツール）

#### プロダクト管理（5ツール）
- `whop_create_product`
- `whop_get_products`
- `whop_get_product`
- `whop_update_product`
- `whop_delete_product`

#### プラン管理（5ツール）
- `whop_get_plans`
- `whop_get_plan`
- `whop_create_plan`
- `whop_update_plan`
- `whop_delete_plan`

#### メンバーシップ管理（8ツール）
- `whop_get_memberships`
- `whop_get_membership`
- `whop_cancel_membership`
- `whop_reactivate_membership`
- `whop_extend_membership`
- `whop_update_membership`
- `whop_suspend_membership`
- `whop_unsuspend_membership`

#### メンバー管理（4ツール）
- `whop_get_members`
- `whop_get_member`
- `whop_update_member`
- `whop_get_member_payments`

#### Entries管理（6ツール）
- `whop_get_entries`
- `whop_get_entry`
- `whop_create_entry`
- `whop_approve_entry`
- `whop_reject_entry`
- `whop_delete_entry`

#### Experiences管理（5ツール）
- `whop_get_experiences`
- `whop_get_experience`
- `whop_create_experience`
- `whop_update_experience`
- `whop_delete_experience`

#### アフィリエイト管理（6ツール）
- `whop_get_affiliates`
- `whop_get_affiliate`
- `whop_create_affiliate`
- `whop_generate_affiliate_link`
- `whop_get_affiliate_commissions`
- `whop_get_affiliate_stats`

#### 返金・支払い管理（4ツール）
- `whop_get_refunds`
- `whop_create_refund`
- `whop_get_refund`
- `whop_get_payments`
- `whop_get_payment`

---

**バージョン**: v2.1.0  
**更新日**: 2026-01-09
