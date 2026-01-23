// scripts/ask-grok-x-algorithm-hack.js
// GrokにXのアルゴリズムを「ハッキング」して最適化してもらう（包括的版）

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
  console.error('使用方法: node scripts/ask-grok-x-algorithm-hack.js --api-key=YOUR_API_KEY');
  console.error('または環境変数 XAI_API_KEY を設定してください');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

// 現在の実装状況を読み込む
function loadCurrentImplementation() {
  const files = [
    { path: '../api/x-post-free-report.js', name: 'x-post-free-report' },
    { path: '../api/x-quote-repost.js', name: 'x-quote-repost' },
    { path: '../services/x/optimization.js', name: 'x-optimization' },
    { path: '../services/grok/client.js', name: 'grok-client' },
  ];
  
  const implementation = {};
  
  for (const file of files) {
    try {
      const filePath = path.join(__dirname, file.path);
      if (fs.existsSync(filePath)) {
        implementation[file.name] = fs.readFileSync(filePath, 'utf8').substring(0, 5000); // 最初の5000文字
      }
    } catch (error) {
      console.warn(`Failed to load ${file.name}:`, error.message);
    }
  }
  
  return implementation;
}

async function askGrokForAlgorithmHack() {
  const implementation = loadCurrentImplementation();
  
  const prompt = `あなたは「X（Twitter）アルゴリズムハッキングの専門家」として、2026年のXアルゴリズムを徹底的に分析し、インプレッションとエンゲージメントを最大化する「ハッキング手法」を提案してください。

## 🎯 目標
Trap Defence BTCというBTCトレーディングツールのプロジェクトで、X（Twitter）を攻略してTelegramにトラフィックを流すことが目標です。

**現在の実測データ**:
- インフルエンサーへの引用リポスト = 数万インプレッション（30,000）
- クリック率: 5%
- エンゲージメント率: 0.3%（トラフィック → 有料版エンゲージメント）
- 目標: 初速で10万～20万インプレッション規模（EN）、5万～10万規模（その他言語）

## 📊 現在の実装状況

### 1. 無料版レポートX投稿（6言語）
- **タイミング**: UTC 6:05 AM and 6:05 PM（無料版レポート配信後）
- **形式**: スレッド投稿（1メイン + 2-3リプライ）
- **言語**: EN, ES, PT-BR, AR, JA, KO
- **コンテンツ**: Trap Score分析、BTC価格、24時間変動、Telegram Deep Link
- **ハッシュタグ**: 言語別（#BTC #CryptoTrading #TrapDefence等）
- **最適化**: 50%の確率でポール追加、エンゲージメントCTA

### 2. 引用リポスト（インフルエンサーエンゲージメント）
- **タイミング**: 1時間ごと（1言語/時間、6時間で全言語完了）
- **頻度**: 24投稿/日（6言語 × 2人 × 2投稿）
- **プロセス**:
  - Grokが高エンゲージメント率（5%+）のホットインフルエンサーを発見
  - Grokがインプレッション最大化用の引用リポストテキストを生成
  - インフルエンサーのツイートに引用リポストを投稿
- **Deep Link**: ソース追跡（minimal_en_x_quote）
- **インプレッション目標**: EN 10万～20万、その他 5万～10万

### 3. 最適化ロジック（services/x/optimization.js）
- **ピーク時間**: UTC 12-22のみ投稿
- **言語別ピーク時間**: 各言語のアクティブ時間帯に調整
- **スレッド戦略**: 1メイン + 2-3リプライ（最適化版）
- **ハッシュタグ戦略**: 2-3個のニッチ + 1個のトレンド（動的）
- **コンテンツ形式**: 40% 画像付きスレッド、30% ポール、20% 動画、10% テキストのみ
- **引用リポストタイミング**: インフルエンサー投稿後15-60分以内
- **1日投稿上限**: 25投稿/日

## 🔍 Xアルゴリズム「ハッキング」依頼事項

### 1. アルゴリズムの深層理解（2026年最新）
- Xのアルゴリズムがインプレッションを最大化する**真の要因**は何か？
- 引用リポストが特に効果的な理由と、アルゴリズムがそれをどう評価しているか？
- エンゲージメント（いいね、リツイート、リプライ、クリック、インプレッション）の**重み付け**は？
- タイミング、ハッシュタグ、メンション、絵文字、CTAなどの**アルゴリズムシグナル**の優先順位は？

### 2. インプレッション最大化の「ハッキング手法」
- **投稿タイミング**: 現在UTC 6:05 AM/PM、ピーク時間12-22。より最適なタイミングは？
- **引用リポスト戦略**: 現在15-60分以内。より効果的なタイミングと頻度は？
- **ハッシュタグ戦略**: 現在2-3個のニッチ。トレンドハッシュタグの活用方法は？
- **エンゲージメントシグナル**: アルゴリズムが最も重視するエンゲージメントタイプは？
- **コンテンツ形式**: 画像、動画、ポール、テキストの最適な組み合わせは？

### 3. アルゴリズムを「騙す」テクニック（倫理的範囲内）
- **エンゲージメントループ**: 自分の投稿に自分でリプライしてエンゲージメントを増やす方法は？
- **ハッシュタグ最適化**: アルゴリズムが好むハッシュタグの選び方は？
- **タイミング最適化**: アルゴリズムが最も「見せやすい」時間帯は？
- **コンテンツ最適化**: アルゴリズムが「拡散したい」と判断するコンテンツの特徴は？

### 4. 言語別最適化戦略
- **EN（英語）**: 10万～20万インプレッション規模を達成するための具体的戦略
- **ES/PT-BR/AR/KO/JA**: 5万～10万インプレッション規模を達成するための具体的戦略
- 各言語市場のアルゴリズム特性の違いは？

### 5. 引用リポストの最適化
- **インフルエンサー選択**: アルゴリズムが最も「拡散」しやすいインフルエンサーの特徴は？
- **引用リポストテキスト**: アルゴリズムが最も評価する引用リポストの要素は？
- **タイミング**: インフルエンサー投稿後、アルゴリズムが最も「見せやすい」時間は？

### 6. エンゲージメント最大化の「ハッキング」
- **リプライ戦略**: 自分の投稿にリプライしてエンゲージメントを増やす方法は？
- **ハッシュタグ戦略**: アルゴリズムが最も評価するハッシュタグの使い方は？
- **CTA最適化**: アルゴリズムが最も評価するCTAの形式は？

### 7. リスク回避
- **スパム判定回避**: アルゴリズムにスパムと判定されないための具体的対策は？
- **レート制限**: 現在25投稿/日。より安全に投稿数を増やす方法は？
- **アカウント凍結回避**: アルゴリズムに「悪質」と判定されないためのベストプラクティスは？

## 📋 出力形式

以下の形式で、Xアルゴリズム「ハッキング」の具体的な手法を提案してください：

### 1. アルゴリズムの深層理解（500-800字）
- 2026年のXアルゴリズムの仕組み
- インプレッション最大化の真の要因
- エンゲージメントの重み付け

### 2. インプレッション最大化の「ハッキング手法」（800-1200字）
- **投稿タイミング**: 具体的な最適タイミング（UTC時間）
- **引用リポスト戦略**: 最適なタイミングと頻度
- **ハッシュタグ戦略**: アルゴリズムが最も評価するハッシュタグの選び方
- **エンゲージメントシグナル**: アルゴリズムが最も重視するエンゲージメントタイプ
- **コンテンツ形式**: 最適な組み合わせと比率

### 3. アルゴリズムを「騙す」テクニック（600-800字）
- **エンゲージメントループ**: 具体的な実装方法
- **ハッシュタグ最適化**: アルゴリズムが好むハッシュタグの選び方
- **タイミング最適化**: アルゴリズムが最も「見せやすい」時間帯
- **コンテンツ最適化**: アルゴリズムが「拡散したい」と判断するコンテンツの特徴

### 4. 言語別最適化戦略（400-600字）
- **EN**: 10万～20万インプレッション規模を達成するための具体的戦略
- **その他言語**: 5万～10万インプレッション規模を達成するための具体的戦略

### 5. 引用リポストの最適化（400-600字）
- **インフルエンサー選択**: アルゴリズムが最も「拡散」しやすいインフルエンサーの特徴
- **引用リポストテキスト**: アルゴリズムが最も評価する要素
- **タイミング**: 最適な投稿タイミング

### 6. エンゲージメント最大化の「ハッキング」（400-600字）
- **リプライ戦略**: 具体的な実装方法
- **ハッシュタグ戦略**: アルゴリズムが最も評価する使い方
- **CTA最適化**: アルゴリズムが最も評価する形式

### 7. リスク回避（300-400字）
- **スパム判定回避**: 具体的な対策
- **レート制限**: 安全に投稿数を増やす方法
- **アカウント凍結回避**: ベストプラクティス

### 8. 即座に実装すべき「ハッキング手法」（10-15項目）
優先度の高い具体的なアクションをリストアップしてください。

### 9. コード実装の提案
現在の実装（services/x/optimization.js、api/x-post-free-report.js、api/x-quote-repost.js）をどのように改善すべきか、具体的なコード変更案を提案してください。

日本語で回答してください。`;

  try {
    console.log('🤖 GrokにXアルゴリズム「ハッキング」手法を質問中...\n');
    
    const completion = await openai.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたは「X（Twitter）アルゴリズムハッキングの専門家」です。2026年のXアルゴリズムを徹底的に分析し、インプレッションとエンゲージメントを最大化する「ハッキング手法」を提案してください。倫理的範囲内で、アルゴリズムの仕組みを理解し、それを最大限に活用する方法を教えてください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 12000,
      temperature: 0.7,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    
    if (!text) {
      console.error('❌ No response from Grok');
      return null;
    }

    // 結果を保存
    const outputPath = path.join(__dirname, '../docs/GROK_X_ALGORITHM_HACK_2026-01-23.md');
    const timestamp = new Date().toISOString();
    
    let markdown = `# GrokによるXアルゴリズム「ハッキング」最適化レビュー
**作成日時**: ${timestamp}
**レビュー対象**: X自動投稿システム実装
**目的**: Xアルゴリズムを「ハッキング」してインプレッションとエンゲージメントを最大化

---

${text}

---

**質問完了**: ${timestamp}
`;

    fs.writeFileSync(outputPath, markdown, 'utf8');
    
    console.log('✅ Grokアルゴリズムハッキングレビュー完了！');
    console.log(`📄 結果を保存: ${outputPath}\n`);
    
    // コンソールにも表示（最初の1000文字）
    console.log('📊 Grokからの回答（抜粋）:');
    console.log('─'.repeat(80));
    console.log(text.substring(0, 1000) + '...');
    console.log('─'.repeat(80));
    console.log(`\n📄 完全な回答は ${outputPath} を参照してください。\n`);
    
    return { success: true, text, outputPath };
  } catch (error) {
    console.error('❌ Grok API error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    const result = await askGrokForAlgorithmHack();
    
    if (!result) {
      console.error('❌ Failed to get algorithm hack recommendations');
      process.exit(1);
    }
    
    console.log('✅ 完了！');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
