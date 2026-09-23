#!/usr/bin/env tsx
/**
 * GrokとGeminiにアフィリエイター向けLPファイルのレビューを依頼するスクリプト
 * アフィリエイター向けLPに特化したレビュー
 */

import { callGrok41FastReasoning, callGemini3Pro } from '../api/unified-api.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// アフィリエイター向けLPファイルのパス
const affiliateLPPath = join(__dirname, '..', 'hadayalab-website-dev', 'cryptotradeacademy-lp-dev', 'cryptotradeacademy-lp-en', 'app', 'affiliate', '[market]', 'page.tsx');
const cvrDataPath = join(__dirname, '..', 'hadayalab-website-dev', 'cryptotradeacademy-lp-dev', 'cryptotradeacademy-lp-en', 'lib', 'cvr-data.ts');

// ファイルの存在確認
if (!fs.existsSync(affiliateLPPath)) {
  throw new Error(`アフィリエイター向けLPファイルが見つかりません: ${affiliateLPPath}`);
}
if (!fs.existsSync(cvrDataPath)) {
  throw new Error(`CVRデータファイルが見つかりません: ${cvrDataPath}`);
}

// ファイルを読み込む
const affiliateLPContent = fs.readFileSync(affiliateLPPath, 'utf-8');
const cvrDataContent = fs.readFileSync(cvrDataPath, 'utf-8');

// Grokに依頼するプロンプト（アフィリエイター向けLP特化レビュー）
const grokPrompt = `以下のアフィリエイター向けLPファイルの実装を厳格にレビューしてください。

## レビュー対象

### 1. アフィリエイター向けLP
ファイルパス: app/affiliate/[market]/page.tsx
\`\`\`typescript
${affiliateLPContent}
\`\`\`

### 2. CVRデータ（参考）
ファイルパス: lib/cvr-data.ts
\`\`\`typescript
${cvrDataContent.substring(0, 5000)}${cvrDataContent.length > 5000 ? '\n... (ファイルが長いため一部省略) ...' : ''}
\`\`\`

## レビュー観点（アフィリエイター向けLP特化）

1. **「隠された敵」×「島への招待」ハイブリッド戦略の実装**: 
   - 「隠された敵」セクション（業界の嘘暴露）が正しく実装されているか
   - 「島への招待」セクション（Hell Island vs Heaven Island）が正しく実装されているか
   - Two Young Men対比画像（Desperate Affiliate vs Successful Affiliate）が実装されているか

2. **報酬構造の実装**:
   - REWARD_STRUCTUREが正しく実装されているか
   - SSOT準拠か（ハードコードではなく、CVR_DATAから取得すべき）
   - プラン選択とWhop Checkoutの統合が正しいか

3. **アフィリエイター向けのベネフィット**:
   - コンバージョン率50%の強調
   - リカーリング報酬の説明
   - ダッシュボードの説明
   - 実績（Success Stories）の表示

4. **登録フォーム**:
   - RegistrationFormコンポーネントが正しく使用されているか
   - #registrationセクションが実装されているか

5. **コード品質**:
   - TypeScriptの型安全性
   - エラーハンドリング
   - 未使用コンポーネントの削除
   - SSOT準拠

## レビュー形式

以下の形式でレビューしてください：

### ✅ 正しく実装されている点
- [具体的な点を列挙]

### ❌ 問題点・改善が必要な点（具体的な修正方法を含む）
- [具体的な問題点と修正方法]

### ⚠️ 致命的な問題（即座に修正が必要）
- [クラッシュや重大なバグ]

### 📊 総合評価
- 実装の正確性: X/10
- 「隠された敵」×「島への招待」戦略の実装: X/10
- 報酬構造の実装: X/10
- コード品質: X/10
- プロダクション品質: X/10

**このアフィリエイター向けLPが本当に正しく実装されているかどうかを厳格に評価してください。ごまかさず、問題があれば具体的に指摘してください。**`;

