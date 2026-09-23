#!/usr/bin/env tsx
/**
 * CSO: Grok (Strategy) アフィリエイター候補リスト規模リサーチ依頼スクリプト
 * 
 * api/unified-api.tsを使ってGrok: CSO（grok-4-1-fast-reasoning）に
 * 最大どれぐらいの規模のアフィリエイター候補リストをデータベース化できるかリサーチを依頼
 */

import { callGrok41FastReasoning } from '../api/unified-api';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// .envファイルを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// 関連ドキュメントを読み込む
const projectRoot = join(__dirname, '..');
const databaseSchemaPath = join(projectRoot, 'database', 'schema.sql');
const prismaSchemaPath = join(projectRoot, 'database', 'prisma', 'schema.prisma');
const whopArchitecturePrinciplesPath = join(projectRoot, 'docs', 'WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md');

let databaseSchemaContent = '';
let prismaSchemaContent = '';
let whopArchitecturePrinciplesContent = '';

try {
  databaseSchemaContent = fs.readFileSync(databaseSchemaPath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read database/schema.sql: ${error}`);
  databaseSchemaContent = 'ファイルが見つかりませんでした';
}

try {
  prismaSchemaContent = fs.readFileSync(prismaSchemaPath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read database/prisma/schema.prisma: ${error}`);
  prismaSchemaContent = 'ファイルが見つかりませんでした';
}

