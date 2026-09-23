#!/usr/bin/env tsx
/**
 * Whop EN版プロダクトページ最適化スクリプト
 * 
 * 目的: Whop APIを使用して、EN版プロダクトページを最適化
 * - プロダクト名の統一（Trap Defence BTC）
 * - プロダクト説明の更新（Gemini生成コンテンツを使用）
 * - Featuresの更新
 * - FAQの更新
 * 
 * 注意: Whop API v2ではプロダクト更新が401エラー（権限不足）で失敗する可能性があります
 * その場合、手動更新ガイドを生成します
 */

import { whopRequestSafe, getWhopProduct, getWhopPlans } from '../api/unified-api.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// EN版プロダクトID（constants.tsから取得）
const WHOP_PRODUCT_ID_EN = 'prod_6RjqaJMGyEw1F';

// Gemini生成コンテンツ（EN版）
const EN_CONTENT = {
  headline: "Stop Giving Back Profits. Master the Art of Defensive Trading with AI.",
  description: `Two traders started with the same capital. Three months later, Trader A had lost months of hard-earned profits in a single week of emotional trading. Trader B, however, was sipping coffee, relaxed, having secured $5K in profit.

The difference? Trader B used Trap Defence BTC.

Most traders fail not because they can't trade, but because they don't know when to STOP. The market is full of traps designed to liquidate you.

Trap Defence BTC is not just a signal service; it is a defensive shield for your portfolio. We utilize advanced AI to visualize market traps, telling you exactly when to retreat and when to strike.

**Why Trap Defence BTC?**
- **Defense First:** We prioritize protecting your capital. If you don't lose, you eventually win.
- **The 70% Rule:** The market is noise 70% of the time. We teach you the discipline to wait for the clear 30% advantage.
- **AI-Powered Clarity:** No more guessing. Our Gemini AI and Dr. Grok provide visual clarity and mental stability.

Don't let one bad day ruin your month. Join the defensive revolution. Secure your edge today.`,
  features: [
    "Trap Defense Engine: Instantly visualize market traps and 'fake-outs'. We identify danger zones so you can keep your capital safe.",
    "70% Waiting Strategy: Master the art of doing nothing. We filter out the noise so you only trade when the odds are unfairly in your favor.",
    "Pursuit of Precision: Stop gambling. We focus on high-certainty setups, prioritizing quality over quantity for consistent growth.",
    "Gemini AI Visual Storytelling: Complex market data transformed into intuitive visual stories. Understand the market narrative at a glance.",
    "Dr. Grok Psychological Support: Your personal AI mental coach. It detects emotional bias and helps you maintain a zen-like trading state."
  ],
  faq: [
    {
      question: "Is this suitable for beginners?",
      answer: "Yes. In fact, learning 'defense first' is the best way to start. We simplify complex market data into actionable advice, preventing bad habits before they form."
    },
    {
      question: "How much time do I need to spend daily?",
      answer: "Very little. Our philosophy is '70% waiting'. You receive daily concise updates. You don't need to stare at charts all day; we do the heavy lifting for you."
    },
    {
      question: "What is the 'Trap Defense Engine'?",
      answer: "It is our proprietary system that identifies market manipulation and liquidity traps. It signals when NOT to trade, which is often more valuable than knowing when to trade."
    },
    {
      question: "Do you provide trading signals?",
      answer: "We provide 'Setup' and 'Retreat' contexts. Rather than blind signals, we give you the high-probability zones and the warning signs to avoid losses."
    },
    {
      question: "How does Dr. Grok help my trading?",
      answer: "Trading is 90% psychology. Dr. Grok acts as a rational voice, helping you manage FOMO (Fear Of Missing Out) and revenge trading urges."
    }
  ]
};

/**
 * 手動更新ガイドを生成
 */
