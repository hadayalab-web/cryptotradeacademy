# COO実装計画: 大規模リクルートDM運用（100-1000人/日）対応

**作成日**: 2026-01-11  
**作成者**: COO: Cursor (Composer 1)  
**運用規模**: 毎日100人～1000人単位でリクルートDM実行  
**基づく分析**: 
- CSOリサーチ（アフィリエイター候補リスト規模分析）
- CSOリサーチ（各市場アフィリエイター候補ポテンシャル分析）
- COO分析（アフィリエイトリンク自動付与）

---

## 📊 大規模運用の要件

### 運用規模

- **リクルートDM**: 100-1000人/日
- **アフィリエイター作成**: 100-1000人/日（Puppeteer自動化）
- **リンク生成**: 100-1000人/日（Whop API）
- **リンク送信**: 100-1000人/日（Telegram DM）

### スループット要件

| 処理 | 現在のスループット | 必要なスループット | ギャップ |
|------|------------------|------------------|---------|
| **Puppeteer自動化** | 1時間30件（並行5インスタンス） | 100-1000件/日 = 4-42件/時間 | ⚠️ 1000人/日は不足 |
| **Whop API呼び出し** | 1分60-100コール | 100-1000件/日 = 0.07-0.7件/分 | ✅ 十分 |
| **Telegram DM送信** | 1時間500件 | 100-1000件/日 = 4-42件/時間 | ✅ 十分 |

**結論**: **Puppeteer自動化のスループットがボトルネック**

---

## 🏗️ 大規模運用対応の実装計画

### Phase 1: インフラ・スケーリング基盤構築（最優先・即時実装）

**目的**: 100-1000人/日の処理能力を確保

#### 1.1 Puppeteer並列処理の大幅拡張

**実装内容**:
- **現在**: 並行5インスタンス（1時間30件）
- **目標**: 並行50-100インスタンス（1時間300-600件、1000人/日対応）

**技術的実装**:
```typescript
// services/affiliate/puppeteer-cluster.ts
import { Cluster } from 'puppeteer-cluster';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createPuppeteerCluster(options: {
  maxConcurrency?: number;
  retryLimit?: number;
}): Promise<Cluster> {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: options.maxConcurrency || 50, // 50並列処理
    puppeteerOptions: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
    retryLimit: options.retryLimit || 3,
    retryDelay: 5000,
  });

  // タスク処理関数
  await cluster.task(async ({ page, data }) => {
    const { candidate, productId } = data;
    
    // Whopダッシュボードでアフィリエイター作成
    const affiliateId = await registerAffiliateViaDashboard(page, candidate, productId);
    
    return { email: candidate.email, affiliateId };
  });

  return cluster;
}

// バッチ処理実行
export async function batchRegisterAffiliates(options: {
  candidates: Array<{ email: string; name?: string }>;
  productId: string;
  batchSize?: number;
}): Promise<{
  registered: number;
  failed: number;
  affiliateIds: Array<{ email: string; affiliateId: string }>;
}> {
  const cluster = await createPuppeteerCluster({ maxConcurrency: 50 });
  const { candidates, productId, batchSize = 100 } = options;

  const affiliateIds: Array<{ email: string; affiliateId: string }> = [];
  let registered = 0;
  let failed = 0;

  // バッチごとに処理
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(candidate =>
        cluster.execute({ candidate, productId })
      )
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        affiliateIds.push(result.value);
        registered++;
      } else {
        failed++;
        console.error('Registration failed:', result.reason);
      }
    }
  }

  await cluster.idle();
  await cluster.close();

  return { registered, failed, affiliateIds };
}
```

**インフラ要件**:
- **CPU**: 100コア以上（50並列 × 2コア/インスタンス）
- **メモリ**: 200GB以上（50並列 × 4GB/インスタンス）
- **推奨**: AWS EC2 c6i.24xlarge（96 vCPU、192GB RAM）または同等

**見積もり**: 15-25人日

#### 1.2 キューシステムの導入

