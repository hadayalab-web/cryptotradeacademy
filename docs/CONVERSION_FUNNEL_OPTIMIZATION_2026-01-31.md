# コンバージョンファネル最適化プラン
## 作成日: 2026-01-31

## 📊 現状の3つのファネル構造

### ファネル1: X → VSL1 → Minimal Version（無料版）
```
X投稿（引用リポスト）
  ↓
https://youtu.be/OqvqngJOiXc (EN以外の字幕あり)
  ↓
Telegram Bot（Deep Link: ?start=minimal_{lang}）
  ↓
Whop無料版（Minimal Version）コンバージョン
```

**実装ファイル**: 
- `api/vsl1-post.js` - VSL1投稿（X/Twitter専用、12時間ごと）
- `api/x-quote-repost-{lang}.js` - 引用リポスト（6言語、頻繁）
- `api/x-post-minimal-version-cron.js` - Minimal Version直接投稿

**YouTube動画**: https://youtu.be/OqvqngJOiXc
**Whopチェックアウト**: 
- EN: https://whop.com/checkout/plan_9zf3nrYeweovV
- ES: https://whop.com/checkout/plan_pukjeWHXVbEBK
- PT-BR: https://whop.com/checkout/plan_wyK2xZcXtsMAV
- AR: https://whop.com/checkout/plan_wREBLF9wriihy
- KO: https://whop.com/checkout/plan_BYB0OUOWBrLem
- JA: https://whop.com/checkout/plan_3hbsrgte6pCma

**現状の問題点**:
- ✅ VSL1が無料版チャンネル（MINIMAL）にも配信される設定があり、既存ユーザーに不要なメッセージが届く可能性
  - 現在は`VSL1_TELEGRAM_MINIMAL_ENABLED=false`でデフォルト無効化されている
- ✅ VSL1はX/Twitter専用として正しく動作中

---

### ファネル2: Minimal Version → VSL2 → Regular Briefing（有料版）
```
無料版ユーザー（Telegram登録24時間後）
  ↓
https://youtu.be/fXgVsKhqDjI (EN以外の字幕あり)
  ↓
Whop有料版（Regular Briefing）コンバージョン
  + プロモコード: defend50
```

**実装ファイル**:
- `api/vsl2-free-users.js` - 24時間後に自動送信（1時間ごとチェック）
- `api/vsl2-last-call.js` - ラストコール送信（1時間ごとチェック）
- `api/vsl1-reminder.js` - VSL1リマインダー（12時間ごと）

**YouTube動画**: https://youtu.be/fXgVsKhqDjI
**Whop商品URL**:
- EN: https://whop.com/trapdefence/btc-regular-en/
- ES: https://whop.com/trapdefence/btc-regular-es/
- PT-BR: https://whop.com/trapdefence/btc-regular-pt/
- AR: https://whop.com/trapdefence/btc-regular-ar/
- KO: https://whop.com/trapdefence/btc-regular-ko/
- JA: https://whop.com/trapdefence/btc-regular-ja/

**プロモコード**: `defend50` (50%割引)

**現状の問題点**:
- ✅ 正常に動作中
- ✅ 中央集約された`services/telegram/whop-links.js`を使用

---

### ファネル3: X → Regular Briefing（直接）→ VSL3 → コンバージョン
```
X投稿（有料版直接誘導）
  ↓
Whop有料版（Regular Briefing）ページアクセス
  ↓
VSL3自動再生（https://youtu.be/rdMvxGs0ZaI）
  ↓
コンバージョン（50%OFF特典付き）
```

**YouTube動画**: https://youtu.be/rdMvxGs0ZaI (WhopページにVSL3埋め込み、6言語完全対応)
**Whop商品URL**: ファネル2と同じ（trapdefence/btc-regular-{lang}）
**プロモコード**: `defend50` (50%割引)

**重要**: WhopページにVSL3が埋め込まれており、ページアクセス時に自動再生される仕組み。
したがって、X投稿からWhop有料版ページへの直接導線を最大限強化することが最優先。

