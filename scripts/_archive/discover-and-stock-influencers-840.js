// scripts/discover-and-stock-influencers-840.js
// 840人のインフルエンサーを発見してKVにストック（深掘り分析に基づく最適配分）
// 内部理解: Xアルゴリズムハッキング戦略のためのインフルエンサーストック構築

const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');
const { saveInfluencersToStock, getInfluencersFromStock } = require('../services/x/influencerStock');

// 深掘り分析に基づく最適配分
const TARGET_DISTRIBUTION = {
  'en': 210,
  'es': 168,
  'pt-br': 168,
  'ar': 112,
  'ja': 98,
  'ko': 84
};

const TOTAL_TARGET = 840;

/**
 * フォロワー数に基づいて階層を判定
 * @param {number} followerCount - フォロワー数
 * @returns {string} 'top' | 'mid' | 'bottom'
 */
function determineTier(followerCount) {
  if (typeof followerCount === 'string') {
    // 範囲文字列の場合（例: "10000-50000"）
    const match = followerCount.match(/(\d+)/);
    if (match) {
      followerCount = parseInt(match[1]);
    } else {
      return 'mid'; // デフォルト
    }
  }
  
  if (typeof followerCount !== 'number') {
    return 'mid'; // デフォルト
  }
  
  if (followerCount >= 10000) {
    return 'top';
  } else if (followerCount >= 1000) {
    return 'mid';
  } else {
    return 'bottom';
  }
}

/**
 * インフルエンサーにタスク推進に必要な情報を追加
 * @param {Object} influencer - インフルエンサーオブジェクト
 * @param {string} lang - 言語コード
 * @returns {Object} 拡張されたインフルエンサーオブジェクト
 */
function enrichInfluencerData(influencer, lang) {
  // CRITICAL: tweetIdの最終検証
  if (!influencer.tweetId) {
    throw new Error(`CRITICAL: enrichInfluencerData called with influencer without tweetId: @${influencer.username || 'unknown'}`);
  }
  
  const tweetIdStr = String(influencer.tweetId).trim();
  if (!/^\d{18,19}$/.test(tweetIdStr)) {
    throw new Error(`CRITICAL: Invalid tweetId format in enrichInfluencerData: ${tweetIdStr} for @${influencer.username || 'unknown'}`);
  }
  
  const followerCount = influencer.followerCount || 0;
  const tier = determineTier(followerCount);
  
  return {
    // 基本情報（必須）- CRITICAL: これらが欠けていると引用リポストが失敗する
    username: String(influencer.username).trim().replace(/^@/, ''),
    tweetId: tweetIdStr, // 正規化済み（18-19桁の数値文字列）
    tweetText: influencer.tweetText || '',
    lang: lang.toLowerCase(),
    
    // エンゲージメント情報
    engagementRate: influencer.engagementRate || 0,
    followerCount: followerCount,
    recentImpressions: influencer.recentImpressions || 0,
    
    // 階層情報（タスク推進に必要）
    tier: tier,
    
    // メタデータ（タスク推進に必要）
    discoveredAt: new Date().toISOString(),
    lastQuoteAt: null, // まだ引用していない
    quoteCount: 0, // 引用回数
    lastQuoteDate: null, // 最後の引用日
    
    // パフォーマンス追跡（タスク推進に必要）
    totalQuotes: 0,
    totalImpressions: 0,
    totalEngagements: 0,
    conversions: 0,
    
    // シャドウバン検出（タスク推進に必要）
    shadowbanFlagged: false,
    shadowbanDetectedAt: null,
    
    // ローテーション管理（タスク推進に必要）
    rotationCycle: 0, // ローテーションサイクル
    isActive: true, // アクティブかどうか
    
    // その他のメタデータ
    notes: '', // メモ
    tags: [] // タグ
  };
}

/**
 * Grokのデータをローカルに保存
 * @param {string} lang - 言語コード
 * @param {Array} influencers - インフルエンサー配列
 * @returns {Promise<string>} 保存されたファイルパス
 */
async function saveGrokDataToLocal(lang, influencers) {
  const fs = require('fs');
  const path = require('path');
  
  const dataDir = path.join(__dirname, '../data/grok-influencers');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `influencers-${lang}-${timestamp}.json`;
  const filepath = path.join(dataDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(influencers, null, 2), 'utf-8');
  console.log(`[${lang.toUpperCase()}] ✅ Grokデータをローカルに保存: ${filepath} (${influencers.length}人)`);
  
  return filepath;
}

