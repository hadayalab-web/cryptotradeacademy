#!/usr/bin/env node
/**
 * Premium Tierローンチ戦略のGPT実装設計書生成 - Week 1のみ
 * Grok×Gemini統合分析を基に、Cursorが実装しやすい形式で戦略設計書を作成
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * 既存ドキュメントを読み込む
 */
function loadExistingDocuments() {
  const docsDir = path.join(__dirname, '../docs');
  const reportsDir = path.join(__dirname, '../docs/reports');
  
  let enhancedStrategy = '';
  let grokGeminiAnalysis = '';
  
  try {
    const enhancedPath = path.join(docsDir, 'PREMIUM_TIER_LAUNCH_STRATEGY_ENHANCED.md');
    if (fs.existsSync(enhancedPath)) {
      enhancedStrategy = fs.readFileSync(enhancedPath, 'utf-8');
    }
  } catch (error) {
    console.warn('⚠️ Enhanced strategy not found:', error.message);
  }
  
  try {
    const files = fs.readdirSync(reportsDir);
    const analysisFiles = files.filter(f => f.startsWith('premium-launch-grok-gemini-analysis-'));
    if (analysisFiles.length > 0) {
      const latestFile = analysisFiles.sort().reverse()[0];
      const analysisPath = path.join(reportsDir, latestFile);
      grokGeminiAnalysis = fs.readFileSync(analysisPath, 'utf-8');
    }
  } catch (error) {
    console.warn('⚠️ Grok×Gemini analysis not found:', error.message);
  }
  
  return { enhancedStrategy, grokGeminiAnalysis };
}

/**
 * GPTでWeek 1の実装設計書を生成
 */
