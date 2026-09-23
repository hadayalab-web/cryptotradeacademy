#!/usr/bin/env tsx
/**
 * Whopページレビュースクリプト（API確認版）
 * Whop APIを使って実際のページ内容を取得し、ファイルと比較
 */

import { getWhopProduct } from '../api/unified-api.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PRODUCT_ID = 'prod_6RjqaJMGyEw1F';

async function reviewWhopPage() {
  console.log('📢 Whop APIでプロダクト情報を取得中...\n');

  try {
    // Whop APIからプロダクト情報を取得
    const product = await getWhopProduct(PRODUCT_ID);
    
    console.log('✅ Whop API取得成功\n');
    console.log('='.repeat(80));
    console.log('📊 Whop API取得結果');
    console.log('='.repeat(80));
    console.log(JSON.stringify(product, null, 2));
    console.log('='.repeat(80));
    console.log('');

    // ファイルから期待値を読み込む
    const filePath = join(__dirname, '..', 'docs', 'WHOP_EN_COPY_PASTE_READY_FINAL.md');
    const fileContent = readFileSync(filePath, 'utf-8');

    // Headlineを抽出
    const headlineMatch = fileContent.match(/```\n([^\n]+)\n```/);
    const expectedHeadline = headlineMatch ? headlineMatch[1] : '';

    // Descriptionを抽出
    const descMatch = fileContent.match(/## 📝 Description[\s\S]*?```\n([\s\S]*?)\n```/);
    const expectedDescription = descMatch ? descMatch[1].trim() : '';

    // Featuresを抽出
    const featuresMatches = fileContent.matchAll(/### Feature \d+\n```\n([^\n]+)\n```/g);
    const expectedFeatures: string[] = [];
    for (const match of featuresMatches) {
      expectedFeatures.push(match[1]);
    }

    // FAQを抽出
    const faqMatches = fileContent.matchAll(/### FAQ \d+: Question\n```\n([^\n]+)\n```[\s\S]*?### FAQ \d+: Answer\n```\n([^\n]+)\n```/g);
    const expectedFAQ: Array<{ question: string; answer: string }> = [];
    for (const match of faqMatches) {
      expectedFAQ.push({
        question: match[1],
        answer: match[2]
      });
    }

    // 実際のWhopページの内容を取得
    const actualHeadline = product.data?.headline || product.headline || '';
    const actualDescription = product.data?.description || product.description || '';
    const actualFeatures = product.data?.features || product.features || [];
    const actualFAQ = product.data?.faq || product.faq || [];

    // レビュー結果を作成
    const reviewResult = {
      headline: {
        expected: expectedHeadline,
        actual: actualHeadline,
        match: expectedHeadline === actualHeadline,
        expectedLength: expectedHeadline.length,
        actualLength: actualHeadline.length
      },
      description: {
        expected: expectedDescription,
        actual: actualDescription,
        match: expectedDescription === actualDescription,
        expectedLength: expectedDescription.length,
        actualLength: actualDescription.length
      },
      features: {
        expected: expectedFeatures,
        actual: actualFeatures,
        match: JSON.stringify(expectedFeatures) === JSON.stringify(actualFeatures),
        count: {
          expected: expectedFeatures.length,
          actual: actualFeatures.length
        }
      },
      faq: {
        expected: expectedFAQ,
        actual: actualFAQ,
        match: JSON.stringify(expectedFAQ) === JSON.stringify(actualFAQ),
        count: {
          expected: expectedFAQ.length,
          actual: actualFAQ.length
        }
      }
    };

    // レビュー結果を表示
    console.log('📋 レビュー結果');
    console.log('='.repeat(80));
    console.log('\n1. Headline:');
    console.log(`   期待値: "${reviewResult.headline.expected}" (${reviewResult.headline.expectedLength}字)`);
    console.log(`   実際値: "${reviewResult.headline.actual}" (${reviewResult.headline.actualLength}字)`);
    console.log(`   一致: ${reviewResult.headline.match ? '✅' : '❌'}`);

    console.log('\n2. Description:');
    console.log(`   期待値: ${reviewResult.description.expectedLength}字`);
    console.log(`   実際値: ${reviewResult.description.actualLength}字`);
    console.log(`   一致: ${reviewResult.description.match ? '✅' : '❌'}`);
    if (!reviewResult.description.match) {
      console.log(`   期待値（最初の100字）: ${reviewResult.description.expected.substring(0, 100)}...`);
      console.log(`   実際値（最初の100字）: ${reviewResult.description.actual.substring(0, 100)}...`);
    }

    console.log('\n3. Features:');
    console.log(`   期待値: ${reviewResult.features.count.expected}項目`);
    console.log(`   実際値: ${reviewResult.features.count.actual}項目`);
    console.log(`   一致: ${reviewResult.features.match ? '✅' : '❌'}`);
    if (!reviewResult.features.match) {
      console.log('   期待値:');
      reviewResult.features.expected.forEach((f, i) => {
        console.log(`     ${i + 1}. ${f.substring(0, 50)}... (${f.length}字)`);
      });
      console.log('   実際値:');
      reviewResult.features.actual.forEach((f: string, i: number) => {
        console.log(`     ${i + 1}. ${f.substring(0, 50)}... (${f.length}字)`);
      });
    }

    console.log('\n4. FAQ:');
    console.log(`   期待値: ${reviewResult.faq.count.expected}項目`);
    console.log(`   実際値: ${reviewResult.faq.count.actual}項目`);
    console.log(`   一致: ${reviewResult.faq.match ? '✅' : '❌'}`);

    // レビュー結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'WHOP_PAGE_REVIEW_RESULT_API.md');
    const reviewContent = `# Whopページレビュー結果（API確認版）

**レビュー日時**: ${new Date().toISOString()}
**プロダクトID**: ${PRODUCT_ID}
**Whop URL**: https://whop.com/products/${PRODUCT_ID}

---

## 📊 API取得結果

\`\`\`json
${JSON.stringify(product, null, 2)}
\`\`\`

---

## 📋 レビュー結果

### 1. Headline

**期待値**: \`${reviewResult.headline.expected}\` (${reviewResult.headline.expectedLength}字)
**実際値**: \`${reviewResult.headline.actual}\` (${reviewResult.headline.actualLength}字)
**状態**: ${reviewResult.headline.match ? '✅ 一致' : '❌ 不一致'}

### 2. Description

**期待値**: ${reviewResult.description.expectedLength}字
**実際値**: ${reviewResult.description.actualLength}字
**状態**: ${reviewResult.description.match ? '✅ 一致' : '❌ 不一致'}

${!reviewResult.description.match ? `
**期待値（最初の200字）**:
\`\`\`
${reviewResult.description.expected.substring(0, 200)}...
\`\`\`

**実際値（最初の200字）**:
\`\`\`
${reviewResult.description.actual.substring(0, 200)}...
\`\`\`
` : ''}

### 3. Features

**期待値**: ${reviewResult.features.count.expected}項目
**実際値**: ${reviewResult.features.count.actual}項目
**状態**: ${reviewResult.features.match ? '✅ 一致' : '❌ 不一致'}

${!reviewResult.features.match ? `
**期待値**:
${reviewResult.features.expected.map((f, i) => `${i + 1}. ${f} (${f.length}字)`).join('\n')}

**実際値**:
${reviewResult.features.actual.map((f: string, i: number) => `${i + 1}. ${f} (${f.length}字)`).join('\n')}
` : ''}

### 4. FAQ

**期待値**: ${reviewResult.faq.count.expected}項目
**実際値**: ${reviewResult.faq.count.actual}項目
**状態**: ${reviewResult.faq.match ? '✅ 一致' : '❌ 不一致'}

---

## 🎯 総合評価

- **Headline**: ${reviewResult.headline.match ? '✅' : '❌'}
- **Description**: ${reviewResult.description.match ? '✅' : '❌'}
- **Features**: ${reviewResult.features.match ? '✅' : '❌'}
- **FAQ**: ${reviewResult.faq.match ? '✅' : '❌'}

**全体一致**: ${reviewResult.headline.match && reviewResult.description.match && reviewResult.features.match && reviewResult.faq.match ? '✅ 完全一致' : '⚠️ 一部不一致'}

---

**レビュー者**: COO（Cursor/Composer 1）
`;

    writeFileSync(outputPath, reviewContent, 'utf-8');
    console.log(`\n✅ レビュー結果を保存しました: ${outputPath}\n`);

    return reviewResult;
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

reviewWhopPage()
  .then(() => {
    console.log('✅ レビュー完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  });
