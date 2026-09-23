/**
 * GrokにAffiliate ScoutプログラムのGrokポテンシャルについて質問するスクリプト
 */

import { callGrok41FastReasoning } from '../../../scripts/direct-ai-api.js';

const prompt = `あなたはGrok AIの専門家です。以下のアフィリエイター募集自動化プログラム「Affiliate Scout」について、Grokのポテンシャルを最大限に発揮できているかを評価してください。

## プログラム概要

Affiliate Scoutは、アフィリエイター候補を自動で発見・分析・接触する統合ワークフローです。

## Grokの現在の使用状況

### 1. アフィリエイター候補検索
- **用途**: Grok APIを使用してアフィリエイター候補を検索
- **プラットフォーム**: X (Twitter), Telegram, YouTube, LinkedIn, Instagram
- **検索方法**: 検索クエリベース（例: "crypto trading", "bitcoin analysis"）
- **出力**: 候補者の情報（名前、Email、Telegram User ID、フォロワー数、エンゲージメント率など）
- **モデル**: grok-4-1-fast-reasoning または grok-beta

### 2. 実装詳細

**プロンプト構造**:
- System prompt: "You are an expert affiliate recruiter. Extract affiliate candidates from various platforms..."
- User prompt: 検索クエリ、プラットフォーム、市場コード、最大候補数、最小マッチスコアを含む

**出力形式**:
- JSON形式で候補者配列を返す
- 各候補者には以下が含まれる:
  - id, name, email, telegram_user_id
  - platform (X, Telegram, YouTube, etc.)
  - follower_count, engagement_rate
  - match_score, cv_score
  - market (EN, AR, KO, JA, ES, PT-BR)
  - profile_url

**ワークフローでの位置づけ**:
1. アフィリエイト展開ワークフロー実行
2. **Grok APIでアフィリエイター候補検索** ← ここでGrokを使用
3. GPT分析（Grokでストックした候補をGPTで分析・優先順位付け）
4. Telegram DM送信
5. Email送信

### 3. 現在の制約

- **検索クエリ**: 手動で指定する必要がある
- **プラットフォーム**: 固定リスト（X, Telegram, YouTube, LinkedIn, Instagram）
- **候補数**: 最大20-100人/クエリ
- **マッチスコア**: 最小7以上でフィルタリング
- **モデル**: grok-4-1-fast-reasoning または grok-beta

## 質問

1. **Grokのポテンシャルを最大限に発揮できているか？**
   - 現在の実装でGrokの強み（リアルタイム情報、X統合、推論能力）を活用できているか？
   - 改善の余地はあるか？

2. **より効果的なGrok活用方法は？**
   - 検索クエリの最適化方法
   - プロンプトエンジニアリングの改善
   - モデル選択（grok-4-1-fast-reasoning vs grok-beta）
   - プラットフォーム別の最適化

3. **Grokの特徴を活かした機能追加の提案**
   - リアルタイム情報の活用
   - X統合の強化
   - 推論能力を活かした分析

4. **パフォーマンスとコストの最適化**
   - API呼び出しの効率化
   - コスト削減の方法
   - レート制限の最適化

5. **具体的な改善提案**
   - コードレベルの改善
   - プロンプトの改善
   - ワークフローの改善

日本語で回答してください。`;

async function main() {
  try {
    console.log('🤖 Grokに質問を送信中...\n');
    console.log('=' .repeat(60));
    console.log('');
    
    const result = await callGrok41FastReasoning(prompt, {
      temperature: 0.7,
      maxTokens: 4000,
    });
    
    console.log('📝 Grokの回答:');
    console.log('');
    console.log(result.text);
    console.log('');
    console.log('=' .repeat(60));
    console.log('');
    
    if (result.usage) {
      console.log('📊 使用量:');
      console.log(`  - Prompt Tokens: ${result.usage.promptTokenCount || 'N/A'}`);
      console.log(`  - Completion Tokens: ${result.usage.candidatesTokenCount || 'N/A'}`);
      console.log(`  - Total Tokens: ${result.usage.totalTokenCount || 'N/A'}`);
      console.log('');
    }
    
    // 結果をファイルに保存
    const fs = await import('fs');
    const path = await import('path');
    const outputPath = path.join(process.cwd(), 'GROK_POTENTIAL_REVIEW.md');
    
    const output = `# Grokポテンシャルレビュー - Affiliate Scout

**質問日**: ${new Date().toISOString()}  
**質問方法**: direct-ai-api.ts経由  
**モデル**: grok-4-1-fast-reasoning

---

## 質問内容

${prompt}

---

## Grokの回答

${result.text}

---

## 使用量

${result.usage ? `
- Prompt Tokens: ${result.usage.promptTokenCount || 'N/A'}
- Completion Tokens: ${result.usage.candidatesTokenCount || 'N/A'}
- Total Tokens: ${result.usage.totalTokenCount || 'N/A'}
` : 'N/A'}

---

**最終更新**: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`✅ 結果を保存しました: ${outputPath}`);
    
  } catch (error: any) {
    console.error('❌ エラーが発生しました:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
