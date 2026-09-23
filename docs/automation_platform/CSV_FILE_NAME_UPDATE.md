# CSVファイル名変更完了

**作成日時**: 2026-01-13  
**目的**: 直接販売用にCSVファイル名を変更

---

## ✅ 変更内容

### ファイル名

**変更前**: `data/affiliate-candidates-en.csv`  
**変更後**: `data/user-list-en.csv`

### 理由

- ✅ **直接販売用であることが明確**: 「アフィリエイト候補」ではなく「ユーザーリスト」
- ✅ **シンプルで分かりやすい**: 短くて覚えやすい
- ✅ **用途が明確**: DM送信先のユーザーリストであることが一目で分かる

---

## 📝 更新したファイル

### スクリプト

- ✅ `scripts/send-en-dm-csv.ts`
- ✅ `scripts/check-en-dm-csv-status.ts`
- ✅ `scripts/send-ceo-test-dm-csv.ts`

### ドキュメント

- ✅ `docs/CSV_FILE_FORMAT.md`
- ✅ `docs/CSV_BASED_DM_GUIDE.md`
- ✅ `docs/CSV_CREATION_PROMPT_FOR_COPILOT.md`
- ✅ `docs/DIRECT_SALES_TERMINOLOGY_UPDATE.md`

---

## 🚀 次のステップ

1. **CSVファイルを作成**: `data/user-list-en.csv`
2. **CSV状態確認を実行**: `npx tsx scripts/check-en-dm-csv-status.ts`
3. **CEO宛てテスト送信を実行**: `npx tsx scripts/send-ceo-test-dm-csv.ts`
4. **本番送信を実行**: `npx tsx scripts/send-en-dm-csv.ts`

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
