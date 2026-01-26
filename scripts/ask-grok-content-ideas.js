// scripts/ask-grok-content-ideas.js
// Grokに、CryptoQuant × Geminiで生成できるSoSoValue風ニュース記事の需要と、
// Trap Defence BTCの無料版（Minimal Version）・有料版（Regular Briefing）への活用アイディアを質問するスクリプト

const OpenAI = require('openai');

// 環境変数からAPIキーを取得
const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

// Grokクライアントを初期化
const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

/**
 * Grokにコンテンツ需要と活用アイディアを質問
 */
async function askGrokAboutContentIdeas() {
  try {
    const prompt = `あなたはTrap Defence BTCのコンテンツ戦略担当者です。以下の質問に答えてください。

## 背景

CryptoQuantのオンチェーンデータとGeminiの分析力を組み合わせることで、SoSoValueやOdailyのような暗号通貨ニュース記事を自前で生成できることが確認できました。

**例: SoSoValue風のニュース記事**
「データ：ビットコインの取引所内流量が約1.4万枚に低下し、2022年以来の最低水準を記録

CryptoOnchainのデータによると、ビットコイン取引所内の総トラフィックは2022年以来の最低水準まで低下し、約1.4万$BTCとなっています。

この指標は、取引所内部の$BTCの流動性、運営活動、および短期的な分配準備状況を追跡しています。

その継続的な低下は、取引所内部の$BTCの流動が大幅に減少していることを示しており、市場のマーケットメイク活動の弱まりと流動性の逼迫を示唆しています。

内部トラフィックの低下は通常、保有行動の増加、裁定取引活動の減少、オーダーブックの薄さ、およびショックに対する感受性の増加と一致します。

**現在、ビットコイン市場は「流動性の一時停止」段階にあるように見えます。歴史的に、この段階は市場が再び活発になった後に劇的な方向転換が起こる前兆です。**」

## Trap Defence BTCの現状

### 無料版（Minimal Version / VSL1）
- **配信チャンネル**: Telegram MINIMALチャンネル + X投稿
- **配信頻度**: 1日2回（9時、21時 UTC）
- **内容**: 簡潔な市場分析、トラップ検出、基本的なシグナル
- **目的**: リード獲得、有料版への導線

### 有料版（Regular Briefing / VSL2）
- **配信チャンネル**: Telegram DM
- **配信タイミング**: VSL1投稿の24時間後
- **内容**: 詳細な市場分析、深掘りデータ、心理的コーチングアドバイス
- **目的**: コンバージョン、継続的な価値提供

### 現在のワークフロー
1. **CryptoQuantデータ取得**: オンチェーンデータ（Exchange Netflow, MPI等）
2. **Grok分析**: Xセンチメント分析、市場分析、心理的パターン検出
3. **GPT分析**: CryptoQuantデータの詳細分析
4. **Gemini生成**: 画像・動画生成
5. **VSL1配信**: Minimal VersionをTelegram + Xに投稿
6. **VSL2配信**: Regular BriefingをTelegram DMで配信

## 質問

### 1. コンテンツ需要の分析

**CryptoQuant × Geminiで生成できるSoSoValue風のニュース記事コンテンツに需要があると思いますか？**

以下の視点から分析してください：
- **市場需要**: BTCトレーダーはこのような「過去に照らし合わせると、、」のような洞察のあるニュース記事を求めているか？
- **競合分析**: SoSoValue、Odaily、CryptoQuantのニュースレターなどと比較して、差別化できるポイントは？
- **エンゲージメント予測**: このようなコンテンツは、XやTelegramでどの程度のエンゲージメントを獲得できると予測するか？
- **視聴率・クリック率**: 「過去に照らし合わせると、、」のような表現は、実際に高視聴率を獲得できるか？

### 2. Minimal Version（無料版）への活用アイディア

**SoSoValue風のニュース記事を、Trap Defence BTCの無料版（Minimal Version / VSL1）にどう活用できますか？**

以下の視点から提案してください：
- **コンテンツ形式**: 記事形式？要約形式？画像付き？動画付き？
- **配信タイミング**: 現在の1日2回（9時、21時 UTC）に追加？置き換え？
- **差別化ポイント**: Trap Defence BTCらしさをどう出すか？（例：トラップ検出との連動、心理的コーチング要素）
- **リード獲得**: 無料版でこのコンテンツを提供することで、有料版への導線をどう強化するか？

### 3. Regular Briefing（有料版）への活用アイディア

**SoSoValue風のニュース記事を、Trap Defence BTCの有料版（Regular Briefing / VSL2）にどう活用できますか？**

以下の視点から提案してください：
- **コンテンツの深さ**: 無料版との差別化をどう出すか？（例：より詳細な分析、過去データとの詳細比較、複数指標の統合分析）
- **付加価値**: 有料版ならではの価値をどう提供するか？（例：アクショナブルなシグナル、具体的なエントリー/エグジットポイント）
- **心理的コーチング**: Trap Defence BTCの強みである「心理的コーチング」をどう組み込むか？
- **継続的な価値**: 毎日配信することで、ユーザーに継続的な価値をどう提供するか？

### 4. このパターン以外の活用アイディア

**SoSoValue風のニュース記事以外にも、CryptoQuant × Gemini（またはCryptoQuant × Grok）の組み合わせで、Trap Defence BTCの無料版・有料版に活用できるアイディアはありますか？**

以下の視点から提案してください：
- **コンテンツタイプ**: 記事以外の形式（例：インフォグラフィック、動画解説、音声解説、インタラクティブダッシュボード）
- **分析の深さ**: 単発のニュース記事ではなく、継続的な分析シリーズ（例：「週間オンチェーン分析レポート」「月間市場サイクル分析」）
- **パーソナライゼーション**: ユーザーごとにカスタマイズされた分析（例：リスク許容度別、トレードスタイル別）
- **コミュニティ活用**: TelegramやXのコミュニティをどう活用するか？（例：ユーザーからの質問に基づく分析、コミュニティ投票で分析テーマを決定）
- **教育コンテンツ**: オンチェーン分析の読み方を教えるコンテンツ（例：「MPIとは何か？過去のデータから学ぶ」）

### 5. 実装優先度とROI予測

**提案したアイディアについて、実装優先度とROI予測を分析してください。**

以下の視点から分析してください：
- **実装難易度**: 各アイディアの実装難易度（低/中/高）
- **開発コスト**: 必要な開発リソースと時間
- **期待される効果**: リード獲得率、コンバージョン率、エンゲージメント率の向上予測
- **ROI**: 投資対効果の予測
- **優先度ランキング**: 即座に実装すべきものから順にランキング

## 回答形式

以下の形式で回答してください：

### 1. コンテンツ需要の分析
- 市場需要の評価
- 競合分析
- エンゲージメント予測
- 視聴率・クリック率の予測

### 2. Minimal Version（無料版）への活用アイディア
- 具体的なコンテンツ形式の提案（3-5案）
- 配信タイミングの提案
- 差別化ポイント
- リード獲得戦略

### 3. Regular Briefing（有料版）への活用アイディア
- コンテンツの深さの提案
- 付加価値の提案
- 心理的コーチングの組み込み方
- 継続的な価値提供の方法

### 4. このパターン以外の活用アイディア
- コンテンツタイプの提案（5-10案）
- 分析の深さの提案
- パーソナライゼーションの提案
- コミュニティ活用の提案
- 教育コンテンツの提案

### 5. 実装優先度とROI予測
- 各アイディアの実装難易度と開発コスト
- 期待される効果の予測
- ROI予測
- 優先度ランキング（Top 10）

日本語で回答してください。`;

    console.log('🤖 Grokに質問を送信中...');
    
    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are a content strategy expert for Trap Defence BTC, specializing in cryptocurrency market analysis and trader psychology. You provide strategic insights on content creation, engagement optimization, and conversion strategies.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const text = completion.choices[0]?.message?.content || '回答が取得できませんでした。';
    const usage = completion.usage || {};

    return {
      text,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error('❌ Grok API呼び出しエラー:', error.message);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Grok × Trap Defence BTC コンテンツ戦略分析スクリプト\n');
  
  try {
    // Grokに質問
    const result = await askGrokAboutContentIdeas();
    
    // 結果を表示
    console.log('\n' + '='.repeat(80));
    console.log('📝 Grokの回答');
    console.log('='.repeat(80) + '\n');
    console.log(result.text);
    console.log('\n' + '='.repeat(80));
    console.log('📊 トークン使用量');
    console.log('='.repeat(80));
    console.log(`プロンプトトークン: ${result.usage.promptTokens}`);
    console.log(`レスポンストークン: ${result.usage.completionTokens}`);
    console.log(`合計トークン: ${result.usage.totalTokens}`);
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = {
  askGrokAboutContentIdeas,
};
