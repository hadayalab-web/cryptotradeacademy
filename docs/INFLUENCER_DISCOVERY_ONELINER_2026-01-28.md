# インフルエンサーリスト構築 - ワンショットコマンド
**作成日時**: 2026-01-28

---

## 🚀 PowerShellワンショットコマンド

### EN（英語）から開始

```powershell
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-single-lang-robust.js en 210
```

**コピー&ペーストして実行してください。**

---

## 📋 他の言語も同様に

### ES（スペイン語）
```powershell
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-single-lang-robust.js es 168
```

### PT-BR（ポルトガル語）
```powershell
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-single-lang-robust.js pt-br 168
```

### AR（アラビア語）
```powershell
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-single-lang-robust.js ar 112
```

### JA（日本語）
```powershell
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-single-lang-robust.js ja 98
```

### KO（韓国語）
```powershell
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-single-lang-robust.js ko 84
```

---

## ✅ 実行後の確認

実行が完了したら、以下で確認：

```powershell
Get-Content data\influencers\influencers-en.json | ConvertFrom-Json | Select-Object count, lang
```

---

**準備完了！** 上記のワンショットコマンドをコピー&ペーストして実行してください。
