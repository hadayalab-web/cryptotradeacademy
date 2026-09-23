#!/usr/bin/env tsx
/**
 * Whop価格・プラン確認スクリプト
 * 実際のWhop APIから価格とプラン情報を取得して確認
 */

import { getWhopProduct, getWhopPlan } from '../api/unified-api.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PRODUCT_ID = 'prod_6RjqaJMGyEw1F';
const PLAN_IDS = [
  'plan_SatV2J5R7gvHn', // 月額
  'plan_L1xVv19322pC3', // 年額
  'plan_CKOj1QCfnlr1j'  // 3ヶ月
];

async function checkWhopPricingPlans() {
  console.log('📢 Whop価格・プラン情報を確認中...\n');

  try {
    // プロダクト情報を取得
    const product = await getWhopProduct(PRODUCT_ID);
    console.log('✅ プロダクト情報取得成功\n');

    // 各プランの詳細を取得
    const plans: any[] = [];
    for (const planId of PLAN_IDS) {
      try {
        const plan = await getWhopPlan(planId);
        plans.push(plan);
        console.log(`✅ プラン取得成功: ${planId}`);
      } catch (error: any) {
        console.log(`⚠️ プラン取得失敗: ${planId} - ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 価格・プラン情報');
    console.log('='.repeat(80));
    console.log('\nプロダクト情報:');
    console.log(JSON.stringify(product, null, 2));
    console.log('\nプラン情報:');
    plans.forEach((plan, i) => {
      console.log(`\nプラン ${i + 1}:`);
      console.log(JSON.stringify(plan, null, 2));
    });
    console.log('='.repeat(80));

    // 価格・プラン情報を整理
    const pricingSummary = {
      product: {
        id: product.productId,
        name: product.name,
        title: product.data?.title || product.name
      },
      plans: plans.map(plan => ({
        id: plan.planId,
        name: plan.name || plan.data?.name || 'N/A',
        price: plan.price || plan.data?.price || 0,
        currency: plan.currency || plan.data?.currency || 'USD',
        interval: plan.interval || plan.data?.interval || 'N/A',
        trialDays: plan.data?.trial_days || 0,
        renewalPrice: plan.data?.renewal_price || plan.price || 0
      }))
    };

    // 結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'WHOP_PRICING_PLANS_FINAL.md');
    const output = `# Whop価格・プラン最終確認結果

**確認日時**: ${new Date().toISOString()}
**プロダクトID**: ${PRODUCT_ID}
**Whop URL**: https://whop.com/aio-media-llc/trap-defence-btc-en/

---

## 📊 現在の価格・プラン設定

### プロダクト情報

- **ID**: ${pricingSummary.product.id}
- **名前**: ${pricingSummary.product.name}
- **タイトル**: ${pricingSummary.product.title}

---

### プラン詳細

${pricingSummary.plans.map((plan, i) => `
#### プラン ${i + 1}: ${plan.name}

- **プランID**: \`${plan.id}\`
- **価格**: **$${(plan.price / 100).toFixed(2)}** ${plan.currency}
- **更新価格**: **$${(plan.renewalPrice / 100).toFixed(2)}** ${plan.currency}
- **期間**: ${plan.interval}
- **トライアル**: ${plan.trialDays}日

**月額換算**: $${plan.interval === 'month' ? (plan.price / 100).toFixed(2) : plan.interval === 'year' ? ((plan.price / 100) / 12).toFixed(2) : plan.interval === 'quarter' ? ((plan.price / 100) / 3).toFixed(2) : 'N/A'}/月
`).join('\n')}

---

## 🎯 SSOT仕様との比較

### SSOT仕様（目標設定）

| プラン | 目標価格 | 期間 | 割引率 | 月額換算 |
|--------|----------|------|--------|----------|
| **月額** | **$69/月** | 30日 | 0% | $69 |
| **3ヶ月** | **$165** | 90日 | -20% | $55 |
| **年額** | **$588/年** | 365日 | -29% | $49 |

### 実際のWhop設定

${pricingSummary.plans.map((plan, i) => {
  const price = (plan.price / 100).toFixed(2);
  const monthly = plan.interval === 'month' ? price : plan.interval === 'year' ? ((plan.price / 100) / 12).toFixed(2) : plan.interval === 'quarter' ? ((plan.price / 100) / 3).toFixed(2) : 'N/A';
  const expected = i === 0 ? '69' : i === 1 ? '588' : '165';
  const match = Math.abs(parseFloat(price) - parseFloat(expected)) < 1 ? '✅' : '❌';
  
  return `| **${plan.name}** | **$${price}** | ${plan.interval} | ${match} | **$${monthly}/月** |`;
}).join('\n')}

---

## 📋 詳細なAPIレスポンス

\`\`\`json
${JSON.stringify({ product, plans }, null, 2)}
\`\`\`

---

**確認者**: COO（Cursor/Composer 1）
`;

    writeFileSync(outputPath, output, 'utf-8');
    console.log(`\n✅ 結果を保存しました: ${outputPath}\n`);

    return pricingSummary;
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

checkWhopPricingPlans()
  .then(() => {
    console.log('✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  });
