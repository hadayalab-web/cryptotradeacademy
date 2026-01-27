// services/x/userReplyHandler.js
// ユーザーリプライへの自動返信機能（Grok推奨: 最初の10リプライにパーソナライズされた自動返信）

const { xApiRequest, replyToTweet } = require('./client');
const { getXConfigStatus } = require('./config');
const { generateUserReplyText } = require('./userReplyGenerator');

// Vercel KV（リプライ履歴追跡用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[User Reply Handler] @vercel/kv not available:', error.message);
}

/**
 * ツイートのリプライを取得（X API v2）
 * @param {string} tweetId - ツイートID
 * @param {number} maxResults - 最大取得数（デフォルト: 10）
 * @returns {Promise<Array>} リプライ配列
 */
async function getTweetReplies(tweetId, maxResults = 10) {
  try {
    // P0 FIX: options.paramsを使用する形式に修正（Grok推奨）
    // conversation_idクエリを使用してリプライを取得（過去7日以内）
    // Grok推奨: `conversation_id:TARGET_TWEET_ID -is:retweet`でリツイートを除外
    const paramsObj = {
      query: `conversation_id:${tweetId} -is:retweet`, // リツイートを除外
      max_results: Math.min(Math.max(10, maxResults), 100).toString(), // X APIは文字列を期待する場合があるため、toString()を追加
      'tweet.fields': 'author_id,created_at,public_metrics,text,in_reply_to_user_id',
      'user.fields': 'username,name',
      expansions: 'author_id',
    };
    
    const response = await xApiRequest('/tweets/search/recent', {
      method: 'GET',
      params: paramsObj,
    });

    if (!response.data || !Array.isArray(response.data)) {
      return [];
    }

    // ユーザー情報をマッピング
    const usersMap = {};
    if (response.includes && response.includes.users) {
      response.includes.users.forEach(user => {
        usersMap[user.id] = user;
      });
    }

    // リプライを整形
    const replies = response.data.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id,
      author: usersMap[tweet.author_id] || null,
      createdAt: tweet.created_at,
      metrics: tweet.public_metrics || {},
      inReplyToUserId: tweet.in_reply_to_user_id,
    }));

    return replies;
  } catch (error) {
    console.error(`[User Reply Handler] Failed to get replies for tweet ${tweetId}:`, error.message);
    return [];
  }
}

/**
 * ユーザーリプライへの自動返信を実行
 * Grok推奨: 最初の10リプライにパーソナライズされた自動返信
 * @param {string} mainTweetId - メインツイートID
 * @param {string} lang - 言語コード
 * @param {Object} reportData - レポートデータ
 * @param {number} maxReplies - 最大返信数（デフォルト: 10）
 * @returns {Promise<Array>} 返信結果配列
 */
