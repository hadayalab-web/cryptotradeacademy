#!/usr/bin/env tsx
/**
 * CTO: GPT (Architect) 技術的実装計画依頼スクリプト
 * 
 * api/unified-api.tsを使ってGPT: CTO（gpt-5.2-2025-12-11）に技術的な実装計画を依頼
 */

import { callGPT52 } from '../api/unified-api';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// .envファイルを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// レビュー対象のドキュメントを読み込む
const projectRoot = join(__dirname, '..');
const cmoReviewPath = join(projectRoot, 'docs', 'CMO_REVIEW_RESULT_WHOP_ARCHITECTURE_PRINCIPLES.md');
const whopArchitecturePrinciplesPath = join(projectRoot, 'docs', 'WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md');
const unifiedApiPath = join(projectRoot, 'api', 'unified-api.ts');

let cmoReviewContent = '';
let whopArchitecturePrinciplesContent = '';
let unifiedApiCode = '';

try {
  cmoReviewContent = fs.readFileSync(cmoReviewPath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read CMO_REVIEW_RESULT_WHOP_ARCHITECTURE_PRINCIPLES.md: ${error}`);
  cmoReviewContent = 'ファイルが見つかりませんでした';
}

try {
  whopArchitecturePrinciplesContent = fs.readFileSync(whopArchitecturePrinciplesPath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md: ${error}`);
  whopArchitecturePrinciplesContent = 'ファイルが見つかりませんでした';
}

try {
  unifiedApiCode = fs.readFileSync(unifiedApiPath, 'utf-8');
} catch (error) {
  console.warn(`Failed to read unified-api.ts: ${error}`);
  unifiedApiCode = 'ファイルが見つかりませんでした';
}

const technicalPlanPrompt = `あなたはCTO: GPT (Architect)です。CMOからの改善提案を基に、技術的な実装計画を正確に立ててください。

## 現在のアーキテクチャ

### Whop中心アーキテクチャ - 3つの基本原則

${whopArchitecturePrinciplesContent}

## CMOからの改善提案

${cmoReviewContent}

## 技術的実装計画の依頼事項

CMOが提案した以下の改善点について、技術的な実装計画を詳細に立ててください：

### 1. データ計測とアトリビューションの原則（第4の原則候補）
- **要件**: LP上のGA4/FBピクセルイベントと、WhopのWebhookを統合し、どの広告・どのアフィリエイターが「最もLTV（顧客生涯価値）の高いユーザー」を連れてきたかを可視化する仕組み
- **技術的課題**: Whop、外部LP、Telegramが分散しているため、ユーザーの行動データが断片化するリスク

### 2. リテンション・ナーチャリングの自動化
- **要件**: Whopのメンバーシップ状態（更新1週間前、解約直後など）に応じて、メールやTelegramでの自動リマインド、アップセル提案を行うロジック
- **技術的課題**: 原則3は「アクセス管理」に閉じているため、ライフサイクル・マーケティングの自動化を外部機能（補完レイヤー）として定義する必要がある

### 3. アフィリエイター・コミュニティのエンゲージメント
- **要件**: アフィリエイター専用のダッシュボードや、彼らの成果をリアルタイムで称賛する通知システム（Webhook活用）
- **技術的課題**: スカウト自動化は「量」を確保するが、「質（アクティブ率）」の維持には別の施策が必要

### 4. VSL（Video Sales Letter）のパーソナライズ
- **要件**: HeyGen等のAI動画をLPに統合する際、市場ごとの文化的背景に合わせた「背景画像」や「ジェスチャー」の最適化プロセス
- **技術的課題**: 6言語対応において、テキストだけでなく動画の親和性がCVRを左右する

### 5. トラッキングの標準化
- **要件**: \`affiliate_code\` を含む全遷移において、UTMパラメータが正確に引き継がれ、最終的なコンバージョンがどのアフィリエイターに紐づくかを100%保証するテスト仕様
- **技術的課題**: 複数のシステム間でトラッキングパラメータの一貫性を保つ必要がある

### 6. アフィリエイター・リクルートLPのA/Bテスト
- **要件**: 「Hidden Enemy」ストーリーのどのフックが最も反応が良いか、市場別に検証できる体制
- **技術的課題**: A/Bテスト機能の実装と、結果の分析・可視化

### 7. サンクスページの活用
- **要件**: Whop Checkout後のリダイレクト先（サンクスページ）を、単なる完了報告ではなく、Telegram参加を促す「強力なCTAページ」としてLP側で実装
- **技術的課題**: Whop Checkoutからのリダイレクト処理と、LP側での動的なコンテンツ表示

## 現在の技術スタック

\`\`\`typescript
// api/unified-api.tsの主要関数（抜粋）
${unifiedApiCode.substring(0, 2000)} // 最初の2000文字のみ
\`\`\`

## 技術的実装計画の出力形式

以下の形式で技術的実装計画を返してください：

# CTO技術的実装計画: CMO改善提案の実装

## 📋 実装計画サマリー

## 🏗️ アーキテクチャ設計

### 1. データ計測とアトリビューションの原則
- システムアーキテクチャ
- データフロー設計
- 統合ポイントの定義
- 技術スタック選定

### 2. リテンション・ナーチャリングの自動化
- システムアーキテクチャ
- ワークフロー設計
- 外部機能（補完レイヤー）の実装方法
- 技術スタック選定

### 3. アフィリエイター・コミュニティのエンゲージメント
- システムアーキテクチャ
- ダッシュボード設計
- Webhook統合設計
- 技術スタック選定

### 4. VSL（Video Sales Letter）のパーソナライズ
- システムアーキテクチャ
- 動画生成パイプライン設計
- 市場別最適化プロセス
- 技術スタック選定

### 5. トラッキングの標準化
- トラッキングパラメータ設計
- システム間連携設計
- テスト仕様
- 技術スタック選定

### 6. アフィリエイター・リクルートLPのA/Bテスト
- A/Bテストシステム設計
- データ収集・分析設計
- 可視化ダッシュボード設計
- 技術スタック選定

### 7. サンクスページの活用
- リダイレクト処理設計
- 動的コンテンツ表示設計
- CTA最適化設計
- 技術スタック選定

## 📝 実装フェーズ

### Phase 1: 基盤構築（優先度: 高）
- 実装項目
- 技術的タスク
- 見積もり工数
- 依存関係

### Phase 2: 統合・連携（優先度: 高）
- 実装項目
- 技術的タスク
- 見積もり工数
- 依存関係

### Phase 3: 最適化・拡張（優先度: 中）
- 実装項目
- 技術的タスク
- 見積もり工数
- 依存関係

## 🔧 技術的詳細

### 使用する技術スタック
- フロントエンド
- バックエンド
- データベース
- 外部サービス統合
- インフラ

### 実装上の注意点
- パフォーマンス
- スケーラビリティ
- セキュリティ
- メンテナンス性

## 📊 実装優先順位

各改善提案の実装優先順位と理由を記載してください。

## ✅ 実装チェックリスト

各フェーズごとの実装チェックリストを記載してください。

## 🎯 結論

技術的実装計画の総括と、次のステップを記載してください。

技術的実装計画を日本語で、構造化された形式で返してください。`;

