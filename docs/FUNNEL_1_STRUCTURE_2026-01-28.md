# ファネル1構造（確定版）
**作成日時**: 2026-01-28  
**目的**: インフルエンサーDB → X投稿 → 無料版 → 有料版の完全なファネル構造を理解

---

## 📊 ファネル1の完全な流れ

```
インフルエンサーDB
    ↓
X投稿（引用リポスト）
    ↓
VSL1: https://youtu.be/OqvqngJOiXc
    ↓
無料版（Minimal Version）Whopページ（6言語別）
    - EN: https://whop.com/trapdefence/btc-minimal-en/
    - ES: https://whop.com/trapdefence/btc-minimal-es/
    - PT: https://whop.com/trapdefence/btc-minimal-pt/
    - AR: https://whop.com/trapdefence/btc-minimal-ar/
    - KO: https://whop.com/trapdefence/btc-minimal-ko/
    - JA: https://whop.com/trapdefence/btc-minimal-ja/
    ↓
無料版（Minimal Version）ユーザーへTGで定期配信
    ↓
VSL2: https://youtu.be/fXgVsKhqDjI
    ↓
有料版（Regular Briefing）Whopページ（6言語別）
    - EN: https://whop.com/trapdefence/btc-regular-en/
    - ES: https://whop.com/trapdefence/btc-regular-es/
    - AR: https://whop.com/trapdefence/btc-regular-ar/
    - PT: https://whop.com/trapdefence/btc-regular-pt/
    - KO: https://whop.com/trapdefence/btc-regular-ko/
    - JA: https://whop.com/trapdefence/btc-regular-ja/
```

---

## 🎯 各ステップの詳細

### ステップ1: インフルエンサーDB → X投稿

**データソース**: `data/influencers/influencers-{lang}.json`  
**実行**: 引用リポストCronJobs（6言語別）
- `/api/x-quote-repost-en`
- `/api/x-quote-repost-es`
- `/api/x-quote-repost-pt-br`
- `/api/x-quote-repost-ar`
- `/api/x-quote-repost-ja`
- `/api/x-quote-repost-ko`

**目的**: インフルエンサーのツイートを引用リポストして、VSL1へのトラフィックを獲得

---

### ステップ2: X投稿 → VSL1

**VSL1リンク**: `https://youtu.be/OqvqngJOiXc`  
**実行**: 
- `/api/vsl1-post` - 1日3回（UTC 1時、13時、21時）
- `/api/x-post-minimal-version-cron` - 1日5回（UTC 0時、7時、12時、15時、23時）
- `/api/x-post-free-report` - 1日4回（UTC 4:30、10:30、17:30、19:30）

**目的**: X投稿でVSL1を紹介し、無料版（Minimal Version）へのオプトインを促進

---

### ステップ3: VSL1 → 無料版（Minimal Version）Whopページ

**Whopページ（6言語別）**:
- EN: `https://whop.com/trapdefence/btc-minimal-en/`
- ES: `https://whop.com/trapdefence/btc-minimal-es/`
- PT: `https://whop.com/trapdefence/btc-minimal-pt/`
- AR: `https://whop.com/trapdefence/btc-minimal-ar/`
- KO: `https://whop.com/trapdefence/btc-minimal-ko/`
- JA: `https://whop.com/trapdefence/btc-minimal-ja/`

**目的**: 無料版（Minimal Version）へのオプトイン

**ユーザー管理**: 無料版ユーザーとして登録・管理

---

### ステップ4: 無料版ユーザー → TGで定期配信

**実行**: `/api/cron` - 15分ごと  
**機能**: 
- 無料版（Minimal Version）の定期配信
- 有料版（Regular Briefing）の定期配信
- 緊急配信（トラップ検出時）

**目的**: 無料版ユーザーにTGで定期配信し、エンゲージメントを維持

---

### ステップ5: TG定期配信 → VSL2

**VSL2リンク**: `https://youtu.be/fXgVsKhqDjI`  
**実行**: 
- `/api/vsl2-free-users` - 1時間ごと（24時間後）
- `/api/vsl1-reminder` - 12時間ごと（VSL1リマインド）
- `/api/vsl2-last-call` - 1時間ごと（22時間後）

**目的**: 無料版ユーザーにVSL2を紹介し、有料版（Regular Briefing）へのコンバージョンを促進

---

### ステップ6: VSL2 → 有料版（Regular Briefing）Whopページ

**Whopページ（6言語別）**:
- EN: `https://whop.com/trapdefence/btc-regular-en/`
- ES: `https://whop.com/trapdefence/btc-regular-es/`
- AR: `https://whop.com/trapdefence/btc-regular-ar/`
- PT: `https://whop.com/trapdefence/btc-regular-pt/`
- KO: `https://whop.com/trapdefence/btc-regular-ko/`
- JA: `https://whop.com/trapdefence/btc-regular-ja/`

**目的**: 有料版（Regular Briefing）へのコンバージョン

**ユーザー管理**: 有料版ユーザーとして登録・管理

---

## 🔄 見直し対象のCronJobs（6言語ごとのパイプライン構築）

### 2. 無料版（Minimal Version）のX投稿（3個）

これらのCronJobsは、**ステップ2（X投稿 → VSL1）**を実行します。

#### 2-1. VSL1自動投稿
- **CronJob**: `/api/vsl1-post`
- **スケジュール**: `0 1,13,21 * * *`（1日3回）
- **見直し**: 6言語ごとのパイプライン構築

#### 2-2. 無料版（Minimal Version）のX投稿
- **CronJob**: `/api/x-post-minimal-version-cron`
- **スケジュール**: `0 0,7,12,15,23 * * *`（1日5回）
- **見直し**: 6言語ごとのパイプライン構築

#### 2-3. 無料版レポートX投稿
- **CronJob**: `/api/x-post-free-report`
- **スケジュール**: `30 4,10,17,19 * * *`（1日4回）
- **見直し**: 6言語ごとのパイプライン構築

### 3. TG DM関連（無料版ユーザー向け）（3個）

これらのCronJobsは、**ステップ5（TG定期配信 → VSL2）**を実行します。

#### 3-1. VSL2自動配信（24時間後）
- **CronJob**: `/api/vsl2-free-users`
- **スケジュール**: `0 * * * *`（1時間ごと）
- **見直し**: 6言語ごとのパイプライン構築

#### 3-2. VSL1リマインドメッセージ（12時間後）
- **CronJob**: `/api/vsl1-reminder`
- **スケジュール**: `0 */12 * * *`（12時間ごと）
- **見直し**: 6言語ごとのパイプライン構築

#### 3-3. VSL2ラストコール（22時間後）
- **CronJob**: `/api/vsl2-last-call`
- **スケジュール**: `0 * * * *`（1時間ごと）
- **見直し**: 6言語ごとのパイプライン構築

---

## ✅ 認識確定

**ファネル1の構造**: ✅ 理解しました

**見直し対象**: 6個のCronJobsを6言語ごとのパイプラインとして再構築

**設計方針**: シンプルに実行できるように設計

---

## 🎯 次のステップ

投稿パターンの見直し案を提示してください。6言語ごとのパイプライン構築に進みます。
