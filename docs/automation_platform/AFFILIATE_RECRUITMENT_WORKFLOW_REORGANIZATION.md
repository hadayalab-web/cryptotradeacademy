# アフィリエイター募集ワークフロー再編成: Whop機能補完インフラ

**作成日**: 2026-01-11  
**作成者**: COO: Cursor (Composer 1)  
**目的**: `affiliate-recruitment-workflow`をWhop機能を補完するインフラとして再編成

---

## 🎯 再編成の方針

### Whop中心アーキテクチャの原則に基づく

**原則1: Whop APIで制御できないことは外部機能を配置**

`affiliate-recruitment-workflow`は、Whop APIでできない以下の機能を補完します：

1. **アフィリエイター候補の検索**（Whop APIではできない）
2. **アフィリエイター候補の分析**（Whop APIではできない）
3. **アフィリエイター候補へのDM送信**（Whop APIではできない）
4. **アフィリエイター候補のデータベース化**（Whop APIではできない）

---

## 🏗️ 再編成後のアーキテクチャ

### 現在の構造

```
affiliate-recruitment-workflow/
├── src/
│   ├── workflows/
│   │   ├── deployment.ts      # LP情報保存、Whop連動
│   │   ├── integrated.ts     # 統合ワークフロー
│   │   └── management.ts     # 候補検索・保存・DM送信
│   └── utils/
│       ├── api-client.ts     # API呼び出し共通
│       └── validation.ts     # バリデーション共通
```

### 再編成後の構造（Whop機能補完インフラ）

```
affiliate-recruitment-workflow/
├── src/
│   ├── whop-complement/      # Whop機能補完レイヤー
│   │   ├── candidate-search.ts    # 候補検索（Whop APIではできない）
│   │   ├── candidate-analysis.ts  # 候補分析（Whop APIではできない）
│   │   ├── candidate-dm.ts        # DM送信（Whop APIではできない）
│   │   └── candidate-db.ts        # データベース化（Whop APIではできない）
│   ├── whop-integration/     # Whop統合レイヤー
│   │   ├── affiliate-link.ts      # アフィリエイトリンク生成（Whop API活用）
│   │   └── affiliate-sync.ts      # Whop APIとの同期
│   └── workflows/
│       └── daily-recruitment.ts   # 毎日50人×6市場のリクルート実行
```

---

## 📋 再編成の詳細

### 1. Whop機能補完レイヤー（`whop-complement/`）

**目的**: Whop APIでできない機能を補完

#### `candidate-search.ts`
```typescript
/**
 * アフィリエイター候補の検索（Whop APIではできない）
 * Grok: CSOが実行
 */
export async function searchAffiliateCandidates(options: {
  market: MarketCode;
  searchQueries: string[];
  maxCandidates: number;
}): Promise<AffiliateCandidate[]> {
  // Grok APIで候補を検索
  // Whop APIではできない機能
}
```

#### `candidate-analysis.ts`
```typescript
/**
 * アフィリエイター候補の分析（Whop APIではできない）
 * GPT: CTOが実行
 */
export async function analyzeAffiliateCandidates(options: {
  candidates: AffiliateCandidate[];
  market: MarketCode;
}): Promise<AnalyzedCandidate[]> {
  // GPT APIで候補を分析
  // Whop APIではできない機能
}
```

#### `candidate-dm.ts`
```typescript
/**
 * アフィリエイター候補へのDM送信（Whop APIではできない）
 * GPT: CTOが実行
 */
export async function sendRecruitmentDM(options: {
  candidate: AffiliateCandidate;
  market: MarketCode;
  affiliateLink: string;
}): Promise<{ success: boolean }> {
  // Telegram Bot APIでDM送信
  // Whop APIではできない機能
}
```

#### `candidate-db.ts`
```typescript
/**
 * アフィリエイター候補のデータベース化（Whop APIではできない）
 * Grok: CSOが実行
 */
export async function saveCandidatesToDatabase(options: {
  candidates: AffiliateCandidate[];
  market: MarketCode;
}): Promise<{ saved: number }> {
  // PostgreSQLに保存
  // Whop APIではできない機能
}
```

### 2. Whop統合レイヤー（`whop-integration/`）

**目的**: Whop APIを活用して統合

#### `affiliate-link.ts`
```typescript
/**
 * アフィリエイトリンク生成（Whop API活用）
 */
export async function generateAffiliateLink(options: {
  affiliateCode: string;
  productId: string;
  market: MarketCode;
}): Promise<string> {
  // Whop APIでプロダクト情報を取得
  const product = await getWhopProduct(options.productId);
  
  // アフィリエイトリンクを生成
  return `https://your-domain.com/${product.market}?ref=${options.affiliateCode}`;
}
```

#### `affiliate-sync.ts`
```typescript
/**
 * Whop APIとの同期
 */
