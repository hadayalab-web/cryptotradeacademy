# CronJobs ドライラン実行テストスケジュール
**作成日**: 2026-01-30  
**目的**: すべてのCronJobsをドライランでテスト実行し、バグを修正してから本番環境の投稿に臨む

---

## 🎯 テスト目標

1. **すべてのCronJobsが正常に動作することを確認**
2. **ドライランモードで実際の投稿を行わずに動作を検証**
3. **バグがあれば修正**
4. **完全な挙動が確認できたら本番環境の投稿に臨む**

---

## 🔧 ドライラン設定

### 環境変数設定

```bash
# X投稿関連のドライランを有効化
X_POSTING_DRY_RUN=true

# 本番環境では false に設定
# X_POSTING_DRY_RUN=false
```

**注意**: Vercelの環境変数で `X_POSTING_DRY_RUN=true` を設定してください。

---

## 📋 CronJobs一覧とテスト順序

### Phase 1: Trap Defence BTC配信（有料版・無料版）

#### 1. `/api/cron` - 定期配信・緊急配信
- **スケジュール**: 15分ごと
- **機能**: 有料版（Regular Briefing）と無料版（Minimal Version）の定期配信と緊急配信
- **テスト方法**: 
  ```bash
  curl -X GET "https://your-vercel-app.vercel.app/api/cron?force=true" \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
- **確認項目**:
  - [ ] 有料版メッセージが正しく生成される
  - [ ] 無料版メッセージが正しく生成される
  - [ ] 6言語すべてで配信される
  - [ ] 緊急アラートが正しく動作する
  - [ ] エラーが発生しない

**推定時間**: 10分

---

### Phase 2: X投稿関連（4件）

#### 2. `/api/vsl1-post` - VSL1自動投稿
- **スケジュール**: UTC 1時、13時、21時（1日3回）
- **機能**: VSL1動画のX投稿（無料版オプトイン誘導）
- **テスト方法**:
  ```bash
  curl -X GET "https://your-vercel-app.vercel.app/api/vsl1-post" \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
- **確認項目**:
  - [ ] ドライランモードで実行される（実際の投稿なし）
  - [ ] 6言語すべてで投稿テキストが生成される
  - [ ] VSL1リンクが正しく含まれる
  - [ ] インフルエンサー選択が正しく動作する
  - [ ] エラーが発生しない

**推定時間**: 5分

#### 3. `/api/x-post-minimal-version-cron` - 無料版X投稿
- **スケジュール**: UTC 0時、7時、12時、15時、23時（1日5回）
- **機能**: 無料版（Minimal Version）のX投稿
- **テスト方法**:
  ```bash
  curl -X GET "https://your-vercel-app.vercel.app/api/x-post-minimal-version-cron" \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
- **確認項目**:
  - [ ] ドライランモードで実行される
  - [ ] 6言語すべてで投稿テキストが生成される
  - [ ] Whop Minimal Versionチェックアウトリンクが正しく含まれる
  - [ ] UTMパラメータが正しく付与される
  - [ ] エラーが発生しない

**推定時間**: 5分

#### 4. `/api/x-post-free-report` - 無料版レポートX投稿
- **スケジュール**: UTC 4:30、10:30、17:30、19:30（1日4回）
- **機能**: 無料版レポート配信後のX投稿
- **テスト方法**:
  ```bash
  curl -X GET "https://your-vercel-app.vercel.app/api/x-post-free-report" \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
- **確認項目**:
  - [ ] ドライランモードで実行される
  - [ ] 6言語すべてで投稿テキストが生成される
  - [ ] 市場データが正しく取得される
  - [ ] エラーが発生しない

**推定時間**: 5分

#### 5-10. `/api/x-quote-repost-{lang}` - 引用リポスト自動化（6言語）
- **スケジュール**: 6分ごとにローテーション
  - EN: 0,6,12,18,24,30,36,42,48,54分
  - ES: 1,7,13,19,25,31,37,43,49,55分
  - PT-BR: 2,8,14,20,26,32,38,44,50,56分
  - AR: 3,9,15,21,27,33,39,45,51,57分
  - JA: 4,10,16,22,28,34,40,46,52,58分
  - KO: 5,11,17,23,29,35,41,47,53,59分