try {
  whopArchitecturePrinciplesContent = fs.readFileSync(whopArchitecturePrinciplesPath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md: ${error}`);
  whopArchitecturePrinciplesContent = 'ファイルが見つかりませんでした';
}

const researchPrompt = `あなたはCSO（Chief Strategy Officer）です。以下の情報を基に、最大どれぐらいの規模のアフィリエイター候補リストをデータベース化できるか、戦略的な観点からリサーチ・分析してください。

## 現在のアーキテクチャ

### Whop中心アーキテクチャ - 3つの基本原則

${whopArchitecturePrinciplesContent}

## 現在のデータベーススキーマ

### PostgreSQLスキーマ（affiliate_candidatesテーブル）

\`\`\`sql
${databaseSchemaContent.substring(databaseSchemaContent.indexOf('CREATE TABLE IF NOT EXISTS affiliate_candidates'), databaseSchemaContent.indexOf('CREATE INDEX', databaseSchemaContent.indexOf('CREATE TABLE IF NOT EXISTS affiliate_candidates')) + 200)}
\`\`\`

### Prismaスキーマ（AffiliateCandidateモデル）

\`\`\`prisma
${prismaSchemaContent.substring(prismaSchemaContent.indexOf('model AffiliateCandidate'), prismaSchemaContent.indexOf('model Affiliate', prismaSchemaContent.indexOf('model AffiliateCandidate') + 1))}
\`\`\`

## リサーチ依頼事項

### 1. データベース化可能な最大規模の分析

以下の観点から、最大どれぐらいの規模のアフィリエイター候補リストをデータベース化できるか分析してください：

#### 1.1 技術的制約の分析
- **データベース容量**: PostgreSQLのテーブルサイズ制限、インデックスサイズ制限
- **パフォーマンス**: クエリ速度、インデックス効率、JOIN処理のパフォーマンス
- **メモリ使用量**: データベースサーバーのメモリ要件
- **ストレージ**: データベースファイルサイズ、バックアップサイズ
- **同時接続数**: データベース接続プールの制約

#### 1.2 運用上の制約の分析
- **スカウト自動化ワークフローの処理能力**: 候補検索・分析・DM送信のスループット
- **Whop APIのレート制限**: アフィリエイター情報取得・リンク生成の制限
- **Puppeteer自動化の処理能力**: Whopダッシュボード経由のアフィリエイター作成のスループット
- **データ更新頻度**: 候補情報の更新・同期の頻度と処理時間

#### 1.3 スケーラビリティの分析
- **水平スケーリング**: データベースのレプリケーション、シャーディングの可能性
- **垂直スケーリング**: サーバーリソースの拡張による対応
- **データアーカイブ**: 古いデータのアーカイブ戦略
- **パーティショニング**: テーブルパーティショニングによる最適化

#### 1.4 コスト分析
- **インフラコスト**: データベースサーバー、ストレージ、ネットワークのコスト
- **運用コスト**: バックアップ、監視、メンテナンスのコスト
- **スケール時のコスト増加**: 規模拡大に伴うコスト増加の見積もり

### 2. 規模別の推奨アーキテクチャ

以下の規模別に、推奨されるアーキテクチャを提案してください：

- **小規模（1,000件以下）**
- **中規模（1,000〜10,000件）**
- **大規模（10,000〜100,000件）**
- **超大型（100,000件以上）**

各規模について：
- 推奨データベース構成
- インデックス戦略
- パフォーマンス最適化手法
- 運用上の注意点

### 3. 現在の実装状況の評価

現在の実装（PostgreSQL + Prisma + CSVバックアップ）について：
- どの規模まで対応可能か
- ボトルネックとなる箇所
- 改善すべき点

### 4. 成長戦略の提案

アフィリエイター候補リストが成長する際の戦略を提案してください：
- 段階的なスケーリング計画
- パフォーマンス監視指標
- アラート設定の推奨値
- 移行・拡張のタイミング

## 出力形式

以下の形式でリサーチ結果を返してください：

# CSOリサーチ: アフィリエイター候補リストのデータベース化規模分析

## 📊 エグゼクティブサマリー

## 🔍 技術的制約の分析

### 1.1 データベース容量制約
- 最大テーブルサイズ
- インデックスサイズ制約
- 推奨最大レコード数

### 1.2 パフォーマンス制約
- クエリ速度の目安
- インデックス効率
- JOIN処理のパフォーマンス

### 1.3 メモリ・ストレージ要件
- メモリ使用量の見積もり
- ストレージ容量の見積もり
- バックアップサイズの見積もり

### 1.4 同時接続数制約
- 推奨最大接続数
- 接続プールサイズ

## ⚙️ 運用上の制約の分析

### 2.1 スカウト自動化ワークフローの処理能力
- 候補検索のスループット
- 分析処理のスループット
- DM送信のスループット

### 2.2 Whop APIのレート制限
- API呼び出し制限
- バッチ処理の必要性
- レート制限回避戦略

### 2.3 Puppeteer自動化の処理能力
- ダッシュボード操作のスループット
- 並行処理の制約
- エラーハンドリングの重要性

### 2.4 データ更新頻度
- 更新処理のスループット
- 同期処理の最適化

## 📈 スケーラビリティの分析

### 3.1 水平スケーリング
- レプリケーション戦略
- シャーディング戦略
- 読み取り専用レプリカの活用

### 3.2 垂直スケーリング
- サーバーリソース拡張の効果
- コストパフォーマンス

### 3.3 データアーカイブ戦略
- アーカイブ対象データ
- アーカイブタイミング
- アーカイブ後のクエリ戦略

### 3.4 パーティショニング戦略
- パーティショニングキー
- パーティションサイズ
- クエリ最適化

## 💰 コスト分析

### 4.1 インフラコスト
- データベースサーバーコスト
- ストレージコスト
- ネットワークコスト

### 4.2 運用コスト
- バックアップコスト
- 監視コスト
- メンテナンスコスト

### 4.3 スケール時のコスト増加
- 規模別コスト見積もり
- ROI分析

## 🏗️ 規模別推奨アーキテクチャ

### 小規模（1,000件以下）
- 推奨構成
- インデックス戦略
- パフォーマンス最適化
- 運用上の注意点

### 中規模（1,000〜10,000件）
- 推奨構成
- インデックス戦略
- パフォーマンス最適化
- 運用上の注意点

### 大規模（10,000〜100,000件）
- 推奨構成
- インデックス戦略
- パフォーマンス最適化
- 運用上の注意点

### 超大型（100,000件以上）
- 推奨構成
- インデックス戦略
- パフォーマンス最適化
- 運用上の注意点

## 📊 現在の実装状況の評価

### 対応可能な規模
- 現在の実装で対応可能な最大規模
- ボトルネックとなる箇所
- 改善すべき点

## 🚀 成長戦略の提案

### 段階的なスケーリング計画
- Phase 1: 初期段階（〜1,000件）
- Phase 2: 成長段階（1,000〜10,000件）
- Phase 3: 拡大段階（10,000〜100,000件）
- Phase 4: 大規模段階（100,000件以上）

### パフォーマンス監視指標
- 監視すべきメトリクス
- アラート設定の推奨値
- パフォーマンス劣化の早期検知

### 移行・拡張のタイミング
- スケーリングが必要なタイミング
- 移行計画
- リスク管理

## 🎯 結論

- 最大対応可能規模の総合評価
- 推奨されるアーキテクチャ
- 次のステップ

リサーチ結果を日本語で、構造化された形式で返してください。`;

async function main() {
  try {
    console.log('📋 CSO: Grok (Strategy)にアフィリエイター候補リスト規模リサーチを依頼中...\n');
    
    const result = await callGrok41FastReasoning(researchPrompt, {
      temperature: 0.7,
      maxTokens: 8000,
    });
    
    console.log('='.repeat(80));
    console.log('CSOリサーチ結果');
    console.log('='.repeat(80));
    console.log('\n');
    console.log(result.text);
    console.log('\n');
    console.log('='.repeat(80));
    
    if (result.usage) {
      console.log('\n📊 使用量:');
      console.log(`  - Prompt Tokens: ${result.usage.prompt_tokens || 'N/A'}`);
      console.log(`  - Completion Tokens: ${result.usage.completion_tokens || 'N/A'}`);
      console.log(`  - Total Tokens: ${result.usage.total_tokens || 'N/A'}`);
    }
    
    if (result.note) {
      console.log(`\nℹ️ ${result.note}`);
    }
    
    // 結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'CSO_RESEARCH_AFFILIATE_SCALE.md');
    const output = `# CSOリサーチ: アフィリエイター候補リストのデータベース化規模分析

**作成日**: ${new Date().toISOString()}  
**作成者**: Grok: CSO (grok-4-1-fast-reasoning)  
**依頼者**: COO: Cursor (Composer)  
**リサーチ対象**: アフィリエイター候補リストのデータベース化最大規模

---

${result.text}

---

## 使用量

${result.usage ? `
- Prompt Tokens: ${result.usage.prompt_tokens || 'N/A'}
- Completion Tokens: ${result.usage.completion_tokens || 'N/A'}
- Total Tokens: ${result.usage.total_tokens || 'N/A'}
` : 'N/A'}

${result.note ? `\n**Note**: ${result.note}` : ''}

---

**最終更新**: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`\n✅ リサーチ結果を保存しました: ${outputPath}`);
    
  } catch (error: any) {
    console.error('❌ エラーが発生しました:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