export async function syncWithWhop(options: {
  candidateId: number;
  productId: string;
}): Promise<{ whopAffiliateId: string }> {
  // Whop APIでアフィリエイター情報を取得
  const affiliates = await getWhopAffiliates({ productId: options.productId });
  
  // データベースと同期
  // ...
}
```

### 3. 統合ワークフロー（`workflows/daily-recruitment.ts`）

**目的**: 毎日50人×6市場のリクルートを実行

```typescript
/**
 * 毎日50人×6市場のアフィリエイターリクルート実行
 * 
 * フロー:
 * 1. Grok: CSOが候補を検索・データベース化
 * 2. GPT: CTOが候補にDM送信
 * 3. アフィリエイターがリクルートLPにアクセス
 * 4. LPからWhopに遷移してアフィリエイトリンクを取得
 * 5. アフィリエイターがユーザー向けLPにアクセスさせる
 * 6. ユーザーがWhopチェックアウトでコンバージョン
 * 7. Whop Webhookでコンバージョンをカウント
 */
export async function executeDailyRecruitment(options: {
  markets: MarketCode[];
  candidatesPerMarket: number;
}): Promise<DailyRecruitmentResult> {
  const { markets, candidatesPerMarket = 50 } = options;
  
  const results: MarketRecruitmentResult[] = [];
  
  for (const market of markets) {
    // Step 1: Grok: CSOが候補を検索・データベース化
    const candidates = await searchAndSaveCandidates({
      market,
      maxCandidates: candidatesPerMarket,
    });
    
    // Step 2: GPT: CTOが候補にDM送信
    const dmResults = await sendRecruitmentDMs({
      candidates,
      market,
    });
    
    results.push({
      market,
      candidatesFound: candidates.length,
      dmsSent: dmResults.sent,
    });
  }
  
  return {
    success: true,
    markets: results,
    totalCandidates: results.reduce((sum, r) => sum + r.candidatesFound, 0),
    totalDMsSent: results.reduce((sum, r) => sum + r.dmsSent, 0),
  };
}
```

---

## 🔄 再編成後のフロー

### 完全フロー

```
1. Grok: CSOが毎日50人×6市場のアフィリエイター候補をデータベース化
   ↓
2. GPT: CTOが毎日50人×6市場のアフィリエイター候補にDM送信
   ↓
3. アフィリエイター候補がリクルートLPにアクセス
   ↓
4. LPからWhopに遷移してアフィリエイトリンクを取得（Whop API活用）
   ↓
5. アフィリエイターがユーザー向けLPにアクセスさせる
   ↓
6. ユーザー向けLPがユーザーにセールスし、Whopチェックアウトでコンバージョン
   ↓
7. Whop Webhookでコンバージョンをカウント（Whop API活用）
```

---

## ✅ 再編成チェックリスト

### Phase 1: ディレクトリ構造の再編成

- [ ] `src/whop-complement/`ディレクトリを作成
- [ ] `src/whop-integration/`ディレクトリを作成
- [ ] 既存のワークフローを新しい構造に移動

### Phase 2: Whop機能補完レイヤーの実装

- [ ] `candidate-search.ts`の実装（Grok: CSO）
- [ ] `candidate-analysis.ts`の実装（GPT: CTO）
- [ ] `candidate-dm.ts`の実装（GPT: CTO）
- [ ] `candidate-db.ts`の実装（Grok: CSO）

### Phase 3: Whop統合レイヤーの実装

- [ ] `affiliate-link.ts`の実装（Whop API活用）
- [ ] `affiliate-sync.ts`の実装（Whop API活用）

### Phase 4: 統合ワークフローの実装

- [ ] `daily-recruitment.ts`の実装
- [ ] 毎日50人×6市場のリクルート実行

---

## 🎯 結論

### 再編成の目的

- ✅ **Whop機能を補完**: Whop APIでできない機能を外部機能として実装
- ✅ **Whop APIを活用**: Whop APIでできることは最大限活用
- ✅ **シンプルな構造**: 明確な役割分担と構造

### 重要なポイント

- **Whop中心**: Whop API/Botを基本・中核として配置
- **補完レイヤー**: `affiliate-recruitment-workflow`がWhop機能を補完
- **完全自動化**: 毎日50人×6市場のリクルートが自動実行

---

**最終更新**: 2026-01-11  
**ステータス**: ✅ 再編成計画確定
