# Grokアフィリエイター候補検索 - データフロー詳細

**作成日**: 2026-01-09  
**目的**: Grokアフィリエイター候補検索で取得する情報とデータベース格納方法の詳細説明

---

## 📊 取得する情報

### 1. Grok APIから取得する情報

Grok APIが返す候補情報（`GrokCandidate`インターフェース）:

```typescript
interface GrokCandidate {
  id: string;                    // 候補ID（Grokが生成）
  name: string;                  // 候補者名
  email?: string;                // Emailアドレス（取得可能な場合）
  platform: string;              // プラットフォーム（X, Telegram, YouTube, LinkedIn, Instagram）
  cv_score?: number;             // Grokが計算したマッチスコア（1-10）
  telegram_user_id?: string;     // Telegram User ID
  market?: string;               // 市場コード（EN, AR, KO, JA, ES, PT-BR）
  profile_url?: string;          // プロフィールURL
  follower_count?: number;       // フォロワー数
  engagement_rate?: number;      // エンゲージメント率（0-1）
}
```

### 2. 検索パラメータ

```typescript
{
  search_query: string;          // 検索クエリ（例: "crypto trading", "bitcoin analysis"）
  platforms?: string[];          // 検索対象プラットフォーム（デフォルト: ['X', 'Telegram', 'YouTube', 'LinkedIn', 'Instagram']）
  max_candidates?: number;       // 最大候補数（デフォルト: 20）
  min_match_score?: number;       // 最小マッチスコア（デフォルト: 7）
  marketCode: string;            // 市場コード（EN, AR, KO, JA, ES, PT-BR）
}
```

---

## 🗄️ データベース格納先

### データベースの種類

**GitHub CSV/JSONベースのデータ管理**（Notion Databaseは使用しない）

### 格納先ファイル

1. **全候補CSV**: `data/affiliate-candidates/affiliate-candidates-all.csv`
   - すべてのアフィリエイター候補を格納
   - メインデータベース

2. **トップ100CSV**: `data/affiliate-candidates/affiliate-candidates-top100.csv`
   - CVRスコアでソートした上位100名
   - 優先的にアプローチする候補リスト

### ファイルパス

```
プロジェクトルート/
└── data/
    └── affiliate-candidates/
        ├── affiliate-candidates-all.csv      # 全候補
        └── affiliate-candidates-top100.csv  # トップ100
```

---

## 💾 格納される情報（CSV形式）

### CSVカラム構成

```csv
id,name,email,market,platform,cvrScore,progress,completed,completedAt,telegramUserId,affiliateLink,status,ranking,contactedAt,onboardedAt,orientationLPUrl,approachMethod,approachedAt
```

### 各フィールドの説明

| フィールド | 型 | 説明 | 取得元 |
|-----------|-----|------|--------|
| `id` | number | 候補ID（自動採番） | システム生成 |
| `name` | string | 候補者名 | Grok API |
| `email` | string | Emailアドレス | Grok API |
| `market` | string | 市場コード（EN, AR, KO, JA, ES, PT-BR） | Grok API |
| `platform` | string | プラットフォーム（X, Telegram, YouTube等） | Grok API |
| `cvrScore` | number | CVRスコア（0-10） | システム計算 |
| `progress` | number | 進捗率（0-100） | 後から更新 |
| `completed` | boolean | 完了フラグ | 後から更新 |
| `completedAt` | string | 完了日時 | 後から更新 |
| `telegramUserId` | string | Telegram User ID | Grok API |
| `affiliateLink` | string | アフィリエイトリンク | 後から生成 |
| `status` | string | ステータス（New, Contacted, Responded, Onboarded, Rejected） | システム設定（初期値: 'New'） |
| `ranking` | number | ランキング（CVRスコア順） | システム計算 |
| `contactedAt` | string | 連絡日時 | 後から更新 |
| `onboardedAt` | string | オンボード日時 | 後から更新 |
| `orientationLPUrl` | string | オリエンテーションLP URL | 後から設定 |
| `approachMethod` | string | アプローチ方法（Telegram, Email） | 後から設定 |
| `approachedAt` | string | アプローチ日時 | 後から更新 |

---

## 🔄 データフロー

### 1. Grok API検索

```
Grok API呼び出し
  ↓
searchAffiliateCandidates()
  ↓
Grok APIレスポンス（JSON）
  ↓
GrokCandidate[] に変換
```

**取得情報**:
- name, email, platform, telegram_user_id, market, profile_url, follower_count, engagement_rate

### 2. データ処理

```
GrokCandidate
  ↓
CVRスコア計算（calculateCVRScore）
  ↓
重複チェック（Email/Telegram User ID）
  ↓
最小マッチスコアチェック（minMatchScore以上）
  ↓
AffiliateCandidate形式に変換
```

