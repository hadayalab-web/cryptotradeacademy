#!/usr/bin/env tsx
/**
 * 6市場Whopプロダクトページ同期スクリプト
 * EN版のコンテンツをベースに、他の市場（AR, KO, JA, ES, PT-BR）のWhopプロダクトページを更新
 */

import { whopRequestSafe, getWhopProduct } from '../api/unified-api.js';
import { WHOP_PRODUCT_IDS } from '../hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en/lib/whop/constants.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { callGPT52, callGemini3Pro } from '../api/unified-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// EN版のコンテンツテンプレート（SSOTベース）
const EN_CONTENT = {
  name: 'CryptoTrade Academy',
  title: 'Trap Defence BTC - English',
  description: `**Trap Defense BTC** is a defense-first academy built around one loop: Score → No-Trade → Exit Map → Verification.

## 3 Unique Value Propositions (USP)

### USP1: Trap Defense Engine
- CryptoQuant on-chain data + Grok X sentiment analysis integration
- Pre-detection of market traps (Whale Dump, Retail FOMO Trap, Miner Selling, Liquidation Cascade)
- Trap alerts: AVOID_LONG, AVOID_SHORT, STANDBY
- 70% of the time in TRAP_STANDBY = defense until clear advantage emerges

### USP2: Gemini Show Producer (Simplified: Intelligence Editor)
- **StoryBrand Strategy 2.0**: Text-based newsletter editor for email delivery
- **News Program Structure (Simplified)**: Opening (text 1-2 lines) → Trap Score (numeric display) → What to Avoid → Evidence (bullet points) → Mental Note → Call to Action
- **Removed Features**: Veo 3.1 video generation, NanoBanana Pro image generation, HeyGen content integration (simplified per CEO directive)

### USP3: Dr. Grok's Psychological Support
- Real-time X sentiment analysis + psychological support diagnosis
- Regular commentator appearance in news program structure
- Healing commentator providing emotional engagement

## 5 Key Features

1. **High-Resolution Trap Defense Engine**: CryptoQuant Professional + Grok X integration, multi-timeframe analysis
2. **70% Standby Strategy**: Defense-first approach, BUY/SELL/LONG/SHORT completely removed
3. **Precision/Accuracy Focus**: Trap score (0-100) visualization, not "win rate"
4. **Gemini Intelligence Editor**: Text-based newsletter format with StoryBrand Strategy 2.0 framework
5. **Dr. Grok Psychological Support**: Real-time sentiment analysis + healing commentator

## 10 Emotional Benefits

1. Freedom from anxiety
2. Confidence restoration
3. Discipline maintenance
4. Loss avoidance
5. Clear decision criteria
6. Reduced emotional trading decisions
7. Relief from information overload confusion
8. Freedom from lonely decisions
9. Continuous learning opportunities
10. Community support

## Pricing Plans

- **Monthly Entry**: $69/month (30-day subscription, 1-day free trial + free updates)
- **Pro 3-Month**: $165 (90-day, 20% OFF, monthly equivalent $55, 1-day free trial + free updates) - Recommended
- **Elite Annual**: $588 (365-day, 29% OFF, monthly equivalent $49, 1-day free trial + free updates + Trap Defense Alt Bundle)

All plans include:
- ✅ 1-day free trial (24-hour free access before purchase)
- ✅ Free updates (lifetime support, automatic new features and algorithm improvements)`,
  type: 'Software',
  category: 'Trading',
};

// 市場別の翻訳プロンプト
const TRANSLATION_PROMPTS: Record<string, string> = {
  AR: `以下の英語のコンテンツをアラビア語（フスハー）に翻訳してください。フォーマルな口調で、暗号通貨トレーディングの専門用語を正確に翻訳してください。RTL（右から左）レイアウトを考慮して、改行を適切に入れてください。`,
  KO: `以下の英語のコンテンツを韓国語に翻訳してください。簡潔で明確な表現を心がけ、暗号通貨トレーディングの専門用語を正確に翻訳してください。`,
  JA: `以下の英語のコンテンツを日本語に翻訳してください。丁寧で分かりやすい表現を心がけ、暗号通貨トレーディングの専門用語を正確に翻訳してください。`,
  ES: `以下の英語のコンテンツをスペイン語に翻訳してください。親しみやすく明確な表現を心がけ、暗号通貨トレーディングの専門用語を正確に翻訳してください。`,
  'PT-BR': `以下の英語のコンテンツをブラジルポルトガル語に翻訳してください。エネルギッシュで明確な表現を心がけ、暗号通貨トレーディングの専門用語を正確に翻訳してください。`,
};

// 市場別のタイトル
const MARKET_TITLES: Record<string, string> = {
  EN: 'Trap Defence BTC - English',
  AR: 'Trap Defence BTC - العربية',
  KO: 'Trap Defence BTC - 한국어',
  JA: 'Trap Defence BTC - 日本語',
  ES: 'Trap Defence BTC - Español',
  'PT-BR': 'Trap Defence BTC - Português (Brasil)',
};

/**
 * ENコンテンツを各市場の言語に翻訳
 */
