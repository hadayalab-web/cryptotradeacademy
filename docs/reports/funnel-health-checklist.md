# ファネル動作確認チェックリスト

**作成日時**: 2026-01-27
**目的**: X投稿 → Telegram Deep Link → Whop Link → コンバージョン追跡の各ステップが正常に動作しているかを確認

---

## 🎯 確認項目

### 1. 環境変数の確認

#### 必須環境変数
- [ ] `TELEGRAM_BOT_USERNAME`: Telegram Botのユーザー名（@記号なし）
- [ ] `TELEGRAM_BOT_TOKEN`: Telegram Botのトークン
- [ ] `X_API_CONSUMER_KEY`: X API Consumer Key
- [ ] `X_API_CONSUMER_SECRET`: X API Consumer Secret
- [ ] `X_API_ACCESS_TOKEN`: X API Access Token
- [ ] `X_API_ACCESS_TOKEN_SECRET`: X API Access Token Secret

#### オプション環境変数（Whop Link）
- [ ] `WHOP_PRODUCT_URL_EN`: 英語版Whop Product URL
- [ ] `WHOP_PRODUCT_URL_JA`: 日本語版Whop Product URL
- [ ] `WHOP_PRODUCT_URL_ES`: スペイン語版Whop Product URL
- [ ] `WHOP_PRODUCT_URL_PT_BR`: ポルトガル語版Whop Product URL
- [ ] `WHOP_PRODUCT_URL_AR`: アラビア語版Whop Product URL
- [ ] `WHOP_PRODUCT_URL_KO`: 韓国語版Whop Product URL

**確認方法**:
```bash
node scripts/verify-funnel-health.js
```

---

### 2. Cronスケジュールの確認

#### X投稿関連のCronジョブ
- [ ] `/api/x-quote-repost`: 12回/日（UTC 0,2,4,6,8,10,12,14,16,18,20,22）
- [ ] `/api/x-post-free-report`: 4回/日（UTC 4,10,17,19）
- [ ] `/api/x-post-minimal-version-cron`: 4回/日（UTC 7,12,15,23）

**確認方法**:
- `vercel.json`の`crons`セクションを確認
- Vercel Dashboard → Settings → Cron Jobs で確認

---

### 3. Telegram Deep Linkの確認

#### 各X投稿タイプのDeep Link生成
- [ ] **Quote Repost**: `x_quote`ソースで正しく生成される
- [ ] **Free Report**: `x_direct`ソースで正しく生成される
- [ ] **Minimal Version**: `x_minimal`ソースで正しく生成される

#### 各言語のDeep Link
- [ ] EN: `https://t.me/[BOT_USERNAME]?start=minimal_en_[SOURCE]&utm_source=...`
- [ ] JA: `https://t.me/[BOT_USERNAME]?start=minimal_ja_[SOURCE]&utm_source=...`
- [ ] ES: `https://t.me/[BOT_USERNAME]?start=minimal_es_[SOURCE]&utm_source=...`
- [ ] PT-BR: `https://t.me/[BOT_USERNAME]?start=minimal_pt-br_[SOURCE]&utm_source=...`
- [ ] AR: `https://t.me/[BOT_USERNAME]?start=minimal_ar_[SOURCE]&utm_source=...`
- [ ] KO: `https://t.me/[BOT_USERNAME]?start=minimal_ko_[SOURCE]&utm_source=...`

**確認方法**:
```bash
node scripts/verify-funnel-health.js
```

**手動確認**:
1. X投稿を確認
2. Telegram Deep Linkをクリック
3. Telegram Botが正しく応答するか確認

---

### 4. Whop Linkの確認

#### 各言語のWhop Link
- [ ] EN: `https://whop.com/aio-media-llc/trap-defence-btc-en/?promo=DEFEND50`
- [ ] JA: `https://whop.com/aio-media-llc/trap-defence-btc-ja/?promo=DEFEND50`
- [ ] ES: `https://whop.com/aio-media-llc/trap-defense-btc-es/?promo=DEFEND50`
- [ ] PT-BR: `https://whop.com/aio-media-llc/trap-defense-btc-ptbr/?promo=DEFEND50`
- [ ] AR: `https://whop.com/aio-media-llc/tap-defense-btc-ar/?promo=DEFEND50`
- [ ] KO: `https://whop.com/aio-media-llc/trap-defense-btc-ko/?promo=DEFEND50`

#### プロモコード
- [ ] `DEFEND50`プロモコードが正しく付与されている
- [ ] プロモコードが有効である（Whop Dashboardで確認）

**確認方法**:
```bash
node scripts/verify-funnel-health.js
```

**手動確認**:
1. X投稿のWhop Linkをクリック
2. Whop Productページが正しく表示されるか確認
3. プロモコードが適用されているか確認

---

### 5. X投稿の確認

