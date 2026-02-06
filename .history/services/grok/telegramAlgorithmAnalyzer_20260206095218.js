// services/grok/telegramAlgorithmAnalyzer.js
// GrokがTelegramアルゴリズムを解析・最適化するための関数

const OpenAI = require('openai');
// 注意: reportStorage機能は削除されました（エンドユーザー追跡機能の削除のため）
// const { getLatestReport } = require('../lead-discovery/reportStorage');

const XAI_API_KEY = process.env.XAI_API_KEY;
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const GROK_MODEL = process.env.GROK_MODEL_HIGH_RES || process.env.GROK_MODEL_X_LIVE || 'grok-4-1-fast-reasoning';

const openai = XAI_API_KEY ? new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL,
}) : null;

/**
 * Telegramメッセージのエンゲージメントデータを収集
 * @param {Object} telegramData - Telegram関連データ
 * @returns {Object} エンゲージメント統計
 */
function collectTelegramEngagementData(telegramData = {}) {
  // 実際のデータはVercel KVやログから取得する必要がある
  // ここでは構造のみ定義
  return {
    messagesSent: telegramData.messagesSent || 0,
    messagesDelivered: telegramData.messagesDelivered || 0,
    messagesRead: telegramData.messagesRead || 0,
    buttonClicks: telegramData.buttonClicks || 0,
    conversions: telegramData.conversions || 0,
    blocks: telegramData.blocks || 0,
    mutes: telegramData.mutes || 0,
    byMessageType: {
      vsl1: telegramData.vsl1 || {},
      vsl2: telegramData.vsl2 || {},
      reminder: telegramData.reminder || {},
      lastCall: telegramData.lastCall || {},
    },
    byTiming: {
      hour12: telegramData.hour12 || {}, // 12時間後
      hour22: telegramData.hour22 || {}, // 22時間後
      hour24: telegramData.hour24 || {}, // 24時間後
    },
    byLanguage: {
      en: telegramData.en || {},
      ja: telegramData.ja || {},
      ko: telegramData.ko || {},
      es: telegramData.es || {},
      'pt-br': telegramData['pt-br'] || {},
      ar: telegramData.ar || {},
    },
  };
}

/**
 * GrokがTelegramアルゴリズムを解析して最適化提案を行う
 * @param {Object} telegramData - Telegram関連データ
 * @param {Object} options - オプション
 * @returns {Promise<Object>} 分析結果
 */
