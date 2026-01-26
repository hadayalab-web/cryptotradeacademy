// scripts/gpt-answer-cvr-questions.js
// GPTの質問3点に回答して、より具体的なCVR戦略設計を依頼

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
 * GPTの質問3点に回答して、より具体的なCVR戦略設計を依頼
 */
async function answerCVRQuestions() {
  // 前回のGPT提案を読み込む
  const previousStrategyPath = path.join(__dirname, '../docs/GPT_HIGH_CVR_STRATEGY_2026-01-26T05-36-20-969Z.md');
  let previousStrategy = '';
  try {
    previousStrategy = fs.readFileSync(previousStrategyPath, 'utf-8');
  } catch (error) {
    console.warn('⚠️ 前回の戦略ファイルが見つかりません:', previousStrategyPath);
  }

  const prompt = `前回の高CVR戦略設計提案ありがとうございました。ご質問いただいた3点について回答いたします。

## 📋 ご質問への回答

### 1. X投稿の「自アカ投稿」と「引用リポスト」比率

**現状の比率**:
- **引用リポスト**: 約70-80%（主要なトラフィック獲得手段）
  - 1日あたり: 約14-18投稿（6言語 × 2-3人/日）
  - 高エンゲージメント率インフルエンサー（平均ER 10.53%）への引用リポスト
  - 目標インプレッション: EN 10万-20万/日、その他 5万-10万/日
- **自アカ投稿（Minimal Version）**: 約20-30%
  - 1日あたり: 約4-6投稿（6言語 × 1投稿/日）
  - 無料版レポートのスレッド形式投稿
  - 引用リポストへの補完として機能

**ファネル設計の考え方**:
- **引用リポスト** → 高インプレッション → 高エンゲージメント獲得 → **無料版（Minimal Version）オプトイン** または **Whopで即有料版（Regular Briefing）コンバージョン**
- 引用リポストが主要なトラフィック獲得手段であり、このファネルの精度を上げることが最重要

---

### 2. Telegram運用形態

**運用形態**: **チャンネル（Channel）**を使用

**理由**:
- 一方向配信、スパムなし、管理が簡単、プロフェッショナルな印象
- 無料版（MINIMAL）と有料版（REGULAR）で別チャンネル運用

**チャンネル構成**:
- **MINIMALチャンネル**: 無料版ユーザー向け（言語別チャンネル）
  - チャンネルID: TELEGRAM_CHAT_ID_MINIMAL_{LANG}（環境変数で管理）
  - 配信内容: 無料版レポート（Trap Score + 簡易分析）
- **REGULARチャンネル**: 有料版ユーザー向け（言語別チャンネル）
  - チャンネルID: TELEGRAM_CHAT_ID_REGULAR_{LANG}（環境変数で管理）
  - 配信内容: 有料版レポート（Grok Xアルゴリズム分析 + Gemini深層心理解析統合）

**固定メッセージ（Welcome Message）**:
- /startコマンドで送信されるウェルカムメッセージあり
- 言語別にカスタマイズ可能
- 現在の内容:
  - 無料版への登録案内（/freeコマンド）
  - 有料版へのアップグレード案内（/upgradeコマンド）
  - 免責事項（投資助言ではない）

**改善の余地**:
- 固定メッセージは現在シンプルな構成
- GPT提案の「Telegram固定メッセージ最適化」を実装する余地あり

---

### 3. Whopプラン構成

**現在のプラン構成**:

| プラン | プランID | 価格 | 期間 | トライアル | 割引率 |
|--------|----------|------|------|-----------|--------|
| **1か月** | plan_SatV2J5R7gvHn | **$69/月** | 30日 | **1日無料** | 0% |
| **3か月** | （新規作成予定） | **$165** | 90日 | **1日無料** | -20% |
| **1年間** | plan_L1xVv19322pC3 | **$588/年** | 365日 | **1日無料** | -29% |

**プラン詳細**:
- **全プラン共通**: 1日無料トライアルあり
- **無償アップデート**: 全プランで新機能・アルゴリズム改善を自動で無料提供
- **アフィリエイター報酬**: 全プラン50%統一

**返金ポリシー**:
- 現在のドキュメントには明記されていない
- Whopの標準返金ポリシーに準拠（通常14日間返金保証）

**言語別価格最適化**:
- EN: $69/月（基準）
- JA: ¥10,350/月（約$69相当）
- ES/PT-BR: $49/月（LATAM価格）
- AR/KO: 地域別価格設定

---

## 🎯 ファネル設計の核心

**ユーザーの考え**:
> 高品質リストへ引用リポスト → 高インプレッション → 高エンゲージメントを獲得し、無料版（Minimal Version）のオプトイン または Whopで即有料版（Regular Briefing）をコンバージョン。このファネルの精度を上げるだけで良い。

**現在のファネル**:
1. **X引用リポスト**（高ERインフルエンサー）
   - インプレッション: 目標達成（10,440,000/日）
   - エンゲージメント: 実績0.003%（期待値10.53%の1,333倍～3,333倍の差）← **課題**
2. **Telegram流入**
   - Deep Link経由で流入
   - /startコマンドでウェルカムメッセージ
   - 無料版オプトイン（/free）または有料版コンバージョン（/upgrade）
3. **Whopコンバージョン**
   - 1日無料トライアル付きプラン選択
   - 月額$69、3ヶ月$165、年間$588

**改善の焦点**:
- **引用リポストのエンゲージメント率向上**（0.003% → 0.3-1.2%）
- **Telegram流入率向上**（CTR 0.05% → 0.15-0.6%）
- **Whopコンバージョン率向上**（Telegram start → 購入 1.5-4.0%）

---

## 💡 追加依頼

前回の提案を踏まえ、以下の点をより具体的に設計してください：

### 1. 引用リポストテキストの最適化（ファネル精度向上）
- 高エンゲージメント率を獲得するテキスト設計
- Telegram Deep Linkへの誘導を最大化するCTA
- 無料版オプトインと有料版コンバージョンの両方に対応

### 2. Telegram固定メッセージの最適化
- startコマンド後のウェルカムメッセージ設計
- 無料版オプトイン（freeコマンド）への誘導
- 有料版コンバージョン（upgradeコマンド）への誘導
- 言語別に最適化（6言語対応）

### 3. Whop導線の最適化
- 1日無料トライアルの訴求方法
- プラン選択のガイダンス（月額/3ヶ月/年間）
- 返金ポリシーの明記（不安除去）

### 4. ファネル全体の精度向上施策
- X → Telegram → Whopの各ステップでのCVR向上策
- エンゲージメント率向上からコンバージョンまでの一貫した設計
- A/Bテスト設計（テキスト、CTA、タイミング）

---

前回の提案と今回の回答を踏まえ、**「引用リポスト → 高エンゲージメント → 無料版オプトイン/有料版コンバージョン」というファネルの精度を最大化する設計**を、より具体的に実装可能な形で提案してください。

特に、引用リポストテキスト、Telegram固定メッセージ、Whop導線の3つを統合した「勝ちテンプレ」を言語別に確定させてください。`;

  console.log('🤖 GPTに追加質問への回答と具体的なCVR戦略設計を依頼中...\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのマーケティング戦略専門家です。前回の提案と今回の回答を踏まえ、「引用リポスト → 高エンゲージメント → 無料版オプトイン/有料版コンバージョン」というファネルの精度を最大化する具体的な実装可能な設計を提案します。',
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
    const outputFile = path.join(outputDir, `GPT_CVR_STRATEGY_DETAILED_${timestamp}.md`);

    const output = `# GPT提案: 詳細CVR戦略設計（質問回答後）

**作成日時**: ${new Date().toISOString()}
**モデル**: gpt-5.2-2025-12-11

## 📋 質問への回答

### 1. X投稿比率
- 引用リポスト: 70-80%（主要なトラフィック獲得手段）
- 自アカ投稿（Minimal Version）: 20-30%

### 2. Telegram運用形態
- チャンネル（Channel）運用
- MINIMALチャンネル（無料版）とREGULARチャンネル（有料版）で別運用
- startコマンドでウェルカムメッセージあり

### 3. Whopプラン構成
- 1か月: $69/月（1日無料トライアル）
- 3か月: $165（1日無料トライアル、-20%）
- 1年間: $588/年（1日無料トライアル、-29%）
- 全プラン共通: 無償アップデート、アフィリエイター報酬50%

---

${response}

---

**生成日時**: ${new Date().toISOString()}
`;

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, output, 'utf-8');

    console.log('✅ GPTの詳細提案を取得しました');
    console.log(`📄 結果を保存しました: ${outputFile}\n`);
    console.log('='.repeat(80));
    console.log('GPTの詳細提案:');
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
  answerCVRQuestions()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { answerCVRQuestions };
