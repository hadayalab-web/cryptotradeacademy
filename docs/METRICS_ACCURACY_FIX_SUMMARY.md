# メトリクス取得精度修正サマリー

**作成日**: 2026-01-26  
**目的**: エンゲージメント率0.003%という低い数値の原因（データ取得の不正確さ）を修正した内容の記録

---

## 🔍 問題の原因

**エンゲージメント率0.003%という低い数値は、データ取得が正確でなかったことが原因**

- X APIから正確なインプレッション数を取得できていなかった
- `non_public_metrics`と`organic_metrics`の優先順位が不明確だった
- エラーハンドリングとリトライ機能が不十分だった

---

## ✅ 実装された修正内容

### 1. メトリクス取得の優先順位を明確化

**ファイル**: `services/x/metrics.js`, `api/x-engagement-metrics.js`

**修正内容**:
```javascript
// 優先順位: 1. non_public_metrics (最も正確) → 2. organic_metrics (過去30日以内のツイートのみ) → 3. 0 (フォールバック)
const impressions = metrics.nonPublicMetrics?.impression_count ?? 
                    metrics.organicMetrics?.impression_count ?? 
                    0;
```

**効果**:
- 自分のツイートの場合、`non_public_metrics`から正確なインプレッション数を取得
- 過去30日以内のツイートの場合、`organic_metrics`から取得
- データソースを明確にログ出力

### 2. リトライ機能の強化

**ファイル**: `services/x/metrics.js`

**修正内容**:
- `maxRetries`オプションを追加（デフォルト: 3回）
- レート制限エラーの場合は指数バックオフ
- エラーメッセージの詳細化

**効果**:
- 一時的なエラーでも再試行により正確なデータを取得
- レート制限に引っかかった場合も適切に待機

### 3. データソースの明確な区別

**ファイル**: `api/x-engagement-metrics.js`

**修正内容**:
```javascript
dataSource: {
  impressions: 'x_api_actual', // X APIから取得した実測値
  engagements: 'x_api_actual', // X APIから取得した実測値
  estimatedImpressions: post.metadata?.estimatedImpressions || null,
  estimatedSource: post.metadata?.estimatedSource || null,
}
```

**効果**:
- 実測値と推定値を明確に区別
- データの信頼性を追跡可能

### 4. インプレッション数が0の場合の警告と再試行

**ファイル**: `api/x-engagement-metrics.js`

**修正内容**:
- 投稿から10分以内の場合は正常（データがまだ反映されていない）
- 10分以上経過しても0の場合は警告を出力
- Cron Jobで定期的に再取得

**効果**:
- 投稿直後の0インプレッションを正常として扱う
- 実際に問題がある場合のみ警告

### 5. 重複チェックと更新機能

**ファイル**: `api/x-engagement-metrics.js`

**修正内容**:
- 同じtweetIdが既に存在する場合は更新（重複を防止）
- 合計値から古い値を減算してから新しい値を加算

**効果**:
- メトリクスの重複を防止
- 正確な合計値を維持

---

## 📊 期待される改善効果

### 修正前
- **エンゲージメント率**: 0.003%（不正確なデータ）
- **インプレッション数**: 取得できていない、または不正確

### 修正後（期待値）
- **エンゲージメント率**: 正確な実測値（X APIから取得）
- **インプレッション数**: `non_public_metrics`または`organic_metrics`から正確に取得
- **データの信頼性**: 実測値と推定値を明確に区別

---

## 🔄 現在の実行状況

**ステータス**: 修正を実装し、実行中

**確認方法**:
1. **Cron Jobのログ確認**: `api/x-engagement-metrics.js`の実行ログを確認
2. **KVストレージの確認**: `x:metrics:YYYY-MM-DD`キーからメトリクスを取得
3. **ダッシュボード確認**: `x:dashboard:YYYY-MM-DD`キーからダッシュボードを取得

**確認すべきポイント**:
- `non_public_metrics`からインプレッション数を取得できているか
- エンゲージメント率が正確に計算されているか
- データソースが`x_api_actual`として記録されているか

---

## 📋 次のステップ

1. **データ収集期間**: 修正後、最低24時間のデータ収集を待つ
2. **正確なエンゲージメント率の確認**: 修正後のデータでエンゲージメント率を再計算
3. **GPTレビュー結果の更新**: 正確なデータに基づいて、GPTレビュー結果を再評価
4. **改善策の優先順位の見直し**: 正確なデータに基づいて、改善策の優先順位を調整

---

## 🔗 関連ファイル

- `api/x-engagement-metrics.js`: メトリクス追跡とダッシュボード生成
- `services/x/metrics.js`: X APIからのメトリクス取得
- `api/x-quote-repost.js`: 引用リポスト投稿時の初期メトリクス記録
- `api/x-quote-repost-metrics.js`: 引用リポストの定期メトリクス追跡

---

**最終更新**: 2026-01-26  
**バージョン**: 1.0  
**作成者**: Assistant (Composer)