- **機能**: インフルエンサーのツイートを引用リポスト
- **テスト方法**:
  ```bash
  # EN
  curl -X GET "https://your-vercel-app.vercel.app/api/x-quote-repost-en" \
    -H "Authorization: Bearer $CRON_SECRET"
  
  # ES
  curl -X GET "https://your-vercel-app.vercel.app/api/x-quote-repost-es" \
    -H "Authorization: Bearer $CRON_SECRET"
  
  # PT-BR
  curl -X GET "https://your-vercel-app.vercel.app/api/x-quote-repost-pt-br" \
    -H "Authorization: Bearer $CRON_SECRET"
  
  # AR
  curl -X GET "https://your-vercel-app.vercel.app/api/x-quote-repost-ar" \
    -H "Authorization: Bearer $CRON_SECRET"
  
  # JA
  curl -X GET "https://your-vercel-app.vercel.app/api/x-quote-repost-ja" \
    -H "Authorization: Bearer $CRON_SECRET"
  
  # KO
  curl -X GET "https://your-vercel-app.vercel.app/api/x-quote-repost-ko" \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
- **確認項目**:
  - [ ] ドライランモードで実行される
  - [ ] インフルエンサーが正しく選択される
  - [ ] ローテーションが正しく動作する
  - [ ] クールダウンが正しく機能する（EN: 6時間、その他: 8時間）
  - [ ] 市場データが正しく統合される
  - [ ] 引用リポストテキストが正しく生成される
  - [ ] Whop Minimal Versionチェックアウトリンクが正しく含まれる
  - [ ] UTMパラメータが正しく付与される
  - [ ] エラーが発生しない

**推定時間**: 各言語5分 × 6言語 = 30分

---

### Phase 3: TG DM関連（3件）

#### 11. `/api/vsl2-free-users` - VSL2自動配信
- **スケジュール**: 1時間ごと
- **機能**: 無料版ユーザーへのVSL2自動配信（24時間後）
- **テスト方法**:
  ```bash
  curl -X GET "https://your-vercel-app.vercel.app/api/vsl2-free-users" \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
- **確認項目**:
  - [ ] 無料版ユーザーが正しく取得される
  - [ ] 24時間経過したユーザーに配信される
  - [ ] VSL2メッセージが正しく生成される
  - [ ] 6言語すべてで配信される
  - [ ] エラーが発生しない

**推定時間**: 5分

#### 12. `/api/vsl1-reminder` - VSL1リマインド
- **スケジュール**: UTC 0時、12時（12時間ごと）
- **機能**: 無料版ユーザーへのVSL1リマインドメッセージ（12時間後）
- **テスト方法**:
  ```bash
  curl -X GET "https://your-vercel-app.vercel.app/api/vsl1-reminder" \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
- **確認項目**:
  - [ ] 無料版ユーザーが正しく取得される
  - [ ] 12時間経過したユーザーに配信される
  - [ ] VSL1リマインドメッセージが正しく生成される
  - [ ] 6言語すべてで配信される
  - [ ] エラーが発生しない

**推定時間**: 5分

#### 13. `/api/vsl2-last-call` - VSL2終了直前リマインド
- **スケジュール**: 1時間ごと
- **機能**: 無料版ユーザーへのVSL2終了直前リマインド（21時間後）
- **テスト方法**:
  ```bash
  curl -X GET "https://your-vercel-app.vercel.app/api/vsl2-last-call" \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
- **確認項目**:
  - [ ] 無料版ユーザーが正しく取得される
  - [ ] 21時間経過したユーザーに配信される
  - [ ] VSL2終了直前リマインドメッセージが正しく生成される
  - [ ] 6言語すべてで配信される
  - [ ] エラーが発生しない

**推定時間**: 5分

---

### Phase 4: その他（1件）

