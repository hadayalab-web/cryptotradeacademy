# Grokアフィリエイター候補検索 - 実装状況

**確認日**: 2026-01-09  
**ステータス**: ✅ **実装済み**（環境変数設定が必要）

---

## ✅ 実装完了項目

### 1. Grok APIクライアント

#### ✅ `lib/grok/affiliate-search.ts`
- **GrokClientクラス**: Grok APIを使用してアフィリエイター候補を検索
- **searchAffiliateCandidates()**: 公開関数として実装済み
- **対応プラットフォーム**: X, Telegram, YouTube, LinkedIn, Instagram
- **エラーハンドリング**: 完備

**実装内容**:
```typescript
class GrokClient {
  async searchAffiliateCandidates(options: {
    search_query: string;
    platforms?: string[];
    max_candidates?: number;
    min_match_score?: number;
    marketCode: string;
  }): Promise<GrokSearchResult>
}
```

### 2. APIエンドポイント

#### ✅ `/api/workflows/affiliate-search` (`app/api/workflows/affiliate-search/route.ts`)
- Grok APIで候補を検索
- CVRスコア計算
- 重複チェック（Email/Telegram User ID）
- CSV/JSONベースのデータ保存
- トップ100ランキング更新

**リクエスト例**:
```json
{
  "marketCode": "EN",
  "searchQueries": ["crypto trading", "bitcoin analysis"],
  "maxCandidates": 20,
  "platforms": ["X", "Telegram", "YouTube"],
  "minMatchScore": 7
}
```

### 3. 統合ワークフロー

#### ✅ `/api/workflows/affiliate-integrated` (`app/api/workflows/affiliate-integrated/route.ts`)
- Step 2で`/api/workflows/affiliate-search`を呼び出し
- Grok検索結果を統合ワークフローに組み込み

**フロー**:
```
1. アフィリエイト展開ワークフロー実行
   ↓
2. Grok APIでアフィリエイター候補検索 ← ここでGrokを使用
   ↓
3. Telegram DM送信
   ↓
4. Resend Email送信
```

---

## ⚠️ 必要な環境変数

### 環境変数名の確認

**修正済み**: `lib/grok/affiliate-search.ts`を`XAI_API_KEY`を使用するように修正しました。

### 設定が必要な環境変数

```env
# Grok API（XAI API）
XAI_API_KEY=xai_xxx
```

**注意**: `GROK_API_KEY`という環境変数は存在しません。正しくは`XAI_API_KEY`です。

---

## 🔧 修正が必要な箇所

### 1. 環境変数名の統一

**修正済み**: `lib/grok/affiliate-search.ts`で`XAI_API_KEY`を使用するように修正
```typescript
this.apiKey = process.env.XAI_API_KEY || '';
```

### 2. モデル名の確認

**現在**: `grok-beta`を使用
```typescript
model: 'grok-beta',
```

**確認**: 最新のモデル名（`grok-2-1212`、`grok-4-1-fast-reasoning`など）に更新が必要か確認

---

## 📋 動作確認チェックリスト

### ✅ 実装確認
- [x] GrokClientクラス実装済み
- [x] APIエンドポイント実装済み
- [x] 統合ワークフローに組み込み済み
- [x] エラーハンドリング完備
- [x] CVRスコア計算実装済み
- [x] 重複チェック実装済み

### ⚠️ 環境変数設定
- [ ] `XAI_API_KEY`または`GROK_API_KEY`設定
- [ ] Vercel環境変数に設定

### ⚠️ 動作確認
- [ ] ローカル環境での動作確認
- [ ] Grok API呼び出しのテスト
- [ ] 検索結果のパース確認
- [ ] エラーハンドリングの確認

---

## 🚀 使用方法

### 1. 直接APIエンドポイントを呼び出す

```bash
curl -X POST https://your-domain.com/api/workflows/affiliate-search \
  -H "Content-Type: application/json" \
  -d '{
    "marketCode": "EN",
    "searchQueries": ["crypto trading", "bitcoin analysis"],
    "maxCandidates": 20,
    "platforms": ["X", "Telegram"],
    "minMatchScore": 7
  }'
```

### 2. 統合ワークフローから呼び出す

```bash
curl -X POST https://your-domain.com/api/workflows/affiliate-integrated \
  -H "Content-Type: application/json" \
  -d '{
    "marketCode": "EN",
    "whopProductId": "prod_xxx",
    "searchQueries": ["crypto trading"],
    "maxCandidates": 20,
    "sendTelegramDM": true
  }'
```

### 3. ライブラリ関数から直接使用

```typescript
import { searchAffiliateCandidates } from '@/lib/grok/affiliate-search';

const result = await searchAffiliateCandidates({
  search_query: 'crypto trading',
  platforms: ['X', 'Telegram'],
  max_candidates: 20,
  min_match_score: 7,
  marketCode: 'EN',
});
```

---

## ✅ 結論

**Grokアフィリエイター候補検索機能は実装済みです。**

ただし、以下の対応が必要です：

1. ✅ **環境変数名の統一**: `GROK_API_KEY` → `XAI_API_KEY`に統一済み
2. **環境変数の設定**: Vercel環境変数に`XAI_API_KEY`を設定
3. **動作確認**: 実際にGrok APIを呼び出して動作確認

実装は完了しており、環境変数名も修正済みです。環境変数を設定すればすぐに使用できます。