**実装状況**:
- ✅ **NEW**: `api/x-post-regular-direct.js` を新規作成（有料版直接誘導専用）
- ✅ **スケジュール**: `0 2,8,14,20 * * *` (1日4回、無料版投稿と干渉しない時間帯)
- ✅ 6言語対応、プロモコード付き
- ✅ 「今すぐ見る」を強調したメッセージ設計

---

## 🎯 最適化提案

### 1. VSL1投稿の最適化（ファネル1）
**現状**: VSL1が無料版チャンネル（MINIMAL）にも配信される可能性
**最適化案**: 
- ✅ すでに`VSL1_TELEGRAM_MINIMAL_ENABLED=false`でデフォルト無効化されている
- ✅ X/Twitter専用として正常動作中
- **推奨**: この設定を維持（変更不要）

### 2. VSL3実装（ファネル3）の追加
**目的**: X投稿からRegular Briefing（有料版）への直接コンバージョンを実現

**実装すべきファイル**:
```
api/x-post-regular-direct.js
```

**実装内容**:
- X投稿で有料版（Regular Briefing）を直接訴求
- VSL3動画リンク（https://youtu.be/rdMvxGs0ZaI）を添付
- プロモコード`defend50`を強調
- 特典を追加（例: 初月50%OFF + 限定レポート）

**スケジュール案**:
```json
{ "path": "/api/x-post-regular-direct", "schedule": "0 2,8,14,20 * * *" }
```
（6時間ごと、無料版投稿と干渉しない時間帯）

### 3. 特典戦略の設計
**課題**: 「何か特典を考えなければならないかも」

**提案される特典**:
1. **初月50%OFF** - 既存のプロモコード`defend50`
2. **限定レポート** - 「Trap Defense Pro Report」（週1回配信）
3. **優先サポート** - Telegram DM優先対応
4. **過去データアクセス** - 過去30日分のRegular Briefing閲覧権限
5. **VIP分析セッション** - 月1回のライブ分析セッション（Telegram音声通話）

**実装方法**:
- Whopの「Product Benefits」セクションに特典を明記
- X投稿メッセージに特典を強調
- VSL3動画の説明欄に特典リストを記載

### 4. ファネル統合の最適化
**現状**: 3つのファネルが独立して動作
**最適化案**: 
- ファネル1とファネル3の投稿時間を調整し、干渉を防ぐ
- ファネル2の24時間後送信タイミングを最適化（エンゲージメントが高い時間帯）

**推奨スケジュール**:
```
ファネル1（無料版）:
- VSL1投稿: 1時、13時、21時（3回/日）
- 引用リポスト: 6分ごと（高頻度、6言語）
- Minimal直接投稿: 0時、7時、12時、15時、23時（5回/日）

ファネル2（無料→有料）:
- VSL2送信: 24時間後（1時間ごとチェック）
- ラストコール: 48時間後（1時間ごとチェック）
- リマインダー: 12時間ごと

ファネル3（有料版直接）:【NEW】
- Regular直接投稿: 2時、8時、14時、20時（4回/日）
- VSL3リンク付き
```

---

## 🚀 実装ステップ

### ステップ1: VSL3投稿APIの作成 ✅ 完了
1. ✅ `api/x-post-regular-direct.js`を作成
2. ✅ Whop有料版ページURL（VSL3が埋め込まれている）を統合
3. ✅ プロモコード（50% OFF）を強調したメッセージを実装
4. ✅ 6言語対応完了

### ステップ2: Cronスケジュールの追加 ✅ 完了
1. ✅ `vercel.json`に新しいcronエントリを追加
   - スケジュール: `0 2,8,14,20 * * *` (1日4回: 2時、8時、14時、20時 UTC)
   - 無料版投稿（4時、10時、17時、19時）と干渉しない時間帯に設定
2. ✅ `maxDuration: 60`秒を設定

### ステップ3: 既存のX投稿を強化（推奨）
現在の`x-post-free-report.js`と`x-quote-repost.js`に、以下の強化を追加することを推奨:

1. **Whop有料版ページへのCTAを強化**
   - 「Watch 2-Min Video on Whop」など、VSL3が見られることを明示
   - 既存の「Unlock Full Access」に加えて「Watch How Pros Win」など、動画視聴を促進

