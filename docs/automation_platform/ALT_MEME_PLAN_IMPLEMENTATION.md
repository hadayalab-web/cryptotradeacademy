# Trap Defence（アルト・ミーム）プラン実装計画

**作成日**: 2026-01-13  
**目的**: Trap Defence（アルト・ミーム）を別プランとして展開

---

## プラン概要

### Trap Defence Alt/Meme

- **価格**: $69/月（BTC版と同じ）
- **配信内容**: ETH、SOL、主要ミームコインのトラップアラート
- **特典**: 1日フリートライアル + 無償アップデート
- **配信形式**: メール配信ニュースレター（Resend API）

---

## 実装内容

### 1. Whopプロダクト作成

- **プロダクト名**: "Trap Defence Alt/Meme"
- **価格**: $69/月（renewal）
- **説明**: ETH、SOL、主要ミームコインのトラップアラートを提供

### 2. 配信ロジック

- BTC版と同じトラップ検出ロジックを使用
- 対象アセット: ETH、SOL、主要ミームコイン
- CryptoQuantデータを各アセット用に取得・分析

### 3. メールテンプレート

- BTC版と同じテンプレート構造を使用
- アセット名を動的に変更（ETH/SOL/ミームコイン）

---

## 実装ファイル

- `cryptosignal-ai/api/cron-alt-meme.js` - アルト・ミーム版の配信ロジック（新規作成予定）
- `cryptosignal-ai/services/email/messages/user/en/alt-meme.en.js` - アルト・ミーム版メールテンプレート（新規作成予定）
- `scripts/sync-whop-products.ts` - Whopプロダクト同期スクリプトを更新

---

## 次のステップ

1. Whopで「Trap Defence Alt/Meme」プロダクトを作成
2. アルト・ミーム版の配信ロジックを実装
3. メールテンプレートを作成
4. テスト配信を実行

---

**状態**: ⏳ 実装予定
