// services/x/influencerStock.js
// インフルエンサーストック管理（KVストレージ）

// 🚀 シームレスなKVアクセス（utils/kv.js経由）
const { kv } = require('../../utils/kv');

const { discoverInfluencersForQuoteRepost } = require('../grok/client');
const { 
  selectInfluencersForImpressionTarget, 
  selectInfluencersForHighEngagement,
  getInfluencerCountForLang,
  getStockCountForLang 
} = require('../../config/influencerStrategy');

// KVキーのプレフィックス
const STOCK_KEY_PREFIX = 'x:influencer_stock:';
const STOCK_UPDATE_TIME_KEY_PREFIX = 'x:influencer_stock_update:';

// ストックの有効期限（TTLなし - 永続保存）
// const STOCK_TTL = 24 * 60 * 60; // 24時間（秒） - 削除: 自動削除を無効化

/**
 * 言語別のストックキーを生成
 * @param {string} lang - 言語コード
 * @returns {string} KVキー
 */
function getStockKey(lang) {
  return `${STOCK_KEY_PREFIX}${lang.toLowerCase()}`;
}

/**
 * 言語別の更新時刻キーを生成
 * @param {string} lang - 言語コード
 * @returns {string} KVキー
 */
function getUpdateTimeKey(lang) {
  return `${STOCK_UPDATE_TIME_KEY_PREFIX}${lang.toLowerCase()}`;
}

/**
 * インフルエンサーをストックに保存
 * @param {string} lang - 言語コード
 * @param {Array} influencers - インフルエンサー配列
 * @returns {Promise<boolean>} 保存成功時true
 */
