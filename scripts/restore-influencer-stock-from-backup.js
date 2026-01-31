// scripts/restore-influencer-stock-from-backup.js
// バックアップからインフルエンサーストックを復旧するスクリプト

const { kv } = require('../utils/kv');

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const STOCK_KEY_PREFIX = 'x:influencer_stock:';
const BACKUP_KEY_PATTERN = /^x:influencer_stock:([^:]+):backup:(\d+)$/;

async function listBackups() {
  console.log('========================================');
  console.log('📦 バックアップ一覧');
  console.log('========================================\n');

  // 注意: KVにはキー一覧を取得するAPIがないため、
  // バックアップキーのパターンに基づいて検索する必要があります
  // 実際の実装では、バックアップキーを別途管理する必要があります

  console.log('⚠️  注意: KVにはキー一覧を取得するAPIがありません');
  console.log('   バックアップキーは以下のパターンで保存されています:');
  console.log('   x:influencer_stock:{lang}:backup:{timestamp}\n');

  // 各言語の最新のバックアップを探す（タイムスタンプベース）
  const backups = {};

  for (const lang of SUPPORTED_LANGS) {
    console.log(`🔍 ${lang}言語のバックアップを検索中...`);
    
    // 複数のタイムスタンプパターンを試す（過去24時間分）
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // 1時間ごとにバックアップを確認（過去24時間分）
    let foundBackup = null;
    let latestTimestamp = 0;
    
    for (let timestamp = oneDayAgo; timestamp <= now; timestamp += 60 * 60 * 1000) {
      const backupKey = `${STOCK_KEY_PREFIX}${lang}:backup:${timestamp}`;
      try {
        const data = await kv.get(backupKey);
        if (data && Array.isArray(data) && data.length > 0) {
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            foundBackup = {
              key: backupKey,
              timestamp: timestamp,
              count: data.length,
              date: new Date(timestamp).toISOString(),
            };
          }
        }
      } catch (error) {
        // キーが存在しない場合は無視
      }
    }
    
    if (foundBackup) {
      backups[lang] = foundBackup;
      console.log(`  ✅ 見つかりました: ${foundBackup.count}人 (${foundBackup.date})`);
    } else {
      console.log(`  ❌ バックアップが見つかりませんでした`);
    }
  }

  return backups;
}

async function restoreFromBackup(lang, backupKey) {
  console.log(`\n🔄 ${lang}言語のストックを復旧中...`);
  
  try {
    // バックアップからデータを取得
    const backupData = await kv.get(backupKey);
    
    if (!backupData || !Array.isArray(backupData) || backupData.length === 0) {
      console.error(`  ❌ バックアップデータが無効です`);
      return false;
    }

    // 現在のストックを確認
    const stockKey = `${STOCK_KEY_PREFIX}${lang}`;
    const currentStock = await kv.get(stockKey);
    
    if (currentStock && Array.isArray(currentStock) && currentStock.length > 0) {
      console.log(`  ⚠️  既存のストックが存在します (${currentStock.length}人)`);
      console.log(`  💡 上書きしますか？ (Y/N)`);
      // 実際の実装では、ユーザー入力を受け取る必要があります
      // ここでは自動的に続行します
    }

    // ストックを復旧
    await kv.set(stockKey, backupData);
    
    // 更新時刻を設定
    const updateTimeKey = `x:influencer_stock_update:${lang}`;
    await kv.set(updateTimeKey, new Date().toISOString());

    console.log(`  ✅ 復旧完了: ${backupData.length}人`);
    return true;
  } catch (error) {
    console.error(`  ❌ 復旧エラー: ${error.message}`);
    return false;
  }
}

async function restoreAll() {
  console.log('========================================');
  console.log('🔄 バックアップから全言語を復旧');
  console.log('========================================\n');

  const backups = await listBackups();

  if (Object.keys(backups).length === 0) {
    console.log('\n❌ 復旧可能なバックアップが見つかりませんでした');
    console.log('   緊急再構築スクリプトを使用してください:');
    console.log('   node scripts/emergency-rebuild-influencer-stock.js');
    return;
  }

  console.log('\n========================================');
  console.log('📋 復旧対象');
  console.log('========================================');
  for (const [lang, backup] of Object.entries(backups)) {
    console.log(`${lang}: ${backup.count}人 (${backup.date})`);
  }

  console.log('\n⚠️  既存のストックが上書きされます');
  console.log('   続行しますか？ (Ctrl+Cでキャンセル)\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const results = {};
  for (const [lang, backup] of Object.entries(backups)) {
    const success = await restoreFromBackup(lang, backup.key);
    results[lang] = success;
  }

  console.log('\n========================================');
  console.log('📊 復旧結果');
  console.log('========================================');
  let successCount = 0;
  for (const [lang, success] of Object.entries(results)) {
    const status = success ? '✅' : '❌';
    console.log(`${status} ${lang}`);
    if (success) successCount++;
  }

  console.log(`\n成功: ${successCount}/${Object.keys(results).length}言語`);

  if (successCount < Object.keys(results).length) {
    console.log('\n⚠️  一部の言語の復旧に失敗しました');
    console.log('   失敗した言語は緊急再構築スクリプトで再構築してください');
  }
}

// 実行
if (require.main === module) {
  restoreAll().catch(error => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
}

module.exports = {
  listBackups,
  restoreFromBackup,
  restoreAll,
};