#### 14. `/api/promo-stock-monitor` - プロモコード在庫監視
- **スケジュール**: 15分ごと
- **機能**: プロモコード在庫監視（VSL2に関連）
- **テスト方法**:
  ```bash
  curl -X GET "https://your-vercel-app.vercel.app/api/promo-stock-monitor" \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
- **確認項目**:
  - [ ] プロモコード在庫が正しく取得される
  - [ ] 在庫不足のアラートが正しく動作する
  - [ ] エラーが発生しない

**推定時間**: 5分

---

## 📅 テスト実行スケジュール

### Day 1: 準備と基本テスト（2時間）

| 時間 | タスク | 担当 |
|------|--------|------|
| 00:00-00:30 | 環境変数設定（X_POSTING_DRY_RUN=true） | - |
| 00:30-00:40 | Phase 1: `/api/cron` テスト | - |
| 00:40-00:50 | Phase 2-1: `/api/vsl1-post` テスト | - |
| 00:50-01:00 | Phase 2-2: `/api/x-post-minimal-version-cron` テスト | - |
| 01:00-01:10 | Phase 2-3: `/api/x-post-free-report` テスト | - |
| 01:10-01:40 | Phase 2-4: `/api/x-quote-repost-{lang}` テスト（6言語） | - |
| 01:40-01:50 | Phase 3: TG DM関連（3件）テスト | - |
| 01:50-02:00 | Phase 4: `/api/promo-stock-monitor` テスト | - |

### Day 2: バグ修正と再テスト（4時間）

| 時間 | タスク | 担当 |
|------|--------|------|
| 00:00-02:00 | Day 1で発見されたバグの修正 | - |
| 02:00-04:00 | 修正後の再テスト（全CronJobs） | - |

### Day 3: 最終確認と本番移行（2時間）

| 時間 | タスク | 担当 |
|------|--------|------|
| 00:00-01:00 | 最終確認テスト（全CronJobs） | - |
| 01:00-01:30 | 環境変数変更（X_POSTING_DRY_RUN=false） | - |
| 01:30-02:00 | 本番環境での初回実行確認 | - |

---

## ✅ チェックリスト

### 事前準備

- [ ] Vercel環境変数に `X_POSTING_DRY_RUN=true` を設定
- [ ] すべてのAPIキーとシークレットが正しく設定されている
- [ ] インフルエンサーデータが正しく読み込まれる
- [ ] Whopチェックアウトリンクが正しく設定されている

### テスト実行

- [ ] Phase 1: Trap Defence BTC配信テスト完了
- [ ] Phase 2: X投稿関連テスト完了（4件）
- [ ] Phase 3: TG DM関連テスト完了（3件）
- [ ] Phase 4: その他テスト完了（1件）

### バグ修正

- [ ] 発見されたバグをすべて修正
- [ ] 修正後の再テストを完了
- [ ] エラーログを確認

### 本番移行

- [ ] すべてのテストが成功
- [ ] エラーが発生しないことを確認
- [ ] 環境変数を `X_POSTING_DRY_RUN=false` に変更
- [ ] 本番環境での初回実行を確認

---

## 🐛 バグ報告テンプレート

```markdown
## バグ報告

**CronJob**: `/api/xxx`
**発見日時**: YYYY-MM-DD HH:MM
**エラーメッセージ**: 
```
エラーメッセージをここに記載
```

**再現手順**:
1. 
2. 
3. 

**期待される動作**:
- 

**実際の動作**:
- 

**ログ**:
```
ログをここに記載
```

**修正内容**:
- 
```

---

## 📊 テスト結果レポート

### テスト実行結果

| CronJob | ステータス | エラー | 備考 |
|---------|----------|--------|------|
| `/api/cron` | ⏳ 未実行 | - | - |
| `/api/vsl1-post` | ⏳ 未実行 | - | - |
| `/api/x-post-minimal-version-cron` | ⏳ 未実行 | - | - |
| `/api/x-post-free-report` | ⏳ 未実行 | - | - |
| `/api/x-quote-repost-en` | ⏳ 未実行 | - | - |
| `/api/x-quote-repost-es` | ⏳ 未実行 | - | - |
| `/api/x-quote-repost-pt-br` | ⏳ 未実行 | - | - |
| `/api/x-quote-repost-ar` | ⏳ 未実行 | - | - |
| `/api/x-quote-repost-ja` | ⏳ 未実行 | - | - |
| `/api/x-quote-repost-ko` | ⏳ 未実行 | - | - |
| `/api/vsl2-free-users` | ⏳ 未実行 | - | - |
| `/api/vsl1-reminder` | ⏳ 未実行 | - | - |
| `/api/vsl2-last-call` | ⏳ 未実行 | - | - |
| `/api/promo-stock-monitor` | ⏳ 未実行 | - | - |

### 発見されたバグ

- なし（テスト実行後に更新）

### 修正内容

- なし（バグ修正後に更新）

---

## 🎯 次のステップ

1. **環境変数設定**: Vercelで `X_POSTING_DRY_RUN=true` を設定
2. **テスト実行**: 上記スケジュールに従ってテストを実行
3. **バグ修正**: 発見されたバグを修正
4. **再テスト**: 修正後の再テストを実行
5. **本番移行**: すべてのテストが成功したら `X_POSTING_DRY_RUN=false` に変更

---

**最終更新**: 2026-01-30
