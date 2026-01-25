// scripts/ask-gpt-message-structure-evaluation.js
// GPTに無料版（Minimal Version）と有料版（Regular Briefing）のメッセージ構成について評価と改善提案を求める

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// メッセージテンプレートファイルを読み込む
function loadMessageTemplates() {
  const minimalPath = path.join(__dirname, '../services/telegram/messages/user/en/minimal-high-quality.en.js');
  const regularPath = path.join(__dirname, '../services/telegram/messages/user/en/regular.en.js');
  
  const minimalCode = fs.readFileSync(minimalPath, 'utf-8');
  const regularCode = fs.readFileSync(regularPath, 'utf-8');
  
  return { minimalCode, regularCode };
}

async function askGPTForEvaluation() {
  const { minimalCode, regularCode } = loadMessageTemplates();
  
  const prompt = `あなたは、Crypto Trading Telegram Botのメッセージ構成を評価する専門家です。

現在、無料版（Minimal Version）と有料版（Regular Briefing）の2つのメッセージテンプレートがあります。

## 無料版（Minimal Version）の構造:
1. Trap Score表示（0-100）
2. Trap Score説明（VERY LOW / LOW / MODERATE / HIGH TRAP RISK）
3. BTC価格表示
4. 問題の提示セクション（Trap Scoreに基づく）
5. Data-Backed Reasons（証拠セクション）
   - Exchange Netflow
   - Whale Ratio
   - MPI（Miners' Position Index）
   - Sentiment
6. Strategic Insights（Market ScoreとTrap Scoreに基づく動的メッセージ）
   - 低リスクかつ強気: "Monitor for clear entry opportunities"
   - 低リスクだが中立/弱気: "Maintain discipline and wait for high-quality opportunities"
   - 中リスク: "Exercise caution. Monitor market conditions closely"
   - 高リスク: "Exercise extreme caution"
7. What to Avoid（Trap Score >= 50の場合のみ）
8. Dr. Grok's Quick Insight（簡易コメント）
9. Mental Note（メンタル訓練メッセージ）
10. CTA（アップセル）: "Unlock Full Intelligence Report"

## 有料版（Regular Briefing）の構造:
1. Trade Verdict（最上部）
   - Signal: TRAP STANDBY / AVOID_LONG / AVOID_SHORT
   - Entry, Take Profit, Stop Loss, Risk/Reward
2. Today's Highlights (3 Core Features)
   - Core Feature 1: Trap Defense
   - Core Feature 2: Geminiコンテンツ生成（テキストベース）
   - Core Feature 3: （将来拡張）
3. GPTリポーターのトラップニュース分析（CryptoQuantデータ解析、600文字まで）
4. Data-Backed Reasons + Strategic Insights（無料版と同様の構造）
5. Dr. Grok's Quick Insight
   - X Sentiment Analysis（Grok X解析結果）
   - Psychological Support（心理的サポート診断）
   - Mental Note（状況に応じたメンタルコーチング）
6. "THIS IS WHY YOU PAID FOR THIS REPORT"セクション（価値の明確化）
7. 基本市場データ（後半に配置）
   - BTC Price, Exchange Netflow, MPI, Sentiment
   - Market Score
   - Trap Score, Whale Ratio, Liquidations
   - Trap Detector, Trap Risk Score, NO TRADE Alert, Exit Map

## 現在の評価ポイント:
- 構造の明確性
- 無料版と有料版の差別化
- 価値提供の明確性
- 動的メッセージング（Market ScoreとTrap Scoreに基づく）
- コンバージョン最適化
- データ表示の改善
- 重複表現の削減

## 質問:
1. 現在のメッセージ構成について、あなたはどのように評価しますか？（10点満点で評価）
2. 無料版と有料版の差別化は十分ですか？改善点はありますか？
3. コンバージョン率を向上させるための具体的な改善提案はありますか？
4. 情報の階層化（重要度に応じた表示）について、改善提案はありますか？
5. モバイルユーザー体験を向上させるための提案はありますか？
6. 重複表現をさらに削減する方法はありますか？
7. その他、気づいた改善点があれば教えてください。

コードは以下の通りです:

### 無料版コード:
\`\`\`javascript
${minimalCode.substring(0, 2000)}...
\`\`\`

### 有料版コード:
\`\`\`javascript
${regularCode.substring(0, 2000)}...
\`\`\`

日本語で回答してください。`;

  try {
    console.log('📤 GPTにメッセージ構成の評価を依頼中...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたは、Crypto Trading Telegram Botのメッセージ構成を評価する専門家です。ユーザー体験、コンバージョン最適化、情報設計の観点から、具体的で実装可能な改善提案を提供してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const response = completion.choices[0]?.message?.content || '';
    
    console.log('\n✅ GPTからの評価と改善提案:\n');
    console.log('='.repeat(80));
    console.log(response);
    console.log('='.repeat(80));
    
    // 結果をファイルに保存
    const outputPath = path.join(__dirname, '../docs/GPT_MESSAGE_STRUCTURE_EVALUATION_2026-01-25.md');
    const output = `# GPTによるメッセージ構成評価と改善提案

**評価日**: 2026-01-25  
**モデル**: gpt-4o  
**対象**: 無料版（Minimal Version）と有料版（Regular Briefing）のメッセージ構成

---

## GPTからの評価と改善提案

${response}

---

## 実装検討事項

この評価を基に、以下の改善を検討する:

1. GPTが提案した改善点の優先順位付け
2. 実装可能性の評価
3. A/Bテスト計画
4. コンバージョン率への影響予測

`;
    
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`\n📝 結果を保存しました: ${outputPath}`);
    
    return response;
  } catch (error) {
    console.error('❌ GPT API呼び出しエラー:', error);
    throw error;
  }
}

// 実行
if (require.main === module) {
  askGPTForEvaluation()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { askGPTForEvaluation };