// Geminiに依頼するプロンプト（アフィリエイター向けLP特化・マーケティング観点）
const geminiPrompt = `以下のアフィリエイター向けLPファイルの実装を、マーケティング戦略とアフィリエイター獲得の観点からレビューしてください。

## レビュー対象

### 1. アフィリエイター向けLP
ファイルパス: app/affiliate/[market]/page.tsx
\`\`\`typescript
${affiliateLPContent}
\`\`\`

### 2. CVRデータ（参考）
ファイルパス: lib/cvr-data.ts
\`\`\`typescript
${cvrDataContent.substring(0, 5000)}${cvrDataContent.length > 5000 ? '\n... (ファイルが長いため一部省略) ...' : ''}
\`\`\`

## レビュー観点（CMO/CKO視点・アフィリエイター獲得特化）

1. **「隠された敵」×「島への招待」ハイブリッド戦略の効果**:
   - アフィリエイターの痛み（成約率の低さ）を正確に突いているか
   - 「業界の嘘」への暴露が説得力があるか
   - Hell Island vs Heaven Islandの対比が明確か

2. **アフィリエイターの心理的トリガー**:
   - 恐怖（FOMO）から優越感へのシフトが実装されているか
   - 「成約率50%」という具体的な数値が強調されているか
   - リカーリング報酬の魅力が伝わっているか

3. **CVR最大化（アフィリエイター登録率）**:
   - 登録フォームへの誘導がスムーズか
   - 報酬構造が明確に表示されているか
   - 実績（Success Stories）が信頼性を高めているか

4. **ストーリーテリング**:
   - Desperate Affiliate vs Successful Affiliateの対比が効果的か
   - 感情喚起と論理的説得のバランス

## レビュー形式

以下の形式でレビューしてください：

### ✅ 優れている点（マーケティング・アフィリエイター獲得観点）
- [具体的な点を列挙]

### ❌ 改善が必要な点
- [具体的な問題点と改善提案]

### 💡 アフィリエイター獲得率向上のための提案
- [具体的な改善提案と期待される登録率向上率]

### 📊 総合評価
- 「隠された敵」×「島への招待」戦略の実装: X/10
- アフィリエイター心理的トリガーの実装: X/10
- CVR最大化（登録率）の実装: X/10
- ストーリーテリング: X/10

**このアフィリエイター向けLPが本当に正しく実装されているかどうかを、マーケティングとアフィリエイター獲得の観点から厳格に評価してください。ごまかさず、問題があれば具体的に指摘してください。**`;

async function main() {
  console.log('🚀 GrokとGeminiにアフィリエイター向けLPファイルのレビューを依頼します...\n');
  console.log(`📄 アフィリエイター向けLP: ${affiliateLPPath}`);
  console.log(`📄 CVRデータ: ${cvrDataPath}\n`);

  try {
    // Grokを呼び出す
    console.log('📊 Grokにレビューを依頼中...');
    const grokResult = await callGrok41FastReasoning(grokPrompt, {
      temperature: 0.3,
      maxTokens: 4096
    });
    console.log('✅ Grok完了');

    // Geminiを呼び出す
    console.log('🎨 Geminiにレビューを依頼中...');
    const geminiResult = await callGemini3Pro(geminiPrompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 4096
    });
    console.log('✅ Gemini完了');

    // 結果を保存
    const timestamp = Date.now();
    const outputDir = join(__dirname, '..', 'hadayalab-website-dev', 'cryptotradeacademy-lp-dev', 'results', 'lp-reviews');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const grokOutputPath = join(outputDir, `grok-affiliate-lp-review-${timestamp}.md`);
    const geminiOutputPath = join(outputDir, `gemini-affiliate-lp-review-${timestamp}.md`);

    fs.writeFileSync(grokOutputPath, `# Grok アフィリエイター向けLPレビュー（厳格評価）

**生成日時**: ${new Date().toISOString()}
**レビュー対象**:
- アフィリエイター向けLP: app/affiliate/[market]/page.tsx
- CVRデータ: lib/cvr-data.ts

---

${grokResult.text}
`);

    fs.writeFileSync(geminiOutputPath, `# Gemini アフィリエイター向けLPレビュー（マーケティング・アフィリエイター獲得観点）

**生成日時**: ${new Date().toISOString()}
**レビュー対象**:
- アフィリエイター向けLP: app/affiliate/[market]/page.tsx
- CVRデータ: lib/cvr-data.ts

---

${geminiResult.text}
`);

    console.log('\n✅ レビュー完了！');
    console.log(`📄 Grokレビュー: ${grokOutputPath}`);
    console.log(`📄 Geminiレビュー: ${geminiOutputPath}`);
    console.log('\n📊 Grokレビュー結果:');
    console.log('---');
    console.log(grokResult.text);
    console.log('\n🎨 Geminiレビュー結果:');
    console.log('---');
    console.log(geminiResult.text);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

main();
