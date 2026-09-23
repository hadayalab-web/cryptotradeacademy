# CEO宛てテストDM送信フロー検証

**作成日時**: 2026-01-13  
**目的**: CEO宛てのみにテスト送信するフローの検証

---

## 🎯 フロー概要

### 重要な制約

**CEO（人間）宛て以外は送信しない**

- 実際のユーザーには送信しない
- CEO宛てのテスト送信のみを実行
- 検証完了後、CEOのGOサインが出てから本番送信

---

## 📋 フロー詳細

### Step 1: リスト収集（Grok CSO）

**スクリプト**: `scripts/test-grok-list-collection.ts`

**処理内容**:
1. Grok CSOがEN市場のユーザーリストを収集（20件）
2. `data/user-list-en.csv`に保存
3. 結果をレポート

**実行方法**:
```bash
npx tsx scripts/test-grok-list-collection.ts
```

**出力**:
- `data/user-list-en.csv`: ユーザーリスト（DMメッセージなし）

**状態**: ✅ 完了（23件のユーザーを収集）

---

### Step 2: DMメッセージ作成（Gemini CMO）

**スクリプト**: `scripts/generate-dm-messages-en.ts`

**処理内容**:
1. `data/user-list-en.csv`を読み込む
2. Gemini CMOが各ユーザー向けにDMメッセージを生成（バッチ処理）
3. VSL URLを含む: `https://app.heygen.com/embedded-player/3aaf47b98f4b49c59c14999a16038af3`
4. `data/dm-messages-en.json`に保存
5. 結果をレポート

**実行方法**:
```bash
npx tsx scripts/generate-dm-messages-en.ts
```

**出力**:
- `data/dm-messages-en.json`: Gemini CMOが作成したDMメッセージ

**状態**: ⏳ 未実行

---

### Step 3: CEO宛てテスト送信

**スクリプト**: `scripts/send-ceo-test-dm-csv.ts`

**処理内容**:
1. `data/user-list-en.csv`を読み込む
2. `data/dm-messages-en.json`を読み込む
3. `username`をキーにして結合
4. **最初の1件をCEOにテスト送信**（CEO宛て以外は送信しない）
   - Email: Resend → `admin@cryptotradeacademy.io`
   - Telegram: EN Bot → `TELEGRAM_ADMIN_ID` (6770292419)
5. 送信結果をレポート

**実行方法**:
```bash
npx tsx scripts/send-ceo-test-dm-csv.ts
```

**出力**:
- CEOにEmailとTelegramでテストDMを送信
- 結果レポートをEmailで送信

**状態**: ⏳ 未実行

---

## ✅ 検証項目

### 1. データフロー

- [x] CSVファイルからユーザーリストを読み込める
- [ ] JSONファイルからDMメッセージを読み込める
- [ ] `username`をキーにして結合できる
- [ ] CEO宛てにのみ送信できる

### 2. DMメッセージ

- [ ] VSL URLが含まれている
- [ ] パーソナライズされている
- [ ] Whopページへのリンクが含まれている
- [ ] メッセージの長さが適切（200-400文字）

### 3. 送信機能

- [ ] Email送信が成功する
- [ ] Telegram送信が成功する
- [ ] CEOがメッセージを受信できる
- [ ] メッセージのフォーマットが正しい

---

## 🔄 実行順序

1. **リスト収集**（完了）
   ```bash
   npx tsx scripts/test-grok-list-collection.ts
   ```

2. **DMメッセージ作成**
   ```bash
   npx tsx scripts/generate-dm-messages-en.ts
   ```

3. **CEO宛てテスト送信**
   ```bash
   npx tsx scripts/send-ceo-test-dm-csv.ts
   ```

---

## 📊 期待される結果

### Step 2完了後

- `data/dm-messages-en.json`に23件のDMメッセージが保存される
- 各メッセージにVSL URLが含まれる
- 各メッセージがパーソナライズされている

### Step 3完了後

- CEOにEmailでテストDMが送信される
- CEOにTelegramでテストDMが送信される
- 結果レポートがEmailで送信される
- **実際のユーザーには送信されない**

---

## ⚠️ 注意事項

1. **CEO宛てのみ送信**: 実際のユーザーには送信しない
2. **VSL URL**: HeyGen VSLのiframeが正しく埋め込まれているか確認
3. **WhopページURL**: 正しいURLが含まれているか確認
4. **メッセージの長さ**: 200-400文字程度に収まっているか確認

---

## 🎯 次のステップ

1. ✅ **リスト収集**（完了）
2. ⏳ **DMメッセージ作成**（次に実行）
3. ⏳ **CEO宛てテスト送信**（その次に実行）
4. ⏳ **CEOのGOサイン待ち**
5. ⏳ **本番送信準備**（GOサイン後）

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