/**
 * ローカルファイルからKVに保存
 * @param {string} lang - 言語コード
 * @param {string} filepath - ローカルファイルパス
 * @returns {Promise<boolean>} 保存成功時true
 */
async function saveLocalDataToKV(lang, filepath) {
  const fs = require('fs');
  
  if (!fs.existsSync(filepath)) {
    console.error(`[${lang.toUpperCase()}] ❌ ローカルファイルが見つかりません: ${filepath}`);
    return false;
  }
  
  const rawData = fs.readFileSync(filepath, 'utf-8');
  const influencers = JSON.parse(rawData);
  
  if (!Array.isArray(influencers) || influencers.length === 0) {
    console.error(`[${lang.toUpperCase()}] ❌ ローカルファイルに有効なデータがありません: ${filepath}`);
    return false;
  }
  
  console.log(`[${lang.toUpperCase()}] 🔵 ローカルファイルから読み込み: ${influencers.length}人`);
  console.log(`[${lang.toUpperCase()}] 🔵 サンプルデータ:`, JSON.stringify(influencers[0] || {}, null, 2));
  
  // KV接続確認
  const { kv } = require('../utils/kv');
  if (!kv) {
    console.error(`[${lang.toUpperCase()}] ❌ CRITICAL: KV not available`);
    console.error(`[${lang.toUpperCase()}] 💡 Check KV environment variables: KV_REST_API_URL, KV_REST_API_TOKEN`);
    return false;
  }
  
  // KVに保存
  console.log(`[${lang.toUpperCase()}] 🔵 KVに保存を試みます...`);
  const saved = await saveInfluencersToStock(lang, influencers);
  
  if (saved) {
    console.log(`[${lang.toUpperCase()}] ✅✅✅ KVに保存完了: ${influencers.length}人`);
  } else {
    console.error(`[${lang.toUpperCase()}] ❌❌❌ KVへの保存に失敗`);
    console.error(`[${lang.toUpperCase()}] 💡 上記のログを確認して原因を特定してください`);
  }
  
  return saved;
}

/**
 * 一言語のインフルエンサーを発見してストック
 * @param {string} lang - 言語コード
 * @param {number} targetCount - 目標人数
 * @returns {Promise<Object>} 結果オブジェクト
 */