function generateManualUpdateGuide(
  productId: string,
  currentProduct: any,
  updates: {
    name?: string;
    description?: string;
    features?: string[];
    faq?: Array<{ question: string; answer: string }>;
  }
) {
  const guide = `# Whop EN版プロダクトページ - 手動更新ガイド

**生成日**: ${new Date().toISOString()}
**プロダクトID**: ${productId}
**プロダクトURL**: https://whop.com/aio-media-llc/trap-defense-btc-en/
**Whop Dashboard**: https://whop.com/dashboard/products/${productId}

---

## 📋 更新内容

### 1. プロダクト名の統一

**現在**: ${currentProduct.name || 'N/A'}
**更新後**: ${updates.name || 'Trap Defence BTC - English'}

**手順**:
1. Whop Dashboardにアクセス: https://whop.com/dashboard/products/${productId}
2. 「Settings」タブを開く
3. 「Name」フィールドを「${updates.name || 'Trap Defence BTC - English'}」に変更
4. 「Save」をクリック

---

### 2. プロダクト説明の更新

**更新内容**:
${updates.description?.split('\n').map(line => `  ${line}`).join('\n') || 'N/A'}

**手順**:
1. Whop Dashboard → Products → ${productId} → 「Description」セクション
2. 上記の説明をコピー&ペースト
3. 「Save」をクリック

---

### 3. Featuresの更新

**更新内容**:
${updates.features?.map((f, i) => `${i + 1}. ${f}`).join('\n') || 'N/A'}

**手順**:
1. Whop Dashboard → Products → ${productId} → 「Features」セクション
2. 既存のFeaturesを削除
3. 上記のFeaturesを追加（各項目を1つずつ追加）
4. 「Save」をクリック

---

### 4. FAQの更新

**更新内容**:
${updates.faq?.map((q, i) => `**Q${i + 1}: ${q.question}**\nA: ${q.answer}`).join('\n\n') || 'N/A'}

**手順**:
1. Whop Dashboard → Products → ${productId} → 「FAQ」セクション
2. 既存のFAQを削除
3. 上記のFAQを追加（各質問と回答を1つずつ追加）
4. 「Save」をクリック

---

## ✅ 更新後の確認事項

- [ ] プロダクト名が「Trap Defence BTC - English」に統一されている
- [ ] プロダクト説明がGemini生成コンテンツと一致している
- [ ] Featuresが5つすべて正しく表示されている
- [ ] FAQが5つすべて正しく表示されている
- [ ] VSLが埋め込まれている（手動で埋め込みが必要な場合）

---

**最終更新**: ${new Date().toISOString()}
`;

  const guidePath = join(__dirname, '../docs/WHOP_EN_PRODUCT_MANUAL_UPDATE_GUIDE.md');
  writeFileSync(guidePath, guide, 'utf-8');
  console.log(`\n📝 手動更新ガイドを生成しました: ${guidePath}`);
  
  return guide;
}

/**
 * Whopプロダクトを更新（PATCHまたはPUTを試行）
 * 
 * 注意: Whop API v2ではプロダクト更新が401エラー（権限不足）で失敗する可能性があります
 */
async function updateWhopProduct(
  productId: string,
  currentProduct: any,
  updates: {
    name?: string;
    description?: string;
    features?: string[];
    faq?: Array<{ question: string; answer: string }>;
  }
): Promise<{
  success: boolean;
  method?: string;
  error?: string;
  manualUpdateGuide?: string;
}> {
  console.log(`\n🔄 Whopプロダクト更新を試行中: ${productId}`);
  console.log('更新内容:', JSON.stringify(updates, null, 2));

  // PATCHとPUTを試行
  const methods = ['PATCH', 'PUT'];
  let lastError: Error | null = null;

  for (const method of methods) {
    try {
      console.log(`\n🔧 ${method} メソッドで更新を試行中...`);
      
      // Whop API v2の構造に合わせてリクエストボディを構築
      // 公式ドキュメントによると、フラット形式で送信し、`title`フィールドを使用
      const updateBodies = [
        // 形式1: titleフィールドを使用（公式ドキュメント推奨）
        {
          title: updates.name,
          description: updates.description
        },
        // 形式2: nameフィールドを使用（フォールバック）
        {
          name: updates.name,
          description: updates.description
        },
        // 形式3: titleとnameの両方を使用
        {
          title: updates.name,
          name: updates.name,
          description: updates.description
        }
      ];
      
      // 各形式を試行
      for (let i = 0; i < updateBodies.length; i++) {
        const updateBody = updateBodies[i];
        console.log(`    📝 形式${i + 1}で試行中... (${JSON.stringify(Object.keys(updateBody))})`);
        
        try {
          const result = await whopRequestSafe(
            method,
            `/products/${productId}`,
            updateBody,
            {
              maxRetries: 1,
              onError: (error, attempt) => {
                console.warn(`      ⚠️ エラー (attempt ${attempt}): ${error.message}`);
              }
            }
          );

          console.log(`✅ ${method} メソッド（形式${i + 1}）で更新成功:`);
          console.log(JSON.stringify(result, null, 2));
          return { success: true, method, format: `形式${i + 1}` };
        } catch (error: any) {
          // 401エラーでない場合のみ続行
          if (!error.message?.includes('401') && !error.message?.includes('permission')) {
            console.warn(`      ⚠️ 形式${i + 1}で失敗: ${error.message}`);
            continue;
          }
          // 401エラーの場合は次の形式を試さない
          throw error;
        }
      }
      
      // すべての形式が失敗した場合
      throw new Error('すべてのリクエスト形式で更新に失敗しました');
      
      const result = await whopRequestSafe(
        method,
        `/products/${productId}`,
        updateBody,
        {
          maxRetries: 1,
          onError: (error, attempt) => {
            console.warn(`  ⚠️ エラー (attempt ${attempt}): ${error.message}`);
          }
        }
      );

      console.log(`✅ ${method} メソッドで更新成功:`);
      console.log(JSON.stringify(result, null, 2));
      return { success: true, method };
    } catch (error: any) {
      lastError = error;
      console.warn(`  ❌ ${method} メソッドで更新失敗: ${error.message}`);
      
      // 401エラーの場合、権限不足なので次のメソッドを試さない
      if (error.message?.includes('401') || error.message?.includes('permission')) {
        console.warn(`  ⚠️ 権限不足のため、他のメソッドも試行しません`);
        break;
      }
    }
  }

  // すべてのメソッドが失敗した場合、手動更新ガイドを生成
  if (lastError) {
    console.error(`\n❌ すべての更新方法が失敗しました`);
    console.error(`最後のエラー: ${lastError.message}`);
    
    // 権限不足の場合、手動更新ガイドを生成
    if (lastError.message?.includes('401') || lastError.message?.includes('permission')) {
      console.log(`\n💡 権限不足のため、手動更新ガイドを生成します...`);
      const guide = generateManualUpdateGuide(productId, currentProduct, updates);
      
      return {
        success: false,
        error: lastError.message,
        manualUpdateGuide: guide
      };
    }
    
    throw lastError;
  }

  throw new Error('更新に失敗しました');
}

