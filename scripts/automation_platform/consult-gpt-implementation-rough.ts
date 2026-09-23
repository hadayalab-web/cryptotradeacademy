#!/usr/bin/env tsx
/**
 * 実装/行動ラフ - GPTに確認
 * Grok/Geminiの相談結果とCOO作成のラフをGPTに確認してもらう
 */

import { callGPT52 } from '../api/unified-api.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 最新のGrok/Gemini相談結果を読み込む
 */
function getLatestGrokGeminiResult(): string {
  const docsDir = join(__dirname, '..', 'docs');
  const files = fs.readdirSync(docsDir)
    .filter(f => f.startsWith('USER_DIRECT_SALES_STRATEGY_'))
    .sort()
    .reverse();

  if (files.length === 0) {
    return 'Grok/Geminiの相談結果がまだありません。';
  }

  const latestFile = files[0];
  const content = fs.readFileSync(join(docsDir, latestFile), 'utf-8');
  return content;
}

/**
 * COO作成のラフを読み込む
 */
function getImplementationRough(): string {
  const roughPath = join(__dirname, '..', 'docs', 'USER_DIRECT_SALES_IMPLEMENTATION_ROUGH.md');
  if (fs.existsSync(roughPath)) {
    return fs.readFileSync(roughPath, 'utf-8');
  }
  return 'COO作成のラフがまだありません。';
}

// GPTに依頼するプロンプト（CTO/CPO視点）
const gptPrompt = `【実装/行動ラフの確認をお願いします】

## ユーザー指示
- アフィリエイター戦略をいったん保留
- ユーザーへ直接営業特化
- VSL+セールスレターのDM→Whopページへ
- X APIも活用（Freeプラン）※これは手段の一つ、これに特化ではない
- 戦略はシンプル+成果は最大限
- 週末まで$100,000売上必達

## Grok/Gemini相談結果
${getLatestGrokGeminiResult()}

## COO作成の実装/行動ラフ
${getImplementationRough()}

## レビュー観点（CTO/CPO視点）

1. **技術的実装の妥当性**
   - 既存リソースの活用が適切か
   - 実装の難易度は適切か
   - 実行時間の見積もりは適切か

2. **シンプルさ**
   - 複雑すぎないか
   - よりシンプルな方法はないか

3. **成果最大化**
   - 期待売上が適切か
   - より効果的な方法はないか

4. **リスク管理**
   - リスクは適切に評価されているか
   - 対策は十分か

## 出力形式

以下の形式で出力してください：

### ✅ 承認項目
- [承認項目1]
- [承認項目2]
- [承認項目3]

### ⚠️ 改善提案
- [改善提案1]
- [改善提案2]
- [改善提案3]

### ❌ 問題点
- [問題点1]
- [問題点2]
- [問題点3]

### 📊 総合評価
- **実装可能性**: X/10
- **期待成果**: $XX,XXX
- **リスク**: 低/中/高
- **承認**: 承認/条件付き承認/要修正

**シンプルで成果最大限の実装/行動ラフになっているか確認してください。ごまかさず、具体的に。**`;

async function main() {
  console.log('📋 Grok/Gemini相談結果とCOO作成ラフをGPTに確認中...\n');

  try {
    // GPTを呼び出す（CTO/CPO視点）
    console.log('⚙️ GPT（CTO/CPO視点）に実装/行動ラフの確認を依頼中...');
    const gptResult = await callGPT52(gptPrompt, {
      temperature: 0.7,
      maxCompletionTokens: 4096
    });
    console.log('✅ GPT完了');

    // 結果を保存
    const timestamp = Date.now();
    const outputDir = join(__dirname, '..', 'docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = join(outputDir, `GPT_REVIEW_IMPLEMENTATION_ROUGH_${timestamp}.md`);

    fs.writeFileSync(outputPath, `# 実装/行動ラフ - GPT確認結果

**生成日時**: ${new Date().toISOString()}

---

## ⚙️ GPTレビュー（CTO/CPO視点）

${gptResult.text}

---

## 🎯 次のステップ

GPT確認後、COOが正式に実装/行動します。

`, 'utf-8');

    console.log('\n✅ GPT確認完了！');
    console.log(`📄 結果: ${outputPath}`);
    console.log('\n⚙️ GPTレビュー結果:');
    console.log('---');
    console.log(gptResult.text.substring(0, 1000) + '...');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

main();
