#!/usr/bin/env tsx
/**
 * Whopプロダクトページ検証スクリプト
 * 
 * Whop APIを使ってプロダクト情報を取得し、CEOが編集した内容を確認
 */

import { getWhopProduct, getWhopAffiliates } from '../api/unified-api';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// .envファイルを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// プロダクトIDを環境変数から取得（EN市場）
// EN市場のプロダクトID: prod_6RjqaJMGyEw1F
const WHOP_PRODUCT_ID_EN = process.env.WHOP_PRODUCT_ID_EN || 'prod_6RjqaJMGyEw1F';

async function main() {
  try {
    console.log('📋 Whop APIからプロダクト情報を取得中...\n');
    console.log(`プロダクトID: ${WHOP_PRODUCT_ID_EN}\n`);
    
    if (!WHOP_PRODUCT_ID_EN) {
      throw new Error('WHOP_PRODUCT_ID_EN is not set');
    }
    
    if (!process.env.WHOP_API_KEY) {
      throw new Error('WHOP_API_KEY is not set in .env file');
    }

    // Whop APIでプロダクト情報を取得
    const product = await getWhopProduct(WHOP_PRODUCT_ID_EN);

    console.log('='.repeat(80));
    console.log('Whopプロダクト情報（API取得）');
    console.log('='.repeat(80));
    console.log('\n');

    // プロダクト基本情報
    console.log('## プロダクト基本情報');
    console.log(`- ID: ${product.id}`);
    console.log(`- 名前: ${product.name}`);
    console.log(`- タイトル: ${product.title || 'N/A'}`);
    console.log(`- 説明: ${product.description?.substring(0, 200) || 'N/A'}...`);
    console.log(`- カテゴリ: ${product.category || 'N/A'}`);
    console.log(`- タイプ: ${product.type || 'N/A'}`);
    console.log(`- 可視性: ${product.visibility || 'N/A'}`);
    console.log('\n');

    // プラン情報
    if (product.plans && Array.isArray(product.plans)) {
      console.log('## プラン情報');
      product.plans.forEach((plan: any, index: number) => {
        console.log(`\nプラン ${index + 1}:`);
        console.log(`  - ID: ${plan.id || 'N/A'}`);
        console.log(`  - 名前: ${plan.name || 'N/A'}`);
        console.log(`  - 価格: $${plan.price || 'N/A'}`);
        console.log(`  - 期間: ${plan.interval_count || 'N/A'} ${plan.interval || 'N/A'}`);
        console.log(`  - トライアル: ${plan.trial_period_days || 0}日`);
      });
      console.log('\n');
    }

    // アフィリエイト情報
    console.log('## アフィリエイト情報');
    try {
      const affiliates = await getWhopAffiliates({ productId: WHOP_PRODUCT_ID_EN });
      console.log(`- アフィリエイター数: ${affiliates.length}`);
      if (affiliates.length > 0) {
        console.log(`- 報酬率: ${affiliates[0].commissionRate || 'N/A'}%`);
        console.log(`- サンプルアフィリエイターコード: ${affiliates[0].code || 'N/A'}`);
      }
    } catch (error: any) {
      console.log(`- エラー: ${error.message}`);
    }
    console.log('\n');

    // 結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'WHOP_PRODUCT_API_VERIFICATION.md');
    const output = `# Whopプロダクトページ検証レポート（API取得）

**検証日**: ${new Date().toISOString()}  
**検証者**: COO: Cursor (Composer 1)  
**検証対象**: Whop API経由で取得したプロダクト情報  
**プロダクトID**: ${WHOP_PRODUCT_ID_EN}  
**プロダクトURL**: https://whop.com/aio-media-llc/trap-defense-btc-en/

---

## 📋 プロダクト情報（Whop API取得）

### 基本情報

\`\`\`json
${JSON.stringify(product, null, 2)}
\`\`\`

### プラン情報

${product.plans && Array.isArray(product.plans) ? product.plans.map((plan: any, index: number) => `
#### プラン ${index + 1}
- **ID**: ${plan.id || 'N/A'}
- **名前**: ${plan.name || 'N/A'}
- **価格**: $${plan.price || 'N/A'}
- **期間**: ${plan.interval_count || 'N/A'} ${plan.interval || 'N/A'}
- **トライアル**: ${plan.trial_period_days || 0}日
`).join('\n') : 'プラン情報なし'}

### アフィリエイト情報

${(() => {
  try {
    // アフィリエイト情報は別途取得が必要
    return 'アフィリエイト情報は別途取得が必要';
  } catch (error: any) {
    return `エラー: ${error.message}`;
  }
})()}

---

## 🎯 CEO編集内容との照合

### 確認事項

1. **プロダクト名**: ${product.name || 'N/A'}
2. **価格**: $${product.plans?.[0]?.price || 'N/A'}/月
3. **アフィリエイト報酬率**: 50%（Whopダッシュボード設定）

### 参照情報

- **WhopページURL**: https://whop.com/aio-media-llc/trap-defense-btc-en/
- **プロダクトID**: ${WHOP_PRODUCT_ID_EN}

---

**最終更新**: ${new Date().toISOString()}  
**ステータス**: ✅ API取得完了
`;

    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`\n✅ 検証結果を保存しました: ${outputPath}`);

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