async function saveInfluencersToStock(lang, influencers) {
  // KV接続確認（utils/kv.js経由）
  if (!kv) {
    console.error('[InfluencerStock] ❌ CRITICAL: KV not available, cannot save influencers');
    console.error('[InfluencerStock] 💡 Check KV environment variables: KV_REST_API_URL, KV_REST_API_TOKEN');
    return false;
  }
  
  // KV接続テスト（詳細ログ付き）
  try {
    const testKey = `x:influencer_stock:test:${Date.now()}`;
    console.log(`[InfluencerStock] 🔵 KV接続テスト開始: ${testKey}`);
    
    const testValue = { test: true, timestamp: new Date().toISOString() };
    const testResult = await kv.set(testKey, testValue, { ex: 10 });
    
    console.log(`[InfluencerStock] 🔵 kv.set() 結果:`, testResult);
    
    if (!testResult) {
      console.error('[InfluencerStock] ❌ KV connection test failed (set returned false)');
      console.error('[InfluencerStock] 💡 KV環境変数を確認してください:');
      console.error('[InfluencerStock]   - KV_REST_API_URL:', process.env.KV_REST_API_URL ? '設定済み' : '未設定');
      console.error('[InfluencerStock]   - KV_REST_API_TOKEN:', process.env.KV_REST_API_TOKEN ? '設定済み' : '未設定');
      console.error('[InfluencerStock]   - KV_URL:', process.env.KV_URL ? '設定済み' : '未設定');
      return false;
    }
    
    const retrievedValue = await kv.get(testKey);
    console.log(`[InfluencerStock] 🔵 kv.get() 結果:`, retrievedValue);
    
    if (!retrievedValue || JSON.stringify(retrievedValue) !== JSON.stringify(testValue)) {
      console.error('[InfluencerStock] ❌ KV接続テスト失敗: 保存した値が取得できません');
      console.error('[InfluencerStock] 期待値:', JSON.stringify(testValue, null, 2));
      console.error('[InfluencerStock] 実際の値:', JSON.stringify(retrievedValue, null, 2));
      return false;
    }
    
    const delResult = await kv.del(testKey);
    console.log(`[InfluencerStock] 🔵 kv.del() 結果:`, delResult);
    console.log('[InfluencerStock] ✅ KV connection test passed');
  } catch (kvTestError) {
    console.error('[InfluencerStock] ❌ KV connection test failed:', kvTestError.message);
    console.error('[InfluencerStock] Stack:', kvTestError.stack);
    console.error('[InfluencerStock] 💡 KV環境変数を確認してください:');
    console.error('[InfluencerStock]   - KV_REST_API_URL:', process.env.KV_REST_API_URL ? '設定済み' : '未設定');
    console.error('[InfluencerStock]   - KV_REST_API_TOKEN:', process.env.KV_REST_API_TOKEN ? '設定済み' : '未設定');
    console.error('[InfluencerStock]   - KV_URL:', process.env.KV_URL ? '設定済み' : '未設定');
    return false;
  }

  try {
    const stockKey = getStockKey(lang);
    const updateTimeKey = getUpdateTimeKey(lang);
    
    // 🛡️ 保護機能1: 空配列での上書きを防ぐ
    if (!Array.isArray(influencers) || influencers.length === 0) {
      console.error(`[InfluencerStock] 🛡️ PROTECTION: Attempted to save empty array for ${lang} - BLOCKED`);
      console.error(`[InfluencerStock] 🛡️ This would delete all ${lang} influencers! Operation cancelled.`);
      
      // 既存のストックを確認
      const existing = await kv.get(stockKey);
      if (existing && Array.isArray(existing) && existing.length > 0) {
        console.error(`[InfluencerStock] 🛡️ Existing stock has ${existing.length} influencers - preserving existing data`);
        return false; // 既存データを保護
      }
      
      // 既存データがない場合でも空配列の保存は拒否
      console.error(`[InfluencerStock] 🛡️ No existing stock found, but empty array save is still blocked for safety`);
      return false;
    }
    
    // 🛡️ 保護機能2: 既存データのバックアップ（上書き前に保存）
    const existingStock = await kv.get(stockKey);
    if (existingStock && Array.isArray(existingStock) && existingStock.length > 0) {
      const backupKey = `${stockKey}:backup:${Date.now()}`;
      try {
        await kv.set(backupKey, existingStock);
        console.log(`[InfluencerStock] 🛡️ Backup created: ${backupKey} (${existingStock.length} influencers)`);
      } catch (backupError) {
        console.warn(`[InfluencerStock] ⚠️ Failed to create backup: ${backupError.message}`);
        // バックアップ失敗でも続行（ログのみ）
      }
    }
    
    // 🔒 言語整合性保証: すべてのインフルエンサーにlangフィールドを明示的に設定
    const targetLang = (lang || 'en').toLowerCase();
    const influencersWithLang = influencers.map(inf => ({
      ...inf,
      lang: targetLang, // 明示的に言語を設定（上書きも含む）
    }));
    
    // 言語不一致のインフルエンサーを警告（保存前に検証）
    const mismatchedLang = influencersWithLang.filter(inf => inf.lang && inf.lang.toLowerCase() !== targetLang);
    if (mismatchedLang.length > 0) {
      console.warn(`[InfluencerStock] ⚠️ Found ${mismatchedLang.length} influencers with mismatched language before saving for ${targetLang}:`, 
        mismatchedLang.map(inf => `@${inf.username} (lang: ${inf.lang})`));
      console.warn(`[InfluencerStock] 🔧 Correcting language field to ${targetLang} for all influencers`);
    }
    
    // 🛡️ 保護機能3: 最小数のチェック（10人未満の場合は警告）
    if (influencersWithLang.length < 10) {
      console.warn(`[InfluencerStock] ⚠️ WARNING: Only ${influencersWithLang.length} influencers to save for ${targetLang} (very low count!)`);
    }
    
    // インフルエンサーをストックに保存（TTLなし - 永続保存）
    console.log(`[InfluencerStock] 🔵 Attempting to save ${influencersWithLang.length} influencers to KV key: ${stockKey}`);
    console.log(`[InfluencerStock] 📊 Sample influencer before save:`, JSON.stringify(influencersWithLang[0], null, 2));
    
    try {
      // CRITICAL: kv.setはbooleanを返すが、エラー時は例外を投げる可能性がある
      const saveResult = await kv.set(stockKey, influencersWithLang);
      
      if (saveResult === false) {
        console.error(`[InfluencerStock] ❌ kv.set returned false for ${stockKey}`);
        console.error(`[InfluencerStock] 💡 Check KV connection and permissions`);
        return false;
      }
      
      console.log(`[InfluencerStock] ✅ kv.set succeeded for ${stockKey}`);
      
      // 🔍 保存後の検証（CRITICAL: 保存が確実に成功したことを確認）
      console.log(`[InfluencerStock] 🔵 Verifying save by retrieving from KV...`);
      const retrieved = await kv.get(stockKey);
      
      if (!retrieved) {
        console.error(`[InfluencerStock] ❌ CRITICAL: Save verification failed - retrieved value is null`);
        console.error(`[InfluencerStock] 💡 KV保存は成功したが、取得できませんでした`);
        return false;
      }
      
      if (!Array.isArray(retrieved)) {
        console.error(`[InfluencerStock] ❌ CRITICAL: Save verification failed - retrieved value is not an array`);
        console.error(`[InfluencerStock] 💡 Retrieved type: ${typeof retrieved}`);
        console.error(`[InfluencerStock] 💡 Retrieved value:`, JSON.stringify(retrieved, null, 2));
        return false;
      }
      
      if (retrieved.length !== influencersWithLang.length) {
        console.error(`[InfluencerStock] ❌ CRITICAL: Save verification failed - count mismatch`);
        console.error(`[InfluencerStock] 💡 Expected: ${influencersWithLang.length}, Got: ${retrieved.length}`);
        console.error(`[InfluencerStock] 💡 This indicates a partial save failure`);
        return false;
      }
      
      // サンプルデータの検証
      const sampleRetrieved = retrieved[0];
      const sampleOriginal = influencersWithLang[0];
      if (sampleRetrieved.tweetId !== sampleOriginal.tweetId || 
          sampleRetrieved.username !== sampleOriginal.username) {
        console.error(`[InfluencerStock] ❌ CRITICAL: Save verification failed - sample data mismatch`);
        console.error(`[InfluencerStock] 💡 Original sample:`, JSON.stringify(sampleOriginal, null, 2));
        console.error(`[InfluencerStock] 💡 Retrieved sample:`, JSON.stringify(sampleRetrieved, null, 2));
        return false;
      }
      
      console.log(`[InfluencerStock] ✅✅✅ Save verification PASSED: ${retrieved.length} influencers confirmed in KV`);
      console.log(`[InfluencerStock] 📊 Retrieved sample:`, JSON.stringify(sampleRetrieved, null, 2));
      
    } catch (setError) {
      console.error(`[InfluencerStock] ❌ Exception during kv.set for ${stockKey}:`, setError.message);
      console.error(`[InfluencerStock] Stack:`, setError.stack);
      return false;
    }
    
    // 更新時刻を保存（TTLなし - 永続保存）
    try {
      const updateTimeResult = await kv.set(updateTimeKey, new Date().toISOString());
      if (updateTimeResult === false) {
        console.warn(`[InfluencerStock] ⚠️ Failed to save update time, but influencers were saved`);
      }
    } catch (updateTimeError) {
      console.warn(`[InfluencerStock] ⚠️ Exception saving update time (non-fatal):`, updateTimeError.message);
    }
    
    console.log(`[InfluencerStock] ✅✅✅ Saved and verified ${influencersWithLang.length} influencers to stock for ${targetLang} (all with lang field set)`);
    return true;
  } catch (error) {
    console.error(`[InfluencerStock] ❌ Failed to save influencers to stock for ${lang}:`, error.message);
    console.error(`[InfluencerStock] ❌ Error stack:`, error.stack);
    console.error(`[InfluencerStock] ❌ Attempted to save ${influencers?.length || 0} influencers`);
    console.error(`[InfluencerStock] ❌ KV available:`, !!kv);
    if (kv) {
      try {
        // KV接続テスト
        const testKey = `x:influencer_stock:test:${Date.now()}`;
        await kv.set(testKey, { test: true }, { ex: 10 });
        await kv.get(testKey);
        await kv.del(testKey);
        console.log(`[InfluencerStock] ✅ KV connection test passed`);
      } catch (kvTestError) {
        console.error(`[InfluencerStock] ❌ KV connection test failed:`, kvTestError.message);
      }
    }
    return false;
  }
}