async function discoverAndStockForLang(lang, targetCount) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${lang.toUpperCase()}] インフルエンサー発見開始`);
  console.log(`${'='.repeat(80)}`);
  console.log(`目標人数: ${targetCount}人`);
  
  // 既存のストックを確認
  const existing = await getInfluencersFromStock(lang);
  console.log(`[${lang.toUpperCase()}] 既存ストック: ${existing.length}人`);
  
  if (existing.length >= targetCount) {
    console.log(`[${lang.toUpperCase()}] ✅ 既に目標人数に達しています（${existing.length}人 >= ${targetCount}人）`);
    return {
      lang,
      success: true,
      count: existing.length,
      message: 'Already at target'
    };
  }
  
  const needed = targetCount - existing.length;
  console.log(`[${lang.toUpperCase()}] 追加必要人数: ${needed}人`);
  
  // Grokからインフルエンサーを取得（複数回に分けて取得）
  const batchSize = 50; // 1回あたり50人取得
  const batches = Math.ceil(needed / batchSize);
  const allInfluencers = []; // Grokの生データを保持
  
  for (let batch = 0; batch < batches; batch++) {
    const remaining = needed - allInfluencers.length;
    if (remaining <= 0) break;
    
    const currentBatchSize = Math.min(batchSize, remaining);
    console.log(`[${lang.toUpperCase()}] バッチ ${batch + 1}/${batches}: ${currentBatchSize}人取得中...`);
    
    try {
      const influencers = await discoverInfluencersForQuoteRepost(lang, {
        maxResults: currentBatchSize
      });
      
      if (!influencers || influencers.length === 0) {
        console.warn(`[${lang.toUpperCase()}] ⚠️ バッチ ${batch + 1}でインフルエンサーが取得できませんでした`);
        continue;
      }
      
      console.log(`[${lang.toUpperCase()}] ✅ バッチ ${batch + 1}: ${influencers.length}人取得`);
      
      // Grokの生データをそのまま保持（検証は後で）
      allInfluencers.push(...influencers);
      
      // レート制限対策: バッチ間で待機
      if (batch < batches - 1) {
        console.log(`[${lang.toUpperCase()}] 次のバッチ取得前に3秒待機...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`[${lang.toUpperCase()}] ❌ バッチ ${batch + 1}でエラー:`, error.message);
      console.error(`[${lang.toUpperCase()}] Stack:`, error.stack);
      // エラーが発生しても続行
    }
  }
  
  // Grokの生データをローカルに保存（STEP 1）
  if (allInfluencers.length === 0) {
    console.error(`[${lang.toUpperCase()}] ❌ CRITICAL: Grokからインフルエンサーが取得できませんでした`);
    return {
      lang,
      success: false,
      count: 0,
      target: targetCount,
      message: 'No influencers from Grok'
    };
  }
  
  console.log(`[${lang.toUpperCase()}] 📊 Grokから取得: ${allInfluencers.length}人`);
  
  // STEP 1: Grokのデータをローカルに保存
  let localFilepath;
  try {
    localFilepath = await saveGrokDataToLocal(lang, allInfluencers);
  } catch (localSaveError) {
    console.error(`[${lang.toUpperCase()}] ❌ ローカル保存に失敗:`, localSaveError.message);
    return {
      lang,
      success: false,
      count: allInfluencers.length,
      target: targetCount,
      message: `Local save failed: ${localSaveError.message}`
    };
  }
  
  // STEP 2: データ検証と拡張
  console.log(`[${lang.toUpperCase()}] 🔵 データ検証と拡張を開始...`);
  const validInfluencers = allInfluencers
    .filter(inf => {
      // CRITICAL: tweetIdが必須（引用リポストに必要）
      if (!inf.tweetId) {
        console.warn(`[${lang.toUpperCase()}] ❌ Skipping influencer without tweetId:`, inf.username || 'unknown');
        return false;
      }
      
      // tweetIdが数値文字列であることを確認（18-19桁）
      const tweetIdStr = String(inf.tweetId).trim();
      if (!/^\d{18,19}$/.test(tweetIdStr)) {
        console.warn(`[${lang.toUpperCase()}] ❌ Invalid tweetId format: ${tweetIdStr} for @${inf.username || 'unknown'}`);
        return false;
      }
      
      // usernameが必須
      if (!inf.username || !inf.username.trim()) {
        console.warn(`[${lang.toUpperCase()}] ❌ Skipping influencer without username`);
        return false;
      }
      
      return true;
    })
    .map(inf => {
      // tweetIdを正規化（文字列として保存）
      const normalizedInf = {
        ...inf,
        tweetId: String(inf.tweetId).trim(),
        username: String(inf.username).trim().replace(/^@/, ''),
      };
      return enrichInfluencerData(normalizedInf, lang);
    })
    .filter(inf => {
      // 既存ストックとの重複チェック
      const isDuplicate = existing.some(existing => 
        existing.username === inf.username || existing.tweetId === inf.tweetId
      );
      if (isDuplicate) {
        console.warn(`[${lang.toUpperCase()}] ⚠️ Skipping duplicate: @${inf.username} (tweetId: ${inf.tweetId})`);
      }
      return !isDuplicate;
    });
  
  console.log(`[${lang.toUpperCase()}] ✅ 検証後: ${validInfluencers.length}人（元: ${allInfluencers.length}人）`);
  
  // 既存ストックとマージ
  const finalInfluencers = [...existing, ...validInfluencers];
  const finalCount = finalInfluencers.length;
  
  console.log(`[${lang.toUpperCase()}] 📊 最終数: ${finalCount}人（既存: ${existing.length}人 + 新規: ${validInfluencers.length}人）`);
  
  // STEP 3: 検証済みデータをローカルに保存
  const validatedFilepath = localFilepath.replace('.json', '-validated.json');
  const fs = require('fs');
  fs.writeFileSync(validatedFilepath, JSON.stringify(finalInfluencers, null, 2), 'utf-8');
  console.log(`[${lang.toUpperCase()}] ✅ 検証済みデータをローカルに保存: ${validatedFilepath}`);
  
  // STEP 4: ローカルファイルからKVに保存
  const saved = await saveLocalDataToKV(lang, validatedFilepath);
  
  if (saved) {
    // 階層別の内訳を表示
    const tierCounts = {
      top: finalInfluencers.filter(inf => inf.tier === 'top').length,
      mid: finalInfluencers.filter(inf => inf.tier === 'mid').length,
      bottom: finalInfluencers.filter(inf => inf.tier === 'bottom').length
    };
    console.log(`[${lang.toUpperCase()}] 📊 階層別内訳: Top ${tierCounts.top}人, Mid ${tierCounts.mid}人, Bottom ${tierCounts.bottom}人`);
    
    return {
      lang,
      success: true,
      count: finalCount,
      target: targetCount,
      tierCounts,
      localFile: localFilepath,
      validatedFile: validatedFilepath,
      message: finalCount >= targetCount ? 'Target reached' : 'Partial success'
    };
  } else {
    return {
      lang,
      success: false,
      count: finalCount,
      target: targetCount,
      localFile: localFilepath,
      validatedFile: validatedFilepath,
      message: 'KV save failed'
    };
  }
}

