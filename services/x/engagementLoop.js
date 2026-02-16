// services/x/engagementLoop.js
// エンゲージメントループ実装（Grok推奨: 子アカウント3で自リプループ）

const { replyToTweet } = require('./client');
const { getXConfigStatus } = require('./config');

// Vercel KV（リプライ履歴追跡用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Engagement Loop] @vercel/kv not available:', error.message);
}

/**
 * 子アカウント用のリプライテキストを生成
 * Grok推奨: 自然なリプライ（質問/同意/追加分析）でスパム回避
 * @param {string} lang - 言語コード
 * @param {number} replyIndex - リプライインデックス（0-2）
 * @param {Object} reportData - レポートデータ
 * @returns {string} リプライテキスト
 */
function generateEngagementReplyText(lang, replyIndex, reportData = null) {
  const normalizedLang = (lang || 'en').toLowerCase();
  const { trapScore = 25, priceUsd = null } = reportData || {};
  
  // Grok推奨: 内容多様化（質問/同意/追加分析）でスパム回避
  const replyTemplates = {
    'en': [
      // 質問タイプ
      `This Trap Score is 🔥! How do you use it for trading?`,
      // 同意タイプ
      `Agree! This saved me from a trap last week. TrapDefence is legit! 💪`,
      // 追加分析タイプ
      `The whale ratio is interesting here. Combined with Trap Score, this is a solid signal.`,
    ],
    'ja': [
      `このTrap Scoreすごい！どうやってトレードに使ってる？`,
      `同意！先週これでトラップ回避できた。TrapDefence本物だ！💪`,
      `クジラ比率が興味深い。Trap Scoreと組み合わせると強力なシグナルだ。`,
    ],
    'es': [
      `¡Este Trap Score es 🔥! ¿Cómo lo usas para operar?`,
      `¡De acuerdo! Esto me salvó de una trampa la semana pasada. ¡TrapDefence es legítimo! 💪`,
      `La proporción de ballenas es interesante aquí. Combinado con Trap Score, es una señal sólida.`,
    ],
    'pt-br': [
      `Este Trap Score é 🔥! Como você usa para operar?`,
      `Concordo! Isso me salvou de uma armadilha na semana passada. TrapDefence é legítimo! 💪`,
      `A proporção de baleias é interessante aqui. Combinado com Trap Score, é um sinal sólido.`,
    ],
    'ar': [
      `هذا Trap Score رائع! كيف تستخدمه للتداول؟`,
      `موافق! هذا أنقذني من فخ الأسبوع الماضي. TrapDefence شرعي! 💪`,
      `نسبة الحيتان مثيرة للاهتمام هنا. مجتمعة مع Trap Score، هذه إشارة قوية.`,
    ],
    'ko': [
      `이 Trap Score 대박! 어떻게 거래에 사용하나요?`,
      `동의! 지난주에 이것으로 함정을 피했습니다. TrapDefence 진짜예요! 💪`,
      `고래 비율이 여기서 흥미롭네요. Trap Score와 결합하면 강력한 신호입니다.`,
    ],
  };
  
  const templates = replyTemplates[normalizedLang] || replyTemplates['en'];
  return templates[replyIndex % templates.length];
}

/**
 * エンゲージメントループを実行
 * Grok推奨: 自投稿に子アカウント3で自然リプライ（投稿後2-5分、10分後フォローアップ）
 * @param {string} mainTweetId - メインツイートID
 * @param {string} lang - 言語コード
 * @param {Object} reportData - レポートデータ
 * @returns {Promise<Array>} リプライ結果配列
 */
async function executeEngagementLoop(mainTweetId, lang, reportData = null) {
  const xStatus = getXConfigStatus();
  
  if (!xStatus.postingEnabled || !xStatus.configured) {
    console.warn('[Engagement Loop] X posting disabled or not configured, skipping engagement loop');
    return [];
  }
  
  if (xStatus.dryRun) {
    console.log('[Engagement Loop] 🧪 DRY RUN MODE - Engagement loop skipped');
    return [];
  }
  
  // Grok推奨: 1投稿3リプ上限
  const maxReplies = 3;
  const results = [];
  
  // 既にリプライ済みかチェック（KVストレージ）
  if (kv) {
    try {
      const key = `x:engagement_loop:${mainTweetId}`;
      const alreadyReplied = await kv.get(key);
      if (alreadyReplied) {
        console.log(`[Engagement Loop] Already executed for tweet ${mainTweetId}, skipping`);
        return [];
      }
    } catch (error) {
      console.warn('[Engagement Loop] Failed to check engagement loop status:', error.message);
    }
  }
  
  // Grok推奨: 投稿後2-5分で最初のリプライ
  const firstReplyDelay = (2 + Math.random() * 3) * 60 * 1000; // 2-5分（ランダム）
  
  // 最初のリプライ（2-5分後）
  setTimeout(async () => {
    try {
      const replyText1 = generateEngagementReplyText(lang, 0, reportData);
      const result1 = await replyToTweet(replyText1, mainTweetId);
      results.push({ replyIndex: 0, success: true, tweetId: result1.id });
      console.log(`[Engagement Loop] ✅ Reply 1/3 posted for tweet ${mainTweetId}: ${result1.id}`);
      
      // 2回目のリプライ（最初のリプライ後1-3分）
      const secondReplyDelay = (1 + Math.random() * 2) * 60 * 1000; // 1-3分
      setTimeout(async () => {
        try {
          const replyText2 = generateEngagementReplyText(lang, 1, reportData);
          const result2 = await replyToTweet(replyText2, mainTweetId);
          results.push({ replyIndex: 1, success: true, tweetId: result2.id });
          console.log(`[Engagement Loop] ✅ Reply 2/3 posted for tweet ${mainTweetId}: ${result2.id}`);
          
          // 3回目のリプライ（10分後フォローアップ）
          const thirdReplyDelay = (10 - (firstReplyDelay + secondReplyDelay) / 1000 / 60) * 60 * 1000; // 10分後
          if (thirdReplyDelay > 0) {
            setTimeout(async () => {
              try {
                const replyText3 = generateEngagementReplyText(lang, 2, reportData);
                const result3 = await replyToTweet(replyText3, mainTweetId);
                results.push({ replyIndex: 2, success: true, tweetId: result3.id });
                console.log(`[Engagement Loop] ✅ Reply 3/3 posted for tweet ${mainTweetId}: ${result3.id}`);
                
                // リプライ完了をマーク（KVストレージ）
                if (kv) {
                  try {
                    const key = `x:engagement_loop:${mainTweetId}`;
                    await kv.set(key, true, { ex: 86400 * 7 }); // 7日間保持
                  } catch (error) {
                    console.warn('[Engagement Loop] Failed to mark engagement loop complete:', error.message);
                  }
                }
              } catch (error) {
                console.error(`[Engagement Loop] ❌ Failed to post reply 3/3:`, error.message);
                results.push({ replyIndex: 2, success: false, error: error.message });
              }
            }, thirdReplyDelay);
          }
        } catch (error) {
          console.error(`[Engagement Loop] ❌ Failed to post reply 2/3:`, error.message);
          results.push({ replyIndex: 1, success: false, error: error.message });
        }
      }, secondReplyDelay);
    } catch (error) {
      console.error(`[Engagement Loop] ❌ Failed to post reply 1/3:`, error.message);
      results.push({ replyIndex: 0, success: false, error: error.message });
    }
  }, firstReplyDelay);
  
  return results;
}

module.exports = {
  executeEngagementLoop,
  generateEngagementReplyText,
};
