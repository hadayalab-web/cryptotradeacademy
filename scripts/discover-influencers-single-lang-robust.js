// scripts/discover-influencers-single-lang-robust.js
// 一言語ずつ、段階的にインフルエンサーを発見・検証・保存（過去の問題を解決）

const fs = require('fs');
const path = require('path');
const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');

// 言語と目標数をコマンドライン引数から取得
const TARGET_LANG = process.argv[2] || 'en';
const TARGET_COUNT = parseInt(process.argv[3]) || 50; // デフォルト50人（段階的）
const BATCH_SIZE = 15; // 一度に取得する人数（小さいバッチで確実に）

const FINAL_DIR = path.join(__dirname, '..', 'data', 'influencers');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'influencers', 'backups');

// ディレクトリ作成
[FINAL_DIR, BACKUP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * 厳格な検証ロジック（過去の問題を解決）
 */
function strictValidate(influencer, lang) {
  const errors = [];
  
  // 1. tweetId検証: 18-19桁の数値（必須）
  if (!influencer.tweetId) {
    errors.push('tweetId is missing');
    return { valid: false, errors };
  }
  const tweetIdStr = String(influencer.tweetId).trim();
  if (!/^\d{18,19}$/.test(tweetIdStr)) {
    errors.push(`tweetId must be 18-19 digits (got: ${tweetIdStr})`);
    return { valid: false, errors };
  }
  
  // 2. username検証: @なし、空でない（必須）
  if (!influencer.username || !influencer.username.trim()) {
    errors.push('username is missing');
    return { valid: false, errors };
  }
  const username = String(influencer.username).trim().replace(/^@/, '');
  if (username.length === 0 || username.length > 15) {
    errors.push(`username must be 1-15 characters (got: ${username})`);
    return { valid: false, errors };
  }
  
  // 3. tweetText検証: 空でない、280文字以内（必須）
  if (!influencer.tweetText || !influencer.tweetText.trim()) {
    errors.push('tweetText is missing');
    return { valid: false, errors };
  }
  const tweetText = String(influencer.tweetText).trim();
  if (tweetText.length === 0 || tweetText.length > 280) {
    errors.push(`tweetText must be 1-280 characters (got: ${tweetText.length})`);
    return { valid: false, errors };
  }
  
  // 4. followerCount検証: 数値、> 0
  let followerCount = 0;
  if (influencer.followerCount) {
    if (typeof influencer.followerCount === 'string') {
      const match = influencer.followerCount.match(/(\d+)/);
      followerCount = match ? parseInt(match[1]) : 0;
    } else {
      followerCount = parseInt(influencer.followerCount) || 0;
    }
  }
  if (followerCount <= 0) {
    errors.push(`followerCount must be > 0 (got: ${followerCount})`);
  }
  
  // 5. engagementRate検証: 0-1の範囲
  let engagementRate = 0;
  if (influencer.engagementRate !== undefined) {
    engagementRate = parseFloat(influencer.engagementRate) || 0;
    if (engagementRate < 0 || engagementRate > 1) {
      errors.push(`engagementRate must be 0-1 (got: ${engagementRate})`);
    }
  }
  
  // 6. recentImpressions検証: 数値、>= 0
  let recentImpressions = 0;
  if (influencer.recentImpressions !== undefined) {
    recentImpressions = parseInt(influencer.recentImpressions) || 0;
    if (recentImpressions < 0) {
      errors.push(`recentImpressions must be >= 0 (got: ${recentImpressions})`);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    normalized: {
      username,
      tweetId: tweetIdStr,
      tweetText: tweetText.substring(0, 280),
      lang: lang.toLowerCase(),
      followerCount,
      engagementRate,
      recentImpressions,
      tier: determineTier(followerCount),
      discoveredAt: new Date().toISOString(),
      lastQuoteAt: null,
      quoteCount: 0,
      totalQuotes: 0,
      totalImpressions: 0,
      totalEngagements: 0,
      conversions: 0,
      shadowbanFlagged: false,
      isActive: true
    }
  };
}

function determineTier(followerCount) {
  if (followerCount >= 10000) return 'top';
  if (followerCount >= 1000) return 'mid';
  return 'bottom';
}

/**
 * 既存データを読み込む（重複チェック用）
 */
function loadExistingInfluencers(lang) {
  const langFile = path.join(FINAL_DIR, `influencers-${lang}.json`);
  if (!fs.existsSync(langFile)) {
    return [];
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(langFile, 'utf-8'));
    return data.influencers || [];
  } catch (error) {
    console.warn(`[${lang.toUpperCase()}] 既存ファイル読み込みエラー: ${error.message}`);
    return [];
  }
}

/**
 * バックアップを作成
 */
function createBackup(lang) {
  const langFile = path.join(FINAL_DIR, `influencers-${lang}.json`);
  if (!fs.existsSync(langFile)) {
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `influencers-${lang}-${timestamp}.json`);
  
  try {
    fs.copyFileSync(langFile, backupFile);
    console.log(`✅ [${lang.toUpperCase()}] バックアップ作成: ${backupFile}`);
  } catch (error) {
    console.warn(`[${lang.toUpperCase()}] バックアップ作成失敗: ${error.message}`);
  }
}

/**
 * データを保存（保存前・保存後の検証）
 */
function saveInfluencers(lang, influencers) {
  const langFile = path.join(FINAL_DIR, `influencers-${lang}.json`);
  
  // 保存前検証
  console.log(`\n[${lang.toUpperCase()}] 保存前検証:`);
  console.log(`  - インフルエンサー数: ${influencers.length}`);
  
  // 重複チェック（tweetIdベース）
  const tweetIdSet = new Set();
  const uniqueInfluencers = [];
  let duplicates = 0;
  
  for (const inf of influencers) {
    if (tweetIdSet.has(inf.tweetId)) {
      duplicates++;
      continue;
    }
    tweetIdSet.add(inf.tweetId);
    uniqueInfluencers.push(inf);
  }
  
  if (duplicates > 0) {
    console.log(`  ⚠️  重複削除: ${duplicates}件`);
  }
  
  console.log(`  - ユニーク数: ${uniqueInfluencers.length}`);
  
  // データ構造の検証
  const data = {
    lang: lang.toLowerCase(),
    updatedAt: new Date().toISOString(),
    count: uniqueInfluencers.length,
    influencers: uniqueInfluencers
  };
  
  // バックアップ作成
  createBackup(lang);
  
  // 保存
  try {
    fs.writeFileSync(langFile, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ [${lang.toUpperCase()}] 保存成功: ${langFile}`);
  } catch (error) {
    console.error(`❌ [${lang.toUpperCase()}] 保存失敗: ${error.message}`);
    throw error;
  }
  
  // 保存後検証（ファイルを読み込んで確認）
  try {
    const savedData = JSON.parse(fs.readFileSync(langFile, 'utf-8'));
    if (savedData.count !== uniqueInfluencers.length) {
      throw new Error(`保存後検証失敗: 期待値 ${uniqueInfluencers.length}, 実際 ${savedData.count}`);
    }
    console.log(`✅ [${lang.toUpperCase()}] 保存後検証成功: ${savedData.count}人`);
    return savedData;
  } catch (error) {
    console.error(`❌ [${lang.toUpperCase()}] 保存後検証失敗: ${error.message}`);
    throw error;
  }
}

/**
 * Grokからインフルエンサーを取得（小さいバッチで確実に）
 */
async function fetchInfluencersBatch(lang, batchSize, existingTweetIds, retryCount = 0) {
  const maxRetries = 3;
  console.log(`\n[${lang.toUpperCase()}] Grokから取得開始（バッチサイズ: ${batchSize}${retryCount > 0 ? `, リトライ ${retryCount}/${maxRetries}` : ''}）`);
  
  try {
    const rawInfluencers = await discoverInfluencersForQuoteRepost(lang, {
      maxResults: batchSize
    });
    
    if (!rawInfluencers || rawInfluencers.length === 0) {
      if (retryCount < maxRetries) {
        console.warn(`[${lang.toUpperCase()}] Grokから取得失敗（0人）、${2000 * (retryCount + 1)}ms後にリトライ...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        return await fetchInfluencersBatch(lang, batchSize, existingTweetIds, retryCount + 1);
      }
      console.warn(`[${lang.toUpperCase()}] Grokから取得失敗（0人、リトライ上限に達しました）`);
      return [];
    }
    
    console.log(`[${lang.toUpperCase()}] Grokから取得: ${rawInfluencers.length}人`);
    
    // 厳格な検証
    const validated = [];
    const invalid = [];
    
    for (const inf of rawInfluencers) {
      const validation = strictValidate(inf, lang);
      
      if (validation.valid) {
        // 重複チェック（既存データとの重複）
        if (!existingTweetIds.has(validation.normalized.tweetId)) {
          validated.push(validation.normalized);
          existingTweetIds.add(validation.normalized.tweetId);
        }
      } else {
        invalid.push({
          username: inf.username || 'unknown',
          errors: validation.errors
        });
      }
    }
    
    console.log(`[${lang.toUpperCase()}] 検証結果:`);
    console.log(`  ✅ 有効: ${validated.length}人`);
    console.log(`  ❌ 無効: ${invalid.length}人`);
    
    if (invalid.length > 0) {
      console.log(`  ⚠️  無効なデータの例:`);
      invalid.slice(0, 3).forEach(item => {
        console.log(`    - @${item.username}: ${item.errors.join(', ')}`);
      });
    }
    
    return validated;
    
  } catch (error) {
    console.error(`[${lang.toUpperCase()}] エラー: ${error.message}`);
    console.error(`[${lang.toUpperCase()}] エラー詳細:`, error.stack);
    
    // リトライ可能なエラーの場合はリトライ
    if (retryCount < maxRetries && (error.message.includes('rate limit') || error.message.includes('timeout'))) {
      console.warn(`[${lang.toUpperCase()}] リトライ可能なエラー、${2000 * (retryCount + 1)}ms後にリトライ...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
      return await fetchInfluencersBatch(lang, batchSize, existingTweetIds, retryCount + 1);
    }
    
    return [];
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('='.repeat(80));
  console.log(`インフルエンサー発見・検証・保存（${TARGET_LANG.toUpperCase()}）`);
  console.log('='.repeat(80));
  console.log(`目標数: ${TARGET_COUNT}人`);
  console.log(`バッチサイズ: ${BATCH_SIZE}人`);
  console.log(`言語: ${TARGET_LANG}`);
  
  // 既存データを読み込む
  const existing = loadExistingInfluencers(TARGET_LANG);
  const existingTweetIds = new Set(existing.map(inf => inf.tweetId));
  console.log(`\n既存データ: ${existing.length}人（重複チェック用）`);
  
  // 必要な人数を計算
  const needed = Math.max(0, TARGET_COUNT - existing.length);
  if (needed === 0) {
    console.log(`✅ 既に目標数に達しています（${existing.length}人）`);
    return;
  }
  
  console.log(`追加必要数: ${needed}人`);
  
  // 段階的に取得（小さいバッチで確実に）
  const allValidated = [...existing];
  let attempts = 0;
  const maxAttempts = Math.ceil(needed / BATCH_SIZE) + 2; // 余裕を持たせる
  
  while (allValidated.length < TARGET_COUNT && attempts < maxAttempts) {
    attempts++;
    const remaining = TARGET_COUNT - allValidated.length;
    const currentBatchSize = Math.min(BATCH_SIZE, remaining);
    
    console.log(`\n--- バッチ ${attempts} ---`);
    console.log(`残り必要数: ${remaining}人`);
    console.log(`今回のバッチサイズ: ${currentBatchSize}人`);
    
    const batch = await fetchInfluencersBatch(TARGET_LANG, currentBatchSize, existingTweetIds);
    
    if (batch.length === 0) {
      console.warn(`[${TARGET_LANG.toUpperCase()}] バッチ ${attempts}で取得失敗、次のバッチに進みます`);
      continue;
    }
    
    allValidated.push(...batch);
    console.log(`累計: ${allValidated.length}人 / 目標: ${TARGET_COUNT}人`);
    
    // 各バッチ後に保存（段階的保存で確実に）
    try {
      saveInfluencers(TARGET_LANG, allValidated);
      console.log(`✅ バッチ ${attempts}を保存しました`);
    } catch (error) {
      console.error(`❌ バッチ ${attempts}の保存に失敗: ${error.message}`);
      // エラーが発生しても続行（既存データは保持）
      break;
    }
    
    // 目標に達したら終了
    if (allValidated.length >= TARGET_COUNT) {
      break;
    }
    
    // レート制限回避のため少し待機
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // 最終結果
  console.log('\n' + '='.repeat(80));
  console.log('最終結果');
  console.log('='.repeat(80));
  console.log(`言語: ${TARGET_LANG.toUpperCase()}`);
  console.log(`目標数: ${TARGET_COUNT}人`);
  console.log(`取得数: ${allValidated.length}人`);
  console.log(`達成率: ${((allValidated.length / TARGET_COUNT) * 100).toFixed(1)}%`);
  
  // 階層別の内訳
  const byTier = {
    top: allValidated.filter(inf => inf.tier === 'top').length,
    mid: allValidated.filter(inf => inf.tier === 'mid').length,
    bottom: allValidated.filter(inf => inf.tier === 'bottom').length
  };
  console.log(`\n階層別内訳:`);
  console.log(`  - トップ: ${byTier.top}人`);
  console.log(`  - ミッド: ${byTier.mid}人`);
  console.log(`  - ボトム: ${byTier.bottom}人`);
  
  // 最終保存
  try {
    const finalData = saveInfluencers(TARGET_LANG, allValidated);
    console.log(`\n✅ 最終保存成功: ${finalData.count}人`);
  } catch (error) {
    console.error(`\n❌ 最終保存失敗: ${error.message}`);
    process.exit(1);
  }
}

// 実行
main().catch(error => {
  console.error('❌ 致命的エラー:', error);
  process.exit(1);
});
