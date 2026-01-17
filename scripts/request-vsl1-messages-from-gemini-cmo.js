// scripts/request-vsl1-messages-from-gemini-cmo.js
// Gemini CMOにVSL1投稿メッセージ（6言語）の作成を依頼

require('dotenv').config({ path: '.env' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-pro-preview';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set');
  console.error('環境変数ファイルの場所: .env');
  process.exit(1);
}

const SUPPORTED_LANGS = [
  { code: 'en', name: '英語', market: 'EN' },
  { code: 'ja', name: '日本語', market: 'JA' },
  { code: 'es', name: 'スペイン語', market: 'ES' },
  { code: 'pt-br', name: 'ポルトガル語（ブラジル）', market: 'PT-BR' },
  { code: 'ar', name: 'アラビア語', market: 'AR' },
  { code: 'ko', name: '韓国語', market: 'KO' },
];

/**
 * Gemini CMOにVSL1メッセージの作成を依頼
 */
async function requestVSL1MessagesFromGeminiCMO() {
  const prompt = `あなたはTrap Defence BTCのCMO（Chief Marketing Officer）として、VSL1（Video Sales Letter 1）の投稿メッセージを6言語で作成してください。

## 背景情報

### プロダクト
- **名前**: Trap Defence BTC
- **価値提案**: ビットコイントレーダーが市場のトラップ（罠）を回避するためのAI分析ツール
- **無料版**: 基本的なTrap Score（0-100）を提供
- **有料版**: 完全なオンチェーン分析、リアルタイムアラート、Dr. Grokの心理的サポート

### VSL1の目的
- 無料版へのオプトイン誘導
- 損失回避の心理を活用したCTA
- Telegram Botへの登録を促進

### 現在のメッセージ（英語版・参考）
\`\`\`
🎬 Watch This: Two traders started with the same capital...

https://youtu.be/OqvqngJOiXc

Three months later:
• Trader A: Lost months of profits in 1 week
• Trader B: Secured $5K profit, relaxed

The difference? Trader B used Trap Defence BTC.

⚠️ Before you lose your capital, watch this 4-minute video (VSL1).

🚀 Get the trap avoidance logic that pros use (FREE):
→ {DEEP_LINK}

#Bitcoin #CryptoTrading #TrapDefence #FreeSignals
\`\`\`

## 要件

### 1. メッセージ構造
- **フック**: 2人のトレーダーの対比ストーリー
- **問題提起**: 資本を失うリスク
- **解決策**: Trap Defence BTC
- **CTA**: 無料でトラップ回避ロジックを入手
- **Deep Link**: {DEEP_LINK}（プレースホルダー、実際の値に置き換え）
- **VSL1リンク**: {VSL1_LINK}（プレースホルダー、実際の値に置き換え）
- **ハッシュタグ**: #Bitcoin #CryptoTrading #TrapDefence #FreeSignals

### 2. 言語別の要件
各言語で以下の点を考慮してください：

- **EN（英語）**: グローバル市場向け、直接的な表現
- **JA（日本語）**: 日本の市場文化に合わせた表現、丁寧語
- **ES（スペイン語）**: ラテンアメリカ市場向け、情熱的な表現
- **PT-BR（ポルトガル語）**: ブラジル市場向け、親しみやすい表現
- **AR（アラビア語）**: 中東市場向け、右から左への読み順を考慮
- **KO（韓国語）**: 韓国市場向け、敬語を使用

### 3. マーケティング原則
- **損失回避**: 「資本を失う前に」という心理を活用
- **社会的証明**: 2人のトレーダーの対比
- **緊急性**: 「今すぐ行動」を促す
- **明確なCTA**: Deep Linkで簡単にアクセス可能

## 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "en": "英語版のメッセージ（{DEEP_LINK}と{VSL1_LINK}はプレースホルダーのまま）",
  "ja": "日本語版のメッセージ（{DEEP_LINK}と{VSL1_LINK}はプレースホルダーのまま）",
  "es": "スペイン語版のメッセージ（{DEEP_LINK}と{VSL1_LINK}はプレースホルダーのまま）",
  "pt-br": "ポルトガル語版のメッセージ（{DEEP_LINK}と{VSL1_LINK}はプレースホルダーのまま）",
  "ar": "アラビア語版のメッセージ（{DEEP_LINK}と{VSL1_LINK}はプレースホルダーのまま）",
  "ko": "韓国語版のメッセージ（{DEEP_LINK}と{VSL1_LINK}はプレースホルダーのまま）"
}
\`\`\`

## 注意事項

1. **プレースホルダー**: {DEEP_LINK}と{VSL1_LINK}はそのまま残してください（後で実際の値に置き換えます）
2. **文字数制限**: Telegramのメッセージは4096文字まで、X（Twitter）は280文字まで
3. **絵文字**: 適切に使用してください（過度に使用しない）
4. **ハッシュタグ**: 各言語で適切なハッシュタグを使用（英語版のハッシュタグを参考）

日本語で回答してください。`;

  try {
    console.log('🔄 Gemini CMO（gemini-3-pro-preview）にVSL1メッセージ作成を依頼中...\n');

    // Gemini APIを直接呼び出し（REST API）
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        },
        systemInstruction: {
          parts: [{
            text: 'あなたはTrap Defence BTCのCMO（Chief Marketing Officer）です。マーケティング戦略、ブランドボイス、コンテンツ戦略、ユーザー教育を担当します。各市場の文化と心理を理解し、効果的なマーケティングメッセージを作成します。'
          }]
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    console.log('✅ Gemini CMOからの回答を受信\n');
    console.log('='.repeat(80));
    console.log(text);
    console.log('='.repeat(80));

    // JSONを抽出（コードブロック内のJSONを探す）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const messages = JSON.parse(jsonMatch[1]);
        console.log('\n✅ JSON形式でメッセージを抽出しました\n');
        return messages;
      } catch (parseError) {
        console.error('❌ JSON解析エラー:', parseError.message);
        console.log('テキスト全体を返します');
        return { raw: text };
      }
    }

    return { raw: text };
  } catch (error) {
    console.error('❌ Gemini CMO API呼び出しエラー:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  requestVSL1MessagesFromGeminiCMO()
    .then((messages) => {
      console.log('\n✅ VSL1メッセージ作成完了');
      if (messages.raw) {
        console.log('\n⚠️ JSON形式で抽出できませんでした。手動で確認してください。');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { requestVSL1MessagesFromGeminiCMO };