/**
 * ストックからインフルエンサーを取得（スコアリング・フィルタリング機能付き）
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション
 * @param {boolean} options.enableScoring - スコアリングを有効にする（デフォルト: false）
 * @param {number} options.topN - 上位N人を返す（デフォルト: 全員）
 * @returns {Promise<Array>} インフルエンサー配列（スコアリング有効時はスコアでソート）
 */
async function getInfluencersFromStock(lang, options = {}) {
  if (!kv) {
    console.warn('[InfluencerStock] KV not available, cannot get influencers from stock');
    return [];
  }

  try {
    const stockKey = getStockKey(lang);
    let influencers = await kv.get(stockKey);
    
    if (!influencers || !Array.isArray(influencers) || influencers.length === 0) {
      console.log(`[InfluencerStock] No influencers in stock for ${lang}`);
      return [];
    }
    
    console.log(`[InfluencerStock] ✅ Retrieved ${influencers.length} influencers from stock for ${lang}`);

    // 🔒 言語整合性検証: ストックに保存されたインフルエンサーが正しい言語のストックから取得されているか確認
    // 注意: インフルエンサーオブジェクトにlangフィールドがある場合は検証、なければ警告のみ
    const mismatchedLang = influencers.filter(inf => inf.lang && inf.lang.toLowerCase() !== lang.toLowerCase());
    if (mismatchedLang.length > 0) {
      console.error(`[InfluencerStock] ⚠️⚠️⚠️ LANGUAGE MISMATCH WARNING: Found ${mismatchedLang.length} influencers with mismatched language in stock for ${lang}:`, 
        mismatchedLang.map(inf => `@${inf.username} (lang: ${inf.lang})`));
      // 言語不一致のインフルエンサーを除外
      influencers = influencers.filter(inf => !inf.lang || inf.lang.toLowerCase() === lang.toLowerCase());
      console.log(`[InfluencerStock] ✅ Filtered to ${influencers.length} influencers with correct language (${lang})`);
    }
    
    // 🔒 言語フィールドがないインフルエンサーにlangを設定（古いストックデータ対応）
    influencers = influencers.map(inf => ({
      ...inf,
      lang: inf.lang || lang, // langフィールドがない場合は現在の言語を設定
    }));

    // 公式 88 件を優先: official → discovered → legacy の順でソート（統合ローテーション）
    if (options.prioritizeOfficial) {
      const sourceOrder = { official: 0, discovered: 1, legacy: 2 };
      influencers.sort((a, b) => (sourceOrder[a.source] ?? 2) - (sourceOrder[b.source] ?? 2));
      const officialCount = influencers.filter((inf) => inf.source === "official").length;
      if (officialCount > 0) {
        console.log(`[InfluencerStock] ✅ Prioritized: ${officialCount} official, order official→discovered→legacy`);
      }
    }

    // 🔥 改善: スコアリング機能が有効な場合、Webhookデータからエンゲージメント統計を取得してスコアを計算
    if (options.enableScoring) {
      const influencersWithScores = await Promise.all(
        influencers.map(async (influencer) => {
          // Webhookデータからインフルエンサー別のエンゲージメント統計を取得
          const influencerStatsKey = `x:webhook:stats:influencer:${influencer.username}`;
          const influencerStats = await kv.get(influencerStatsKey) || {
            totalLikes: 0,
            totalRetweets: 0,
            totalReplies: 0,
            tweetCount: 0,
          };

          // 動的スコアリング: エンゲージメント率60% + インプレッション30% + コンバージョン10%
          const engagementRate = influencer.engagementRate || 0;
          const recentImpressions = influencer.recentImpressions || 0;
          const totalEngagement = (influencerStats.totalLikes || 0) + (influencerStats.totalRetweets || 0) + (influencerStats.totalReplies || 0);
          
          // スコア計算（0-100の範囲に正規化）
          const engagementScore = engagementRate * 60; // エンゲージメント率（0-1）を60点満点に
          const impressionsScore = Math.min(recentImpressions / 100000, 1) * 30; // インプレッション（0-100k）を30点満点に
          const conversionScore = Math.min(totalEngagement / 100, 1) * 10; // 総エンゲージメント（0-100）を10点満点に
          
          const score = engagementScore + impressionsScore + conversionScore;

          return {
            ...influencer,
            score,
            webhookStats: influencerStats,
          };
        })
      );

      // スコアでソート（降順）
      influencersWithScores.sort((a, b) => (b.score || 0) - (a.score || 0));

      // topNが指定されている場合は上位N人を返す
      const result = options.topN ? influencersWithScores.slice(0, options.topN) : influencersWithScores;
      
      console.log(`[InfluencerStock] ✅ Scored and sorted ${result.length} influencers (top score: ${result[0]?.score?.toFixed(2) || 'N/A'})`);
      return result;
    }
    
    return influencers;
  } catch (error) {
    console.error(`[InfluencerStock] ❌ Failed to get influencers from stock for ${lang}:`, error.message);
    return [];
  }
}

