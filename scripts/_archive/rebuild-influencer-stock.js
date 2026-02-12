// scripts/rebuild-influencer-stock.js
// 6言語のインフルエンサーリストを再構築（数を増やす）
// 内部理解: Xアルゴリズムハッキング戦略のためのインフルエンサーストック再構築

const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');
const { saveInfluencersToStock, getInfluencersFromStock } = require('../services/x/influencerStock');

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

// 各言語で取得するインフルエンサー数（増加）
const INFLUENCERS_PER_LANG = 100; // 386人から増やす（各言語100人 = 600人）

/**
 * 6言語のインフルエンサーリストを再構築
 */
async function rebuildInfluencerStock() {
  console.log('='.repeat(80));
  console.log('インフルエンサーストック再構築開始');
  console.log('='.repeat(80));
  console.log(`対象言語: ${SUPPORTED_LANGS.join(', ')}`);
  console.log(`各言語の取得数: ${INFLUENCERS_PER_LANG}人`);
  console.log(`合計目標: ${SUPPORTED_LANGS.length * INFLUENCERS_PER_LANG}人\n`);

  const results = {
    success: [],
    failed: [],
    total: 0
  };

  for (const lang of SUPPORTED_LANGS) {
    try {
      console.log(`\n[${lang.toUpperCase()}] インフルエンサー取得中...`);
      
      // 既存のストックを確認
      const existing = await getInfluencersFromStock(lang);
      console.log(`[${lang.toUpperCase()}] 既存ストック: ${existing.length}人`);

      // Grokからインフルエンサーを取得
      const influencers = await discoverInfluencersForQuoteRepost(lang, {
        maxResults: INFLUENCERS_PER_LANG
      });

      if (!influencers || influencers.length === 0) {
        console.warn(`[${lang.toUpperCase()}] ⚠️ インフルエンサーが取得できませんでした`);
        results.failed.push({ lang, reason: 'No influencers found' });
        continue;
      }

      console.log(`[${lang.toUpperCase()}] ✅ ${influencers.length}人のインフルエンサーを取得`);

      // データ検証
      const validInfluencers = influencers.filter(inf => {
        const hasRequiredFields = inf.username && inf.tweetId && inf.tweetText;
        if (!hasRequiredFields) {
          console.warn(`[${lang.toUpperCase()}] ⚠️ 必須フィールドが欠けているインフルエンサーをスキップ:`, inf.username || 'unknown');
        }
        return hasRequiredFields;
      });

      console.log(`[${lang.toUpperCase()}] ✅ 有効なインフルエンサー: ${validInfluencers.length}人`);

      // ストックに保存
      const saved = await saveInfluencersToStock(lang, validInfluencers);
      
      if (saved) {
        console.log(`[${lang.toUpperCase()}] ✅ ストックに保存完了: ${validInfluencers.length}人`);
        results.success.push({ lang, count: validInfluencers.length });
        results.total += validInfluencers.length;
      } else {
        console.error(`[${lang.toUpperCase()}] ❌ ストックへの保存に失敗`);
        results.failed.push({ lang, reason: 'Save failed' });
      }

      // レート制限対策: 言語間で少し待機
      if (lang !== SUPPORTED_LANGS[SUPPORTED_LANGS.length - 1]) {
        console.log(`[${lang.toUpperCase()}] 次の言語取得前に2秒待機...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`[${lang.toUpperCase()}] ❌ エラー:`, error.message);
      console.error(`[${lang.toUpperCase()}] スタックトレース:`, error.stack);
      results.failed.push({ lang, reason: error.message });
    }
  }

  // 最終結果の確認
  console.log('\n' + '='.repeat(80));
  console.log('インフルエンサーストック再構築結果');
  console.log('='.repeat(80));

  for (const lang of SUPPORTED_LANGS) {
    try {
      const stock = await getInfluencersFromStock(lang);
      console.log(`[${lang.toUpperCase()}] ストック数: ${stock.length}人`);
    } catch (error) {
      console.error(`[${lang.toUpperCase()}] ストック確認エラー:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('サマリー');
  console.log('='.repeat(80));
  console.log(`✅ 成功: ${results.success.length}言語`);
  console.log(`❌ 失敗: ${results.failed.length}言語`);
  console.log(`📊 合計インフルエンサー数: ${results.total}人`);

  if (results.success.length > 0) {
    console.log('\n成功した言語:');
    results.success.forEach(({ lang, count }) => {
      console.log(`  - ${lang.toUpperCase()}: ${count}人`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\n失敗した言語:');
    results.failed.forEach(({ lang, reason }) => {
      console.log(`  - ${lang.toUpperCase()}: ${reason}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('再構築完了');
  console.log('='.repeat(80));
}

// 実行
rebuildInfluencerStock().catch(error => {
  console.error('❌ 致命的なエラー:', error.message);
  console.error('スタックトレース:', error.stack);
  process.exit(1);
});