**実装内容**:
- **BullMQ + Redis**: ジョブキューで処理を管理
- **優先度キュー**: 市場別・優先度別に処理順序を制御
- **リトライ機能**: 失敗時の自動リトライ

**技術的実装**:
```typescript
// services/affiliate/affiliate-queue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// アフィリエイター作成キュー
export const affiliateRegistrationQueue = new Queue('affiliate-registration', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// ワーカー（並列処理）
const worker = new Worker(
  'affiliate-registration',
  async (job) => {
    const { candidate, productId } = job.data;
    
    // Puppeteerでアフィリエイター作成
    const result = await batchRegisterAffiliates({
      candidates: [candidate],
      productId,
    });
    
    // リンク生成キューに追加
    if (result.registered > 0) {
      await affiliateLinkGenerationQueue.add('generate-link', {
        affiliateId: result.affiliateIds[0].affiliateId,
        candidateId: candidate.id,
        productId,
      });
    }
    
    return result;
  },
  {
    connection: redis,
    concurrency: 50, // 50並列処理
  }
);
```

**見積もり**: 8-12人日

#### 1.3 データベーススケーリング

**実装内容**:
- **複合インデックス追加**: `(market, status, match_score DESC)`
- **Redisキャッシュ**: Whop API呼び出し結果のキャッシュ
- **バッチUPSERT**: 一括更新処理の最適化
- **パーティショニング**: market別パーティション（10万件超の場合）

**技術的実装**:
```sql
-- 複合インデックス追加
CREATE INDEX idx_affiliate_candidates_market_status_score 
ON affiliate_candidates(market, status, match_score DESC);

-- パーティショニング（10万件超の場合）
CREATE TABLE affiliate_candidates_partitioned (
  -- 既存のカラム
) PARTITION BY LIST(market);

CREATE TABLE affiliate_candidates_en PARTITION OF affiliate_candidates_partitioned
FOR VALUES IN ('EN');
-- 他の市場も同様に作成
```

**見積もり**: 5-8人日

**Phase 1合計**: 28-45人日

---

### Phase 2: 統合オンボーディングフロー（高優先度・1週間後）

**目的**: アフィリエイター作成→リンク生成→送信の自動化

#### 2.1 統合ワークフロー関数の実装

**実装内容**:
- Puppeteerでアフィリエイター作成 → Whop APIでリンク生成 → Telegram DM送信の一連のフローを自動化
- **大規模対応**: バッチ処理、キューシステム統合

**技術的実装**:
```typescript
// services/affiliate/onboarding-complete-batch.ts
import { batchRegisterAffiliates } from './puppeteer-cluster';
import { generateWhopAffiliateLink } from '../../api/unified-api';
import { sendTelegramMessage } from '../../api/unified-api';
import { affiliateRegistrationQueue, affiliateLinkGenerationQueue } from './affiliate-queue';

export async function batchCompleteAffiliateOnboarding(options: {
  candidates: Array<{
    id: number;
    email: string;
    name?: string;
    market: MarketCode;
    telegramUserId?: string;
  }>;
  productId: string;
}): Promise<{
  success: number;
  failed: number;
  results: Array<{
    candidateId: number;
    success: boolean;
    whopAffiliateId?: string;
    affiliateLink?: string;
    error?: string;
  }>;
}> {
  const { candidates, productId } = options;
  
  // Step 1: キューにジョブを追加（バッチ処理）
  const jobs = candidates.map(candidate =>
    affiliateRegistrationQueue.add('register', {
      candidate,
      productId,
    }, {
      priority: getPriorityByMarket(candidate.market), // EN/PT-BR優先
    })
  );

  // Step 2: ジョブの完了を待機（非同期処理）
  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      const result = await job.waitUntilFinished();
      return result;
    })
  );

  // Step 3: 結果を集計
  let success = 0;
  let failed = 0;
  const detailedResults = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const candidate = candidates[i];

    if (result.status === 'fulfilled' && result.value.registered > 0) {
      success++;
      detailedResults.push({
        candidateId: candidate.id,
        success: true,
        whopAffiliateId: result.value.affiliateIds[0].affiliateId,
        affiliateLink: result.value.affiliateLink,
      });
    } else {
      failed++;
      detailedResults.push({
        candidateId: candidate.id,
        success: false,
        error: result.status === 'rejected' ? result.reason.message : 'Unknown error',
      });
    }
  }

  return { success, failed, results: detailedResults };
}
```

