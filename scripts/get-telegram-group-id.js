// scripts/get-telegram-group-id.js
// TelegramグループIDを取得するヘルパースクリプト

require('dotenv').config({ path: '.env' });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * TelegramグループIDを取得する方法を案内
 */
function showInstructions() {
  console.log('📋 TelegramグループIDの取得方法\n');
  console.log('='.repeat(60));
  console.log('\n方法1: Botをグループに追加してメッセージを送信\n');
  console.log('1. 監視したいTelegramグループにBotを追加');
  console.log('2. グループ内で何かメッセージを送信（例: /start）');
  console.log('3. 以下のコマンドでWebhookログを確認:');
  console.log('   - Vercel Dashboard → Project → Logs');
  console.log('   - または、ローカルでWebhookを実行してログを確認');
  console.log('\n方法2: グループ情報を取得（Botがメンバーの場合）\n');
  console.log('以下のスクリプトを実行して、Botが参加しているグループのIDを取得できます。\n');
}

/**
 * Botが参加しているグループの情報を取得（getUpdates API使用）
 */
async function getBotGroups() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKENが設定されていません');
    console.log('\n.envファイルに以下を追加してください:');
    console.log('TELEGRAM_BOT_TOKEN=your_bot_token');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      console.error('❌ Telegram APIエラー:', data.description);
      return;
    }

    const updates = data.result || [];
    const groups = new Map();

    // グループメッセージからグループIDを抽出
    for (const update of updates) {
      if (update.message && update.message.chat) {
        const chat = update.message.chat;
        if (chat.type === 'group' || chat.type === 'supergroup') {
          const groupId = chat.id.toString();
          if (!groups.has(groupId)) {
            groups.set(groupId, {
              id: groupId,
              title: chat.title || 'Unknown',
              username: chat.username || null,
              type: chat.type,
            });
          }
        }
      }
    }

    if (groups.size === 0) {
      console.log('⚠️ Botが参加しているグループが見つかりませんでした');
      console.log('\n以下の手順でグループIDを取得してください:');
      console.log('1. 監視したいグループにBotを追加');
      console.log('2. グループ内でメッセージを送信');
      console.log('3. このスクリプトを再実行');
      return;
    }

    console.log(`\n✅ ${groups.size}個のグループが見つかりました:\n`);
    console.log('='.repeat(60));
    
    let index = 1;
    for (const [groupId, group] of groups) {
      console.log(`\nグループ #${index}`);
      console.log(`  ID: ${groupId}`);
      console.log(`  タイトル: ${group.title}`);
      console.log(`  ユーザー名: ${group.username ? '@' + group.username : 'なし'}`);
      console.log(`  タイプ: ${group.type}`);
      index++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📝 環境変数に追加する形式:\n');
    
    // 言語別に分類（手動で指定が必要）
    console.log('# 英語グループ（例）');
    console.log('TELEGRAM_MONITORED_GROUPS_EN=-1001234567890,-1001234567891');
    console.log('\n# スペイン語グループ（例）');
    console.log('TELEGRAM_MONITORED_GROUPS_ES=-1001234567892');
    console.log('\n# その他の言語も同様に設定してください\n');

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

/**
 * メイン実行
 */
async function main() {
  showInstructions();
  await getBotGroups();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { getBotGroups };
