#!/usr/bin/env tsx
/**
 * CSO: Grok (Strategy) 各市場アフィリエイター候補ポテンシャルリサーチ依頼スクリプト
 * 
 * api/unified-api.tsを使ってGrok: CSO（grok-4-1-fast-reasoning）に
 * 各市場（EN, AR, ES, JA, KO, PT-BR）のアフィリエイター候補のポテンシャルをリサーチ依頼
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
const whopArchitecturePrinciplesPath = join(projectRoot, 'docs', 'WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md');
const csoResearchScalePath = join(projectRoot, 'docs', 'CSO_RESEARCH_AFFILIATE_SCALE.md');
const databaseSchemaPath = join(projectRoot, 'database', 'schema.sql');

let whopArchitecturePrinciplesContent = '';
let csoResearchScaleContent = '';
let databaseSchemaContent = '';

try {
  whopArchitecturePrinciplesContent = fs.readFileSync(whopArchitecturePrinciplesPath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md: ${error}`);
  whopArchitecturePrinciplesContent = 'ファイルが見つかりませんでした';
}

try {
  csoResearchScaleContent = fs.readFileSync(csoResearchScalePath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read CSO_RESEARCH_AFFILIATE_SCALE.md: ${error}`);
  csoResearchScaleContent = 'ファイルが見つかりませんでした';
}

try {
  databaseSchemaContent = fs.readFileSync(databaseSchemaPath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read database/schema.sql: ${error}`);
  databaseSchemaContent = 'ファイルが見つかりませんでした';
}

const researchPrompt = `あなたはCSO（Chief Strategy Officer）です。以下の情報を基に、各市場（EN, AR, ES, JA, KO, PT-BR）のアフィリエイター候補のポテンシャルを、戦略的な観点からリサーチ・分析してください。

## 現在のアーキテクチャ

### Whop中心アーキテクチャ - 3つの基本原則

${whopArchitecturePrinciplesContent}

## データベーススキーマ（参考）

### affiliate_candidatesテーブル構造

\`\`\`sql
${databaseSchemaContent.substring(databaseSchemaContent.indexOf('CREATE TABLE IF NOT EXISTS affiliate_candidates'), databaseSchemaContent.indexOf('CREATE INDEX', databaseSchemaContent.indexOf('CREATE TABLE IF NOT EXISTS affiliate_candidates')) + 200)}
\`\`\`

**主要フィールド**:
- \`market\`: 市場コード（EN, AR, ES, JA, KO, PT-BR）
- \`follower_count\`: フォロワー数
- \`engagement_rate\`: エンゲージメント率
- \`match_score\`: マッチスコア（0-10）
- \`status\`: ステータス（New, Contacted, Responded, Approved, Rejected）

## リサーチ依頼事項

### 1. 各市場のアフィリエイター候補ポテンシャル分析

以下の6つの市場について、アフィリエイター候補のポテンシャルを分析してください：

- **EN（英語圏）**: アメリカ、イギリス、カナダ、オーストラリア、ニュージーランド等
- **AR（アラビア語圏）**: 中東・北アフリカ地域
- **ES（スペイン語圏）**: スペイン、メキシコ、アルゼンチン、チリ等
- **JA（日本語圏）**: 日本
- **KO（韓国語圏）**: 韓国
- **PT-BR（ポルトガル語圏）**: ブラジル、ポルトガル等

#### 1.1 市場規模・成長性の分析
- **市場規模**: 各市場の潜在的なアフィリエイター候補数
- **成長性**: 市場の成長率、トレンド
- **競争環境**: 競合他社の存在、市場の成熟度
- **文化・言語的障壁**: 各市場特有の文化的要因、言語障壁

#### 1.2 アフィリエイター候補の質的分析
- **フォロワー数の分布**: 各市場の典型的なフォロワー数分布
- **エンゲージメント率**: 各市場の平均的なエンゲージメント率
- **コンテンツタイプ**: 各市場で人気のコンテンツタイプ
- **インフルエンサー文化**: 各市場のインフルエンサーマーケティング文化

#### 1.3 コンバージョン・収益ポテンシャル
- **CVR（コンバージョン率）ポテンシャル**: 各市場の予想CVR
- **LTV（顧客生涯価値）ポテンシャル**: 各市場の予想LTV
- **アフィリエイト報酬への反応**: 各市場のアフィリエイト報酬への反応度
- **購買力**: 各市場の購買力、支払い意欲

#### 1.4 リクルート難易度の分析
- **リクルートの容易さ**: 各市場でのアフィリエイターリクルートの難易度
- **言語・文化障壁**: リクルート時の言語・文化障壁
- **プラットフォーム**: 各市場で主要なプラットフォーム（X/Twitter, Telegram, YouTube等）
- **リクルートコスト**: 各市場でのリクルートにかかるコスト

#### 1.5 スケーラビリティの分析
- **スケール可能性**: 各市場でのスケール可能性
- **自動化の容易さ**: 各市場での自動化リクルートの容易さ
- **成長速度**: 各市場での成長速度の見込み

### 2. 市場別優先順位の提案

各市場のポテンシャルを総合的に評価し、優先順位を提案してください：
- **優先度の高い市場**: 即座にリソースを投入すべき市場
- **中期的に重要となる市場**: 成長段階で重要となる市場
- **長期的に重要となる市場**: 将来的に重要となる市場

### 3. 市場別戦略の提案

各市場について、以下の観点から戦略を提案してください：
- **リクルート戦略**: 各市場に適したリクルート方法
- **メッセージング戦略**: 各市場に適したメッセージング
- **報酬戦略**: 各市場に適した報酬体系
- **オンボーディング戦略**: 各市場に適したオンボーディングプロセス

### 4. リスク分析

各市場について、以下のリスクを分析してください：
- **市場リスク**: 市場固有のリスク
- **規制リスク**: 各市場の規制リスク
- **競争リスク**: 競合他社によるリスク
- **運用リスク**: 運用上のリスク

## 出力形式

以下の形式でリサーチ結果を返してください：

# CSOリサーチ: 各市場アフィリエイター候補ポテンシャル分析

## 📊 エグゼクティブサマリー

## 🌍 市場別ポテンシャル分析

### EN（英語圏）

#### 1.1 市場規模・成長性
- 市場規模
- 成長性
- 競争環境
- 文化・言語的障壁

#### 1.2 アフィリエイター候補の質的分析
- フォロワー数の分布
- エンゲージメント率
- コンテンツタイプ
- インフルエンサー文化

#### 1.3 コンバージョン・収益ポテンシャル
- CVRポテンシャル
- LTVポテンシャル
- アフィリエイト報酬への反応
- 購買力

#### 1.4 リクルート難易度
- リクルートの容易さ
- 言語・文化障壁
- プラットフォーム
- リクルートコスト

#### 1.5 スケーラビリティ
- スケール可能性
- 自動化の容易さ
- 成長速度

### AR（アラビア語圏）

（ENと同様の構造で分析）

### ES（スペイン語圏）

（ENと同様の構造で分析）

### JA（日本語圏）

（ENと同様の構造で分析）

### KO（韓国語圏）

（ENと同様の構造で分析）

### PT-BR（ポルトガル語圏）

（ENと同様の構造で分析）

## 🎯 市場別優先順位

### 優先度の高い市場（即座にリソース投入）
- 市場名と理由

### 中期的に重要となる市場
- 市場名と理由

### 長期的に重要となる市場
- 市場名と理由

## 📋 市場別戦略提案

### EN（英語圏）
- リクルート戦略
- メッセージング戦略
- 報酬戦略
- オンボーディング戦略

### AR（アラビア語圏）
（ENと同様の構造）

### ES（スペイン語圏）
（ENと同様の構造）

### JA（日本語圏）
（ENと同様の構造）

### KO（韓国語圏）
（ENと同様の構造）

### PT-BR（ポルトガル語圏）
（ENと同様の構造）

## ⚠️ リスク分析

### 市場リスク
- 各市場の市場リスク

### 規制リスク
- 各市場の規制リスク

### 競争リスク
- 各市場の競争リスク

### 運用リスク
- 各市場の運用リスク

## 📊 市場別比較表

| 市場 | 市場規模 | 成長性 | CVRポテンシャル | LTVポテンシャル | リクルート難易度 | スケーラビリティ | 総合評価 |
|------|---------|--------|----------------|----------------|----------------|----------------|---------|
| EN   |         |        |                |                |                |                |         |
| AR   |         |        |                |                |                |                |         |
| ES   |         |        |                |                |                |                |         |
| JA   |         |        |                |                |                |                |         |
| KO   |         |        |                |                |                |                |         |
| PT-BR|         |        |                |                |                |                |         |

## 🎯 結論

- 各市場の総合評価
- 推奨される市場別戦略
- 次のステップ

リサーチ結果を日本語で、構造化された形式で返してください。`;

async function main() {
  try {
    console.log('📋 CSO: Grok (Strategy)に各市場アフィリエイター候補ポテンシャルリサーチを依頼中...\n');
    
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
    const outputPath = join(__dirname, '..', 'docs', 'CSO_RESEARCH_MARKET_POTENTIAL.md');
    const output = `# CSOリサーチ: 各市場アフィリエイター候補ポテンシャル分析

**作成日**: ${new Date().toISOString()}  
**作成者**: Grok: CSO (grok-4-1-fast-reasoning)  
**依頼者**: COO: Cursor (Composer)  
**リサーチ対象**: 各市場（EN, AR, ES, JA, KO, PT-BR）のアフィリエイター候補ポテンシャル

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