async function analyzeTelegramAlgorithmWithGrok(telegramData = {}, options = {}) {
  if (!openai) {
    throw new Error('XAI_API_KEY is not set');
  }

  const engagementData = collectTelegramEngagementData(telegramData);

  try {
    // Grokに分析を依頼
    const systemPrompt = `あなたはTrap Defence BTCのCOO（Chief Operating Officer）として、Telegram Bot APIのアルゴリズムを解析し、メッセージ送信の最適化戦略を提案します。

## あなたの役割
- **Telegramアルゴリズム解析**: Telegram Bot APIの動作パターンを分析
- **エンゲージメント最適化**: 開封率、クリック率、コンバージョン率を最大化
- **スパム検出回避**: Telegramのスパム検出を避けつつ、効果的な送信パターンを確立
- **データドリブン**: 数値データに基づいた具体的な最適化提案

## Telegramアルゴリズムの推測される要素
1. **メッセージ送信タイミング**
   - ユーザーのアクティブ時間帯
   - タイムゾーン別の最適送信時間
   - 送信間隔の最適化

2. **メッセージ形式**
   - テキスト vs 画像 vs 動画の効果
   - ボタンの配置とテキスト
   - メッセージの長さと構造

3. **エンゲージメント指標**
   - 開封率（メッセージが読まれたか）
   - クリック率（ボタンがクリックされたか）
   - コンバージョン率（登録・購入）

4. **スパム検出回避**
   - 送信頻度の最適化（1分間に30メッセージまで）
   - 自然な送信パターン
   - ユーザーエンゲージメントに基づく送信

5. **チャンネル/グループでの可視性**
   - 投稿タイミング
   - エンゲージメント（リアクション、コメント）
   - ピン留めの効果

## 出力形式
以下のJSON形式で出力してください：
{
  "summary": "Telegramアルゴリズム解析の要約（100-200字）",
  "algorithmInsights": {
    "timingOptimization": {
      "optimalHours": [9, 12, 18, 21],
      "timezoneStrategy": "ユーザーのタイムゾーンに合わせた送信",
      "sendInterval": "メッセージ間隔の最適化"
    },
    "messageFormat": {
      "bestFormat": "text|photo|video",
      "buttonPlacement": "ボタンの配置戦略",
      "messageLength": "最適なメッセージ長"
    },
    "engagementFactors": {
      "openRate": "開封率の分析",
      "clickRate": "クリック率の分析",
      "conversionRate": "コンバージョン率の分析"
    },
    "spamAvoidance": {
      "sendFrequency": "送信頻度の最適化",
      "naturalPattern": "自然な送信パターン",
      "userEngagement": "ユーザーエンゲージメントに基づく送信"
    }
  },
  "optimizations": [
    {
      "priority": "high|medium|low",
      "category": "timing|format|engagement|spam",
      "action": "具体的な最適化アクション",
      "expectedImpact": "期待される効果",
      "implementation": "実装方法の説明"
    }
  ],
  "recommendations": [
    "COO向けの推奨事項（3-5項目）"
  ]
}`;

    const userPrompt = `以下のTelegramエンゲージメントデータを分析し、Telegramアルゴリズムを解析して最適化戦略を提案してください：

## Telegramエンゲージメントデータ

### 基本統計
- メッセージ送信数: ${engagementData.messagesSent}
- メッセージ配信数: ${engagementData.messagesDelivered}
- メッセージ開封数: ${engagementData.messagesRead}
- ボタンクリック数: ${engagementData.buttonClicks}
- コンバージョン数: ${engagementData.conversions}
- ブロック数: ${engagementData.blocks}
- ミュート数: ${engagementData.mutes}

### メッセージタイプ別
${JSON.stringify(engagementData.byMessageType, null, 2)}

### タイミング別
${JSON.stringify(engagementData.byTiming, null, 2)}

### 言語別
${JSON.stringify(engagementData.byLanguage, null, 2)}

上記のデータを分析し、Telegramアルゴリズムを解析して最適化戦略をJSON形式で出力してください。`;

    const completion = await openai.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const analysisText = completion?.choices?.[0]?.message?.content?.trim();
    if (!analysisText) {
      throw new Error('Grok analysis failed: empty response');
    }

    // JSONをパース
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      return {
        success: false,
        error: 'Failed to parse Grok response as JSON',
        rawResponse: analysisText,
      };
    }

    return {
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Grok Telegram Algorithm Analyzer] Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Telegramメッセージ送信の最適タイミングを提案
 * @param {Object} userData - ユーザーデータ（タイムゾーン、アクティブ時間など）
 * @returns {Promise<Object>} 最適タイミング提案
 */
async function getOptimalTelegramTiming(userData = {}) {
  if (!openai) {
    throw new Error('XAI_API_KEY is not set');
  }

  const systemPrompt = `あなたはTelegram Bot APIのアルゴリズム専門家として、メッセージ送信の最適タイミングを提案します。

## 考慮すべき要素
1. **ユーザーのアクティブ時間帯**: タイムゾーン別の最適送信時間
2. **メッセージタイプ**: VSL1、VSL2、リマインダー、ラストコール
3. **送信間隔**: スパム検出を避けるための適切な間隔
4. **エンゲージメント率**: 過去のデータに基づく最適タイミング

## 出力形式
以下のJSON形式で出力してください：
{
  "optimalTimings": {
    "vsl1": {
      "hours": [9, 21],
      "timezone": "UTC",
      "reason": "理由"
    },
    "vsl2": {
      "hours": [10, 22],
      "timezone": "UTC",
      "reason": "理由"
    },
    "reminder": {
      "delayHours": 12,
      "optimalHour": 9,
      "reason": "理由"
    },
    "lastCall": {
      "delayHours": 22,
      "optimalHour": 10,
      "reason": "理由"
    }
  },
  "sendInterval": {
    "minSeconds": 2,
    "maxMessagesPerMinute": 30,
    "recommendation": "推奨送信間隔"
  }
}`;

  const userPrompt = `以下のユーザーデータに基づいて、Telegramメッセージ送信の最適タイミングを提案してください：

${JSON.stringify(userData, null, 2)}`;

  try {
    const completion = await openai.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const resultText = completion?.choices?.[0]?.message?.content?.trim();
    if (!resultText) {
      throw new Error('Grok analysis failed: empty response');
    }

    return {
      success: true,
      timing: JSON.parse(resultText),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Grok Telegram Timing Analyzer] Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  analyzeTelegramAlgorithmWithGrok,
  getOptimalTelegramTiming,
  collectTelegramEngagementData,
};
