#!/usr/bin/env tsx
/**
 * Whop全6言語プロダクト情報取得スクリプト
 * 価格、プラン、トライアル期間などの実際の設定を確認
 */

import { getWhopProduct, getWhopPlans } from '../api/unified-api.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PRODUCTS = [
  { id: 'prod_6RjqaJMGyEw1F', lang: 'EN', name: 'Trap Defence BTC EN' },
  { id: 'prod_756mUZhSfLAkL', lang: 'JA', name: 'Trap Defence BTC JA' },
  { id: 'prod_HouQTKTN1F7vD', lang: 'KO', name: 'Trap Defence BTC KO' },
  { id: 'prod_Eg1V8et0WTg69', lang: 'ES', name: 'Trap Defence BTC ES' },
  { id: 'prod_l4ipnvNhwFpdQ', lang: 'AR', name: 'Trap Defence BTC AR' },
  { id: 'prod_Cpz4oQla16GUB', lang: 'PT-BR', name: 'Trap Defence BTC PT-BR' },
];

interface PlanInfo {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  intervalCount: number;
  trialDays: number;
  renewalPrice?: number;
  initialPrice?: number;
}

interface ProductInfo {
  id: string;
  lang: string;
  name: string;
  productName: string;
  slug: string;
  description: string;
  plans: PlanInfo[];
  error?: string;
}

async function checkAllWhopProducts() {
  console.log('📢 Whop全6言語プロダクト情報を取得中...\n');

  const results: ProductInfo[] = [];

  for (const product of PRODUCTS) {
    console.log(`🌍 ${product.lang}: ${product.name}`);

    try {
      // プロダクト情報を取得
      const productData = await getWhopProduct(product.id);

      // プラン一覧を取得
      const plansData = await getWhopPlans({ productId: product.id });

      // デバッグ: ENプロダクトの最初のプランの生データを表示（環境変数で制御）
      if (process.env.DEBUG_WHOP_API === 'true' && product.lang === 'EN' && plansData.plans.length > 0) {
        console.log(`\n🔍 デバッグ: 最初のプランの生データ:`);
        console.log(JSON.stringify(plansData.plans[0], null, 2));
      }

      // プラン情報を整形（Whop APIの実際の構造に基づく）
      const plans: PlanInfo[] = plansData.plans.map((plan: any) => {
        // renewal_priceは文字列でドル単位（セントではない）
        const renewalPriceStr = plan.renewal_price ?? '0';
        const renewalPrice = Math.round(parseFloat(renewalPriceStr) * 100); // セントに変換
        
        const initialPriceStr = plan.initial_price ?? '0';
        const initialPrice = Math.round(parseFloat(initialPriceStr) * 100);
        
        // billing_periodからintervalを推定
        const billingPeriod = plan.billing_period ?? 0;
        let interval = 'N/A';
        let intervalCount = 1;
        if (billingPeriod === 30) {
          interval = 'month';
        } else if (billingPeriod === 90) {
          interval = 'quarter';
          intervalCount = 3;
        } else if (billingPeriod === 365) {
          interval = 'year';
        } else if (billingPeriod > 0) {
          interval = 'day';
          intervalCount = billingPeriod;
        }
        
        // trial_period_daysはnullの可能性がある
        const trialDays = plan.trial_period_days ?? 0;
        
        // nameは存在しない場合があるので、plan_typeとbilling_periodから生成
        let name = plan.name ?? plan.title ?? 'N/A';
        if (name === 'N/A') {
          if (plan.plan_type === 'renewal') {
            if (billingPeriod === 30) name = 'Monthly';
            else if (billingPeriod === 365) name = 'Annual';
            else name = `${billingPeriod} days`;
          } else {
            name = `${billingPeriod} days`;
          }
        }

        return {
          id: plan.id ?? 'N/A',
          name: name,
          price: renewalPrice, // renewal_priceを優先
          currency: plan.base_currency?.toUpperCase() ?? 'USD',
          interval: interval,
          intervalCount: intervalCount,
          trialDays: trialDays,
          renewalPrice: renewalPrice,
          initialPrice: initialPrice,
        };
      });

      // プラン情報を簡潔に表示（1行にまとめる）
      const planSummary = plans.map((plan, i) => {
        const trialText = plan.trialDays > 0 ? `(試用${plan.trialDays}日)` : '';
        return `${plan.name}: $${(plan.price / 100).toFixed(2)}/${plan.interval}${trialText ? ' ' + trialText : ''}`;
      }).join(', ');
      console.log(`  ✅ ${planSummary}`);

      results.push({
        id: product.id,
        lang: product.lang,
        name: product.name,
        productName: productData.name || productData.productId,
        slug: productData.slug || 'N/A',
        description: productData.description || '',
        plans: plans,
      });

    } catch (error: any) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.push({
        id: product.id,
        lang: product.lang,
        name: product.name,
        productName: 'N/A',
        slug: 'N/A',
        description: '',
        plans: [],
        error: error.message,
      });
    }
  }

  // 結果をMarkdownファイルに保存
  const outputPath = join(__dirname, '..', 'docs', 'WHOP_ALL_PRODUCTS_PRICING.md');
  const output = `# Whop全6言語プロダクト価格・プラン情報

**確認日時**: ${new Date().toISOString()}

---

## 📊 全プロダクト情報サマリー

${results.map((result, i) => {
  if (result.error) {
    return `### ${i + 1}. ${result.lang}: ${result.name} ❌ **エラー**