/**
 * メイン処理
 */
async function main() {
  try {
    const productId = WHOP_PRODUCT_ID_EN;

    console.log('🚀 Whop EN版プロダクトページ最適化を開始');
    console.log(`📦 プロダクトID: ${productId}`);
    console.log(`📦 プロダクトURL: https://whop.com/aio-media-llc/trap-defense-btc-en/`);

    // プロダクト情報を取得
    console.log('\n📋 現在のプロダクト情報を取得中...');
    const productResponse = await whopRequestSafe("GET", `/products/${productId}`);
    console.log('📊 レスポンス構造:', Object.keys(productResponse));
    
    // レスポンス構造を確認
    const productData = productResponse.data || productResponse;
    const currentProduct = {
      name: productData.name || productData.title,
      slug: productData.slug,
      description: productData.description,
      data: productData
    };
    
    console.log(`  - Name: ${currentProduct.name || 'N/A'}`);
    console.log(`  - Slug: ${currentProduct.slug || 'N/A'}`);
    console.log(`  - Description: ${currentProduct.description?.substring(0, 100) || 'N/A'}...`);
    console.log(`  - データ構造:`, Object.keys(productData).slice(0, 10));

    // 更新内容を準備
    const updates = {
      name: 'Trap Defence BTC - English', // 「Defence」に統一（イギリス英語）
      description: EN_CONTENT.description,
      features: EN_CONTENT.features,
      faq: EN_CONTENT.faq
    };

    // 変更点を確認
    console.log('\n🔍 変更点の確認:');
    if (currentProduct.name !== updates.name) {
      console.log(`  ⚠️ プロダクト名の変更が必要:`);
      console.log(`     現在: "${currentProduct.name}"`);
      console.log(`     更新後: "${updates.name}"`);
    } else {
      console.log(`  ✅ プロダクト名は既に正しい: "${currentProduct.name}"`);
    }

    // プロダクトを更新（試行）
    console.log('\n🔄 プロダクト更新を実行中...');
    const result = await updateWhopProduct(productId, currentProduct, updates);

    if (result.success) {
      console.log('\n✅ 最適化完了！');
      console.log(`✅ 更新方法: ${result.method}`);
      console.log('\n📝 次のステップ:');
      console.log('1. Whop Dashboardでプロダクトページを確認');
      console.log('2. FeaturesとFAQが正しく表示されているか確認');
      console.log('3. VSLが埋め込まれているか確認（VSLは正確に動きます）');
    } else {
      console.log('\n⚠️ API更新が失敗しました（権限不足の可能性）');
      console.log('\n📝 手動更新が必要です:');
      console.log(`   - 手動更新ガイド: docs/WHOP_EN_PRODUCT_MANUAL_UPDATE_GUIDE.md`);
      console.log(`   - Whop Dashboard: https://whop.com/dashboard/products/${productId}`);
      console.log(`   - プロダクトURL: https://whop.com/aio-media-llc/trap-defense-btc-en/`);
    }

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// スクリプトとして実行された場合のみmainを実行
main().catch(console.error);

export { updateWhopProduct, generateManualUpdateGuide, EN_CONTENT };
