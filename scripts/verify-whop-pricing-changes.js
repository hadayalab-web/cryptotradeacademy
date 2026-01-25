// scripts/verify-whop-pricing-changes.js
// Whop価格設定の変更を確認し、Grok推奨価格と比較

require('dotenv').config();
const { getProduct } = require('../services/whop/client');
const fs = require('fs');
const path = require('path');

// Grok推奨価格
const GROK_RECOMMENDED_PRICES = {
  EN: { monthly: 99, quarterly: 237, annual: 845, arpu: 250 },
  ES: { monthly: 89, quarterly: 214, annual: 758, arpu: 180 },
  'PT-BR': { monthly: 87, quarterly: 209, annual: 741, arpu: 170 },
  AR: { monthly: 79, quarterly: 190, annual: 673, arpu: 150 },
  KO: { monthly: 95, quarterly: 228, annual: 809, arpu: 160 },
  JA: { monthly: 95, quarterly: 228, annual: 809, arpu: 155 },
};

// 製品ID
const PRODUCT_IDS = {
  EN: 'prod_6RjqaJMGyEw1F',
  ES: 'prod_Eg1V8et0WTg69',
  'PT-BR': 'prod_Cpz4oQla16GUB',
  AR: 'prod_l4ipnvNhwFpdQ',
  KO: 'prod_HouQTKTN1F7vD',
  JA: 'prod_756mUZhSfLAkL',
};

// プラン分散
const PLAN_DISTRIBUTION = {
  monthly: 0.214,
  quarterly: 0.357,
  annual: 0.429,
};

/**
 * ARPUを計算
 */
function calculateARPU(monthly, quarterly, annual) {
  const arpuBeforePromo = 
    (monthly * PLAN_DISTRIBUTION.monthly) +
    (quarterly * PLAN_DISTRIBUTION.quarterly) +
    (annual * PLAN_DISTRIBUTION.annual);
  
  const arpuAfterPromo = arpuBeforePromo * 0.5; // プロモコード50%割引
  const finalARPU = arpuAfterPromo * 0.97; // Whop手数料3%差し引き
  
  return {
    beforePromo: arpuBeforePromo,
    afterPromo: arpuAfterPromo,
    final: finalARPU,
  };
}

/**
 * 製品の価格を取得
 */
