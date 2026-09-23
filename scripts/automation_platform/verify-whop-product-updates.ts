/**
 * Whopプロダクト情報の更新状況を確認するスクリプト
 * 
 * 使用方法:
 *   npx tsx scripts/verify-whop-product-updates.ts
 */

import { getWhopProduct, getWhopPlans } from '../api/unified-api';

// 確認対象のプロダクトID
const PRODUCTS = [
  { id: 'prod_6RjqaJMGyEw1F', market: 'EN', expectedName: 'Trap Defense BTC - English' },
  { id: 'prod_Eg1V8et0WTg69', market: 'ES', expectedName: 'Trap Defense BTC - Spanish' },
  { id: 'prod_l4ipnvNhwFpdQ', market: 'AR', expectedName: 'Trap Defense BTC - Arabic' },
  { id: 'prod_Cpz4oQla16GUB', market: 'PT-BR', expectedName: 'Trap Defense BTC - Portuguese' },
  { id: 'prod_HouQTKTN1F7vD', market: 'KO', expectedName: 'Trap Defense BTC - Korean' },
  { id: 'prod_756mUZhSfLAkL', market: 'JA', expectedName: 'Trap Defense BTC - Japanese' },
];

interface VerificationResult {
  productId: string;
  market: string;
  currentName: string;
  expectedName: string;
  nameMatch: boolean;
  plans: Array<{
    planId: string;
    name: string;
    price: number;
    currency: string;
    interval?: string;
  }>;
}

async function verifyProduct(productId: string, market: string, expectedName: string): Promise<VerificationResult | null> {
  try {
    console.log(`\n📦 プロダクト情報を確認中: ${productId} (${market})...`);
    
    // プロダクト情報を取得
    const product = await getWhopProduct(productId);
    const currentName = product.name || product.data?.name || product.data?.title || 'N/A';
    const nameMatch = currentName === expectedName;
    
    // プラン情報を取得
    const plansResult = await getWhopPlans({ productId });
    const plans = (plansResult.plans || []).map((plan: any) => ({
      planId: plan.id || plan.planId || 'N/A',
      name: plan.name || 'N/A',
      price: plan.price || plan.initial_price || 0,
      currency: plan.currency || 'USD',
      interval: plan.interval || plan.billing_period || 'N/A',
    }));
    
    return {
      productId,
      market,
      currentName,
      expectedName,
      nameMatch,
      plans,
    };
  } catch (error: any) {
    console.error(`❌ エラー: ${productId}`, error.message);
    return null;
  }
}

function formatResult(result: VerificationResult): string {
  const statusIcon = result.nameMatch ? '✅' : '❌';
  let output = `\n${'='.repeat(80)}\n`;
  output += `${statusIcon} ${result.market}市場: ${result.productId}\n`;
  output += `${'='.repeat(80)}\n`;
  output += `📌 プロダクト名:\n`;
  output += `   現在: ${result.currentName}\n`;
  output += `   期待: ${result.expectedName}\n`;
  output += `   一致: ${result.nameMatch ? '✅ 一致' : '❌ 不一致'}\n\n`;
  
  if (result.plans.length > 0) {
    output += `💰 プラン情報 (${result.plans.length}件):\n`;
    result.plans.forEach((plan, index) => {
      output += `   ${index + 1}. ${plan.name}\n`;
      output += `      ID: ${plan.planId}\n`;
      output += `      価格: ${plan.currency} ${plan.price}\n`;
      if (plan.interval && plan.interval !== 'N/A') {
        output += `      期間: ${plan.interval}\n`;
      }
      output += '\n';
    });
  } else {
    output += `💰 プラン情報: ❌ 取得できませんでした\n\n`;
  }
  
  return output;
}

async function main() {
  try {
    console.log('🚀 Whopプロダクト情報の更新状況を確認します...\n');
    
    const results: VerificationResult[] = [];
    
    for (const product of PRODUCTS) {
      try {
        const result = await verifyProduct(product.id, product.market, product.expectedName);
        if (result) {
          results.push(result);
          console.log(formatResult(result));
        }
      } catch (error: any) {
        console.error(`❌ ${product.market}市場の確認中にエラー:`, error.message);
      }
      
      // APIレート制限を避けるため、少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  
  // サマリー
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 確認結果サマリー');
  console.log(`${'='.repeat(80)}\n`);
  
  const nameMatches = results.filter(r => r.nameMatch).length;
  const nameMismatches = results.filter(r => !r.nameMatch).length;
  const totalPlans = results.reduce((sum, r) => sum + r.plans.length, 0);
  
  console.log(`✅ プロダクト名一致: ${nameMatches}/${results.length}件`);
  console.log(`❌ プロダクト名不一致: ${nameMismatches}/${results.length}件`);
  console.log(`💰 取得できたプラン数: ${totalPlans}件\n`);
  
  // 詳細
  results.forEach(result => {
    const status = result.nameMatch ? '✅' : '❌';
    console.log(`  ${status} ${result.market}: ${result.currentName}`);
    if (!result.nameMatch) {
      console.log(`     → 期待値: ${result.expectedName}`);
    }
  });
  
  // 不一致がある場合の推奨事項
  if (nameMismatches > 0) {
    console.log(`\n⚠️ プロダクト名が不一致のプロダクトがあります。`);
    console.log(`   Whop Dashboardで手動更新するか、APIで更新してください。`);
  } else {
    console.log(`\n✅ すべてのプロダクト名が期待値と一致しています！`);
  }
}

  } catch (error: any) {
    console.error('❌ スクリプト実行エラー:', error.message);
    console.error('スタック:', error.stack);
    process.exit(1);
  }
}

// スクリプト実行
main().catch((error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
