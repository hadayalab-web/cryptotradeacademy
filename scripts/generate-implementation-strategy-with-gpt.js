#!/usr/bin/env node
/**
 * Premium Tierローンチ戦略のGPT実装設計書生成
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
    // 最新のGrok×Gemini分析結果を探す
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
 * GPTで実装設計書を生成
 */
async function generateImplementationStrategy(enhancedStrategy, grokGeminiAnalysis) {
  const prompt = `あなたはNode.js/JavaScriptの実装設計の専門家です。Trap Defence BTC Premium Tierのプロダクトローンチ戦略を、Cursor（AIコードエディタ）が**即座に実装できる**詳細な技術設計書として作成してください。

## 既存の戦略ドキュメント

### 1. Grok×Gemini統合強化版戦略（要約）
- Week 1: プレローンチ準備（ウェイティングリスト構築、コンテンツ準備）
- Week 2: ソフトローンチ（ベータユーザー募集、フィードバック収集）
- Week 3: 正式ローンチ準備（コンテンツ作成、マルチチャネル告知）
- Week 4: 正式ローンチ（3連投、優先アクセス、一般公開）

### 2. Grok×Gemini詳細分析結果（要約）
- X投稿タイミング: 平日朝9時/夜21時（JST）、UTC 12-16時
- ハッシュタグ: #BTC #Bitcoin #CryptoTrading #TrapDefence
- コンテンツ形式: 動画（最優先）> 画像 > スレッド（5-10ツイート）
- 心理的アプローチ: FOMO創出、緊急性、ソーシャルプルーフ

## 既存コードベースの実装パターン（必須参照）

このプロジェクトは以下の実装パターンを使用しています。**必ずこのパターンを踏襲してください**：

### パターン1: X投稿API（api/x-post-minimal-version.js）
\`\`\`javascript
// 構造: Vercel Serverless Function
module.exports = async function handler(req, res) {
  // 1. 設定チェック
  const xStatus = getXConfigStatus();
  if (!xStatus.postingEnabled) return { success: false };
  
  // 2. 既存投稿チェック（Vercel KV）
  const alreadyPosted = await hasPostedToday(dateString, lang);
  if (alreadyPosted) return { success: false, skipped: true };
  
  // 3. メッセージ生成（言語別テンプレート）
  const langTemplates = loadUserTemplates(lang);
  const message = langTemplates.formatMessage({ trapScore, priceUsd, ... });
  
  // 4. A/Bテスト実装
  const useWhopFirst = Math.random() < 0.5;
  const selectedCTA = useWhopFirst ? whopFirstCTAs[lang] : telegramFirstCTAs[lang];
  
  // 5. スレッド投稿（postTweet, replyToTweet）
  const thread = splitTextForThread(message);
  const firstTweet = await postTweet(thread[0]);
  for (let i = 1; i < thread.length; i++) {
    await replyToTweet(firstTweet.id, thread[i]);
  }
  
  // 6. ログ記録（postLogger）
  await logPostSuccess({ lang, abTestVariant, ... });
  
  return { success: true };
}
\`\`\`

### パターン2: Telegram Botコマンド（services/telegram/bot-commands.js）
\`\`\`javascript
// コマンドハンドラー構造
async function handleStartCommand(chatId, username, firstName, message) {
  const startParam = parseStartParam(message);
  const lang = startParam.lang || 'en';
  
  // 言語別メッセージ生成
  const welcomeMessage = generateWelcomeMessage(lang);
  
  // Telegram API呼び出し
  await sendMessageToAsset(welcomeMessage, 'BTC', lang);
  
  return { success: true, action: 'start', lang };
}

// Webhook統合（api/telegram-webhook.js）
module.exports = async function handler(req, res) {
  const update = req.body;
  const result = await handleBotCommand(update);
  return res.status(200).json({ ok: true, result });
}
\`\`\`

### パターン3: メッセージテンプレート（services/telegram/messages/user/en/minimal-high-quality.en.js）
\`\`\`javascript
// エクスポート関数: formatMinimalHighQualityBriefing
function formatMinimalHighQualityBriefing({ now, trapScore, priceUsd, change24h, trapData, marketData, sentimentData, lang }) {
  // セクション別にフォーマット
  const hook = getTrapScoreHook(trapScore);
  const avoidItems = generateWhatToAvoid(trapScore, trapData);
  const evidence = generateEvidence(trapData, marketData);
  
  // 番号付きセクション（[1/4]形式）
  return \`[1/4] \${hook}\n\n[2/4] What to Avoid:\n\${avoidItems.join('\\n')}\n\n...\`;
}

module.exports = { formatMinimalHighQualityBriefing };
\`\`\`

### パターン4: Vercel KVデータ管理（services/core/postLogger.js）
\`\`\`javascript
// KVキー構造: 'x:post_logs:YYYY-MM-DD'
// データ構造: Array<{ timestamp, type, lang, abTestVariant, ... }>
async function logPostSuccess(logData) {
  const dateString = getDateString();
  const logKey = \`x:post_logs:\${dateString}\`;
  let logs = await kv.get(logKey) || [];
  logs.push({ timestamp: new Date().toISOString(), type: 'POST_SUCCESS', ...logData });
  await kv.set(logKey, logs, { ex: 30 * 24 * 60 * 60 });
}
\`\`\`

### パターン5: Cron設定（vercel.json）
\`\`\`json
{
  "crons": [
    { "path": "/api/x-post-minimal-version-cron", "schedule": "0 8,12,18,20 * * *" }
  ]
}
\`\`\`

## 実装設計書の必須要件

**重要**: 以下のすべてを含めてください。コード例は**実際に動作する完全な実装**であること。

### 1. Week 1: プレローンチ準備

#### 1.1 X投稿機能（api/x-post-premium-tier-cron.js）
- **完全なコード実装**（上記パターン1を踏襲）
- 関数シグネチャ: \`async function postPremiumTierAnnouncement(lang, phase)\`
- メッセージ生成ロジック（Grok×Gemini分析に基づく）
- A/Bテスト実装（既存パターンと同じ構造）
- エラーハンドリング、リトライロジック

#### 1.2 Telegramウェイティングリスト登録（services/telegram/premium-commands.js）
- **完全なコード実装**（上記パターン2を踏襲）
- コマンド: \`/waitlist\`, \`/premium-beta\`
- Vercel KVでのユーザーステータス管理
- データ構造: \`{ userId, status: 'waitlist'|'beta'|'premium', registeredAt, lang }\`

#### 1.3 Premium Tierメッセージテンプレート（services/telegram/messages/user/en/premium-announcement.en.js）
- **完全なコード実装**（上記パターン3を踏襲）
- 関数: \`formatPremiumAnnouncement({ phase, discount, features, ... })\`
- 6言語対応（en, ja, es, pt-br, ar, ko）
- セクション番号付き（[1/4]形式）

### 2. Week 2: ソフトローンチ

#### 2.1 ベータユーザー管理（services/premium/user-management.js）
- **完全なコード実装**
- 関数: \`async function addBetaUser(userId, lang)\`, \`async function getBetaUsers()\`
- Vercel KVスキーマ: \`premium:beta_users:YYYY-MM-DD\`
- フィードバック収集機能

#### 2.2 A/Bテストロガー拡張（services/core/premiumPostLogger.js）
- **完全なコード実装**（既存postLogger.jsを拡張）
- Premium Tier専用ログ構造
- エンゲージメントメトリクス収集

### 3. Week 3: コンテンツ準備

#### 3.1 コンテンツ生成サービス（services/premium/content-generator.js）
- **完全なコード実装**
- スレッド生成、動画URL管理、画像生成ロジック
- マルチチャネル対応（X, Telegram, Email）

### 4. Week 4: 正式ローンチ

#### 4.1 ローンチ日特別機能（api/premium-launch-day.js）
- **完全なコード実装**
- 3連投ロジック、優先アクセス管理、オファー適用

## 出力形式（必須）

Markdown形式で、以下のセクションを**すべて**含めてください：

1. **概要**: 実装設計書の目的、スコープ、前提条件
2. **アーキテクチャ概要**: 
   - ディレクトリ構造（完全なパス）
   - ファイル依存関係図
   - データフロー図
3. **Week 1-4の詳細実装設計**:
   - **各ファイルの完全なコード実装**（コピー&ペーストで動作するレベル）
   - 関数シグネチャ、パラメータ、戻り値
   - エラーハンドリング
   - テスト方法（具体的なテストコード例）
4. **データモデル**:
   - Vercel KVキー構造（完全な例）
   - データ構造（JSONスキーマ）
   - インデックス設計
5. **API設計**:
   - エンドポイント定義（完全なパス、メソッド、リクエスト/レスポンス例）
   - 認証・認可
   - レート制限
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
10. **デプロイメント計画**:
    - 段階的デプロイ手順（具体的なコマンド）
    - ロールバック手順

## 重要な制約

1. **既存パターンを100%踏襲**: 上記パターン1-5を必ず参照
2. **完全なコード実装**: 関数の骨組みではなく、動作する完全なコード
3. **6言語対応**: すべての機能で6言語（en, ja, es, pt-br, ar, ko）をサポート
4. **エラーハンドリング**: try-catch、フォールバック、ログ記録を含める
5. **型安全性**: JSDocコメントで型を明示
6. **実装可能**: Cursorがそのまま実装できるレベル

日本語で回答してください。`;

  try {
    console.log('🔄 GPTで実装設計書を生成中...');
    
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはNode.js/JavaScriptの実装設計の専門家です。Cursor（AIコードエディタ）が**即座に実装できる**詳細な技術設計書を作成します。既存コードパターンを100%踏襲し、動作する完全なコード実装を含めます。関数シグネチャ、エラーハンドリング、テストコード、データ構造をすべて明示します。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 12000,
      temperature: 0.7,
    });

    // レスポンス構造を確認
    if (!response || !response.choices || response.choices.length === 0) {
      console.error('❌ GPTレスポンスの構造が不正です');
      console.error('Response:', JSON.stringify(response, null, 2));
      return {
        success: false,
        error: 'Invalid response structure from GPT',
      };
    }

    const strategy = response.choices[0]?.message?.content;
    
    if (!strategy || strategy.trim().length === 0) {
      console.error('❌ GPTレスポンスが空です');
      console.error('Response structure:', JSON.stringify({
        choices: response.choices?.length,
        firstChoice: response.choices?.[0],
        message: response.choices?.[0]?.message,
      }, null, 2));
      return {
        success: false,
        error: 'Empty response from GPT',
      };
    }
    
    console.log('✅ GPT実装設計書生成完了');
    console.log(`📝 生成された文字数: ${strategy.length}文字`);
    
    return {
      success: true,
      strategy,
      model: 'gpt-5.2-2025-12-11',
    };
  } catch (error) {
    console.error('❌ GPT実装設計書生成エラー:', error.message);
    console.error('Error details:', error);
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
  console.log('🚀 Premium Tierローンチ戦略のGPT実装設計書生成');
  console.log('='.repeat(80));
  console.log('');

  // 1. 既存ドキュメントを読み込む
  console.log('📖 既存ドキュメントを読み込み中...');
  const { enhancedStrategy, grokGeminiAnalysis } = loadExistingDocuments();
  
  if (!enhancedStrategy && !grokGeminiAnalysis) {
    console.error('❌ 既存ドキュメントが見つかりません');
    process.exit(1);
  }
  
  console.log(`✅ Enhanced Strategy: ${enhancedStrategy.length}文字`);
  console.log(`✅ Grok×Gemini Analysis: ${grokGeminiAnalysis.length}文字`);
  console.log('');

  // 2. GPTで実装設計書を生成
  const result = await generateImplementationStrategy(enhancedStrategy, grokGeminiAnalysis);
  
  if (!result.success) {
    console.error('❌ 実装設計書生成に失敗しました');
    process.exit(1);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('📋 GPT実装設計書');
  console.log('='.repeat(80));
  console.log(result.strategy.substring(0, 2000) + '...');
  console.log('');

  // 3. 結果をファイルに保存
  const outputDir = path.join(__dirname, '../docs');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const outputFile = path.join(outputDir, `PREMIUM_TIER_IMPLEMENTATION_STRATEGY_${timestamp}.md`);

  const output = `# Trap Defence BTC Premium Tier 実装設計書（GPT生成）

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
  console.log('');
  console.log('='.repeat(80));
  console.log('✅ 生成完了');
  console.log('='.repeat(80));
}

// 実行
main().catch((error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
