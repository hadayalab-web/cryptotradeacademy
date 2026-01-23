// scripts/check-queue-leads.js
// キュー内のリードのtweetId有無を確認

const { getQueueStats, dequeueLead } = require('../services/lead-discovery/priorityQueue');

async function checkQueueLeads() {
  console.log('🔍 キュー内のリードを確認中...\n');
  
  try {
    // キュー統計を取得
    const stats = await getQueueStats();
    console.log('📊 キュー統計:');
    console.log(`   総数: ${stats.total}件`);
    console.log(`   ドンピシャリード: ${stats.perfectMatch}件`);
    console.log(`   高優先度: ${stats.high}件`);
    console.log(`   中優先度: ${stats.medium}件`);
    console.log(`   低優先度: ${stats.low}件\n`);
    
    if (stats.total === 0) {
      console.log('✅ キューは空です');
      return;
    }
    
    // サンプルとして最初の10件を確認（実際にはdequeueしない）
    console.log('📋 キュー内のリードサンプル（最初の10件）:');
    
    // 注意: dequeueLead()を呼ぶと実際にキューから削除されるため、
    // ここでは統計のみを表示する
    // 実際のリード内容を確認するには、KVストレージを直接確認する必要がある
    
    console.log('\n💡 キュー内のリードの詳細を確認するには、KVストレージを直接確認してください');
    console.log('   キー: lead-discovery:queue:*');
    
    // tweetIdがないリードの可能性をチェック
    console.log('\n⚠️ リプライ送信が0件の可能性のある原因:');
    console.log('   1. キュー内のリードにtweetIdがない');
    console.log('   2. 重複送信防止でスキップされている');
    console.log('   3. レート制限で待機している');
    console.log('   4. replyVSL1ToLeadが失敗している');
    
    console.log('\n🔧 確認方法:');
    console.log('   1. Vercelログで「Lead Discovery Process」のログを確認');
    console.log('   2. 「No tweetId」のログがあるか確認');
    console.log('   3. 「Reply result:」のログを確認');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

checkQueueLeads();
