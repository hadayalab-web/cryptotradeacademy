#!/usr/bin/env tsx
/**
 * Whopプロダクトページ確認 - CEO認識合わせ
 */

import { getWhopProducts, getWhopProduct, getWhopPlans, getWhopPlan } from '../api/unified-api.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'whop-review');
mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
  console.log('🚀 Whopプロダクト情報取得開始...\n');

  // 環境変数チェック
  if (!process.env.WHOP_API_KEY) {
    console.error('❌ WHOP_API_KEYが設定されていません');
    console.error('   .envファイルにWHOP_API_KEYを設定してください。\n');
    process.exit(1);
  }
  console.log('✅ 環境変数チェック完了\n');

  try {
    // 全プロダクト取得
    console.log('📋 全プロダクト一覧を取得中...');
    const productsResult = await getWhopProducts({ perPage: 100 });
    const products = productsResult.products || [];
    
    console.log(`✅ ${products.length}件のプロダクトを取得しました\n`);

    const report: any[] = [];

    // 各プロダクトの詳細情報を取得
    for (const product of products) {
      const productId = product.id;
      const productName = product.name || product.title || productId;
      console.log(`📦 ${productName} の詳細情報を取得中...`);
      process.stdout.write(''); // 強制フラッシュ
      
      try {
        const detail = await getWhopProduct(productId);
        const plansResult = await getWhopPlans({ productId, perPage: 50 });
        
        const productData = detail.data || product;
        const planIds = productData.plans || [];
        
        // 各プランの詳細情報を取得
        const plansDetail = [];
        for (const planId of planIds) {
          try {
            const planDetail = await getWhopPlan(planId);
            const planData = planDetail.data || planDetail;
            plansDetail.push({
              id: planId,
              name: planData.name || planDetail.name,
              price: planData.price || planDetail.price,
              currency: planData.currency || planDetail.currency,
              interval: planData.interval || planDetail.interval
            });
          } catch (err: any) {
            console.log(`     ⚠️ プラン ${planId} の取得に失敗: ${err.message}`);
          }
        }
        
        const productInfo = {
          id: productId,
          name: productData.name || productData.title || detail.name || product.name,
          slug: productData.slug || detail.slug,
          description: productData.description || detail.description,
          visibility: productData.visibility,
          url: productData.slug ? `https://whop.com/${productData.slug}` : `https://whop.com/products/${productId}`,
          plans: plansDetail,
          raw: productData
        };
        
        report.push(productInfo);
        
        console.log(`   ✅ プラン数: ${productInfo.plans.length}`);
      } catch (error: any) {
        console.error(`   ❌ エラー: ${error.message}`);
      }
    }

    // レポート生成
    const timestamp = Date.now();
    const reportPath = join(OUTPUT_DIR, `whop-products-${timestamp}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    // サマリー表示
    console.log('\n' + '='.repeat(80));
    console.log('📊 Whopプロダクト一覧サマリー');
    console.log('='.repeat(80));
    
    report.forEach((p, idx) => {
      console.log(`\n${idx + 1}. ${p.name || '名前なし'}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   URL: ${p.url}`);
      console.log(`   プラン数: ${p.plans.length}`);
      if (p.plans.length > 0) {
        p.plans.forEach((plan: any, planIdx: number) => {
          const planName = plan.name || `プラン${planIdx + 1}`;
          const price = plan.price !== undefined ? plan.price : '価格未設定';
          const currency = plan.currency || '';
          const interval = plan.interval || '';
          console.log(`     - ${planName}: ${price} ${currency}${interval ? '/' + interval : ''}`);
        });
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`✅ レポートを保存しました: ${reportPath}`);
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタック:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