**見積もり**: 10-15人日

#### 2.2 リンク生成ワーカーの実装

**実装内容**:
- Whop APIでリンク生成 → データベース保存 → Telegram DM送信

**技術的実装**:
```typescript
// services/affiliate/link-generation-worker.ts
import { Worker } from 'bullmq';
import { generateWhopAffiliateLink } from '../../api/unified-api';
import { sendTelegramMessage } from '../../api/unified-api';
import { prisma } from '../../database/prisma';

const linkGenerationWorker = new Worker(
  'affiliate-link-generation',
  async (job) => {
    const { affiliateId, candidateId, productId, market, telegramUserId } = job.data;

    try {
      // Whop APIでリンク生成
      const linkResult = await generateWhopAffiliateLink({
        productId,
        affiliateId,
      });

      // データベースに保存
      await prisma.affiliateCandidate.update({
        where: { id: candidateId },
        data: {
          status: 'Onboarded',
          whopAffiliateId: affiliateId,
          affiliateLink: linkResult.affiliateLink,
          onboardedAt: new Date(),
        },
      });

      // Telegram DMでリンク送信
      if (telegramUserId && linkResult.affiliateLink) {
        await sendTelegramMessage({
          language: market,
          userId: telegramUserId,
          message: `🎉 アフィリエイト登録が完了しました！\n\nあなたのアフィリエイトリンク:\n${linkResult.affiliateLink}\n\nこのリンクをシェアして、コミッションを獲得しましょう！`,
        });
      }

      return { success: true, affiliateLink: linkResult.affiliateLink };
    } catch (error: any) {
      console.error('Link generation error:', error);
      throw error; // リトライのためエラーを再スロー
    }
  },
  {
    connection: redis,
    concurrency: 100, // 100並列処理（Whop APIレート制限内）
  }
);
```

**見積もり**: 5-8人日

#### 2.3 `/api/complete`エンドポイントの修正

**実装内容**:
- キューシステム統合、バッチ処理対応

**見積もり**: 3-5人日

**Phase 2合計**: 18-28人日

---

### Phase 3: 監視・エラーハンドリング・最適化（中優先度・2週間後）

**目的**: 大規模運用での安定性とパフォーマンス確保

#### 3.1 監視ダッシュボード

**実装内容**:
- 処理速度、成功率、エラー率の監視
- リアルタイムアラート

**見積もり**: 5-8人日

#### 3.2 エラーハンドリングの強化

**実装内容**:
- 詳細なエラーログ、自動リトライ、失敗時の通知

**見積もり**: 5-8人日

#### 3.3 パフォーマンス最適化

**実装内容**:
- キャッシュ最適化、DBクエリ最適化、バッチ処理の最適化

**見積もり**: 5-8人日

**Phase 3合計**: 15-24人日

---

## 💰 大規模運用対応の見積もり（修正版）

### 総合見積もり

| Phase | 項目 | 小規模見積もり | 大規模見積もり（100-1000人/日） | 増加率 |
|-------|------|---------------|-------------------------------|--------|
| **Phase 1** | インフラ・スケーリング基盤 | 10-16人日 | **28-45人日** | +180% |
| **Phase 2** | 統合オンボーディングフロー | 15-23人日 | **18-28人日** | +22% |
| **Phase 3** | 監視・エラーハンドリング | 20-31人日 | **15-24人日** | -23% |
| **合計** | | 45-70人日 | **61-97人日** | +36% |

### インフラコスト（大規模運用）

