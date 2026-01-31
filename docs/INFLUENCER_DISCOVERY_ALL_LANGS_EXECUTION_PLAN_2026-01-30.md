# 全言語インフルエンサー発見実行計画
**作成日時**: 2026-01-30  
**目的**: 全言語を実行してパターンを把握し、知見を獲得してから最適化

---

## 🎯 実行計画

### 実行順序

1. **EN（英語）**: ✅ 完了（201人 / 210人、95.7%）
2. **ES（スペイン語）**: 目標168人
3. **PT-BR（ポルトガル語）**: 目標168人
4. **AR（アラビア語）**: 目標112人
5. **JA（日本語）**: 目標98人
6. **KO（韓国語）**: 目標84人

**合計目標**: 840人

---

## 🚀 実行方法

### 方法1: 全言語を自動実行（推奨）

```powershell
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-all-langs-stepwise.js
```

または、スクリプトファイルを実行：

```powershell
.\scripts\run-all-langs-oneliner.ps1
```

### 方法2: 一言語ずつ実行

```powershell
# ES（スペイン語）
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-single-lang-robust.js es 168

# PT-BR（ポルトガル語）
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-single-lang-robust.js pt-br 168

# AR（アラビア語）
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-single-lang-robust.js ar 112

# JA（日本語）
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-single-lang-robust.js ja 98

# KO（韓国語）
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-single-lang-robust.js ko 84
```

---

## 📊 観察ポイント

### 1. 言語別の成功率

- どの言語で成功率が高いか
- どの言語で空配列が返されることが多いか
- リトライロジックの効果は言語によって異なるか

### 2. データ品質の違い

- 言語別のデータ品質（tweetId、username、tweetTextの完全性）
- 言語別の無効データ率
- 言語別の重複率

### 3. 階層バランス

- 言語別の階層分布（トップ/ミッド/ボトム）
- SSOTの推奨配分との差異

### 4. Grok APIの挙動

- 言語別のレスポンスパターン
- 空配列が返される頻度
- リトライで成功する確率

---

## 📋 実行後の分析項目

### 1. 言語別統計

- 各言語の達成率
- 各言語の成功率
- 各言語のリトライ成功率
- 各言語の重複率

### 2. パターン分析

- 空配列が返されるパターン
- リトライで成功するパターン
- 重複が発生するパターン

### 3. 最適化案

- プロンプトの調整案
- バッチサイズの調整案
- リトライ間隔の調整案
- 階層バランスの調整案

---

## 🎯 期待される知見

### 1. 言語別の特性

- どの言語でGrokが高品質なデータを返すか
- どの言語で空配列が返されることが多いか
- 言語別の最適なバッチサイズ

### 2. Grok APIの挙動

- 連続リクエストでの挙動
- リトライの効果
- レート制限のパターン

### 3. データ品質

- 言語別のデータ品質
- 無効データのパターン
- 重複のパターン

---

## ✅ 実行後のアクション

1. **全言語の実行結果を分析**
2. **パターンを特定**
3. **最適化案を提示**
4. **プロンプト・バッチサイズ・リトライ間隔を調整**
5. **最適化後のスクリプトで再実行**

---

**準備完了！** 全言語を実行して、新たな知見を獲得しましょう。
