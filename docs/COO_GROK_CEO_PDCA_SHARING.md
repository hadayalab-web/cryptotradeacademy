# COO・Grok・CEO 3者PDCA情報共有システム

## 概要

COO（Cursor/Composer 1）、Grok、CEO（人間）の3者でPDCAサイクルを効率的に回すための情報共有システムです。

## アーキテクチャ

```
レポート生成 → Vercel KV保存 → API公開 → Grok分析 → 改善提案
     ↓              ↓              ↓          ↓          ↓
  CEOメール     COO閲覧      Grok取得    PDCA提案   実装
```

## 機能

### 1. レポート自動保存

レポート生成時に自動的にVercel KVに保存されます：

- **実行レポート** (`execution`): 各Cron Job実行時に生成
- **日次レポート** (`daily`): 毎日生成
- **週次レポート** (`weekly`): 毎週生成

保存先: `lead_discovery_report:{reportId}`

### 2. APIエンドポイント

GrokがレポートにアクセスするためのAPI:

```
GET /api/lead-discovery-report?type=execution&format=json
GET /api/lead-discovery-report?type=daily&format=grok
GET /api/lead-discovery-report?type=weekly&format=history&limit=10
GET /api/lead-discovery-report?reportId={reportId}
```

**パラメータ:**
- `type`: `execution` | `daily` | `weekly` (デフォルト: `execution`)
- `format`: `json` | `grok` | `text` | `history` (デフォルト: `json`)
- `limit`: 履歴取得件数（デフォルト: 10）
- `reportId`: 特定のレポートIDで取得

### 3. Grok分析機能

Grokがレポートを分析し、PDCAサイクルに基づいた改善提案を行います。

#### 使用方法

```bash
# 簡易分析（読みやすい形式）
node scripts/analyze-report-with-grok.js execution

# 詳細分析（履歴を含む、JSON形式）
node scripts/analyze-report-with-grok.js execution --history
```

#### プログラムから使用

```javascript
const { analyzeReportWithGrok, getReportAnalysis } = require('./services/grok/reportAnalyzer');

// 簡易分析
const analysis = await getReportAnalysis('execution');
console.log(analysis);

// 詳細分析
const result = await analyzeReportWithGrok('execution', {
  includeHistory: true,
  historyLimit: 5,
});
console.log(result.analysis);
```

## レポートデータ構造

### システム稼働状況（COO向け）

```json
{
  "systemMetrics": {
    "cronJobs": {
      "leadDiscovery": {
        "executions": 29,
        "successes": 29,
        "errors": 0,
        "errorRate": "0.00%"
      },
      "xPostFreeReport": { ... },
      "xQuoteRepost": { ... }
    },
    "leadProcessing": {
      "discovered": 29,
      "repliesSent": 25,
      "replySuccessRate": "86.21%",
      "errors": 0,
      "queueTotal": 5,
      "perfectMatchInQueue": 2
    },
    "apiErrors": {
      "skipped403": 3,
      "rateLimitErrors": 0,
      "authErrors": 0,
      "otherErrors": 0
    }
  }
}
```

### CVR統計（CEO向け、Grok分析用）

```json
{
  "cvrStats": {
    "totalLeads": 348,
    "repliesSent": 300,
    "conversions": 104,
    "cvr": "34.67%",
    "revenue": 15600,
    "perfectMatchLeads": 120,
    "perfectMatchCVR": "50.00%",
    "bySource": {
      "x_direct": { ... },
      "x_quote": { ... },
      "telegram": { ... }
    }
  }
}
```

## Grok分析結果の形式

Grokは以下のJSON形式で分析結果を返します：

```json
{
  "summary": "レポートの要約",
  "keyMetrics": {
    "errorRate": "エラー率と評価",
    "replySuccessRate": "リプライ送信成功率と評価",
    "cvr": "CVRと評価",
    "queueStatus": "キュー状況と評価"
  },
  "issues": [
    {
      "priority": "high|medium|low",
      "category": "system|performance|conversion",
      "description": "問題の説明",
      "impact": "影響度の説明"
    }
  ],
  "improvements": [
    {
      "priority": "high|medium|low",
      "category": "system|performance|conversion",
      "action": "具体的な改善アクション",
      "expectedImpact": "期待される効果",
      "implementation": "実装方法の説明"
    }
  ],
  "pdcCycle": {
    "plan": "次回実行時の計画",
    "do": "実行すべき具体的なアクション",
    "check": "確認すべき指標",
    "act": "改善アクション"
  },
  "recommendations": [
    "COO向けの推奨事項"
  ]
}
```

## PDCAサイクルの流れ

### Plan (計画)
1. Grokが最新レポートを分析
2. 問題点と改善点を特定
3. 次回実行時の計画を策定

### Do (実行)
1. COOがGrokの提案を実装
2. システムを実行
3. レポートが自動生成・保存

### Check (評価)
1. Grokが最新レポートを分析
2. 前回の改善が効果的だったか評価
3. 指標の変化を確認

### Act (改善)
1. 効果的だった改善を継続
2. 効果がなかった改善を修正
3. 新しい改善を計画

## 使用例

### 1. 最新レポートを取得（Grok用）

```bash
curl "https://your-domain.vercel.app/api/lead-discovery-report?type=execution&format=grok"
```

### 2. Grokに分析させる

```bash
node scripts/analyze-report-with-grok.js execution
```

### 3. レポート履歴を確認

```bash
curl "https://your-domain.vercel.app/api/lead-discovery-report?type=daily&format=history&limit=5"
```

## ファイル構成

```
services/lead-discovery/
  ├── reportStorage.js          # レポート保存・取得機能
  ├── leadDiscoveryReport.js    # レポート生成（自動保存機能追加）
  └── conversionTracker.js      # CVR統計取得

services/grok/
  └── reportAnalyzer.js          # Grok分析機能

api/
  └── lead-discovery-report.js  # APIエンドポイント

scripts/
  └── analyze-report-with-grok.js  # Grok分析スクリプト
```

## 今後の拡張

1. **自動PDCAサイクル**: Grokが自動的に分析→提案→実装を繰り返す
2. **アラート機能**: エラー率が閾値を超えた場合に自動通知
3. **ダッシュボード**: レポートを可視化するWebダッシュボード
4. **履歴分析**: 過去のレポートを分析してトレンドを把握

## 注意事項

- Vercel KVのストレージ制限に注意（レポートは30日間保持）
- Grok APIのレート制限に注意
- レポートデータは機密情報を含む可能性があるため、適切に保護する