async function main() {
  try {
    console.log('📋 CTO: GPT (Architect)に技術的実装計画を依頼中...\n');
    
    const result = await callGPT52(technicalPlanPrompt, {
      maxCompletionTokens: 8000,
      temperature: 0.7,
    });
    
    console.log('='.repeat(80));
    console.log('CTO技術的実装計画');
    console.log('='.repeat(80));
    console.log('\n');
    console.log(result.text);
    console.log('\n');
    console.log('='.repeat(80));
    
    if (result.usage) {
      console.log('\n📊 使用量:');
      console.log(`  - Prompt Tokens: ${result.usage.prompt_token_count || 'N/A'}`);
      console.log(`  - Completion Tokens: ${result.usage.completion_token_count || 'N/A'}`);
      console.log(`  - Total Tokens: ${result.usage.total_token_count || 'N/A'}`);
    }
    
    // 結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'CTO_TECHNICAL_PLAN_CMO_IMPROVEMENTS.md');
    const output = `# CTO技術的実装計画: CMO改善提案の実装

**作成日**: ${new Date().toISOString()}  
**作成者**: GPT: CTO (gpt-5.2-2025-12-11)  
**依頼者**: COO: Cursor (Composer)  
**基づくレビュー**: CMOレビュー結果（\`docs/CMO_REVIEW_RESULT_WHOP_ARCHITECTURE_PRINCIPLES.md\`）

---

${result.text}

---

## 使用量

${result.usage ? `
- Prompt Tokens: ${result.usage.prompt_token_count || 'N/A'}
- Completion Tokens: ${result.usage.completion_token_count || 'N/A'}
- Total Tokens: ${result.usage.total_token_count || 'N/A'}
` : 'N/A'}

---

**最終更新**: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`\n✅ 技術的実装計画を保存しました: ${outputPath}`);
    
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
