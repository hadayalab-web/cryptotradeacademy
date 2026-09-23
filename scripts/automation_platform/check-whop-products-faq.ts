/**
 * WhopプロダクトのFAQ情報をチェックするスクリプト
 * 
 * 使用方法:
 *   npx tsx scripts/check-whop-products-faq.ts
 */

import { getWhopProduct } from '../api/unified-api';

// チェック対象のプロダクトID
const PRODUCT_IDS = [
  'prod_6RjqaJMGyEw1F', // EN
  'prod_Eg1V8et0WTg69', // 不明
  'prod_l4ipnvNhwFpdQ', // 不明
  'prod_Cpz4oQla16GUB', // 不明
  'prod_HouQTKTN1F7vD', // 不明
  'prod_756mUZhSfLAkL', // 不明
];

// プロダクトIDと市場のマッピング（既知のもの）
const PRODUCT_MARKET_MAP: Record<string, string> = {
  'prod_6RjqaJMGyEw1F': 'EN',
  'prod_MD3f0RKwYBHxQ': 'AR',
  'prod_pDpO2KnhcrdLa': 'KO',
  'prod_BRZvLZeJlvDkC': 'JA',
  'prod_NGa2pDMwaXAg2': 'ES',
  'prod_srLkdUQbrN6AI': 'PT-BR',
};

interface FAQItem {
  question: string;
  answer: string;
}

interface ProductInfo {
  productId: string;
  name: string;
  slug: string;
  description: string;
  headline?: string;
  features?: string[];
  faqs?: FAQItem[];
  rawData?: any;
}