async function handleUserReplies(mainTweetId, lang, reportData = null, maxReplies = 10) {
  const xStatus = getXConfigStatus();
  
  if (!xStatus.postingEnabled || !xStatus.configured) {
    console.warn('[User Reply Handler] X posting disabled or not configured, skipping user reply handling');
    return [];
  }
  
  if (xStatus.dryRun) {
    console.log('[User Reply Handler] 🧪 DRY RUN MODE - User reply handling skipped');
    return [];
  }

  // 既に処理済みかチェック（KVストレージ）
  if (kv) {
    try {
      const key = `x:user_replies:${mainTweetId}`;
      const alreadyProcessed = await kv.get(key);
      if (alreadyProcessed) {
        console.log(`[User Reply Handler] Already processed replies for tweet ${mainTweetId}, skipping`);
        return [];
      }
    } catch (error) {
      console.warn('[User Reply Handler] Failed to check processing status:', error.message);
    }
  }

  // リプライを取得
  console.log(`[User Reply Handler] Fetching replies for tweet ${mainTweetId}...`);
  const replies = await getTweetReplies(mainTweetId, maxReplies);
  
  if (!replies || replies.length === 0) {
    console.log(`[User Reply Handler] No replies found for tweet ${mainTweetId}`);
    return [];
  }

  console.log(`[User Reply Handler] Found ${replies.length} replies, processing...`);

  const results = [];
  const processedUserIds = new Set(); // 同じユーザーへの重複返信を防ぐ

  // Grok推奨: 最初の10リプライにパーソナライズされた自動返信
  for (let i = 0; i < Math.min(replies.length, maxReplies); i++) {
    const reply = replies[i];
    
    // 自分のリプライはスキップ（authorIdで判定、またはユーザー名で判定）
    const myUserId = process.env.X_API_USER_ID;
    const myUsername = process.env.X_API_USERNAME || 'TrapDefenceBTC';
    if (reply.authorId === myUserId || reply.author?.username === myUsername) {
      continue;
    }

    // 同じユーザーへの重複返信を防ぐ
    if (processedUserIds.has(reply.authorId)) {
      continue;
    }

    // 既に返信済みかチェック（KVストレージ）
    if (kv) {
      try {
        const replyKey = `x:user_reply_sent:${mainTweetId}:${reply.id}`;
        const alreadyReplied = await kv.get(replyKey);
        if (alreadyReplied) {
          console.log(`[User Reply Handler] Already replied to ${reply.id}, skipping`);
          continue;
        }
      } catch (error) {
        console.warn('[User Reply Handler] Failed to check reply status:', error.message);
      }
    }

    try {
      // Grok推奨: パーソナライズされた自動返信を生成
      const replyText = await generateUserReplyText(lang, reply, reportData);
      
      if (!replyText || replyText.trim().length === 0) {
        console.warn(`[User Reply Handler] Failed to generate reply text for ${reply.id}`);
        continue;
      }

      // リプライを送信（5-15分のランダム遅延で自然な感じに）
      const delayMs = (5 + Math.random() * 10) * 60 * 1000; // 5-15分
      
      setTimeout(async () => {
        try {
          const result = await replyToTweet(replyText.substring(0, 280), reply.id);
          results.push({ 
            replyId: reply.id, 
            userId: reply.authorId, 
            username: reply.author?.username || 'unknown',
            success: true, 
            tweetId: result.id 
          });
          
          console.log(`[User Reply Handler] ✅ Auto-reply sent to @${reply.author?.username || 'unknown'} (${reply.id}): ${result.id}`);

          // 返信済みをマーク（KVストレージ）
          if (kv) {
            try {
              const replyKey = `x:user_reply_sent:${mainTweetId}:${reply.id}`;
              await kv.set(replyKey, true, { ex: 86400 * 7 }); // 7日間保持
            } catch (error) {
              console.warn('[User Reply Handler] Failed to mark reply as sent:', error.message);
            }
          }

          processedUserIds.add(reply.authorId);
        } catch (error) {
          console.error(`[User Reply Handler] ❌ Failed to send auto-reply to ${reply.id}:`, error.message);
          results.push({ 
            replyId: reply.id, 
            userId: reply.authorId, 
            success: false, 
            error: error.message 
          });
        }
      }, delayMs);

      // レート制限対策（リプライ間隔を空ける）
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 1秒ずつ増加
    } catch (error) {
      console.error(`[User Reply Handler] ❌ Failed to process reply ${reply.id}:`, error.message);
      results.push({ 
        replyId: reply.id, 
        userId: reply.authorId, 
        success: false, 
        error: error.message 
      });
    }
  }

  // 処理完了をマーク（KVストレージ）
  if (kv && results.length > 0) {
    try {
      const key = `x:user_replies:${mainTweetId}`;
      await kv.set(key, true, { ex: 86400 * 7 }); // 7日間保持
    } catch (error) {
      console.warn('[User Reply Handler] Failed to mark processing complete:', error.message);
    }
  }

  console.log(`[User Reply Handler] Processed ${results.length} user replies for tweet ${mainTweetId}`);
  return results;
}

module.exports = {
  handleUserReplies,
  getTweetReplies,
};