- **プロダクトID**: \`${result.id}\`
- **エラー**: ${result.error}
`;
  }

  const plansSummary = result.plans.length > 0
    ? result.plans.map(p => `  - **${p.name}**: $${(p.price / 100).toFixed(2)}/${p.interval} (トライアル: ${p.trialDays}日)`).join('\n')
    : '  - プランなし';

  return `### ${i + 1}. ${result.lang}: ${result.productName}
- **プロダクトID**: \`${result.id}\`
- **スラッグ**: ${result.slug}
- **プラン数**: ${result.plans.length}件
${plansSummary}
`;
}).join('\n')}

---

## 📋 詳細情報

${results.map((result, i) => {
  if (result.error) {
    return `### ${i + 1}. ${result.lang}: ${result.name} ❌ **エラー**

**プロダクトID**: \`${result.id}\`

**エラー**: ${result.error}

`;
  }

  return `### ${i + 1}. ${result.lang}: ${result.productName}

**プロダクトID**: \`${result.id}\`  
**スラッグ**: ${result.slug}  
**説明**: ${result.description ? result.description.substring(0, 200) + '...' : 'なし'}

#### プラン詳細

${result.plans.length === 0 ? 'プランなし' : result.plans.map((plan, j) => {
  const monthlyPrice = plan.interval === 'month' 
    ? (plan.price / 100).toFixed(2)
    : plan.interval === 'year'
    ? ((plan.price / 100) / 12).toFixed(2)
    : plan.interval === 'quarter'
    ? ((plan.price / 100) / 3).toFixed(2)
    : 'N/A';

  return `**プラン ${j + 1}: ${plan.name}**

- **プランID**: \`${plan.id}\`
- **価格**: **$${(plan.price / 100).toFixed(2)}** ${plan.currency}
${plan.renewalPrice && plan.renewalPrice !== plan.price ? `- **更新価格**: **$${(plan.renewalPrice / 100).toFixed(2)}** ${plan.currency}` : ''}
${plan.initialPrice && plan.initialPrice !== plan.price ? `- **初回価格**: **$${(plan.initialPrice / 100).toFixed(2)}** ${plan.currency}` : ''}
- **期間**: ${plan.interval} (${plan.intervalCount}回)
- **トライアル期間**: **${plan.trialDays}日** ${plan.trialDays === 0 ? '❌ **トライアルなし**' : plan.trialDays === 1 ? '✅' : ''}
- **月額換算**: **$${monthlyPrice}/月**
`;
}).join('\n')}

`;
}).join('\n')}

---

## ⚠️ 問題点

${results.filter(r => r.error || r.plans.some(p => p.trialDays > 0)).map(result => {
  if (result.error) {
    return `- **${result.lang}**: プロダクト取得エラー - ${result.error}`;
  }
  
  const trialPlans = result.plans.filter(p => p.trialDays > 0);
  if (trialPlans.length > 0) {
    return `- **${result.lang}**: ${trialPlans.length}件のプランにトライアル期間が設定されています（${trialPlans.map(p => `${p.name}: ${p.trialDays}日`).join(', ')}）`;
  }
  
  return null;
}).filter(Boolean).join('\n') || '問題なし'}

---

## 📝 修正が必要な項目

### トライアル期間の確認
- ユーザーが指摘: 「1日無料トライアルなんてない」
- 確認結果: 上記「問題点」セクションを参照

### 価格の確認
- ユーザーが指摘: 「価格も違う」
- 確認結果: 各プロダクトのプラン詳細を上記参照

---

**確認者**: COO（Cursor/Composer 1）  
**状態**: ✅ 全6言語プロダクト情報取得完了
`;

  writeFileSync(outputPath, output, 'utf-8');
  console.log(`\n✅ 結果を保存: ${outputPath}`);

  return results;
}

checkAllWhopProducts()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  });
