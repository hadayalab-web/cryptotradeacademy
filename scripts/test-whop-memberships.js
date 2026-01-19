#!/usr/bin/env node
/**
 * Whop API メンバーシップ取得テストスクリプト
 * レスポンス形式を確認してレポートに反映
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// 環境変数が設定されていない場合は、直接設定（テスト用）
if (!process.env.WHOP_API_KEY) {
  process.env.WHOP_API_KEY = 'apik_6Ql14WHRU0Sje_C3791174_C_cb45d64f7f618e1c592233edf2cf04ba11ff7d7e5cede362db19089df8a7a6';
}

// タイムアウト設定（10秒）
const TIMEOUT = 10000;

const { listMemberships } = require('../services/whop/client');

async function testWhopMemberships() {
  console.log('🔍 Whop API メンバーシップ取得テスト\n');
  
  if (!process.env.WHOP_API_KEY) {
    console.error('❌ WHOP_API_KEY is not set');
    process.exit(1);
  }
  
  console.log(`✅ WHOP_API_KEY: ${process.env.WHOP_API_KEY.substring(0, 20)}...\n`);
  
  try {
    // タイムアウト付きで実行
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout after 10 seconds')), TIMEOUT);
    });
    
    // まず、すべてのメンバーシップを取得してレスポンス形式を確認
    console.log('📊 すべてのメンバーシップを取得中（status指定なし）...');
    const allMembershipsPromise = listMemberships({});
    const allMemberships = await Promise.race([allMembershipsPromise, timeoutPromise]);
    console.log(`✅ 取得成功: ${allMemberships.length}件のメンバーシップ\n`);
    
    if (allMemberships.length > 0) {
      console.log('📋 レスポンス構造:');
      console.log(JSON.stringify(allMemberships[0], null, 2));
    }
    
    // アクティブなメンバーシップを取得（planを展開）
    console.log('\n📊 アクティブなメンバーシップを取得中（expand指定）...');
    const memberships = await listMemberships({
      status: 'active',
      expand: ['plan'],
    });
    
    console.log(`✅ 取得成功: ${memberships.length}件のメンバーシップ\n`);
    
    if (memberships.length > 0) {
      console.log('📋 最初のメンバーシップの構造:');
      console.log(JSON.stringify(memberships[0], null, 2));
      
      console.log('\n📊 統計:');
      const stats = {
        total: memberships.length,
        withPlan: memberships.filter(m => m.plan).length,
        withCreatedAt: memberships.filter(m => m.created_at).length,
      };
      console.log(`  - 総数: ${stats.total}件`);
      console.log(`  - プラン情報あり: ${stats.withPlan}件`);
      console.log(`  - 作成日時あり: ${stats.withCreatedAt}件`);
      
      // プラン情報の構造を確認
      if (memberships[0].plan) {
        console.log('\n📋 プラン情報の構造:');
        console.log(JSON.stringify(memberships[0].plan, null, 2));
      }
      
      // 収益計算のテスト
      console.log('\n💰 収益計算テスト:');
      let totalRevenue = 0;
      let monthlyRevenue = 0;
      const planStats = {};
      
      for (const membership of memberships.slice(0, 5)) { // 最初の5件でテスト
        const plan = membership.plan || {};
        const initialPrice = plan.initial_price || 0;
        const renewalPrice = plan.renewal_price || 0;
        const billingPeriod = plan.billing_period || 0;
        
        console.log(`  - Membership ID: ${membership.id}`);
        console.log(`    Plan: ${plan.name || 'N/A'}`);
        console.log(`    Initial Price: $${initialPrice}`);
        console.log(`    Renewal Price: $${renewalPrice}`);
        console.log(`    Billing Period: ${billingPeriod}日`);
        
        if (billingPeriod === 30 && renewalPrice > 0) {
          monthlyRevenue += renewalPrice;
        }
        
        const planName = plan.name || 'Unknown';
        if (!planStats[planName]) {
          planStats[planName] = { count: 0, revenue: 0 };
        }
        planStats[planName].count++;
        planStats[planName].revenue += initialPrice + renewalPrice;
      }
      
      console.log(`\n  - 月間収益（MRR）: $${monthlyRevenue}`);
      console.log('  - プラン別統計:');
      Object.entries(planStats).forEach(([planName, planData]) => {
        console.log(`    ${planName}: ${planData.count}人, $${planData.revenue}`);
      });
    } else {
      console.log('⚠️ メンバーシップが見つかりませんでした');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testWhopMemberships().catch(error => {
  console.error('❌ テストエラー:', error);
  process.exit(1);
});