2. **プロモコードの訴求強化**
   - 「50% OFF (DEFEND50) – Limited Time」を全投稿に統一
   - 期限を明示して緊急性を演出

---

## 📈 期待される効果

### ファネル1（無料版）
- **現状**: 既存ユーザーへの不要配信リスク → **最適化後**: X専用として正常動作

### ファネル2（無料→有料）
- **現状**: 正常動作 → **最適化後**: 変更なし（維持）

### ファネル3（有料版直接）
- **現状**: 未実装 → **最適化後**: 新規実装で直接コンバージョン経路を追加
- **期待CVR**: 0.5%〜1.5%（X → Regular Briefing直接）
- **特典効果**: +30%〜50% CVR向上

---

## 🎯 優先度

1. **P0（最優先）✅ 完了**: VSL3投稿API（`api/x-post-regular-direct.js`）の作成
   - ✅ 有料版直接誘導専用のX投稿を実装
   - ✅ Whop有料版ページURL（VSL3埋め込み）への直接導線を強化
   - ✅ 6言語対応、プロモコード統合完了
   - ✅ Cronスケジュール設定完了（1日4回、干渉なし）

2. **P1（高）**: 既存X投稿の強化
   - `x-post-free-report.js`のCTA強化（「Watch Video on Whop」を追加）
   - `x-quote-repost.js`の有料版誘導強化

3. **P2（中）**: Whop Product Benefitsセクションの最適化
   - VSL3動画の説明文を最適化（6言語）
   - 特典リストの明示（初月50%OFF + 追加特典）

4. **P3（低）**: ファネル統合の最適化
   - 投稿時間帯の微調整
   - A/Bテストによるメッセージ最適化

---

## 📝 メモ

- VSL1/VSL2/VSL3の3つのYouTube動画は全て完成済み
- Whop商品URLは中央集約済み（`services/telegram/whop-links.js`）
- プロモコード`defend50`は全ファネルで統一
- 6言語対応が完了済み（EN, ES, PT-BR, AR, KO, JA）

---

## ✅ 完了したアクション（2026-01-31）

### 1. VSL3投稿API（ファネル3）の実装 ✅
- **新規ファイル**: `api/x-post-regular-direct.js`
  - 有料版（Regular Briefing）直接誘導専用のX投稿
  - Whop有料版ページURL（VSL3が埋め込まれている）への直接導線
  - 「Watch 2-Min Video」を強調したメッセージ設計
  - 6言語対応（EN, JA, ES, PT-BR, AR, KO）
  - プロモコード`defend50`を全投稿に統合
  - 二重実行防止（KVストレージ）
  - X APIコスト追跡機能

### 2. Cronスケジュールの追加 ✅
- **`vercel.json`更新**:
  - 新規cronエントリ: `{ "path": "/api/x-post-regular-direct", "schedule": "0 2,8,14,20 * * *" }`
  - スケジュール: 1日4回（2時、8時、14時、20時 UTC）
  - 無料版投稿（4時、10時、17時、19時）と干渉しない時間帯
  - `maxDuration: 60`秒を設定

### 3. ドキュメント更新 ✅
- **`docs/CONVERSION_FUNNEL_OPTIMIZATION_2026-01-31.md`**:
  - ファネル3の実装状況を更新（❌ 未実装 → ✅ 実装完了）
  - VSL3がWhopページに埋め込まれている仕組みを明記
  - 実装ステップと優先度を更新

## ✅ 次のアクション（推奨）

1. **デプロイとテスト**:
   ```bash
   git add .
   git commit -m "Implement Funnel 3: X → Regular Briefing direct conversion with VSL3"
   git push origin main
   ```
   - Vercelに自動デプロイ
   - Cron jobの動作確認（2時、8時、14時、20時 UTC）

2. **既存X投稿の強化（P1）**:
   - `x-post-free-report.js`のCTA強化
   - `x-quote-repost.js`の有料版誘導強化

3. **Whop Product Benefitsの最適化（P2）**:
   - VSL3動画の説明文を6言語で最適化
   - 特典リストの明示
