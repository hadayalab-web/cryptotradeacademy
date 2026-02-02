// services/gemini/messageOptimizer.js
// Gemini動的メッセージ生成（CTR最適化）
// Grok CSO+CFO推奨: Gemini動的メッセージ生成（CTR最適化）

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

/**
 * Gemini APIを呼び出してテキストを生成
 * @param {string} prompt - プロンプト
 * @returns {Promise<string|null>} 生成されたテキスト
 */
async function callGeminiTextAPI(prompt) {
  try {
    if (!GEMINI_API_KEY) {
      console.warn('[Gemini MessageOptimizer] GEMINI_API_KEY not set');
      return null;
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts) {
        const text = candidate.content.parts
          .map(part => part.text)
          .join('');
        return text.trim();
      }
    }

    return null;
  } catch (error) {
    console.error('[Gemini MessageOptimizer] API call failed:', error.message);
    return null;
  }
}

/**
 * VSL1メッセージを動的に最適化（CTR向上）
 * @param {Object} options - オプション
 * @param {string} options.lang - 言語コード
 * @param {string} options.deepLink - Telegram Deep Link
 * @param {string} options.vsl1Link - VSL1 YouTubeリンク
 * @param {Object} options.engagementData - 過去のエンゲージメントデータ（オプション）
 * @param {Object} options.marketSentiment - 市場センチメント（オプション）
 * @returns {Promise<string>} 最適化されたメッセージ
 */
