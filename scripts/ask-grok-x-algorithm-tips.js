// scripts/ask-grok-x-algorithm-tips.js
// GrokにXのアルゴリズム解析と効果最大化のヒントを聞く

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// コマンドライン引数からAPIキーを取得（優先）
const args = process.argv.slice(2);
const apiKeyFromArgs = args.find(arg => arg.startsWith('--api-key='))?.split('=')[1];
const XAI_API_KEY = apiKeyFromArgs || process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  console.error('使用方法: node scripts/ask-grok-x-algorithm-tips.js --api-key=YOUR_API_KEY');
  console.error('または環境変数 XAI_API_KEY を設定してください');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

/**
 * GrokにXのアルゴリズム解析と効果最大化のヒントを聞く
 */
async function askGrokXAlgorithmTips() {
  const prompt = `あなたはX（旧Twitter）のアルゴリズム解析の専門家として、以下の質問に回答してください。

## 🎯 背景

Trap Defence BTCというBTCトレーディングツールのプロジェクトで、新しいVSLワークフローを実装しようとしています。

### 新しいVSLワークフローの概要

1. **ユーザー投稿**: 私が手動かX APIで無料版を私のアカウントにポスト
2. **インフルエンサー発掘**: Grokがホットインフルエンサーアカを見つけて引用リポスト
3. **文章最適化**: Grokがホットな文章を作成してインプレッションを伸ばす
4. **最適タイミング投稿**: 24時間使って、各言語のホットな時間帯にGrokがポスト
5. **トラフィック獲得**: インプレッションを最大化させてファネルにトラフィックをどんどん流す

**目標**: Xを攻略してTelegram（TG）にトラフィックを流す

**実測データ**:
- インフルエンサーへの引用リポスト = 数万インプレッション（30,000）
- クリック率: 5%
- エンゲージメント率: 0.3%（トラフィック → 有料版エンゲージメント）

---

## 📋 質問事項

### 1. Xのアルゴリズム解析

#### 1.1 インプレッション最大化の要因
- Xのアルゴリズムがインプレッションを最大化する要因は何ですか？
- 引用リポスト（Quote Tweet）がインプレッションを伸ばす理由は？
- インフルエンサーアカウントへの引用リポストが特に効果的な理由は？

#### 1.2 アルゴリズムの仕組み
- Xのアルゴリズムはどのように投稿をランキングしていますか？
- エンゲージメント（いいね、リツイート、リプライ、クリック）の重み付けは？
- 引用リポストのエンゲージメントは通常の投稿と比べてどの程度重要ですか？

#### 1.3 タイミング最適化
- 投稿タイミングがインプレッションに与える影響は？
- 各言語市場（en, es, pt-br, ar, ja, ko）の最適な投稿時間帯は？
- 24時間を最適に分散する方法は？

### 2. 引用リポストの効果最大化

#### 2.1 引用リポストの戦略
- 引用リポストでインプレッションを最大化するためのベストプラクティスは？
- インフルエンサーアカウントへの引用リポストの最適な頻度は？
- スパム判定を避けつつ効果を最大化する方法は？

#### 2.2 文章作成の最適化
- インプレッション最大化のための引用リポスト文章の特徴は？
- どのような要素（ハッシュタグ、メンション、絵文字、CTAなど）が効果的ですか？
- 元投稿を引用しつつ、インプレッション最大化を狙う文章の書き方は？

#### 2.3 エンゲージメント向上
- 引用リポストのエンゲージメント率を上げる方法は？
- クリック率を5%以上に保つためのテクニックは？
- トラフィックをTelegramに流すためのCTA最適化は？

### 3. XからTelegramへのトラフィック転換

#### 3.1 ファネル設計
- XからTelegramへのトラフィック転換を最大化するファネル設計は？
- VSL1（無料版オプトイン誘導）へのクリック率を上げる方法は？
- インプレッション → クリック → VSL1視聴 → 無料版オプトインの各ステップで最適化すべき点は？

#### 3.2 コンバージョン最適化
- エンゲージメント率0.3%を向上させる方法は？
- 無料版オプトインから有料版エンゲージメントへの転換率を上げる方法は？
- XのトラフィックをTelegramに流す際の心理的障壁を減らす方法は？

### 4. その他のヒント

#### 4.1 アルゴリズム攻略のテクニック
- Xのアルゴリズムを攻略するための隠れたテクニックはありますか？
- インプレッションを最大化するための「裏技」や「コツ」はありますか？
- 他の成功事例で使われている手法はありますか？

#### 4.2 リスク回避
- X APIのスパム判定を避けるための具体的な対策は？
- レート制限を考慮した最適な投稿頻度は？
- アカウント凍結を避けるためのベストプラクティスは？

#### 4.3 スケーラビリティ
- 24投稿/日からさらに拡張する場合の注意点は？
- 複数のインフルエンサーをローテーションする際の最適な方法は？
- 長期的な運用でインプレッションを維持する方法は？

---

## 📋 出力形式

以下の形式で回答してください：

### 1. Xのアルゴリズム解析（500-800字）
- インプレッション最大化の要因
- アルゴリズムの仕組み
- タイミング最適化の方法

### 2. 引用リポストの効果最大化（500-800字）
- 引用リポストの戦略
- 文章作成の最適化
- エンゲージメント向上のテクニック

### 3. XからTelegramへのトラフィック転換（400-600字）
- ファネル設計の最適化
- コンバージョン最適化の方法

### 4. その他のヒント（400-600字）
- アルゴリズム攻略のテクニック
- リスク回避の対策
- スケーラビリティの考慮事項

### 5. 即座に実行すべき具体的なアクション（5-10項目）
- 優先度の高いアクションをリストアップ

日本語で回答してください。`;

  try {
    console.log('🔄 GrokにXのアルゴリズム解析と効果最大化のヒントを質問中...');
    console.log('📋 質問内容:');
    console.log('  - Xのアルゴリズム解析');
    console.log('  - 引用リポストの効果最大化');
    console.log('  - XからTelegramへのトラフィック転換');
    console.log('  - その他のヒントとテクニック');
    console.log('');

    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはX（旧Twitter）のアルゴリズム解析の専門家です。Xのアルゴリズムを深く理解し、インプレッション最大化とトラフィック獲得のための具体的なヒントとテクニックを提供してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const tipsText = completion?.choices?.[0]?.message?.content?.trim();

    if (!tipsText) {
      console.error('❌ Grokからの回答が空です');
      return null;
    }

    // 回答結果をファイルに保存
    const outputDir = path.join(process.cwd(), 'docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outputFile = path.join(outputDir, `GROK_X_ALGORITHM_TIPS_${timestamp}.md`);

    const markdownContent = `# GrokによるXのアルゴリズム解析と効果最大化のヒント
**作成日時**: ${new Date().toISOString()}  
**質問AI**: Grok（grok-4-1-fast-reasoning）  
**目的**: Xのアルゴリズム攻略とトラフィック最大化のためのヒント収集

---

${tipsText}

---

**質問完了**: ${new Date().toISOString()}
`;

    fs.writeFileSync(outputFile, markdownContent, 'utf-8');

    console.log('✅ Grokからの回答完了');
    console.log(`📄 回答結果を保存: ${outputFile}`);
    console.log('');
    console.log('💡 Grokからのヒント:');
    console.log('─'.repeat(80));
    console.log(tipsText);
    console.log('─'.repeat(80));

    return {
      success: true,
      tips: tipsText,
      outputFile,
    };
  } catch (error) {
    console.error('❌ Grok質問失敗:', error.message);
    if (error.status === 429) {
      console.error('⚠️ レート制限エラー。しばらく待ってから再試行してください。');
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  askGrokXAlgorithmTips()
    .then((result) => {
      if (result) {
        console.log('✅ 質問完了');
        process.exit(0);
      } else {
        console.error('❌ 質問失敗');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { askGrokXAlgorithmTips };
