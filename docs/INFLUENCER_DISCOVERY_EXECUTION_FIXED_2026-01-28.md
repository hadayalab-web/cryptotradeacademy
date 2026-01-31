# インフルエンサーリスト構築 - 実行方法（修正版）
**作成日時**: 2026-01-28  
**問題**: バッチファイルの文字エンコーディングエラー  
**解決策**: PowerShellスクリプト（.ps1）を作成

---

## 🚀 実行方法（PowerShell推奨）

### EN（英語）から開始

**PowerShellで実行**:
```powershell
.\scripts\run-discover-influencers-en-with-env.ps1
```

または、PowerShellで直接：
```powershell
$env:XAI_API_KEY = "xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"
node scripts/discover-influencers-single-lang-robust.js en 210
```

---

## 📋 実行内容

### EN（英語）
- **目標数**: 210人
- **バッチサイズ**: 25人/バッチ
- **実行時間**: 約10-15分（Grok APIの応答時間に依存）

---

## 🔧 トラブルシューティング

### 問題: バッチファイルで文字化けエラー

**原因**: PowerShellからバッチファイルを実行する際の文字エンコーディングの問題

**解決策**: PowerShellスクリプト（.ps1）を使用

```powershell
.\scripts\run-discover-influencers-en-with-env.ps1
```

---

## ✅ 実行後の確認

### 1. ファイルの確認

```powershell
Get-Content data\influencers\influencers-en.json | ConvertFrom-Json | Select-Object count
```

### 2. データ数の確認

ファイルを開いて、`count`フィールドが210に近いか確認してください。

### 3. データの完全性確認

各インフルエンサーに以下のフィールドが存在するか確認：
- `username`: @なしのユーザー名
- `tweetId`: 18-19桁の数値
- `tweetText`: 1-280文字のツイートテキスト
- `followerCount`: > 0
- `engagementRate`: 0-1の範囲

---

## 🔄 他の言語も実行

ENが完了したら、他の言語も同様に実行できます：

```powershell
# ES（スペイン語）
$env:XAI_API_KEY = "xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"
node scripts/discover-influencers-single-lang-robust.js es 168

# PT-BR（ポルトガル語）
node scripts/discover-influencers-single-lang-robust.js pt-br 168

# AR（アラビア語）
node scripts/discover-influencers-single-lang-robust.js ar 112

# JA（日本語）
node scripts/discover-influencers-single-lang-robust.js ja 98

# KO（韓国語）
node scripts/discover-influencers-single-lang-robust.js ko 84
```

または、全言語を自動実行：

```powershell
.\scripts\run-discover-influencers-all-langs-with-env.ps1
```

---

## 🛡️ 安全機能

### バックアップ

各保存前に自動的にバックアップが作成されます：
- `data/influencers/backups/influencers-en-{timestamp}.json`

### 段階的保存

各バッチ（25人）ごとに保存されるため、途中でエラーが発生しても既存データは保持されます。

### 重複チェック

既存データとの重複を自動的にチェックし、重複を除外します。

---

**準備完了！** PowerShellで `.\scripts\run-discover-influencers-en-with-env.ps1` を実行してください。