async function getProductPricing(productId, lang) {
  try {
    const product = await getProduct(productId, ['plans']);
    
    if (!product || !product.plans || product.plans.length === 0) {
      return null;
    }

    let monthly = 0;
    let quarterly = 0;
    let annual = 0;

    for (const plan of product.plans) {
      const billingPeriod = plan.billing_period || 0;
      const renewalPrice = plan.renewal_price || 0;
      
      if (billingPeriod === 30) {
        monthly = renewalPrice;
      } else if (billingPeriod === 90) {
        quarterly = renewalPrice;
      } else if (billingPeriod === 365) {
        annual = renewalPrice;
      }
    }

    const arpu = calculateARPU(monthly, quarterly, annual);
    const recommended = GROK_RECOMMENDED_PRICES[lang];

    return {
      lang,
      productId,
      productName: product.name || product.title,
      current: {
        monthly,
        quarterly,
        annual,
        arpu: arpu.afterPromo,
        finalARPU: arpu.final,
      },
      recommended: recommended ? {
        monthly: recommended.monthly,
        quarterly: recommended.quarterly,
        annual: recommended.annual,
        arpu: recommended.arpu,
      } : null,
      match: recommended ? {
        monthly: Math.abs(monthly - recommended.monthly) < 1,
        quarterly: Math.abs(quarterly - recommended.quarterly) < 1,
        annual: Math.abs(annual - recommended.annual) < 1,
      } : null,
    };
  } catch (error) {
    console.error(`❌ エラー: ${lang} - ${productId}`, error.message);
    return null;
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Whop価格設定の変更確認（Grok推奨価格との比較）');
  console.log('='.repeat(80));

  const results = [];

  for (const [lang, productId] of Object.entries(PRODUCT_IDS)) {
    const result = await getProductPricing(productId, lang);
    if (result) {
      results.push(result);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 結果表示
  console.log('\n📊 価格設定比較表');
  console.log('='.repeat(80));
  console.log(`${'言語'.padEnd(8)} | ${'月額（現在）'.padEnd(15)} | ${'月額（推奨）'.padEnd(15)} | ${'3ヶ月（現在）'.padEnd(15)} | ${'3ヶ月（推奨）'.padEnd(15)} | ${'年間（現在）'.padEnd(15)} | ${'年間（推奨）'.padEnd(15)} | 一致`);
  console.log('-'.repeat(80));

  let allMatch = true;

  for (const result of results) {
    if (!result.recommended) {
      console.log(`${result.lang.padEnd(8)} | 推奨価格なし`);
      continue;
    }

    const monthlyMatch = result.match.monthly ? '✓' : '✗';
    const quarterlyMatch = result.match.quarterly ? '✓' : '✗';
    const annualMatch = result.match.annual ? '✓' : '✗';
    const allMatchLang = result.match.monthly && result.match.quarterly && result.match.annual;

    if (!allMatchLang) {
      allMatch = false;
    }

    console.log(
      `${result.lang.padEnd(8)} | $${String(result.current.monthly).padStart(13)} | $${String(result.recommended.monthly).padStart(13)} | $${String(result.current.quarterly).padStart(13)} | $${String(result.recommended.quarterly).padStart(13)} | $${String(result.current.annual).padStart(13)} | $${String(result.recommended.annual).padStart(13)} | ${monthlyMatch}${quarterlyMatch}${annualMatch}`
    );
  }

  console.log('\n📊 ARPU比較');
  console.log('='.repeat(80));
  console.log(`${'言語'.padEnd(8)} | ${'現在ARPU'.padEnd(15)} | ${'推奨ARPU'.padEnd(15)} | ${'差分'.padEnd(15)} | 一致`);
  console.log('-'.repeat(80));

  for (const result of results) {
    if (!result.recommended) continue;

    const arpuDiff = result.current.arpu - result.recommended.arpu;
    const arpuMatch = Math.abs(arpuDiff) < 5; // 5ドル以内で一致とみなす

    if (!arpuMatch) {
      allMatch = false;
    }

    console.log(
      `${result.lang.padEnd(8)} | $${String(result.current.arpu.toFixed(2)).padStart(13)} | $${String(result.recommended.arpu).padStart(13)} | ${arpuDiff >= 0 ? '+' : ''}${arpuDiff.toFixed(2).padStart(13)} | ${arpuMatch ? '✓' : '✗'}`
    );
  }

  // サマリー
  console.log('\n📊 サマリー');
  console.log('='.repeat(80));

  const matchedLanguages = results.filter(r => 
    r.recommended && 
    r.match.monthly && 
    r.match.quarterly && 
    r.match.annual
  );

  const partiallyMatchedLanguages = results.filter(r => 
    r.recommended && 
    (r.match.monthly || r.match.quarterly || r.match.annual) &&
    !(r.match.monthly && r.match.quarterly && r.match.annual)
  );

  const unmatchedLanguages = results.filter(r => 
    r.recommended && 
    !r.match.monthly && 
    !r.match.quarterly && 
    !r.match.annual
  );

  console.log(`✅ 完全一致: ${matchedLanguages.length}言語`);
  matchedLanguages.forEach(r => console.log(`   - ${r.lang}`));

  if (partiallyMatchedLanguages.length > 0) {
    console.log(`\n⚠️ 部分一致: ${partiallyMatchedLanguages.length}言語`);
    partiallyMatchedLanguages.forEach(r => {
      const matches = [];
      if (r.match.monthly) matches.push('月額');
      if (r.match.quarterly) matches.push('3ヶ月');
      if (r.match.annual) matches.push('年間');
      console.log(`   - ${r.lang}: ${matches.join(', ')}のみ一致`);
    });
  }

  if (unmatchedLanguages.length > 0) {
    console.log(`\n❌ 不一致: ${unmatchedLanguages.length}言語`);
    unmatchedLanguages.forEach(r => console.log(`   - ${r.lang}`));
  }

  // 加重平均ARPU計算
  const languageDistribution = {
    EN: 0.55,
    ES: 0.20,
    'PT-BR': 0.12,
    JA: 0.08,
    KO: 0.03,
    AR: 0.02,
  };

  let weightedARPU = 0;
  for (const result of results) {
    const weight = languageDistribution[result.lang] || 0;
    weightedARPU += result.current.arpu * weight;
  }

  console.log(`\n📈 加重平均ARPU（言語別配分考慮）: $${weightedARPU.toFixed(2)}`);
  console.log(`   推奨加重平均ARPU: $214.00`);
  console.log(`   差分: ${weightedARPU >= 214 ? '+' : ''}${(weightedARPU - 214).toFixed(2)}`);

  // JSON出力
  const outputPath = path.join(__dirname, '../docs/WHOP_PRICING_VERIFICATION_2026-01-24.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n✅ 詳細データを保存しました: ${outputPath}`);

  // 最終判定
  console.log('\n' + '='.repeat(80));
  if (allMatch && matchedLanguages.length === results.length) {
    console.log('✅ すべての言語でGrok推奨価格と一致しています！');
  } else {
    console.log('⚠️ 一部の言語でGrok推奨価格と不一致があります。');
    console.log('   上記の詳細を確認してください。');
  }
  console.log('='.repeat(80));
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { getProductPricing, calculateARPU };
