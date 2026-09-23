# 直接販売用語への統一完了

**作成日時**: 2026-01-13  
**目的**: 「アフィリエイト候補」から「ユーザーリスト」/「DM送信先」への用語統一

---

## ✅ 修正完了

### 目的の明確化

**変更前**: アフィリエイター募集（アフィリエイトプログラムへの参加を促す）  
**変更後**: 直接販売（ユーザーにDMを送り、Whopページで商品を購入してもらう）

---

## 📝 修正したファイル

### 1. ドキュメント

- ✅ `docs/CSV_FILE_FORMAT.md`
  - 「アフィリエイター候補」→「ユーザーリスト（DM送信先）」
  - サンプルDMメッセージを直接販売用に修正

- ✅ `docs/CSV_BASED_DM_GUIDE.md`
  - 目的を「直接販売用」に明確化
  - サンプルDMメッセージを直接販売用に修正

- ✅ `docs/CSV_CREATION_PROMPT_FOR_COPILOT.md`
  - 目的を「直接販売用DM送信先リスト」に明確化
  - すべてのサンプルDMメッセージを直接販売用に修正
    - 「アフィリエイトプログラム」→「商品購入」
    - 「50% commission」→「Special Offer: Limited time pricing」

### 2. スクリプト

- ✅ `scripts/send-en-dm-csv.ts`
  - コメントに「直接販売用」の目的を追加
  - 「各候補者に対して」→「各ユーザーに対して」

- ✅ `scripts/check-en-dm-csv-status.ts`
  - 「総候補者数」→「総ユーザー数」
  - 「連絡先情報がない候補者」→「連絡先情報がないユーザー」

- ✅ `scripts/send-ceo-test-dm-csv.ts`
  - 「対象候補者」→「対象ユーザー」

---

## 📋 用語の統一

| 変更前 | 変更後 |
|--------|--------|
| アフィリエイター候補 | ユーザーリスト / DM送信先 |
| 候補者 | ユーザー |
| アフィリエイトプログラム | 商品購入 / 直接販売 |
| Commission: 50% recurring | Special Offer: Limited time pricing |

---

## 🎯 DMメッセージの変更例

### 変更前（アフィリエイト募集）
```
We're launching an exclusive affiliate program for Trap Defence BTC.
💰 Commission: 50% recurring
```

### 変更後（直接販売）
```
We're launching Trap Defence BTC - a revolutionary tool to protect your crypto trades.
💰 Special Offer: Limited time pricing
```

---

## 📌 注意事項

1. **ファイル名**: `user-list-en.csv` に変更しました（直接販売用に明確化）。

2. **データベーススキーマ**: `AffiliateCandidate`テーブル名は既存のデータベーススキーマのため、変更していません。コメントや説明文のみ修正しました。

3. **変数名**: `CandidateRow`インターフェース名などは、コードの互換性を保つため変更していません。

---

## ✅ 次のステップ

1. CSVファイルを作成（`docs/CSV_CREATION_PROMPT_FOR_COPILOT.md`を参照）
2. CSV状態確認を実行（`scripts/check-en-dm-csv-status.ts`）
3. CEO宛てテスト送信を実行（`scripts/send-ceo-test-dm-csv.ts`）
4. 本番送信を実行（`scripts/send-en-dm-csv.ts`）

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
