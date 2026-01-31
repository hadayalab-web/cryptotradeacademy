# インフルエンサー発見：2周目実行コマンド（言語別）

**実行日時**: 2026-01-30  
**目的**: grok-4-1-fast-reasoningに再度リストを探させて、リストを確定させる  
**スクリプト**: `scripts/discover-influencers-single-lang-robust.js`

---

## 📋 言語別目標数

| 言語 | 目標数 | 現状取得数 | 不足数 |
|------|--------|------------|--------|
| **EN** | 210 | 201 | 9 |
| **ES** | 168 | 160 | 8 |
| **PT-BR** | 168 | 131 | 37 |
| **AR** | 112 | 85 | 27 |
| **JA** | 98 | 68 | 30 |
| **KO** | 84 | 30 | 54 |

---

## 🚀 PowerShell実行コマンド（言語別）

### EN（英語）

```powershell
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"; node scripts/discover-influencers-single-lang-robust.js en 210
```

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

## 📝 実行順序の推奨

### 推奨順序1: 高達成率から（安定性重視）

1. **EN**（現状201/210、不足9人）
2. **ES**（現状160/168、不足8人）
3. **PT-BR**（現状131/168、不足37人）
4. **AR**（現状85/112、不足27人）
5. **JA**（現状68/98、不足30人）
6. **KO**（現状30/84、不足54人）

### 推奨順序2: 低達成率から（改善効果重視）

1. **KO**（現状30/84、不足54人）← 最優先
2. **JA**（現状68/98、不足30人）
3. **PT-BR**（現状131/168、不足37人）
4. **AR**（現状85/112、不足27人）
5. **ES**（現状160/168、不足8人）
6. **EN**（現状201/210、不足9人）

---

## ⚠️ 注意事項

1. **既存データの保持**: スクリプトは既存のJSONファイルを読み込み、重複を自動的に除外します
2. **バックアップ**: 各保存前にタイムスタンプ付きバックアップが自動的に作成されます
3. **実行間隔**: 言語間で5秒以上の間隔を空けることを推奨（レート制限回避）
4. **目標数の調整**: 不足数を考慮して、目標数を調整することも可能です

---

## 📊 実行後の確認

各言語の実行後、以下のファイルを確認してください：

- `data/influencers/influencers-{lang}.json`
- `data/influencers/backups/influencers-{lang}-{timestamp}.json`

最終的な取得数と達成率を記録し、必要に応じて追加の実行を行ってください。
