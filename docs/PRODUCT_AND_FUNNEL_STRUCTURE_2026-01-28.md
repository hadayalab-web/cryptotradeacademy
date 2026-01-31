# プロダクトとマーケティングファネルの構造整理
**作成日時**: 2026-01-28  
**目的**: プロダクト（TG配信）とマーケティングファネルを明確に分離し、現状のCronJobsを整理

---

## 📦 プロダクト（TG配信）

### 1. TG無料版（Minimal Version）
- **配信先**: Telegram無料版チャンネル（MINIMAL）
- **内容**: Trap Score + 簡易分析 + Dr. Grokコメント
- **CronJob**: `/api/cron`（`isRegularSlot`がtrueの場合）
- **スケジュール**: 6時間ごと（または4時間ごと）
- **言語**: 6言語すべて（デフォルト: `MINIMAL_MULTI_LANG=true`）

### 2. TG有料版（Regular Briefing）
- **配信先**: Telegram有料版チャンネル（REGULAR）
- **内容**: 詳細な市場分析、GPT解析、Grok X解析、Gemini深層心理分析
- **CronJob**: `/api/cron`（`isRegularSlot`がtrueの場合）
- **スケジュール**: 6時間ごと（または4時間ごと）
- **言語**: 6言語すべて（デフォルト: `REGULAR_MULTI_LANG=true`）

### 3. TG緊急配信
- **配信先**: Telegram有料版チャンネル（REGULAR）
- **内容**: トラップ検出アラート（trapScore>=60, liquidations>$500M等）
- **CronJob**: `/api/cron`（`needsEmergency`がtrueの場合）
- **スケジュール**: 15分ごとにチェック（緊急時のみ配信）
- **言語**: 6言語すべて

**実装**: すべて`/api/cron`で統合管理

---

## 🎯 マーケティングファネル

### 1. Whopへのトラフィックを増やすX投稿
**目的**: X（Twitter）経由でWhopへのトラフィックを増やす

| CronJob | スケジュール | 実行頻度 | 機能概要 | 状態 |
|---------|------------|---------|---------|------|
| `/api/x-post-free-report` | `30 4,10,17,19 * * *` | 1日4回 | 無料版レポートX投稿（6言語対応、Whopリンク含む） | ✅ 正常 |
| `/api/x-quote-repost` | `0 * * * *` | 1時間ごと | 引用リポスト自動化（386人ローテーション、Whopリンク含む） | ✅ 正常 |

**合計**: 1日約500前後投稿（引用リポスト含む）

---

### 2. TG無料版（Minimal Version）へオプトインさせるX投稿
**目的**: X（Twitter）経由でTG無料版へのオプトインを促進

| CronJob | スケジュール | 実行頻度 | 機能概要 | 状態 |
|---------|------------|---------|---------|------|
| `/api/vsl1-post` | `0 1,13,21 * * *` | 1日3回 | VSL1自動投稿（X/Twitterのみ、TG無料版オプトイン誘導） | ✅ 正常 |
| `/api/x-post-minimal-version-cron` | `0 0,7,12,15,23 * * *` | 1日5回 | 無料版（Minimal Version）のX投稿（TG無料版オプトイン誘導） | ✅ 正常 |

**合計**: 1日8回のX投稿

---

### 3. TG無料版（Minimal Version）ユーザーへWhopへ誘導・プロモコード使用させるTG配信
**目的**: TG無料版ユーザーをWhop有料版へコンバート（プロモコード使用）

| CronJob | スケジュール | 実行頻度 | 機能概要 | 状態 |
|---------|------------|---------|---------|------|
| `/api/vsl2-free-users` | `0 * * * *` | 1時間ごと | VSL2自動配信（24時間後、Whopリンク+プロモコード含む） | ✅ 正常 |
| `/api/vsl1-reminder` | `0 */12 * * *` | 12時間ごと | VSL1リマインド（12時間後、TG無料版オプトイン再促進） | ✅ 正常 |
| `/api/vsl2-last-call` | `0 * * * *` | 1時間ごと | VSL2ラストコール（21時間後、Whopリンク+プロモコード含む） | ✅ 正常 |

**配信タイミング**:
- 12時間後: VSL1リマインド（TG無料版オプトイン再促進）
- 21時間後: VSL2ラストコール（Whopコンバート最終促進）
- 24時間後: VSL2配信（Whopコンバート）

---

## 🔍 現状の問題点

### 1. プロダクトとファネルの混在
- `/api/cron`がプロダクト（TG配信）とファネル（TG無料版配信）の両方を担当
- X投稿が複数のCronJobに分散（`vsl1-post`, `x-post-minimal-version-cron`, `x-post-free-report`, `x-quote-repost`）

### 2. 命名の不統一
- `vsl1-post`: VSL1はマーケティング用語だが、実際は「TG無料版オプトイン誘導X投稿」
- `x-post-minimal-version-cron`: 「Minimal Version」はプロダクト名だが、X投稿はファネル
- `x-post-free-report`: 「free-report」は内容だが、実際は「Whopトラフィック増加X投稿」

### 3. コードの重複
- 言語正規化ロジックが各ファイルに個別実装
- VSLリンク検証ロジックが重複
- Whop URL取得ロジックが重複

---

## 📋 整理方針

### Phase 1: 構造の明確化
1. **プロダクト（TG配信）**: `/api/cron`のみ
   - TG無料版（Minimal Version）
   - TG有料版（Regular Briefing）
   - TG緊急配信

2. **マーケティングファネル**: 3つのカテゴリに分類
   - **Whopトラフィック増加X投稿**: `x-post-free-report`, `x-quote-repost`
   - **TG無料版オプトインX投稿**: `vsl1-post`, `x-post-minimal-version-cron`
   - **TG無料版→WhopコンバートTG配信**: `vsl2-free-users`, `vsl1-reminder`, `vsl2-last-call`

### Phase 2: 命名の統一（オプション）
- 現状の命名を維持しつつ、コメントで明確化
- または、将来的にリネームを検討

### Phase 3: コードの共通化
- `utils/vsl-common.js`: VSL関連の共通ロジック
- `utils/x-posting-common.js`: X投稿関連の共通ロジック

---

## ✅ 確認事項

1. **プロダクト（TG配信）**: `/api/cron`で統合管理 ✅
2. **マーケティングファネル**: 3つのカテゴリに分類 ✅
3. **現状の問題点**: 混在、命名不統一、コード重複 ✅

---

## 🎯 次のステップ

1. ユーザーと構造の理解を確認
2. Phase 1から順次実装開始
3. 各Phase完了時に動作確認