#### Quote Repost
- [ ] 12回/日正しく実行されている（UTC 0,2,4,6,8,10,12,14,16,18,20,22）
- [ ] Telegram Deep Linkが含まれている
- [ ] Whop Link（DEFEND50付き）が含まれている
- [ ] 各言語で正しく投稿されている

#### Free Report
- [ ] 4回/日正しく実行されている（UTC 4,10,17,19）
- [ ] Telegram Deep Linkが含まれている
- [ ] Whop Link（DEFEND50付き）が含まれている
- [ ] 各言語で正しく投稿されている

#### Minimal Version
- [ ] 4回/日正しく実行されている（UTC 7,12,15,23）
- [ ] Telegram Deep Linkが含まれている
- [ ] Whop Link（DEFEND50付き）が含まれている
- [ ] 各言語で正しく投稿されている

**確認方法**:
- Vercel LogsでX投稿の実行ログを確認
- X Webhookで投稿の成功を確認
- Xアカウントで実際の投稿を確認

---

### 6. コンバージョン追跡の確認

#### UTMパラメータ
- [ ] `utm_source`: 正しく設定されている（`x_quote_[lang]`, `x_direct_[lang]`, `x_minimal_[lang]`）
- [ ] `utm_medium`: `social`が設定されている
- [ ] `utm_campaign`: 日付とソースが含まれている

#### アトリビューション
- [ ] Telegram Botで`/start`コマンドのソースが正しく記録されている
- [ ] Whopでのコンバージョンが正しく追跡されている
- [ ] コンバージョン率が測定可能である

**確認方法**:
- Telegram Botのログで`/start`コマンドのパラメータを確認
- Whop Dashboardでコンバージョンを確認
- アナリティクスツールでUTMパラメータを確認

---

### 7. エラーハンドリングの確認

#### X投稿エラー
- [ ] X APIエラーが正しくハンドリングされている
- [ ] レート制限エラーが正しくハンドリングされている
- [ ] エラーログが適切に記録されている

#### Telegram Deep Linkエラー
- [ ] 無効なDeep Linkが正しくハンドリングされている
- [ ] Botが応答しない場合のエラーハンドリング

#### Whop Linkエラー
- [ ] 無効なWhop Linkが正しくハンドリングされている
- [ ] プロモコードエラーが正しくハンドリングされている

**確認方法**:
- Vercel Logsでエラーログを確認
- エラー発生時の動作を確認

---

## 🔍 確認スクリプトの実行

### 基本的な確認
```bash
node scripts/verify-funnel-health.js
```

このスクリプトは以下を確認します：
1. 環境変数の設定状況
2. Cronスケジュールの設定
3. Telegram Deep Linkの生成
4. Whop Linkの生成

### 出力
- コンソールに結果が表示されます
- `docs/reports/funnel-health-check-[timestamp].json`に詳細レポートが保存されます

---

## 📊 確認結果の解釈

### ✅ すべて正常な場合
```
環境変数: ✅
Cron設定: ✅
リンク生成: ✅

✅ ファネルは正常に動作する準備ができています！
```

### ⚠️ 問題がある場合
```
環境変数: ❌ (TELEGRAM_BOT_USERNAMEが設定されていません)
Cron設定: ✅
リンク生成: ⚠️ (一部の言語でリンク生成に失敗)

⚠️ ファネルに問題がある可能性があります。上記の詳細を確認してください。
```

---

## 🚨 よくある問題と解決方法

### 1. Telegram Deep Linkが動作しない
**原因**: `TELEGRAM_BOT_USERNAME`に`@`記号が含まれている
**解決**: 環境変数から`@`記号を削除

### 2. Whop Linkが正しく生成されない
**原因**: 環境変数が設定されていない、またはデフォルトURLが間違っている
**解決**: 環境変数を設定するか、`services/telegram/whop-links.js`のデフォルトURLを確認

### 3. X投稿が実行されない
**原因**: Cronスケジュールが正しく設定されていない、またはX API認証エラー
**解決**: `vercel.json`のCron設定を確認、X API認証情報を確認

### 4. コンバージョンが追跡できない
**原因**: UTMパラメータが正しく設定されていない、またはアナリティクスツールが設定されていない
**解決**: UTMパラメータの設定を確認、アナリティクスツールの設定を確認

---

## 🎯 次のステップ

1. **確認スクリプトの実行**: `node scripts/verify-funnel-health.js`
2. **問題の修正**: チェックリストで問題を特定し、修正
3. **実際のテスト**: X投稿を実行し、実際の動作を確認
4. **コンバージョン追跡**: 実際のコンバージョンを確認
5. **最適化**: コンバージョン率を改善するための最適化

---

**作成日時**: 2026-01-27
**目的**: ファネルの動作状況を確認するためのチェックリスト