async function generateWeek1Strategy(enhancedStrategy, grokGeminiAnalysis) {
  const prompt = `あなたはNode.js/JavaScriptの実装設計の専門家です。Trap Defence BTC Premium Tierの**Week 1: プレローンチ準備**のみを、Cursor（AIコードエディタ）が**即座に実装できる**詳細な技術設計書として作成してください。

## 既存の戦略ドキュメント（要約）

### Grok×Gemini統合強化版戦略
- Week 1: プレローンチ準備（ウェイティングリスト構築、コンテンツ準備）
- X投稿タイミング: 平日朝9時/夜21時（JST）、UTC 12-16時
- ハッシュタグ: #BTC #Bitcoin #CryptoTrading #TrapDefence
- コンテンツ形式: 動画（最優先）> 画像 > スレッド（5-10ツイート）
- 心理的アプローチ: FOMO創出、緊急性、ソーシャルプルーフ

## 既存コードベースの実装パターン（必須参照）

このプロジェクトは以下の実装パターンを使用しています。**必ずこのパターンを踏襲してください**：

### パターン1: X投稿API（api/x-post-minimal-version.js）
\`\`\`javascript
module.exports = async function handler(req, res) {
  const xStatus = getXConfigStatus();
  if (!xStatus.postingEnabled) return { success: false };
  const alreadyPosted = await hasPostedToday(dateString, lang);
  if (alreadyPosted) return { success: false, skipped: true };
  const langTemplates = loadUserTemplates(lang);
  const message = langTemplates.formatMessage({ trapScore, priceUsd, ... });
  const useWhopFirst = Math.random() < 0.5;
  const thread = splitTextForThread(message);
  const firstTweet = await postTweet(thread[0]);
  for (let i = 1; i < thread.length; i++) {
    await replyToTweet(firstTweet.id, thread[i]);
  }
  await logPostSuccess({ lang, abTestVariant, ... });
  return { success: true };
}
\`\`\`

### パターン2: Telegram Botコマンド（services/telegram/bot-commands.js）
\`\`\`javascript
async function handleStartCommand(chatId, username, firstName, message) {
  const startParam = parseStartParam(message);
  const lang = startParam.lang || 'en';
  const welcomeMessage = generateWelcomeMessage(lang);
  await sendMessageToAsset(welcomeMessage, 'BTC', lang);
  return { success: true, action: 'start', lang };
}
\`\`\`

### パターン3: メッセージテンプレート（services/telegram/messages/user/en/minimal-high-quality.en.js）
\`\`\`javascript
function formatMinimalHighQualityBriefing({ now, trapScore, priceUsd, ... }) {
  const hook = getTrapScoreHook(trapScore);
  const avoidItems = generateWhatToAvoid(trapScore, trapData);
  return \`[1/4] \${hook}\n\n[2/4] What to Avoid:\n\${avoidItems.join('\\n')}\n\n...\`;
}
module.exports = { formatMinimalHighQualityBriefing };
\`\`\`

### パターン4: Vercel KVデータ管理（services/core/postLogger.js）
\`\`\`javascript
async function logPostSuccess(logData) {
  const dateString = getDateString();
  const logKey = \`x:post_logs:\${dateString}\`;
  let logs = await kv.get(logKey) || [];
  logs.push({ timestamp: new Date().toISOString(), type: 'POST_SUCCESS', ...logData });
  await kv.set(logKey, logs, { ex: 30 * 24 * 60 * 60 });
}
\`\`\`

## Week 1: プレローンチ準備の実装要件

**重要**: 以下のすべてを含めてください。コード例は**実際に動作する完全な実装**であること。

### 1.1 X投稿機能（api/x-post-premium-tier-cron.js）
- **完全なコード実装**（パターン1を踏襲）
- 関数シグネチャ: \`async function postPremiumTierAnnouncement(lang, phase)\`
- メッセージ生成ロジック（Grok×Gemini分析に基づく）
- A/Bテスト実装（既存パターンと同じ構造）
- エラーハンドリング、リトライロジック

### 1.2 Telegramウェイティングリスト登録（services/telegram/premium-commands.js）
- **完全なコード実装**（パターン2を踏襲）
- コマンド: \`/waitlist\`, \`/premium-beta\`
- Vercel KVでのユーザーステータス管理
- データ構造: \`{ userId, status: 'waitlist'|'beta'|'premium', registeredAt, lang }\`

### 1.3 Premium Tierメッセージテンプレート（services/telegram/messages/user/en/premium-announcement.en.js）
- **完全なコード実装**（パターン3を踏襲）
- 関数: \`formatPremiumAnnouncement({ phase, discount, features, ... })\`
- 6言語対応（en, ja, es, pt-br, ar, ko）
- セクション番号付き（[1/4]形式）

## 出力形式（必須）

Markdown形式で、以下のセクションを**すべて**含めてください：

1. **概要**: Week 1実装設計書の目的、スコープ、前提条件
2. **アーキテクチャ概要**: 
   - ディレクトリ構造（完全なパス）
   - ファイル依存関係図
   - データフロー図
3. **Week 1の詳細実装設計**:
   - **各ファイルの完全なコード実装**（コピー&ペーストで動作するレベル）
   - 関数シグネチャ、パラメータ、戻り値
   - エラーハンドリング
   - テスト方法（具体的なテストコード例）
4. **データモデル**:
   - Vercel KVキー構造（完全な例）
   - データ構造（JSONスキーマ）
5. **API設計**:
   - エンドポイント定義（完全なパス、メソッド、リクエスト/レスポンス例）
   - 認証・認可
6. **Cron設定**:
   - vercel.jsonへの追加設定（完全なJSON）
   - 実行タイミングの根拠
7. **環境変数**:
   - 必要な環境変数のリスト（名前、説明、デフォルト値）
8. **実装チェックリスト**:
   - ファイル単位の実装項目（具体的なファイルパス）
   - 依存関係の順序
9. **テスト計画**:
   - ユニットテストコード例
   - 統合テストシナリオ
   - 手動テスト手順

## 重要な制約

1. **既存パターンを100%踏襲**: 上記パターン1-4を必ず参照
2. **完全なコード実装**: 関数の骨組みではなく、動作する完全なコード
3. **6言語対応**: すべての機能で6言語（en, ja, es, pt-br, ar, ko）をサポート
4. **エラーハンドリング**: try-catch、フォールバック、ログ記録を含める
5. **型安全性**: JSDocコメントで型を明示
6. **実装可能**: Cursorがそのまま実装できるレベル

日本語で回答してください。`;

  try {
    console.log('🔄 GPTでWeek 1実装設計書を生成中...');
    
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはNode.js/JavaScriptの実装設計の専門家です。Cursor（AIコードエディタ）が**即座に実装できる**詳細な技術設計書を作成します。既存コードパターンを100%踏襲し、動作する完全なコード実装を含めます。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 8000,
      temperature: 0.7,
    });

    const strategy = response.choices[0]?.message?.content;
    
    if (!strategy || strategy.trim().length === 0) {
      return {
        success: false,
        error: 'Empty response from GPT',
      };
    }
    
    console.log('✅ GPT Week 1実装設計書生成完了');
    console.log(`📝 生成された文字数: ${strategy.length}文字`);
    
    return {
      success: true,
      strategy,
      model: 'gpt-5.2-2025-12-11',
    };
  } catch (error) {
    console.error('❌ GPT Week 1実装設計書生成エラー:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('='.repeat(80));
  console.log('🚀 Premium Tierローンチ戦略のGPT実装設計書生成 - Week 1');
  console.log('='.repeat(80));
  console.log('');

  const { enhancedStrategy, grokGeminiAnalysis } = loadExistingDocuments();
  
  if (!enhancedStrategy && !grokGeminiAnalysis) {
    console.error('❌ 既存ドキュメントが見つかりません');
    process.exit(1);
  }

  const result = await generateWeek1Strategy(enhancedStrategy, grokGeminiAnalysis);

  if (!result.success) {
    console.error('❌ 実装設計書生成に失敗しました');
    process.exit(1);
  }

  const outputDir = path.join(__dirname, '../docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const outputFile = path.join(outputDir, `PREMIUM_TIER_IMPLEMENTATION_WEEK1_${timestamp}.md`);

  const output = `# Trap Defence BTC Premium Tier 実装設計書 - Week 1（GPT生成）

**作成日時**: ${new Date().toISOString()}
**生成モデル**: ${result.model}
**基盤**: Grok×Gemini統合分析結果

---

${result.strategy}

---

**生成日時**: ${new Date().toISOString()}
**目的**: Cursor（AIコードエディタ）が実装しやすい形式での戦略設計書
`;

  fs.writeFileSync(outputFile, output, 'utf-8');
  console.log(`✅ 実装設計書を保存しました: ${outputFile}`);
  console.log('='.repeat(80));
}

main().catch((error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
