# 再利用可能なサービスアーキテクチャ

**作成日**: 2026-01-25  
**目的**: Cursor/Composer 1病を治療 - スクリプト量産を防ぎ、再利用可能なサービス層を確立

---

## 🎯 問題点

### Cursor/Composer 1病の症状

1. **スクリプトの量産**: 毎回同じような分析スクリプトを作成
2. **再利用不可**: チャットが変わると再利用できない
3. **重複コード**: 同じロジックが複数のスクリプトに散在
4. **保守性の低下**: 修正時に複数ファイルを更新する必要がある

---

## ✅ 解決策: サービス層アーキテクチャ

### アーキテクチャの原則

1. **サービス層**: ビジネスロジックを`services/`に集約
2. **APIエンドポイント**: 再利用可能な機能は`api/`に実装
3. **スクリプトは薄いラッパー**: スクリプトはサービス層を呼び出すだけ
4. **Cron Job化**: 定期的な分析は自動実行されるように設定

---

## 📁 サービス層の構成

### `services/x/postPerformanceAnalyzer.js`

**目的**: 投稿パフォーマンス分析のビジネスロジックを集約

**提供機能**:
- `analyzePostPerformance(dateString)`: 指定日の投稿パフォーマンスを分析
- `calculateExpectedPerformance(impressions, engagementRate, hasTelegramLink, hasWhopLink)`: 期待パフォーマンスを計算
- `calculateDailyExpectations()`: 1日の期待値を計算（投稿パターンに基づく）
- `parseImpressions(impressions)`: インプレッション数を数値に変換

**使用例**:
```javascript
const { analyzePostPerformance } = require('../services/x/postPerformanceAnalyzer');
const result = await analyzePostPerformance('2026-01-25');
```

---

## 🔌 APIエンドポイント

### `/api/x-post-performance-analysis`

**目的**: 投稿パフォーマンス分析をAPIとして提供

**使用方法**:
```bash
# GETリクエスト
curl "https://your-domain.vercel.app/api/x-post-performance-analysis?date=2026-01-25"

# POSTリクエスト
curl -X POST "https://your-domain.vercel.app/api/x-post-performance-analysis" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-25"}'
```

**レスポンス**:
```json
{
  "cached": false,
  "dateString": "2026-01-25",
  "posts": [...],
  "summary": {
    "totalPosts": 16,
    "postsByType": {...},
    "totalExpectedImpressions": 3122000,
    "totalExpectedEngagements": 330000,
    "totalTelegramOptIns": {...},
    "totalWhopConversions": {...}
  }
}
```

**特徴**:
- **キャッシュ機能**: KVに保存され、90日間保持
- **自動実行**: Cron Jobで日次自動実行（UTC 1:00）
- **再利用可能**: いつでもAPI経由で呼び出し可能

---

### `/api/x-conversion-expectations`

**目的**: 期待値計算をAPIとして提供

**使用方法**:
```bash
curl "https://your-domain.vercel.app/api/x-conversion-expectations"
```

**レスポンス**:
```json
{
  "success": true,
  "dailyImpressions": {...},
  "telegramOptIns": {
    "daily": {...},
    "monthly": {...}
  },
  "whopClicks": {...},
  "whopConversions": {...}
}
```

---

## 📝 スクリプトの役割

### `scripts/analyze-post-performance.js`

**役割**: サービス層を呼び出し、マークダウンレポートを生成

**特徴**:
- ビジネスロジックはサービス層に委譲
- レポート生成のみを担当
- 薄いラッパーとして実装

---

## 🔄 Cron Job設定

### `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/x-post-performance-analysis",
      "schedule": "0 1 * * *"
    }
  ]
}
```

**実行タイミング**: 毎日UTC 1:00（前日の投稿を分析）

---

## 📊 データフロー

```
投稿実行
  ↓
postTracker.js で投稿履歴を保存
  ↓
Cron Job で自動分析（UTC 1:00）
  ↓
postPerformanceAnalyzer.js で分析
  ↓
KVに保存（90日間保持）
  ↓
API経由でいつでも取得可能
```

---

## 🎯 メリット

### 1. 再利用性

- **サービス層**: どこからでも呼び出し可能
- **APIエンドポイント**: HTTP経由でアクセス可能
- **スクリプト**: ローカル実行も可能

### 2. 保守性

- **単一責任**: 各サービスは明確な責任を持つ
- **DRY原則**: 重複コードを排除
- **テスト容易性**: サービス層を個別にテスト可能

### 3. 自動化

- **Cron Job**: 定期的な分析を自動実行
- **キャッシュ**: 同じ日の分析は再計算不要
- **永続化**: KVに保存され、いつでも取得可能

---

## 📋 移行ガイド

### 既存スクリプトの移行

1. **ビジネスロジックをサービス層に移動**
2. **スクリプトはサービス層を呼び出すだけに変更**
3. **必要に応じてAPIエンドポイントを作成**
4. **Cron Jobを設定して自動実行**

### 新しい機能の追加

1. **サービス層に機能を追加**（`services/x/`）
2. **APIエンドポイントを作成**（`api/x-*.js`）
3. **必要に応じてCron Jobを設定**（`vercel.json`）
4. **スクリプトは最後の手段**（レポート生成など）

---

## 🚫 禁止事項

### ❌ やってはいけないこと

1. **スクリプトにビジネスロジックを書く**: サービス層に書く
2. **同じロジックを複数のスクリプトに書く**: サービス層に集約
3. **一時的なスクリプトを作る**: APIエンドポイントとして実装
4. **手動実行を前提にする**: Cron Jobで自動化

---

## ✅ 推奨事項

### ✅ やるべきこと

1. **サービス層を優先**: ビジネスロジックは`services/`に
2. **APIエンドポイント化**: 再利用可能な機能は`api/`に
3. **自動化**: 定期的な処理はCron Jobで
4. **ドキュメント化**: サービス層の使い方を明確に

---

## 📋 参照

- `services/x/postPerformanceAnalyzer.js` - 投稿パフォーマンス分析サービス
- `api/x-post-performance-analysis.js` - 投稿パフォーマンス分析API
- `api/x-conversion-expectations.js` - 期待値計算API
- `scripts/analyze-post-performance.js` - 分析スクリプト（サービス層を使用）

---

**最終更新**: 2026-01-25  
**作成者**: COO（Cursor/Composer 1）  
**評価**: ✅ **Cursor/Composer 1病を治療 - 再利用可能なサービス層アーキテクチャを確立**