/**
 * ストックの更新時刻を取得
 * @param {string} lang - 言語コード
 * @returns {Promise<string|null>} 更新時刻（ISO 8601形式）またはnull
 */
async function getStockUpdateTime(lang) {
  if (!kv) {
    return null;
  }

  try {
    const updateTimeKey = getUpdateTimeKey(lang);
    const updateTime = await kv.get(updateTimeKey);
    return updateTime || null;
  } catch (error) {
    console.error(`[InfluencerStock] Failed to get update time for ${lang}:`, error.message);
    return null;
  }
}

/**
 * ストックを更新（Grok APIから新しいインフルエンサーを取得してストックに保存）
 * ⚠️ 手動実行専用 - CronJobsから自動実行されることはありません
 * 手動実行: /api/x-update-influencer-stock?lang={lang}
 * 
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション
 * @returns {Promise<Array>} 更新されたインフルエンサー配列
 */
async function updateInfluencerStock(lang, options = {}) {
  const targetLang = (lang || 'en').toLowerCase();
  const targetCount = getInfluencerCountForLang(targetLang);
  const stockCount = getStockCountForLang(targetLang);
  
  console.log(`[InfluencerStock] 🔄 Updating influencer stock for ${targetLang}...`);
  console.log(`[InfluencerStock] Target: ${stockCount} influencers for stock (posting: ${targetCount})`);
  
  try {
    // Grok APIからインフルエンサーを発見（候補数を大幅に増加 - 好反応率重視）
    // ストック数の5倍以上を取得して、より良い選択肢を確保（最大限の探索）
    const candidateCount = Math.max(stockCount * 5, 50); // ストック数の5倍、最低50人（最大限の探索）
    console.log(`[InfluencerStock] Requesting ${candidateCount} candidate influencers from Grok API (maximum exploration)...`);
    
    const discoveredInfluencers = await discoverInfluencersForQuoteRepost(targetLang, { 
      maxResults: candidateCount 
    });
    
    // 🛡️ 保護機能: Grok APIから取得できなかった場合、既存のストックを保持
    if (!discoveredInfluencers || discoveredInfluencers.length === 0) {
      console.error(`[InfluencerStock] ❌ No influencers discovered for ${targetLang} from Grok API`);
      console.error(`[InfluencerStock] 🛡️ PROTECTION: Returning existing stock to prevent deletion`);
      
      // 既存のストックを取得して返す（空配列を返さない）
      const existingStock = await getInfluencersFromStock(targetLang);
      if (existingStock && existingStock.length > 0) {
        console.warn(`[InfluencerStock] ⚠️ Preserving existing stock: ${existingStock.length} influencers for ${targetLang}`);
        return existingStock;
      }
      
      // 既存のストックもない場合は空配列を返す（保存はしない）
      console.error(`[InfluencerStock] ❌ No existing stock found for ${targetLang} - manual update required`);
      return [];
    }
    
    console.log(`[InfluencerStock] Grok API returned ${discoveredInfluencers.length} candidate influencers for ${targetLang}`);
    
    // エンゲージメント率でフィルタリング（最低4%以上）
    const highEngagementInfluencers = discoveredInfluencers.filter(inf => {
      const engagementRate = inf.engagementRate || 0;
      return engagementRate >= 0.04; // 4%以上
    });
    
    console.log(`[InfluencerStock] Filtered to ${highEngagementInfluencers.length} influencers with 4%+ engagement rate`);
    
    // 好反応率重視の選択戦略を使用（エンゲージメント率とインプレッション数のバランス）
    const selectedInfluencers = selectInfluencersForHighEngagement(
      highEngagementInfluencers.length > 0 ? highEngagementInfluencers : discoveredInfluencers,
      targetLang
    );
    
    console.log(`[InfluencerStock] ✅ Selected ${selectedInfluencers.length} influencers for ${targetLang} stock (target: ${stockCount})`);
    
    // 選択されたインフルエンサーの統計を表示
    if (selectedInfluencers.length > 0) {
      const avgEngagement = selectedInfluencers.reduce((sum, inf) => sum + (inf.engagementRate || 0), 0) / selectedInfluencers.length;
      const avgImpressions = selectedInfluencers.reduce((sum, inf) => sum + (inf.recentImpressions || 0), 0) / selectedInfluencers.length;
      console.log(`[InfluencerStock] 📊 Average engagement rate: ${(avgEngagement * 100).toFixed(2)}%`);
      console.log(`[InfluencerStock] 📊 Average impressions: ${avgImpressions.toLocaleString()}`);
    }
    
    // 🔒 言語整合性保証: すべてのインフルエンサーにlangフィールドを設定（Grok 由来は source: legacy）
    const influencersWithLang = selectedInfluencers.map(inf => ({
      ...inf,
      lang: targetLang,
      source: inf.source || "legacy",
    }));
    
    // 🛡️ 保護機能: 選択されたインフルエンサーが空の場合は既存ストックを保持
    if (!selectedInfluencers || selectedInfluencers.length === 0) {
      console.error(`[InfluencerStock] ❌ No influencers selected for ${targetLang}`);
      console.error(`[InfluencerStock] 🛡️ PROTECTION: Preserving existing stock to prevent deletion`);
      
      // 既存のストックを取得して返す
      const existingStock = await getInfluencersFromStock(targetLang);
      if (existingStock && existingStock.length > 0) {
        console.warn(`[InfluencerStock] ⚠️ Preserving existing stock: ${existingStock.length} influencers for ${targetLang}`);
        return existingStock;
      }
      
      // 既存のストックもない場合は空配列を返す（保存はしない）
      console.error(`[InfluencerStock] ❌ No existing stock found for ${targetLang} - manual update required`);
      return [];
    }
    
    // ストックに保存
    const saved = await saveInfluencersToStock(targetLang, influencersWithLang);
    
    if (saved) {
      console.log(`[InfluencerStock] ✅✅✅ Successfully updated stock for ${targetLang} with ${selectedInfluencers.length} influencers`);
    } else {
      console.error(`[InfluencerStock] ❌ Failed to save influencers to stock for ${targetLang}`);
      // 保存に失敗した場合も既存ストックを返す
      const existingStock = await getInfluencersFromStock(targetLang);
      if (existingStock && existingStock.length > 0) {
        console.warn(`[InfluencerStock] 🛡️ Returning existing stock after save failure: ${existingStock.length} influencers`);
        return existingStock;
      }
    }
    
    return selectedInfluencers;
  } catch (error) {
    console.error(`[InfluencerStock] ❌ Failed to update influencer stock for ${targetLang}:`, error.message);
    console.error(`[InfluencerStock] Error stack:`, error.stack);
    return [];
  }
}

