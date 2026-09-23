/**
 * GPTにGrok×GPTの相乗効果最大化について質問するスクリプト
 */

import { callGPT52 } from '../../../scripts/direct-ai-api.js';
import * as fs from 'fs';
import * as path from 'path';

const prompt = `あなたはGPT AIの専門家であり、GrokとGPTの統合戦略のエキスパートです。以下のアフィリエイター募集自動化プログラム「Affiliate Scout」について、GPTのポテンシャルを最大限に引き出し、かつGrok×GPTの相乗効果を最大化する方法を評価してください。

## プログラム概要

Affiliate Scoutは、アフィリエイター候補を自動で発見・分析・接触する統合ワークフローです。

## 現在のGrok実装状況

### Grokの使用箇所
1. **アフィリエイター候補検索**
   - Grok APIを使用して候補を検索
   - プラットフォーム: X, Telegram, YouTube, LinkedIn, Instagram
   - モデル: grok-4-1-fast-reasoning
   - 機能: クエリ自動生成、エンハンスト検索、バッチ処理

2. **Grok深掘り分析**
   - 優先順位付け、成長予測、コンバージョン可能性予測
   - コンテンツスタイル分析
   - Chain-of-Thoughtプロンプト使用

3. **パーソナライズDM生成**
   - Grokで候補プロフィールからカスタムメッセージ生成

4. **リアルタイムトレンド監視**
   - トレンドキーワードの監視
   - 急上昇インフルエンサーの自動抽出

### Grokの強み（実装済み）
- ✅ リアルタイム情報アクセス（X統合）
- ✅ 高速推論（grok-4-1-fast-reasoning）
- ✅ セマンティック検索
- ✅ Chain-of-Thoughtプロンプト
- ✅ Few-shot例の挿入
- ✅ バッチ処理と並列化
- ✅ キャッシュ機能

## 現在のGPT実装状況

### GPTの使用箇所
1. **GPT分析ワークフロー**（/api/workflows/affiliate-analyze）
   - Grokでストックした候補をGPTで分析
   - 優先順位付け分析
   - コンテンツスタイル分析
   - モデル: GPT-4o または GPT-5.2

2. **DM生成**（一部）
   - GPT-4oでパーソナライズDM生成

### GPTの強み
- 深い推論能力
- 高品質な文章生成
- 多言語対応
- 構造化された分析

## 現在のワークフロー

1. Grokクエリ自動生成
   ↓
2. Grokエンハンスト候補検索（バッチ処理）
   ↓
3. Grok深掘り分析（優先順位付け、成長予測）
   ↓
4. GPT分析（重複？）← ここが疑問
   ↓
5. GrokパーソナライズDM生成
   ↓
6. Telegram DM送信

## 質問

1. **GPTのポテンシャルを最大限に引き出す方法は？**
   - 現在のGPT実装でGPTの強み（深い推論、高品質文章生成、構造化分析）を活用できているか？
   - GPT-5.2の推論能力（reasoningEffort）を活用できているか？
   - 改善の余地はあるか？

2. **Grok×GPTの相乗効果を最大化する方法は？**
   - 現在のワークフローでGrokとGPTの役割分担は最適か？
   - GrokとGPTをどのように組み合わせれば相乗効果が最大化されるか？
   - 重複している処理（Grok分析とGPT分析）は統合すべきか？

3. **最適な役割分担の提案**
   - Grokが得意な領域: リアルタイム情報、高速検索、X統合
   - GPTが得意な領域: 深い推論、高品質文章生成、構造化分析
   - どのように役割分担すべきか？

4. **具体的な改善提案**
   - コードレベルの改善
   - ワークフローの改善
   - プロンプトの改善
   - モデル選択の最適化

5. **相乗効果を最大化する統合戦略**
   - Grokの検索結果をGPTの深い推論で強化する方法
   - GPTの分析結果をGrokのリアルタイム情報で更新する方法
   - 両者の強みを活かしたハイブリッドアプローチ

6. **パフォーマンスとコストの最適化**
   - GrokとGPTの使い分けによるコスト削減
   - 処理速度の最適化
   - 品質とコストのバランス

日本語で回答してください。`;

async function main() {
  try {
    console.log('🤖 GPTに質問を送信中...\n');
    console.log('=' .repeat(60));
    console.log('');
    
    const result = await callGPT52(prompt, {
      temperature: 0.7,
      maxCompletionTokens: 4000,
    });
    
    console.log('📝 GPTの回答:');
    console.log('');
    console.log(result.text);
    console.log('');
    console.log('=' .repeat(60));
    console.log('');
    
    if (result.usage) {
      console.log('📊 使用量:');
      console.log(`  - Prompt Tokens: ${result.usage.prompt_token_count || 'N/A'}`);
      console.log(`  - Completion Tokens: ${result.usage.completion_token_count || 'N/A'}`);
      console.log(`  - Total Tokens: ${result.usage.total_tokens || 'N/A'}`);
      console.log('');
    }
    
    // 結果をファイルに保存
    const outputPath = path.join(process.cwd(), 'GPT_SYNERGY_REVIEW.md');
    
    const output = `# GPTポテンシャル最大化 & Grok×GPT相乗効果レビュー

**質問日**: ${new Date().toISOString()}  
**質問方法**: direct-ai-api.ts経由  
**モデル**: GPT-5.2 (gpt-5.2-2025-12-11)

---

## 質問内容

${prompt}

---

## GPTの回答

${result.text}

---

## 使用量

${result.usage ? `
- Prompt Tokens: ${result.usage.prompt_token_count || 'N/A'}
- Completion Tokens: ${result.usage.completion_token_count || 'N/A'}
- Total Tokens: ${result.usage.total_tokens || 'N/A'}
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