/**
 * 全言語のインフルエンサーを発見してストック
 */
async function discoverAndStockAll() {
  console.log('='.repeat(80));
  console.log('840人インフルエンサーストック構築開始');
  console.log('='.repeat(80));
  console.log(`目標総数: ${TOTAL_TARGET}人`);
  console.log(`言語配分:`);
  Object.entries(TARGET_DISTRIBUTION).forEach(([lang, count]) => {
    console.log(`  - ${lang.toUpperCase()}: ${count}人`);
  });
  console.log('');
  
  const results = {
    success: [],
    failed: [],
    total: 0,
    tierTotals: { top: 0, mid: 0, bottom: 0 }
  };
  
  // 一言語ずつ処理
  const languages = Object.keys(TARGET_DISTRIBUTION);
  
  for (let i = 0; i < languages.length; i++) {
    const lang = languages[i];
    const targetCount = TARGET_DISTRIBUTION[lang];
    
    try {
      const result = await discoverAndStockForLang(lang, targetCount);
      
      if (result.success) {
        results.success.push(result);
        results.total += result.count;
        if (result.tierCounts) {
          results.tierTotals.top += result.tierCounts.top;
          results.tierTotals.mid += result.tierCounts.mid;
          results.tierTotals.bottom += result.tierCounts.bottom;
        }
      } else {
        results.failed.push(result);
      }
      
      // 言語間で待機（最後の言語以外）
      if (i < languages.length - 1) {
        console.log(`\n次の言語処理前に5秒待機...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error) {
      console.error(`[${lang.toUpperCase()}] ❌ 致命的なエラー:`, error.message);
      console.error(`[${lang.toUpperCase()}] スタックトレース:`, error.stack);
      results.failed.push({
        lang,
        success: false,
        message: error.message
      });
    }
  }
  
  // 最終結果の確認
  console.log('\n' + '='.repeat(80));
  console.log('最終ストック確認');
  console.log('='.repeat(80));
  
  for (const lang of languages) {
    try {
      const stock = await getInfluencersFromStock(lang);
      const target = TARGET_DISTRIBUTION[lang];
      const status = stock.length >= target ? '✅' : '⚠️';
      console.log(`${status} [${lang.toUpperCase()}] ${stock.length}人 / 目標${target}人`);
    } catch (error) {
      console.error(`❌ [${lang.toUpperCase()}] ストック確認エラー:`, error.message);
    }
  }
  
  // サマリー
  console.log('\n' + '='.repeat(80));
  console.log('サマリー');
  console.log('='.repeat(80));
  console.log(`✅ 成功: ${results.success.length}言語`);
  console.log(`❌ 失敗: ${results.failed.length}言語`);
  console.log(`📊 合計インフルエンサー数: ${results.total}人 / 目標${TOTAL_TARGET}人`);
  console.log(`📊 階層別合計: Top ${results.tierTotals.top}人, Mid ${results.tierTotals.mid}人, Bottom ${results.tierTotals.bottom}人`);
  
  if (results.success.length > 0) {
    console.log('\n成功した言語:');
    results.success.forEach(({ lang, count, target, tierCounts }) => {
      const status = count >= target ? '✅' : '⚠️';
      console.log(`  ${status} ${lang.toUpperCase()}: ${count}人 / 目標${target}人`);
      if (tierCounts) {
        console.log(`      (Top: ${tierCounts.top}, Mid: ${tierCounts.mid}, Bottom: ${tierCounts.bottom})`);
      }
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n失敗した言語:');
    results.failed.forEach(({ lang, message }) => {
      console.log(`  ❌ ${lang.toUpperCase()}: ${message}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('処理完了');
  console.log('='.repeat(80));
  
  return results;
}

// 実行
if (require.main === module) {
  discoverAndStockAll().catch(error => {
    console.error('❌ 致命的なエラー:', error.message);
    console.error('スタックトレース:', error.stack);
    process.exit(1);
  });
}

module.exports = {
  discoverAndStockForLang,
  discoverAndStockAll,
  enrichInfluencerData,
  determineTier
};
