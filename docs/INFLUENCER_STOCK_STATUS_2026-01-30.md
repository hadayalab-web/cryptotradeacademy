# インフルエンサーストック状況レポート
**作成日**: 2026-01-30  
**目的**: 言語別インフルエンサー数とリスト管理方法の確認

---

## 📊 言語別インフルエンサー数

| 言語 | インフルエンサー数 | 最終更新日時 | ファイル |
|------|------------------|-------------|---------|
| **EN** | **210人** | 2026-01-30T10:15:11.799Z | `data/influencers/influencers-en.json` |
| **ES** | **168人** | 2026-01-30T10:15:30.861Z | `data/influencers/influencers-es.json` |
| **PT-BR** | **158人** | 2026-01-30T10:17:55.805Z | `data/influencers/influencers-pt-br.json` |
| **AR** | **112人** | 2026-01-30T10:16:52.223Z | `data/influencers/influencers-ar.json` |
| **JA** | **98人** | 2026-01-30T10:18:11.088Z | `data/influencers/influencers-ja.json` |
| **KO** | **78人** | 2026-01-30T10:18:54.607Z | `data/influencers/influencers-ko.json` |
| **合計** | **824人** | - | - |

---

## 📁 リスト管理方法

### 1. **ストレージ方式**
- **方式**: **ファイルベース（JSON）**
- **場所**: `data/influencers/influencers-{lang}.json`
- **形式**: 言語別に分割されたJSONファイル
- **構造**:
  ```json
  {
    "lang": "en",
    "updatedAt": "2026-01-30T10:15:11.799Z",
    "count": 210,
    "influencers": [
      {
        "username": "...",
        "tweetId": "...",
        "tweetText": "...",
        "lang": "en",
        "followerCount": 250000,
        "engagementRate": 0.12,
        "recentImpressions": 450000,
        "tier": "top",
        "discoveredAt": "...",
        "lastQuoteAt": null,
        "quoteCount": 0,
        "totalQuotes": 0,
        "totalImpressions": 0,
        "totalEngagements": 0,
        "conversions": 0,
        "shadowbanFlagged": false,
        "isActive": true
      }
    ]
  }
  ```

### 2. **バージョン管理**
- **Git管理**: ✅ **有効**
  - `.gitignore`に`data/influencers/`は含まれていない
  - JSONファイルはGitリポジトリで管理されている
  - Vercelデプロイ時に自動的に含まれる

### 3. **バックアップ機能**
- **自動バックアップ**: ✅ **有効**
  - **場所**: `data/influencers/backups/`
  - **命名規則**: `influencers-{lang}-{timestamp}.json`
  - **タイミング**: ファイル更新前に自動的にバックアップ作成
  - **実装**: `scripts/discover-influencers-single-lang-robust.js`の`createBackup()`関数

### 4. **読み込みロジック**
- **サービス**: `services/x/influencerStockFromFile.js`
- **キャッシュ**: **5分間のメモリキャッシュ**
  - `CACHE_TTL = 5 * 60 * 1000` (5分)
  - キャッシュキー: `lang || 'all'`
- **優先順位**:
  1. 言語別ファイル (`influencers-{lang}.json`) を優先
  2. 統合ファイル (`influencers.json`) をフォールバック

### 5. **更新プロセス**
- **発見スクリプト**: `scripts/discover-influencers-single-lang-robust.js`
- **処理フロー**:
  1. Grok APIからインフルエンサーを取得（バッチサイズ: 15）
  2. 厳格な検証（`strictValidate()`）:
     - `tweetId`: 18-19桁の数値（必須）
     - `username`: 1-15文字、@なし（必須）
     - `tweetText`: 1-280文字（必須）
     - `followerCount`: > 0
     - `engagementRate`: 0-1の範囲
     - `recentImpressions`: >= 0
  3. 重複チェック（`tweetId`ベース）
  4. 既存データとマージ
  5. **バックアップ作成**（更新前）
  6. JSONファイルに保存
  7. 保存後検証

### 6. **データ整合性**
- **検証**: ✅ **厳格**
  - 保存前検証（重複チェック、データ構造検証）
  - 保存後検証（ファイル読み込み確認）
- **重複防止**: `tweetId`ベースで重複を自動除去
- **エラーハンドリング**: エラー時はバックアップから復元可能

---

## 🔄 使用フロー

### X投稿時の読み込み
```javascript
// api/x-quote-repost.js または api/x-quote-repost-{lang}.js
const { getInfluencersFromStock } = require('../services/x/influencerStockFromFile');

// 言語別インフルエンサーを取得
const influencers = getInfluencersFromStock(lang, {
  activeOnly: true,           // アクティブなもののみ
  excludeShadowbanned: true,   // シャドウバンされていないもののみ
  sortBy: 'engagementRate',    // エンゲージメント率でソート
  limit: 10                    // 上位10件
});
```

### インフルエンサー発見・追加
```bash
# 言語別に発見・保存
node scripts/discover-influencers-single-lang-robust.js en 210
node scripts/discover-influencers-single-lang-robust.js es 168
# ... など
```

---

## 📈 現在の状況

### ✅ 正常に動作している機能
1. **ファイルベースストレージ**: JSONファイルで確実に保存
2. **Git管理**: バージョン管理とVercelデプロイ対応
3. **自動バックアップ**: 更新前の自動バックアップ
4. **厳格な検証**: データ整合性の保証
5. **キャッシュ機能**: 5分間のメモリキャッシュで高速読み込み

### ⚠️ 過去の問題（解決済み）
- **KVストレージ失敗**: KVへの保存が失敗していたため、**ファイルベースに完全移行**
- **データ消失リスク**: Git管理とバックアップ機能で解決

---

## 🎯 推奨事項

### 1. **定期的な更新**
- インフルエンサーのパフォーマンスに応じて定期的に更新
- シャドウバン検出時は`isActive: false`に更新

### 2. **Gitコミット**
- インフルエンサーリスト更新後は必ずGitコミット・プッシュ
- Vercelへの自動デプロイで本番環境に反映

### 3. **バックアップ確認**
- `data/influencers/backups/`ディレクトリのバックアップファイルを定期的に確認
- 必要に応じて古いバックアップを削除（ディスク容量管理）

---

## 📝 関連ファイル

- **読み込みサービス**: `services/x/influencerStockFromFile.js`
- **発見スクリプト**: `scripts/discover-influencers-single-lang-robust.js`
- **データディレクトリ**: `data/influencers/`
- **バックアップディレクトリ**: `data/influencers/backups/`

---

**最終更新**: 2026-01-30