**CVRスコア計算ロジック**:
- フォロワー数: 最大3点（10K以上: 1点、50K以上: 2点、100K以上: 3点）
- エンゲージメント率: 最大3点（2%以上: 1点、5%以上: 2点、10%以上: 3点）
- プラットフォーム: 最大2点（X/Telegram: 2点、YouTube: 1.5点、その他: 0.5-1点）
- 市場マッチング: 最大2点（検索市場と候補市場が一致: 2点）
- **合計: 最大10点**

### 3. CSV保存

```
AffiliateCandidate[]
  ↓
upsertCandidates()
  ↓
既存CSVを読み込み
  ↓
重複チェック（idでマッチ）
  ↓
追加または更新
  ↓
CSVファイルに保存（affiliate-candidates-all.csv）
  ↓
トップ100を更新（affiliate-candidates-top100.csv）
```

---

## 📝 CSVファイル形式

### サンプルデータ

```csv
id,name,email,market,platform,cvrScore,progress,completed,completedAt,telegramUserId,affiliateLink,status,ranking,contactedAt,onboardedAt,orientationLPUrl,approachMethod,approachedAt
1,John Doe,john@example.com,EN,X,8.5,0,false,,123456789,,New,1,,,,
2,Jane Smith,jane@example.com,JA,Telegram,9.0,0,false,,987654321,,New,2,,,,
```

### CSV読み込み・保存関数

**読み込み**:
```typescript
import { getAllCandidates } from '@/lib/data/affiliate-candidates';

const candidates = getAllCandidates();
```

**保存**:
```typescript
import { upsertCandidates } from '@/lib/data/affiliate-candidates';

upsertCandidates([candidate1, candidate2, ...]);
```

---

## 🔍 データ処理の詳細

### 1. 重複チェック

**チェック項目**:
- Email（大文字小文字を無視）
- Telegram User ID

**処理**:
- 既存のCSVファイルから全候補を読み込み
- Email/Telegram User IDのSetを作成
- 新しい候補のEmail/Telegram User IDが既に存在する場合はスキップ

### 2. CVRスコアフィルタリング

**処理**:
- 計算されたCVRスコアが`minMatchScore`（デフォルト: 7）未満の場合はスキップ
- スキップ理由を`skippedReasons`に記録

### 3. トップ100更新

**処理**:
- 全候補をCVRスコアで降順ソート
- 上位100名を`affiliate-candidates-top100.csv`に保存
- ランキングを更新

---

## 📊 データ構造の変換

### Grok API → 内部形式

```typescript
// Grok APIレスポンス
{
  id: "candidate_id",
  name: "Candidate Name",
  email: "email@example.com",
  platform: "X",
  cv_score: 8.5,
  telegram_user_id: "123456789",
  market: "EN",
  profile_url: "https://...",
  follower_count: 10000,
  engagement_rate: 0.05
}

// ↓ 変換

// AffiliateCandidate形式
{
  id: 1,                                    // 自動採番
  name: "Candidate Name",
  email: "email@example.com",
  market: "EN",
  platform: "X",
  cvrScore: 8.5,                            // CVRスコア計算結果
  status: "New",                            // 初期ステータス
  telegramUserId: "123456789",
  // その他のフィールドは後から更新
}
```

---

## 🎯 使用例

### APIエンドポイント呼び出し

```bash
POST /api/workflows/affiliate-search
Content-Type: application/json

{
  "marketCode": "EN",
  "searchQueries": ["crypto trading", "bitcoin analysis"],
  "maxCandidates": 20,
  "platforms": ["X", "Telegram"],
  "minMatchScore": 7
}
```

### レスポンス

```json
{
  "success": true,
  "marketCode": "EN",
  "searchQueries": ["crypto trading", "bitcoin analysis"],
  "candidates": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "market": "EN",
      "platform": "X",
      "cvrScore": 8.5,
      "status": "New",
      "telegramUserId": "123456789"
    }
  ],
  "saved": 15,
  "skipped": 5,
  "skippedReasons": [
    {
      "name": "Jane Smith",
      "reason": "Duplicate email",
      "email": "jane@example.com"
    }
  ],
  "dataPath": "data/affiliate-candidates/affiliate-candidates-all.csv"
}
```

---

## ✅ まとめ

### 取得する情報

1. **基本情報**: name, email, platform, market
2. **連絡先**: email, telegram_user_id
3. **メトリクス**: follower_count, engagement_rate
4. **識別情報**: profile_url, id

### 格納先

- **データベース**: CSVファイル（GitHub管理）
- **ファイルパス**: `data/affiliate-candidates/affiliate-candidates-all.csv`
- **トップ100**: `data/affiliate-candidates/affiliate-candidates-top100.csv`

### 格納方法

1. Grok APIで候補を検索
2. CVRスコアを計算
3. 重複チェック
4. CSVファイルに追加/更新
5. トップ100を更新

### 特徴

- **Notion Databaseは使用しない**（GitHub CSV/JSONベース）
- **重複チェック**: Email/Telegram User IDで重複を防止
- **CVRスコア**: 自動計算してランキング
- **トップ100**: 自動更新