async function checkProduct(productId: string): Promise<ProductInfo | null> {
  try {
    console.log(`\n📦 プロダクト情報を取得中: ${productId}...`);
    
    // expandパラメータを使って詳細情報を取得
    const { whopRequestSafe } = await import('../api/unified-api');
    let data: any;
    try {
      const expandedData = await whopRequestSafe("GET", `/products/${productId}?expand[]=experiences&expand[]=plans`);
      data = expandedData.data || expandedData;
    } catch (expandError: any) {
      console.log(`   ⚠️ expandパラメータでの取得に失敗、通常の取得を試行: ${expandError.message}`);
      const result = await getWhopProduct(productId);
      data = result.data || result;
    }
    
    // FAQ情報を抽出（複数の場所を確認）
    const faqs: FAQItem[] = [];
    
    // 1. 直接faqsフィールドを確認
    if (data.faqs && Array.isArray(data.faqs)) {
      data.faqs.forEach((faq: any) => {
        faqs.push({
          question: faq.question || faq.q || '',
          answer: faq.answer || faq.a || '',
        });
      });
    }
    
    // 2. descriptionフィールドからFAQを抽出（Markdown形式の可能性）
    if (data.description && typeof data.description === 'string') {
      const faqMatches = data.description.match(/## FAQs?[\s\S]*?## /i) || 
                        data.description.match(/## FAQ[\s\S]*$/i) ||
                        data.description.match(/FAQ[\s\S]*$/i);
      if (faqMatches) {
        // FAQセクションが見つかった場合の処理（簡易版）
        console.log(`   ℹ️ descriptionにFAQセクションが見つかりました`);
      }
    }
    
    // 3. experiencesの中にFAQがある可能性
    if (data.experiences && Array.isArray(data.experiences)) {
      for (const exp of data.experiences) {
        if (exp && typeof exp === 'object') {
          // Experienceオブジェクトの場合
          if (exp.faqs && Array.isArray(exp.faqs)) {
            exp.faqs.forEach((faq: any) => {
              faqs.push({
                question: faq.question || faq.q || '',
                answer: faq.answer || faq.a || '',
              });
            });
          }
          // propertiesの中にFAQがある可能性
          if (exp.properties && typeof exp.properties === 'object') {
            if (exp.properties.faqs) {
              const expFaqs = Array.isArray(exp.properties.faqs) ? exp.properties.faqs : [];
              expFaqs.forEach((faq: any) => {
                faqs.push({
                  question: faq.question || faq.q || '',
                  answer: faq.answer || faq.a || '',
                });
              });
            }
          }
        }
      }
    }
    
    // 特徴を抽出
    const features: string[] = [];
    if (data.features && Array.isArray(data.features)) {
      data.features.forEach((feature: any) => {
        if (typeof feature === 'string') {
          features.push(feature);
        } else if (feature.text || feature.description) {
          features.push(feature.text || feature.description);
        }
      });
    }
    
    const productInfo: ProductInfo = {
      productId,
      name: data.name || result.name || 'N/A',
      slug: data.slug || result.slug || 'N/A',
      description: data.description || result.description || '',
      headline: data.headline || data.tagline || '',
      features: features.length > 0 ? features : undefined,
      faqs: faqs.length > 0 ? faqs : undefined,
      rawData: data,
    };
    
    return productInfo;
  } catch (error: any) {
    console.error(`❌ エラー: ${productId}`, error.message);
    return null;
  }
}

function formatProductInfo(info: ProductInfo, market?: string): string {
  const marketLabel = market ? ` (${market})` : '';
  let output = `\n${'='.repeat(80)}\n`;
  output += `📦 プロダクト: ${info.name}${marketLabel}\n`;
  output += `   ID: ${info.productId}\n`;
  output += `   Slug: ${info.slug}\n`;
  output += `${'='.repeat(80)}\n\n`;
  
  if (info.headline) {
    output += `📌 ヘッドライン:\n${info.headline}\n\n`;
  }
  
  if (info.description) {
    output += `📝 説明文:\n${info.description.substring(0, 200)}${info.description.length > 200 ? '...' : ''}\n\n`;
  }
  
  if (info.features && info.features.length > 0) {
    output += `✨ 特徴 (${info.features.length}項目):\n`;
    info.features.forEach((feature, index) => {
      output += `   ${index + 1}. ${feature.substring(0, 100)}${feature.length > 100 ? '...' : ''}\n`;
    });
    output += '\n';
  }
  
  if (info.faqs && info.faqs.length > 0) {
    output += `❓ FAQ (${info.faqs.length}項目):\n`;
    info.faqs.forEach((faq, index) => {
      output += `\n   Q${index + 1}: ${faq.question}\n`;
      output += `   A${index + 1}: ${faq.answer || '(回答なし)'}\n`;
    });
    output += '\n';
  } else {
    output += `❓ FAQ: ❌ FAQ情報が見つかりませんでした\n\n`;
  }
  
  // 生データの構造を確認
  if (info.rawData) {
    const keys = Object.keys(info.rawData);
    output += `🔍 利用可能なデータフィールド: ${keys.join(', ')}\n`;
    
    // FAQ関連のフィールドを探す
    const faqRelatedKeys = keys.filter(key => 
      key.toLowerCase().includes('faq') || 
      key.toLowerCase().includes('question') || 
      key.toLowerCase().includes('answer')
    );
    if (faqRelatedKeys.length > 0) {
      output += `   FAQ関連フィールド: ${faqRelatedKeys.join(', ')}\n`;
    }
    
    // experiencesの中身を確認
    if (info.rawData.experiences && Array.isArray(info.rawData.experiences)) {
      output += `\n   📦 Experiences (${info.rawData.experiences.length}件):\n`;
      info.rawData.experiences.forEach((exp: any, idx: number) => {
        if (exp && typeof exp === 'object') {
          const expKeys = Object.keys(exp);
          output += `      Experience ${idx + 1}: ${expKeys.join(', ')}\n`;
        }
      });
    }
    
    // 生データ全体をJSONで出力（デバッグ用）
    output += `\n📋 生データ（JSON）:\n`;
    output += JSON.stringify(info.rawData, null, 2).substring(0, 2000);
    if (JSON.stringify(info.rawData, null, 2).length > 2000) {
      output += '\n... (truncated)';
    }
    output += '\n';
  }
  
  return output;
}

async function main() {
  console.log('🚀 WhopプロダクトFAQチェックを開始します...\n');
  
  const results: Array<{ info: ProductInfo; market?: string }> = [];
  
  for (const productId of PRODUCT_IDS) {
    const market = PRODUCT_MARKET_MAP[productId];
    const info = await checkProduct(productId);
    
    if (info) {
      results.push({ info, market });
      console.log(formatProductInfo(info, market));
    }
    
    // APIレート制限を避けるため、少し待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // サマリー
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 サマリー');
  console.log(`${'='.repeat(80)}\n`);
  
  results.forEach(({ info, market }) => {
    const marketLabel = market ? ` [${market}]` : '';
    const faqStatus = info.faqs && info.faqs.length > 0 
      ? `✅ ${info.faqs.length}項目` 
      : '❌ なし';
    console.log(`  ${info.productId}${marketLabel}: ${info.name} - FAQ: ${faqStatus}`);
  });
  
  // FAQが取得できたプロダクトの詳細
  const productsWithFaqs = results.filter(({ info }) => info.faqs && info.faqs.length > 0);
  if (productsWithFaqs.length > 0) {
    console.log(`\n✅ FAQが取得できたプロダクト: ${productsWithFaqs.length}件`);
  } else {
    console.log(`\n⚠️ FAQが取得できたプロダクトがありません`);
    console.log(`   Whop APIのレスポンス構造を確認する必要があります。`);
  }
}

// スクリプト実行
main().catch(console.error);