| 項目 | 小規模（10人/日） | 大規模（1000人/日） | 月額コスト |
|------|------------------|-------------------|-----------|
| **EC2インスタンス** | t3.medium | c6i.24xlarge × 2台 | $2,000-3,000 |
| **Redis（ElastiCache）** | cache.t3.micro | cache.r6g.2xlarge | $300-500 |
| **RDS（PostgreSQL）** | db.t4g.medium | db.m6i.4xlarge | $500-800 |
| **ストレージ** | 100GB | 1TB | $100-200 |
| **ネットワーク** | 100GB/月 | 10TB/月 | $900-1,200 |
| **合計** | $100/月 | **$3,800-5,700/月** | |

---

## 🎯 大規模運用対応の優先順位

### 最優先（即座に実装）

1. **Puppeteer並列処理の大幅拡張**（28-45人日）
   - 50-100並列処理への拡張
   - クラスター管理システムの構築
   - **理由**: 1000人/日の処理には必須

2. **キューシステムの導入**（8-12人日）
   - BullMQ + Redis
   - ジョブ管理・リトライ機能
   - **理由**: 大規模処理の安定性確保

3. **データベーススケーリング**（5-8人日）
   - 複合インデックス、Redisキャッシュ
   - **理由**: パフォーマンス確保

### 高優先度（1週間後）

4. **統合オンボーディングフロー**（18-28人日）
   - バッチ処理対応
   - キューシステム統合

5. **監視ダッシュボード**（5-8人日）
   - リアルタイム監視
   - アラート機能

---

## 📊 スループット目標

### 目標スループット

| 処理 | 目標 | 実現方法 |
|------|------|---------|
| **Puppeteer自動化** | 1000件/日（42件/時間） | 50-100並列処理 |
| **Whop API呼び出し** | 1000件/日（0.7件/分） | キューシステム + レート制限管理 |
| **Telegram DM送信** | 1000件/日（42件/時間） | バッチ送信 |

### 実現可能性

- **100人/日**: ✅ **実現可能**（現在の実装で対応可能、最適化推奨）
- **500人/日**: ⚠️ **実現可能（要改善）**（Puppeteer並列処理拡張必要）
- **1000人/日**: ⚠️ **実現可能（大幅改善必要）**（Phase 1の実装必須）

---

## ✅ 大規模運用対応チェックリスト

### Phase 1: インフラ・スケーリング基盤（28-45人日）
- [ ] Puppeteer並列処理を50-100インスタンスに拡張
- [ ] クラスター管理システムの構築
- [ ] BullMQ + Redisキューシステムの導入
- [ ] ジョブ管理・リトライ機能の実装
- [ ] 複合インデックス追加
- [ ] Redisキャッシュ導入
- [ ] バッチUPSERT最適化
- [ ] パーティショニング実装（10万件超の場合）

### Phase 2: 統合オンボーディングフロー（18-28人日）
- [ ] バッチ処理対応の統合ワークフロー関数
- [ ] キューシステム統合
- [ ] リンク生成ワーカーの実装
- [ ] `/api/complete`エンドポイントの修正
- [ ] エラーハンドリングの強化

### Phase 3: 監視・最適化（15-24人日）
- [ ] 監視ダッシュボード構築
- [ ] リアルタイムアラート機能
- [ ] パフォーマンス最適化
- [ ] エラーログ分析機能

---

## 🎯 結論

### 大規模運用対応の総合評価

**100人/日**: ✅ **実現可能**（現在の実装で対応可能、最適化推奨）  
**500人/日**: ⚠️ **実現可能（要改善）**（Phase 1の実装推奨）  
**1000人/日**: ⚠️ **実現可能（大幅改善必要）**（Phase 1-2の実装必須）

### 修正後の見積もり

- **小規模見積もり**: 45-70人日
- **大規模見積もり（100-1000人/日）**: **61-97人日**（+36%）
- **インフラコスト**: $3,800-5,700/月

### 推奨アクション

1. **即座に実装開始**: Phase 1のインフラ・スケーリング基盤（28-45人日）
2. **1週間後**: Phase 2の統合オンボーディングフロー（18-28人日）
3. **2週間後**: Phase 3の監視・最適化（15-24人日）

---

**最終更新**: 2026-01-11  
**ステータス**: ⚠️ 大規模運用対応の実装計画確定
