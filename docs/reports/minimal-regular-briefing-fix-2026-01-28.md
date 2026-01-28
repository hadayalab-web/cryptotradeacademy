# 無料版・有料版配信メッセージ修正レポート（2026-01-28）

## 🎯 問題の概要

### 深刻な不具合

1. **有料版（Regular Briefing）がJST3時に配信されていない**
   - **原因**: 4時間スケジュール（`REGULAR_SCHEDULE=4h`）の場合、`REGULAR_HOURS_4H`にUTC 18時（JST 3時）が含まれていない
   - **影響**: 有料版ユーザーがJST3時にレポートを受け取れない

2. **無料版（Minimal Version）メッセージフォーマットの確認**
   - ユーザーが提供したフォーマットと実装の整合性を確認

3. **有料版（Regular Briefing）メッセージフォーマットの確認**
   - ユーザーが提供したフォーマットと実装の整合性を確認

## 🔧 修正内容

### 1. JST3時（UTC 18時）の配信問題を修正

**修正ファイル**: `api/cron.js`

**変更内容**:
```javascript
// 修正前
const REGULAR_HOURS_4H = [0, 4, 8, 12, 16, 20];

// 修正後
const REGULAR_HOURS_4H = [0, 4, 8, 12, 16, 18, 20]; // 18時を追加（JST3時対応）
```

**効果**:
- 4時間スケジュールでもJST3時（UTC 18時）に有料版が配信される
- 6時間スケジュールでも引き続きJST3時に配信される（既存の動作を維持）

### 2. 無料版（Minimal Version）メッセージフォーマット

**実装ファイル**: `services/telegram/messages/user/en/minimal-high-quality.en.js`

**現在のフォーマット**:
- `[1/4] 🚨 Hook`: Fear vs Trap Score contradiction + immediate action
- `[2/4] 📊 Quick Reads (No Fluff)`: Exchange netflow, MPI
- `[3/4] 🧠 Psych Coaching`: Latency anxiety, complacency warning
- `[4/4] 🗳️ Poll + Question + CTA`: Poll + TRAP reply CTA

**ユーザー提供フォーマットとの比較**:
- ✅ 一致: 4つのセクション構造は一致
- ✅ 一致: Hook, Quick Reads, Psych Coaching, Poll + CTAの構造は一致
- ⚠️ 要確認: 実際の配信メッセージが正しく生成されているか

### 3. 有料版（Regular Briefing）メッセージフォーマット

**実装ファイル**: `services/telegram/messages/user/en/regular.en.js`

**現在のフォーマット**:
- `🌤️ Trap Defence BTC - Paid Report`
- `🚨 CRITICAL ALERT: Trap Defence Crisis Briefing`
- `🎯 Trade Verdict`: Signal, Entry, Mode, Take Profit, Stop Loss, Risk/Reward
- `🤔 CONTRADICTION ALERT`: Market Score vs Exchange Netflow vs Sentiment
- `✨ Today's Highlights (3 Core Features)`: Trap Defense, Deep Intelligence, Psychological Support
- `💊 Dr. Grok's Quick Insight`: Psychological State, Mental Note
- `💎 THIS IS WHY YOU PAID FOR THIS REPORT`: Real-Time Action Signals, Deep Intelligence Analysis, Full Psychological Support

**ユーザー提供フォーマットとの比較**:
- ✅ 一致: 基本的な構造は一致
- ⚠️ 要確認: 実際の配信メッセージが正しく生成されているか
- ⚠️ 要確認: 日本語のメッセージが混在していないか（`💡 ✅ 中立状態 - メンタルブロック未検出`など）

## 🐛 発見された不具合

### 1. 有料版メッセージに日本語が混在

**問題**: ユーザー提供の有料版メッセージに日本語が含まれている
```
💡 ✅ 中立状態 - メンタルブロック未検出: 市場センチメントはバランスが取れています。極端な感情は検知されていません。条件は安定しています。

メンタルコーチの洞察: これは理想的な状態です。メンタルブロックが判断を曇らせていません。監視を継続してください。規律を維持し、高確率のセットアップを待ってください。トレーダーとしてのあなたの潜在能力は、この冷静な状態を維持できるときに輝きます。資金の保護を続けてください。素晴らしいです。
```

**原因**: `regular.en.js`の`getEnglishPsychologicalAdvice`関数が正しく動作していない可能性、または`psychologicalSupport`の言語設定が正しくない

**修正が必要**: `regular.en.js`の心理的アドバイス生成ロジックを確認・修正

### 2. JST3時の配信タイミング

**問題**: 4時間スケジュールの場合、UTC 18時が配信スロットに含まれていない

**修正**: ✅ 完了（`REGULAR_HOURS_4H`に18時を追加）

## 📋 修正チェックリスト

### ✅ 完了

- [x] JST3時（UTC 18時）の配信スロットを追加
- [x] 無料版メッセージフォーマットの確認
- [x] 有料版メッセージフォーマットの確認

### ⚠️ 要修正

- [ ] 有料版メッセージの日本語混在問題を修正
- [ ] 無料版メッセージの実際の配信を確認
- [ ] 有料版メッセージの実際の配信を確認

## 🔍 次のステップ

1. **有料版メッセージの日本語混在問題を修正**
   - `regular.en.js`の`getEnglishPsychologicalAdvice`関数を確認
   - `psychologicalSupport`の言語設定を確認
   - EN版では必ず英語で出力されるように修正

2. **実際の配信をテスト**
   - JST3時（UTC 18時）に実際に配信されるか確認
   - 無料版・有料版のメッセージが正しく生成されるか確認

3. **メッセージフォーマットの最終確認**
   - ユーザーが提供したフォーマットと完全に一致するか確認
   - 必要に応じて微調整

## ✅ 結論

**JST3時（UTC 18時）の配信問題**: ✅ 修正完了  
**無料版メッセージフォーマット**: ✅ 確認完了（実装は正しい）  
**有料版メッセージフォーマット**: ⚠️ 日本語混在問題を修正が必要
