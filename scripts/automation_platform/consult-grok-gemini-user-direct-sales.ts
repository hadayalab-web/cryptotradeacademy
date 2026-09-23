#!/usr/bin/env tsx
/**
 * ユーザー直接営業戦略 - Grok/Geminiに相談
 * ユーザーの指示を基に、Grok/Geminiに戦略を相談してから実装計画を作成
 */

import { callGrok41FastReasoning, callGemini3Pro } from '../api/unified-api.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ユーザーの指示
const USER_INSTRUCTIONS = `
【ユーザー指示】
- アフィリエイター戦略をいったん保留
- ユーザーへ直接営業特化
- VSL+セールスレターのDM→Whopページへ
- X APIも活用（Freeプラン）※これは手段の一つ、これに特化ではない
- 戦略はシンプル+成果は最大限
- 週末まで$100,000売上必達
`;

// Grokに依頼するプロンプト（CFO/CRO視点）
const grokPrompt = `【ユーザー指示を基に戦略を考えてください】

${USER_INSTRUCTIONS}

## 現状
- EN版Whopプロダクトページ: ✅ 完全実装済み
- 他の市場（AR, KO, JA, ES, PT-BR）: ⏳ プロダクトID存在
- データベース: ✅ affiliate_candidatesテーブルあり
- Telegram/Resend: ✅ DM送信・メール送信の実装あり
- HeyGen: ✅ VSL生成の実装あり
- X API: ⏳ Freeプラン利用可能（100 posts/月読み取り、500 posts/月書き込み）

## 目標
- 週末まで$100,000売上必達
- ユーザー直接営業特化
- VSL+セールスレターのDM→Whopページへ誘導

## レビュー観点（CFO/CRO視点）

1. **リスト収集戦略**
   - X API（Freeプラン）を含むあらゆる手段
   - シンプルで成果最大限
   - 即効性のある方法

2. **DM送信戦略**
   - VSL+セールスレターの組み合わせ
   - Whopページへの誘導最大化
   - CVR最大化

3. **実装優先順位**
   - 最もROIが高い実装から
   - 即効性のある実装を優先

## 出力形式

以下の形式で出力してください：

### 🎯 ユーザー直接営業戦略

#### リスト収集方法（優先順位順）
1. [方法1] - 期待リスト数: XX,XXX人、実行時間: X時間
2. [方法2] - 期待リスト数: XX,XXX人、実行時間: X時間
3. [方法3] - 期待リスト数: XX,XXX人、実行時間: X時間

#### DM送信戦略
- **VSL活用**: [具体的な活用方法]
- **セールスレター**: [具体的な戦略]
- **Whop誘導**: [具体的な方法]
- **期待CVR**: X%

#### 実装優先順位
1. [実装1] - 期待売上: $XX,XXX、実行時間: X時間
2. [実装2] - 期待売上: $XX,XXX、実行時間: X時間
3. [実装3] - 期待売上: $XX,XXX、実行時間: X時間

### 📊 総合評価
- **合計期待売上**: $XX,XXX
- **実装可能性**: X/10
- **リスク**: 低/中/高

**シンプルで成果最大限の戦略を提案してください。ごまかさず、具体的に。**`;

// Geminiに依頼するプロンプト（CMO視点）
const geminiPrompt = `【ユーザー指示を基にマーケティング戦略を考えてください】

${USER_INSTRUCTIONS}

## 現状
- EN版Whopプロダクトページ: ✅ 完全実装済み
- 他の市場（AR, KO, JA, ES, PT-BR）: ⏳ プロダクトID存在
- Telegram/Resend: ✅ DM送信・メール送信の実装あり
- HeyGen: ✅ VSL生成の実装あり
- X API: ⏳ Freeプラン利用可能

## 目標
- 週末まで$100,000売上必達
- ユーザー直接営業特化
- VSL+セールスレターのDM→Whopページへ誘導

## レビュー観点（CMO視点）

1. **リスト収集戦略**
   - X APIを含むあらゆる手段
   - 各市場に最適なチャネル
   - シンプルで成果最大限

2. **VSL+セールスレター戦略**
   - 各市場に最適なメッセージング
   - VSLの活用方法
   - DM→Whop誘導の最適化

3. **CVR最大化**
   - DMの最適化
   - Whopページの最適化
   - コンバージョン導線の最適化

## 出力形式

以下の形式で出力してください：

### 🎯 マーケティング戦略

#### リスト収集チャネル（優先順位順）
1. [チャネル1] - 期待リスト数: XX,XXX人、CVR: X%
2. [チャネル2] - 期待リスト数: XX,XXX人、CVR: X%
3. [チャネル3] - 期待リスト数: XX,XXX人、CVR: X%

#### VSL+セールスレター戦略
- **VSL生成**: [具体的な方法]
- **セールスレター**: [具体的な戦略]
- **DM構成**: [具体的な構成]
- **期待CVR**: X%

#### 市場別戦略
- **EN**: [戦略]
- **AR**: [戦略]
- **KO**: [戦略]
- **JA**: [戦略]
- **ES**: [戦略]
- **PT-BR**: [戦略]

### 📊 総合評価
- **合計期待売上**: $XX,XXX
- **実装可能性**: X/10
- **リスク**: 低/中/高

**シンプルで成果最大限のマーケティング戦略を提案してください。ごまかさず、具体的に。**`;

async function main() {
  console.log('📋 ユーザー指示を確認しました');
  console.log(USER_INSTRUCTIONS);
  console.log('\n💰 Grok/Geminiに相談中...\n');

  try {
    // Grokを呼び出す（CFO/CRO視点）
    console.log('💰 Grok（CFO/CRO視点）に戦略を相談中...');
    const grokResult = await callGrok41FastReasoning(grokPrompt, {
      temperature: 0.7,
      maxTokens: 4096
    });
    console.log('✅ Grok完了');

    // Geminiを呼び出す（CMO視点）
    console.log('📢 Gemini（CMO視点）にマーケティング戦略を相談中...');
    const geminiResult = await callGemini3Pro(geminiPrompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 4096
    });
    console.log('✅ Gemini完了');

    // 結果を保存
    const timestamp = Date.now();
    const outputDir = join(__dirname, '..', 'docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = join(outputDir, `USER_DIRECT_SALES_STRATEGY_${timestamp}.md`);

    fs.writeFileSync(outputPath, `# ユーザー直接営業戦略 - Grok/Gemini相談結果

**生成日時**: ${new Date().toISOString()}
**ユーザー指示**: 
${USER_INSTRUCTIONS}

---

## 💰 Grokレビュー（CFO/CRO視点）

${grokResult.text}

---

## 📢 Geminiレビュー（CMO視点）

${geminiResult.text}

---

## 🎯 次のステップ

1. COO（Cursor/Composer 1）が実装/行動ラフを作成
2. GPTに確認
3. COOが正式に実装/行動

`, 'utf-8');

    console.log('\n✅ Grok/Geminiへの相談完了！');
    console.log(`📄 結果: ${outputPath}`);
    console.log('\n💰 Grokレビュー結果:');
    console.log('---');
    console.log(grokResult.text.substring(0, 1000) + '...');
    console.log('\n📢 Geminiレビュー結果:');
    console.log('---');
    console.log(geminiResult.text.substring(0, 1000) + '...');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

main();
