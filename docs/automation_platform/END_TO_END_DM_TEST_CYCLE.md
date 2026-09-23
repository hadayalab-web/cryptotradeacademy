# エンドツーエンドDMテストサイクルガイド

**作成日時**: 2026-01-13  
**目的**: リスト抽出→データベース化→DM準備→CEOテスト送信→検証・改善の完全なサイクル

---

## 🎯 テストサイクル概要

```
リスト抽出 → データベース化 → DM準備 → CEOテスト送信 → 検証・改善 → 繰り返し
```

---

## 📋 実行手順

### 方法1: 統合スクリプトで一括実行（推奨）

```bash
npx tsx scripts/end-to-end-dm-test-cycle.ts
```

このスクリプトが以下を順番に実行します：
1. リスト抽出→データベース化 + DM準備
2. CEO宛てテスト送信
3. 検証・改善

---

### 方法2: 個別スクリプトで実行

#### Step 1: リスト抽出→データベース化 + DM準備

```bash
npx tsx scripts/complete-6markets-whop-and-send-dm.ts
```

**処理内容**:
- Grok (CSO) がリストを収集
- Gemini (CMO) がセールスレターを作成
- GPT (CTO) がDM準備
- データベースに保存（status=New）

**注意**: 実際のDM送信は行いません（準備のみ）

---

#### Step 2: CEO宛てテスト送信

```bash
npx tsx scripts/send-ceo-test-dm.ts
```

**処理内容**:
- 準備済みDMから最初の1件を取得
- Email送信: Resend → `admin@cryptotradeacademy.io`
- Telegram送信: EN Bot → `TELEGRAM_ADMIN_ID` (6770292419)
- 送信結果をCEOにレポート

**送信先**:
- **Email**: `admin@cryptotradeacademy.io`
- **Telegram**: `TELEGRAM_ADMIN_ID=6770292419`（EN Botから送信）

---

#### Step 3: 検証・改善

```bash
npx tsx scripts/validate-and-improve-dm.ts
```

**処理内容**:
- 準備済みDMを検証
- 課題を可視化（エラー、警告、情報）
- 改善レポートを生成
- CEOにレポートを送信

**検証項目**:
- メッセージ長さ（4096文字制限）
- 連絡先情報の有無
- Whop URLの存在
- HTMLフォーマットの妥当性
- データベース統計

---

## 🔄 改善サイクル

### 1. 検証実行
```bash
npx tsx scripts/validate-and-improve-dm.ts
```

### 2. 課題確認
- CEOに送信された検証レポートを確認
- エラーと警告を特定

### 3. 改善実施
- エラーを修正
- 警告に対応
- コードを更新

### 4. 再検証
```bash
npx tsx scripts/validate-and-improve-dm.ts
```

### 5. 繰り返し
エラーが0件になるまで、または満足できる品質になるまで繰り返す

---

## 📊 検証レポートの見方

### エラー（即座に対応が必要）
- ❌ メッセージが見つからない
- ❌ メッセージが4096文字を超えている
- ❌ 連絡先情報がない

### 警告（改善推奨）
- ⚠️ メッセージが長い（3500文字以上）
- ⚠️ Whop URLが見つからない
- ⚠️ 無効なHTMLタグが含まれている

### 情報
- ℹ️ データベース統計

---

## 🚀 本番環境での検証フロー

### Phase 1: 初回検証
1. リスト抽出→データベース化
2. DM準備
3. CEO宛てテスト送信
4. 検証実行
5. 課題を可視化

### Phase 2: 改善実施
1. エラーを修正
2. 警告に対応
3. コードを更新

### Phase 3: 再検証
1. 再度検証実行
2. 改善結果を確認
3. エラーが0件か確認

### Phase 4: 繰り返し
Phase 2 → Phase 3 を繰り返して完成させる

---

## 📝 必要な環境変数

```env
# データベース
DATABASE_URL=postgresql://...

# Telegram
TELEGRAM_BOT_TOKEN_EN=...
TELEGRAM_ADMIN_ID=6770292419
TELEGRAM_CHAT_ID_EN=-1003223165053

# Resend
RESEND_API_KEY=...

# AI API Keys
XAI_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...

# Whop
WHOP_API_KEY=...
```

---

## ✅ チェックリスト

### 初回実行前
- [ ] 環境変数がすべて設定されている
- [ ] データベース接続が確認できている
- [ ] Prismaクライアントが生成されている

### テスト送信前
- [ ] リスト抽出が完了している
- [ ] DM準備が完了している
- [ ] データベースに準備済みDMが存在する

### 検証前
- [ ] CEO宛てテスト送信が完了している
- [ ] CEOがテストDMを確認している
- [ ] 検証レポートを確認する準備ができている

---

## 🐛 トラブルシューティング

### エラー: DATABASE_URL not found
```bash
# .envファイルにDATABASE_URLを追加
DATABASE_URL="postgresql://user:password@localhost:5432/cryptotradeacademy?schema=public"
```

### エラー: 準備済みDMが見つかりません
```bash
# 先にリスト抽出→DM準備を実行
npx tsx scripts/complete-6markets-whop-and-send-dm.ts
```

### エラー: Telegram送信失敗
- `TELEGRAM_BOT_TOKEN_EN`が正しく設定されているか確認
- `TELEGRAM_ADMIN_ID`が正しいか確認
- Botがユーザーをブロックしていないか確認

### エラー: Email送信失敗
- `RESEND_API_KEY`が正しく設定されているか確認
- 送信元ドメインがResendで検証されているか確認

---

## 📚 関連スクリプト

- `scripts/complete-6markets-whop-and-send-dm.ts` - リスト抽出→DM準備
- `scripts/send-ceo-test-dm.ts` - CEO宛てテスト送信
- `scripts/validate-and-improve-dm.ts` - 検証・改善
- `scripts/end-to-end-dm-test-cycle.ts` - 統合テストサイクル
- `scripts/check-en-dm-database-status.ts` - データベース状態確認

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
