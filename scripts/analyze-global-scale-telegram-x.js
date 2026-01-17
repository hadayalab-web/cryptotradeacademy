// scripts/analyze-global-scale-telegram-x.js
// Grok CSO+CFOによるTelegramとXの全世界展開規模感分析

// .envファイルを読み込む
require('dotenv').config({ path: '.env' });

const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  console.error('環境変数ファイルの場所: .env');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

/**
 * Grok CSO+CFO（grok-4-1-fast-reasoning）で全世界展開規模感を分析
 */
async function analyzeGlobalScale() {
  const prompt = `あなたはTrap Defence BTCのCSO（Chief Strategy Officer）兼CFO（Chief Financial Officer）として、TelegramとX（Twitter）での全世界リスト収集・投稿展開の規模感を分析してください。

## 現状の実装状況

### 投稿頻度
- VSL1投稿: 1日2回（9時、21時 UTC）
- Telegram MINIMALチャンネル: 6言語対応（EN, ES, PT-BR, AR, KO, JA）
- X（Twitter）投稿: Grokセンチメント連動、動的バリアント選択

### 自動化ワークフロー
- VSL2配信: 24時間後のアップセル/クーポン配信（Telegram DM）
- VSL1リマインダー: 12時間ごと（Telegram DM）
- VSL2ラストコール: 1時間ごと（Telegram DM）
- プロモコード監視: 15分ごと

### 多言語展開
- 対応言語: EN, ES, PT-BR, AR, KO, JA（6言語）
- 各言語で独立したTelegram MINIMALチャンネル
- X投稿も言語別に展開可能

## 分析依頼事項

以下の視点から、全世界展開の規模感を分析してください：

### 1. リーチ規模の予測（戦略的視点）
- **Telegram MINIMALチャンネル**: 各言語チャンネルの購読者数予測（初期・成長・成熟フェーズ）
- **X（Twitter）**: フォロワー数・リーチ予測（初期・成長・成熟フェーズ）
- **リスト収集速度**: 月間新規ユーザー獲得数の予測
- **コンバージョン率**: 無料版→有料版のコンバージョン率予測

### 2. 投稿規模の計算（財務的視点）
- **月間投稿数**: Telegram + Xの合計投稿数
- **コスト計算**: Grok API、X API、Telegram Bot APIのコスト
- **スケール時のコスト**: 成長フェーズごとのコスト予測

### 3. 収益規模の予測（財務的視点）
- **新規ユーザー獲得**: 月間新規ユーザー数の予測
- **コンバージョン収益**: 無料版→有料版コンバージョンによる収益予測
- **ROI分析**: 投資対効果の分析

### 4. スケーラビリティ分析（戦略的視点）
- **成長フェーズ**: 初期（1-3ヶ月）、成長（3-6ヶ月）、成熟（6ヶ月以上）の規模感
- **ボトルネック**: スケール時の技術的・財務的ボトルネック
- **最適化ポイント**: コスト効率を最大化するポイント

## 出力形式

以下の形式で分析結果を出力してください：

### 1. エグゼクティブサマリー（300-400字）
全世界展開の規模感と期待されるインパクトを要約

### 2. リーチ規模の予測
- Telegram MINIMALチャンネル購読者数（言語別、フェーズ別）
- Xフォロワー数・リーチ予測
- 月間新規ユーザー獲得数予測

### 3. 投稿規模の計算
- 月間投稿数（Telegram + X）
- コスト計算（詳細）
- スケール時のコスト予測

### 4. 収益規模の予測
- 月間新規ユーザー獲得数
- コンバージョン収益予測
- ROI分析

### 5. スケーラビリティ分析
- 成長フェーズ別の規模感
- ボトルネック分析
- 最適化ポイント

### 6. 結論と次のアクション
- 総合的な結論
- 即座に実行すべき具体的なアクション（3-5項目）

日本語で回答してください。`;

  try {
    console.log('🔄 Grok CSO+CFO（grok-4-1-fast-reasoning）で全世界展開規模感分析を実行中...\n');

    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのCSO（Chief Strategy Officer）兼CFO（Chief Financial Officer）です。戦略的・財務的視点から、データドリブンな分析を提供してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const response = completion.choices[0]?.message?.content || 'No response';
    console.log('✅ 分析完了\n');
    console.log('='.repeat(80));
    console.log(response);
    console.log('='.repeat(80));

    return response;
  } catch (error) {
    console.error('❌ Grok分析エラー:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  analyzeGlobalScale()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { analyzeGlobalScale };