async function optimizeVSL1Message(options = {}) {
  const {
    lang = 'en',
    deepLink,
    vsl1Link,
    engagementData = null,
    marketSentiment = null,
  } = options;

  // 過去のエンゲージメントデータからインサイトを抽出
  let engagementInsights = '';
  if (engagementData) {
    const avgCTR = engagementData.avgCTR || 0;
    const topPerformingVariants = engagementData.topVariants || [];
    
    if (topPerformingVariants.length > 0) {
      engagementInsights = `過去のデータ分析:
- 平均CTR: ${(avgCTR * 100).toFixed(2)}%
- 高パフォーマンスバリアント: ${topPerformingVariants.join(', ')}
これらの要素を活用してください。`;
    }
  }

  // 市場センチメントからインサイトを抽出
  let sentimentInsights = '';
  if (marketSentiment) {
    const retailFomo = marketSentiment.retailFomo || 0;
    const whaleBias = marketSentiment.whaleBias || 0;
    
    if (retailFomo >= 70) {
      sentimentInsights = '現在、FOMOがピークです。FOMOを強調したメッセージが効果的です。';
    } else if (whaleBias <= -50) {
      sentimentInsights = 'クジラが売り抜け中です。警告メッセージが効果的です。';
    }
  }

  const langNames = {
    'en': 'English',
    'ja': '日本語',
    'es': 'Español',
    'pt-br': 'Português (Brasil)',
    'ar': 'العربية',
    'ko': '한국어',
  };

  const prompt = `あなたはTrap Defence BTCのCMO（Chief Marketing Officer）です。

以下の情報を基に、${langNames[lang] || 'English'}でVSL1投稿メッセージを生成してください。

## 基本情報
- 言語: ${langNames[lang] || 'English'}
- VSL1 YouTubeリンク: ${vsl1Link}
- Telegram Deep Link: ${deepLink}

## メッセージ要件
1. **キャッチーでスパム感がない**: 読者の注意を引くが、過度に押し付けがましくない
2. **損失回避を強調**: 「資金を失う前に」という訴求
3. **社会的証明**: 「2人のトレーダー、同じ資金、異なる結果」というストーリー
4. **明確なCTA**: Deep Linkへの誘導を自然に
5. **適切なハッシュタグ**: 言語に応じたハッシュタグを含める

${engagementInsights ? `## ${engagementInsights}` : ''}
${sentimentInsights ? `## 市場センチメント: ${sentimentInsights}` : ''}

## 出力形式
Telegram投稿用のMarkdown形式で出力してください。絵文字を適切に使用し、読みやすさを重視してください。

メッセージのみを出力してください（説明文は不要）。`;

  try {
    const optimizedMessage = await callGeminiTextAPI(prompt);
    
    if (optimizedMessage) {
      console.log(`[Gemini MessageOptimizer] Optimized VSL1 message generated for ${lang}`);
      return optimizedMessage;
    }
    
    // フォールバック: 既存のテンプレートを使用
    console.warn(`[Gemini MessageOptimizer] Failed to generate optimized message, using template`);
    const { generateVSL1Message } = require('../telegram/messages/vsl1');
    return generateVSL1Message(lang, deepLink, vsl1Link);
  } catch (error) {
    console.error(`[Gemini MessageOptimizer] Error optimizing message: ${error.message}`);
    // フォールバック: 既存のテンプレートを使用
    const { generateVSL1Message } = require('../telegram/messages/vsl1');
    return generateVSL1Message(lang, deepLink, vsl1Link);
  }
}

/**
 * VSL2メッセージを動的に最適化（コンバージョン率向上）
 * @param {Object} options - オプション
 * @param {string} options.lang - 言語コード
 * @param {string} options.userName - ユーザー名
 * @param {string} options.vsl2Link - VSL2 YouTubeリンク
 * @param {string} options.whopUrl - Whop URL
 * @param {string} options.promoCode - プロモコード
 * @param {Object} options.userBehavior - ユーザー行動データ（オプション）
 * @returns {Promise<string>} 最適化されたメッセージ
 */
async function optimizeVSL2Message(options = {}) {
  const {
    lang = 'en',
    userName = 'there',
    vsl2Link,
    whopUrl,
    promoCode,
    userBehavior = null,
  } = options;

  // ユーザー行動データからインサイトを抽出
  let behaviorInsights = '';
  if (userBehavior) {
    const vsl1Watched = userBehavior.vsl1Watched || false;
    const reminderSent = userBehavior.reminderSent || false;
    
    if (vsl1Watched) {
      behaviorInsights = 'ユーザーはVSL1を視聴済みです。VSL1の内容を踏まえたアップセルメッセージが効果的です。';
    } else if (reminderSent) {
      behaviorInsights = 'リマインダーを送信済みです。緊迫感を強調したメッセージが効果的です。';
    }
  }

  const langNames = {
    'en': 'English',
    'ja': '日本語',
    'es': 'Español',
    'pt-br': 'Português (Brasil)',
    'ar': 'العربية',
    'ko': '한국어',
  };

  const prompt = `あなたはTrap Defence BTCのCMO（Chief Marketing Officer）です。

以下の情報を基に、${langNames[lang] || 'English'}でVSL2（アップセル/クーポン）メッセージを生成してください。

## 基本情報
- 言語: ${langNames[lang] || 'English'}
- ユーザー名: ${userName}
- VSL2 YouTubeリンク: ${vsl2Link}
- Whop URL: ${whopUrl}
- プロモコード: ${promoCode}

## メッセージ要件
1. **Empathy（共感）**: ユーザーの不安や損失体験に共感
2. **Proof（実績）**: Trap Defence BTCの効果を示す
3. **Offer（オファー）**: 50%オフクーポンと限定性を強調
4. **Urgency（緊迫感）**: 24時間限定であることを強調
5. **明確なCTA**: Whop URLへの誘導

${behaviorInsights ? `## ユーザー行動分析: ${behaviorInsights}` : ''}

## 出力形式
Telegram DM用のMarkdown形式で出力してください。ユーザー名を自然に使用し、パーソナライズしてください。

メッセージのみを出力してください（説明文は不要）。`;

  try {
    const optimizedMessage = await callGeminiTextAPI(prompt);
    
    if (optimizedMessage) {
      console.log(`[Gemini MessageOptimizer] Optimized VSL2 message generated for ${lang}`);
      return optimizedMessage;
    }
    
    // フォールバック: VSL2配信廃止のためプレースホルダーのみ
    console.warn(`[Gemini MessageOptimizer] Failed to generate optimized message; VSL2 delivery is discontinued.`);
    return null;
  } catch (error) {
    console.error(`[Gemini MessageOptimizer] Error optimizing message: ${error.message}`);
    return null;
  }
}

module.exports = {
  optimizeVSL1Message,
  optimizeVSL2Message,
};