async function translateContent(market: string, content: string): Promise<string> {
  const prompt = TRANSLATION_PROMPTS[market];
  if (!prompt) {
    throw new Error(`Translation prompt not found for market: ${market}`);
  }

  console.log(`📝 ${market}市場のコンテンツを翻訳中...`);

  try {
    // GPT-5.2で翻訳（高品質な翻訳）
    const result = await callGPT52(
      `${prompt}\n\n${content}`,
      {
        temperature: 0.3, // 低めの温度で一貫性を保つ
        maxCompletionTokens: 4096,
      }
    );

    return result.text;
  } catch (error: any) {
    console.error(`❌ ${market}市場の翻訳エラー:`, error.message);
    // フォールバック: Geminiで翻訳
    try {
      const result = await callGemini3Pro(
        `${prompt}\n\n${content}`,
        {
          thinkingLevel: 'low',
          temperature: 0.3,
          maxOutputTokens: 4096,
        }
      );
      return result.text;
    } catch (fallbackError: any) {
      console.error(`❌ ${market}市場のフォールバック翻訳も失敗:`, fallbackError.message);
      throw fallbackError;
    }
  }
}

/**
 * Whopプロダクトページを更新
 */
async function updateWhopProduct(market: string, productId: string, content: any) {
  console.log(`🔄 ${market}市場のWhopプロダクトページを更新中... (${productId})`);

  try {
    // Whop APIでプロダクト情報を更新
    // 注意: Whop API v2の仕様に応じて調整が必要
    const updateData: any = {
      name: content.name,
      description: content.description,
      // その他のフィールドはWhop APIの仕様に応じて追加
    };

    // Whop APIでプロダクトを更新
    // 注意: Whop API v2には直接的な更新エンドポイントがない場合があるため、
    // 実際のAPI仕様を確認して調整が必要
    const result = await whopRequestSafe(
      'PATCH',
      `/products/${productId}`,
      updateData,
      {
        maxRetries: 3,
        retryDelay: 1000,
      }
    );

    console.log(`✅ ${market}市場のWhopプロダクトページを更新しました`);
    return result;
  } catch (error: any) {
    console.error(`❌ ${market}市場のWhopプロダクトページ更新エラー:`, error.message);
    // エラーを記録して続行
    return { error: error.message };
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 6市場Whopプロダクトページ同期を開始します...\n');

  const markets = ['AR', 'KO', 'JA', 'ES', 'PT-BR'];
  const results: Record<string, any> = {};

  // 各市場のコンテンツを翻訳
  const translatedContents: Record<string, any> = {};

  for (const market of markets) {
    try {
      console.log(`\n📋 ${market}市場の処理を開始...`);

      // コンテンツを翻訳
      const translatedDescription = await translateContent(market, EN_CONTENT.description);
      const translatedName = await translateContent(market, EN_CONTENT.name);

      translatedContents[market] = {
        name: translatedName,
        title: MARKET_TITLES[market],
        description: translatedDescription,
        type: EN_CONTENT.type,
        category: EN_CONTENT.category,
      };

      // 翻訳結果を保存
      const contentDir = join(__dirname, '..', 'data', 'whop-content');
      if (!fs.existsSync(contentDir)) {
        fs.mkdirSync(contentDir, { recursive: true });
      }

      const contentPath = join(contentDir, `${market.toLowerCase()}.json`);
      fs.writeFileSync(contentPath, JSON.stringify(translatedContents[market], null, 2), 'utf-8');
      console.log(`💾 ${market}市場のコンテンツを保存しました: ${contentPath}`);

      // Whopプロダクトページを更新
      const productId = WHOP_PRODUCT_IDS[market as keyof typeof WHOP_PRODUCT_IDS];
      if (productId) {
        const updateResult = await updateWhopProduct(market, productId, translatedContents[market]);
        results[market] = updateResult;
      } else {
        console.warn(`⚠️ ${market}市場のプロダクトIDが見つかりません`);
        results[market] = { error: 'Product ID not found' };
      }
    } catch (error: any) {
      console.error(`❌ ${market}市場の処理エラー:`, error.message);
      results[market] = { error: error.message };
    }
  }

  // 結果を保存
  const outputDir = join(__dirname, '..', 'docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = join(outputDir, `WHOP_PRODUCTS_SYNC_RESULT_${Date.now()}.md`);
  fs.writeFileSync(
    outputPath,
    `# 6市場Whopプロダクトページ同期結果

**実行日時**: ${new Date().toISOString()}

## 結果サマリー

${Object.entries(results)
  .map(([market, result]) => {
    if (result.error) {
      return `- ❌ ${market}: ${result.error}`;
    } else {
      return `- ✅ ${market}: 更新完了`;
    }
  })
  .join('\n')}

## 詳細

${Object.entries(results)
  .map(([market, result]) => {
    return `### ${market}市場\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`;
  })
  .join('\n')}

## 次のステップ

1. Whopダッシュボードで各市場のプロダクトページを確認
2. 必要に応じて手動で調整
3. テスト購入で検証

`,
    'utf-8'
  );

  console.log(`\n✅ 同期完了！`);
  console.log(`📄 結果: ${outputPath}`);
}

main().catch((error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
