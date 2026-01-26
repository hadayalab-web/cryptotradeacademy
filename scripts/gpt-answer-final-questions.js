// scripts/gpt-answer-final-questions.js
// GPTの追加確認事項3点に回答して、最終的な実装仕様を依頼

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

/**
 * GPTの追加確認事項3点に回答して、最終的な実装仕様を依頼
 */
async function answerFinalQuestions() {
  // 前回の詳細提案を読み込む
  const previousDetailedPath = path.join(__dirname, '../docs/GPT_CVR_STRATEGY_DETAILED_2026-01-26T05-41-50-609Z.md');
  let previousDetailed = '';
  try {
    previousDetailed = fs.readFileSync(previousDetailedPath, 'utf-8');
  } catch (error) {
    console.warn('⚠️ 前回の詳細提案ファイルが見つかりません:', previousDetailedPath);
  }

  const prompt = `前回の詳細CVR戦略設計提案ありがとうございました。ご確認いただいた3点について、コードベースを確認した結果をお答えします。

## 📋 追加確認事項への回答

### 1. X引用RPのリンクは現在、Telegram直リンクですか？（中間LPなし）

**回答**: ✅ **YES - Telegram直リンクです**

**実装状況**:
- api/x-quote-repost.jsのgetTelegramDeepLinkWithSource関数で、Telegram Deep Linkを直接生成しています
- 形式: https://t.me/{botUsername}?start=minimal_{lang}_{source}
- 例: https://t.me/TrapDefenceBot?start=minimal_en_x_quote
- 中間LP（ランディングページ）は使用していません

**UTMパラメータ**:
- UTMパラメータはTelegram Deep Linkのクエリパラメータとして付与されています
- 例: ?start=minimal_en_x_quote&utm_source=x_quote_en&utm_medium=social&utm_campaign=quote_repost_en_2026-01-26
- ただし、Telegramの?start=パラメータは最初の1つしか認識されないため、UTMパラメータは実際には機能していない可能性があります

**改善の余地**:
- startパラメータ内にUTM情報を含める（例：minimal_en_x_quote_utm_source_x_quote_en）
- または、startパラメータを解析してUTM情報を抽出する仕組みを実装

---

### 2. Telegram Botで、startパラメータ（例：EN_A1）をログ保存できますか？

**回答**: ⚠️ **部分的に可能 - 改善の余地あり**

**現在の実装状況**:
- services/telegram/bot-commands.jsのparseStartParam関数でstartパラメータを解析しています
- 解析結果: { lang, referralCode, source }
- handleStartCommand関数でaddFreeUserを呼び出し、sourceフィールドを保存しています

**保存されている情報**:
- source: x_quote, x_direct, x_minimal, telegramなどに正規化された値
- lang: 言語コード（en, ja, esなど）
- chatId: ユーザーのTelegramチャットID
- joinedAt: 登録日時

**保存されていない情報**:
- startパラメータ全体（例：minimal_en_x_quote）
- テンプレート識別子（例：A1, B2など）
- インフルエンサー情報（例：influencer_saylor）

**改善の余地**:
- startパラメータ全体を保存するフィールドを追加
- テンプレート識別子（A/Bテスト用）を含める設計に変更
- インフルエンサー情報を含める設計に変更

**実装可能**:
- addFreeUser関数にstartParamフィールドを追加
- services/free-users/manager.jsのユーザーオブジェクトにstartParamフィールドを追加
- KVストレージまたはファイルストレージに保存

---

### 3. Whop側で、購入イベント（plan別）を外部にWebhookまたは何らかの形で取得できますか？

**回答**: ❌ **現在は実装されていません**

**現在の実装状況**:
- Whop APIクライアント（services/whop/client.js）は存在します
- プロモコード監視（services/whop/promo-monitor.js）は実装されています
- しかし、Whop Webhookの受信実装は確認できませんでした

**Whop APIの機能**:
- メンバーリスト取得（listMembers）
- プロモコード作成・管理
- プラン情報取得

**Webhookの実装可能性**:
- WhopはWebhook機能を提供している可能性があります（ドキュメントに言及あり）
- 実装する場合: api/whop-webhook.jsのようなエンドポイントを作成
- 購入イベント、トライアル開始イベント、解約イベントなどを取得可能

**代替案**:
- Whop APIのlistMembersを定期的にポーリングして、新規メンバーを検出
- Cron Jobで定期的にチェック（例：1時間ごと）

---

## 💡 追加情報

### startパラメータの現在の構造

**現在の形式**:
- minimal_{lang}_{source}
- 例: minimal_en_x_quote, minimal_ja_x_minimal

**GPT提案の形式**:
- {lang}_{template}_{influencer}_{template}_{timing}
- 例: EN_A1, EN_A1_saylor_tmpA_t15

**実装のギャップ**:
- 現在の形式では、テンプレート識別子（A/Bテスト用）やインフルエンサー情報を含められない
- GPT提案の形式に対応するには、startパラメータの構造を変更する必要がある

---

## 🎯 依頼内容

上記の回答を踏まえ、以下の点を考慮した**最終的な実装仕様**を提案してください：

### 1. startパラメータの設計変更
- テンプレート識別子（A/Bテスト用）を含める設計
- インフルエンサー情報を含める設計
- タイミング情報を含める設計
- 後方互換性を保つ設計

### 2. startパラメータのログ保存実装
- addFreeUser関数の拡張
- ユーザーオブジェクトへのstartParamフィールド追加
- KVストレージへの保存

### 3. Whop Webhookの実装（または代替案）
- Webhookエンドポイントの実装
- 購入イベントの取得とログ保存
- または、ポーリング方式の実装

### 4. 計測とPDCAの実装
- startパラメータからテンプレート×言語×インフルエンサーを抽出
- 購入までの追跡（X → Telegram → Whop）
- A/Bテストの勝敗判定ロジック

---

前回の提案と今回の回答を踏まえ、**実装可能な最終仕様**を、コードレベルの詳細まで含めて提案してください。

特に、startパラメータの構造変更、ログ保存の実装、Whop Webhook（または代替案）の実装について、具体的なコード例を含めて提案してください。`;

  console.log('🤖 GPTに追加確認事項への回答と最終実装仕様を依頼中...\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのマーケティング戦略専門家兼エンジニアです。前回の提案と今回の回答を踏まえ、実装可能な最終仕様を、コードレベルの詳細まで含めて提案します。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 8000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || '';

    // 結果をファイルに保存
    const outputDir = path.join(__dirname, '../docs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `GPT_CVR_STRATEGY_FINAL_${timestamp}.md`);

    const output = `# GPT提案: 最終CVR戦略実装仕様（追加確認事項回答後）

**作成日時**: ${new Date().toISOString()}
**モデル**: gpt-5.2-2025-12-11

## 📋 追加確認事項への回答

### 1. X引用RPのリンク
- ✅ YES - Telegram直リンク（中間LPなし）
- UTMパラメータは付与されているが、Telegramの制約で機能していない可能性

### 2. startパラメータのログ保存
- ⚠️ 部分的に可能 - 改善の余地あり
- 現在はsourceフィールドのみ保存（x_quote, x_directなど）
- startパラメータ全体、テンプレート識別子、インフルエンサー情報は保存されていない

### 3. Whop Webhook
- ❌ 現在は実装されていない
- Whop APIクライアントは存在するが、Webhook受信実装はなし
- 代替案: ポーリング方式で実装可能

---

${response}

---

**生成日時**: ${new Date().toISOString()}
`;

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, output, 'utf-8');

    console.log('✅ GPTの最終実装仕様を取得しました');
    console.log(`📄 結果を保存しました: ${outputFile}\n`);
    console.log('='.repeat(80));
    console.log('GPTの最終実装仕様:');
    console.log('='.repeat(80));
    console.log(response);
    console.log('='.repeat(80));

    return response;
  } catch (error) {
    console.error('❌ GPT API呼び出しエラー:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  answerFinalQuestions()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { answerFinalQuestions };