/**
 * すべての言語のストックを更新
 * ⚠️ 手動実行専用 - CronJobsから自動実行されることはありません
 * 手動実行: /api/x-update-influencer-stock?all=true
 * 
 * @param {Array<string>} langs - 言語コード配列（省略時は全言語）
 * @param {Object} options - オプション
 * @param {number} options.timeoutMs - タイムアウト時間（ミリ秒、デフォルト: 無制限）
 * @returns {Promise<Object>} 言語別の更新結果
 */
async function updateAllInfluencerStocks(langs = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'], options = {}) {
  const results = {};
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs || Infinity;
  
  console.log(`[InfluencerStock] 🔄 Updating influencer stocks for all languages: ${langs.join(', ')}`);
  if (timeoutMs !== Infinity) {
    console.log(`[InfluencerStock] ⚠️ Timeout set to ${timeoutMs}ms`);
  }
  
  for (const lang of langs) {
    // タイムアウトチェック
    const elapsed = Date.now() - startTime;
    if (elapsed > timeoutMs) {
      console.warn(`[InfluencerStock] ⚠️ Timeout approaching (${elapsed}ms), stopping updates`);
      results[lang] = {
        success: false,
        error: 'Timeout: Stopped before processing this language',
        count: 0,
      };
      break;
    }
    
    try {
      const influencers = await updateInfluencerStock(lang);
      results[lang] = {
        success: true,
        count: influencers.length,
        influencers: influencers.slice(0, 5), // 最初の5人だけ返す（ログ用）
      };
      
      // レート制限対策（言語間で3秒待機、タイムアウト対策で短縮）
      if (lang !== langs[langs.length - 1]) {
        const remainingTime = timeoutMs - (Date.now() - startTime);
        const waitTime = Math.min(3000, remainingTime - 1000); // 最低1秒のバッファを残す
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    } catch (error) {
      console.error(`[InfluencerStock] ❌ Failed to update stock for ${lang}:`, error.message);
      results[lang] = {
        success: false,
        error: error.message,
        count: 0,
      };
    }
  }
  
  const totalElapsed = Date.now() - startTime;
  console.log(`[InfluencerStock] ✅✅✅ Completed updating all influencer stocks (${totalElapsed}ms)`);
  return results;
}

/**
 * ストックから指定 tweetId のインフルエンサーを1件削除（X API "Could not find tweet" 対策）
 * 引用元ツイートが削除・非公開になった場合、当該エントリを除去して次回から再試行しないようにする。
 * @param {string} lang - 言語コード
 * @param {string|number} tweetId - 除去するツイートID
 * @param {string} [username] - ログ用のインフルエンサー名（任意）
 * @returns {Promise<boolean>} 削除して保存した場合 true、何もしなかった場合 false
 */
async function removeInfluencerFromStockByTweetId(lang, tweetId, username = null) {
  if (!kv || !lang || tweetId == null) return false;
  const targetLang = (lang || "").toLowerCase();
  const targetId = String(tweetId).trim();
  if (!targetId) return false;

  try {
    const stockKey = getStockKey(targetLang);
    const influencers = await kv.get(stockKey);
    if (!Array.isArray(influencers) || influencers.length === 0) return false;

    const before = influencers.length;
    const filtered = influencers.filter(
      (inf) => String(inf.tweetId || "").trim() !== targetId
    );
    const removed = before - filtered.length;
    if (removed === 0) return false;

    if (filtered.length === 0) {
      console.warn(
        `[InfluencerStock] ⚠️ Would empty stock for ${targetLang} (tweetId=${targetId} @${username || "?"}); not saving to avoid empty stock`
      );
      return false;
    }

    const saved = await saveInfluencersToStock(targetLang, filtered);
    if (saved) {
      console.log(
        `[InfluencerStock] 🗑️ Removed 1 entry from stock for ${targetLang} (tweetId=${targetId} @${username || "?"}); remaining ${filtered.length}`
      );
    }
    return saved;
  } catch (error) {
    console.error(
      `[InfluencerStock] ❌ removeInfluencerFromStockByTweetId failed for ${targetLang} tweetId=${targetId}:`,
      error.message
    );
    return false;
  }
}

module.exports = {
  saveInfluencersToStock,
  getInfluencersFromStock,
  getStockUpdateTime,
  removeInfluencerFromStockByTweetId,
  // ⚠️ updateInfluencerStock / updateAllInfluencerStocks は手動専用（Grok でリスト取得するため）
  // vercel.json の crons に /api/x-update-influencer-stock を追加しないこと
  updateInfluencerStock,
  updateAllInfluencerStocks,
};
