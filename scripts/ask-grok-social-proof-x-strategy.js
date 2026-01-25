// scripts/ask-grok-social-proof-x-strategy.js
// Grokと協議: ソーシャルプルーフ情報をX投稿・引用リポストに活用してインプレッション最大化

const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

/**
 * Grok CSO+CFO（grok-4-1-fast-reasoning）でソーシャルプルーフ情報のX活用戦略を分析
 */
async function askGrokSocialProofXStrategy() {
  const prompt = `あなたはTrap Defence BTCのCSO（Chief Strategy Officer）兼CFO（Chief Financial Officer）として、Telegramボタンクリックで取得したソーシャルプルーフ情報をX（Twitter）投稿やインフルエンサーへの引用リポストに活用してインプレッションを最大化する戦略を分析してください。

## 🎯 現状のソーシャルプルーフ実装

### 1. ボタンクリック機能（実装済み）
**services/telegram/reaction-counter.js**:
- 「🔥 I'm Safe (Trap Avoided)」ボタンがTelegramメッセージに表示
- ユーザーがクリックすると、日次・累計の「保護者数」がカウントされる
- データ構造: { totalSaved: number, dailySaved: { "2024-01-01": number }, dailyUsers: { "2024-01-01": [userId1, userId2] } }
- Vercel KVで永続化（Vercel環境対応）
- ユーザー重複防止（1日1回のみカウント）

### 2. ソーシャルプルーフテキスト生成（実装済み）
**services/telegram/reaction-counter.js の getSocialProofText()**:
- 現在の実装: 「👥 X Traders Saved Today」（X = 今日の保護者数 + ベース値150-300）
- 使用場所: api/cron.js の Regular Briefing配信時に使用（line 1464）
- ただし、X投稿では未使用

### 3. X投稿機能（実装済み）
**api/x-post-free-report.js**:
- 無料版レポートのX投稿（6言語対応）
- スレッド形式（1メイン + 3リプライ）
- ピーク時間帯に投稿（UTC 12,13,14,15,18）
- 1日35投稿まで（インプレッション最大化）

**api/x-quote-repost.js**:
- インフルエンサーへの引用リポスト（6言語対応）
- Grokがインフルエンサーを発掘
- ピーク時間帯に投稿（UTC 0,1,20,21）
- 1日45投稿まで（インプレッション最大化）

### 4. 現在の問題点
- **ソーシャルプルーフ情報がX投稿に活用されていない**
- ボタンクリックで取得した「保護者数」がX投稿に反映されていない
- 社会的証明（Social Proof）の効果をXで最大化できていない

## 💡 ソーシャルプルーフ情報の活用アイディア

### アイディア1: X投稿にソーシャルプルーフを追加
**無料版レポート投稿（api/x-post-free-report.js）**:
- メインツイートに「👥 350 Traders Saved Today」を追加
- 社会的証明として機能し、エンゲージメント向上が期待できる

**引用リポスト（api/x-quote-repost.js）**:
- 引用リポストテキストに「👥 350 Traders Saved Today」を追加
- インフルエンサーのフォロワーに「多くの人が使っている」ことを示す

### アイディア2: 動的なソーシャルプルーフ表示
- リアルタイムで更新される保護者数を表示
- 「今日X人が保護された」という数値を強調
- 累計数も表示（例: 「累計5,000人以上が保護」）

### アイディア3: 言語別ソーシャルプルーフ
- 各言語（EN/ES/PT-BR/AR/JA/KO）ごとに保護者数を表示
- 言語別の社会的証明を強化

### アイディア4: タイミング最適化
- 保護者数が増加したタイミングでX投稿を優先
- 社会的証明の効果が最大化されるタイミングを狙う

## 📊 分析依頼事項

以下の視点から、ソーシャルプルーフ情報をX投稿・引用リポストに活用してインプレッションを最大化する戦略を分析してください：

### 1. 戦略的視点（CSO）

#### 1.1 ソーシャルプルーフのX投稿への統合戦略
- **無料版レポート投稿**: メインツイートにソーシャルプルーフを追加する最適な方法
- **引用リポスト**: インフルエンサーへの引用リポストにソーシャルプルーフを追加する最適な方法
- **タイミング**: ソーシャルプルーフを表示する最適なタイミング（リアルタイム更新 vs 固定値）
- **フォーマット**: ソーシャルプルーフを表示する最適なフォーマット（テキスト、絵文字、数値の強調方法）

#### 1.2 エンゲージメント最大化戦略
- **社会的証明の効果**: ソーシャルプルーフがXアルゴリズムに与える影響
- **エンゲージメント向上**: ソーシャルプルーフを追加することで期待できるエンゲージメント向上
- **コンバージョン率向上**: ソーシャルプルーフがTelegramへの導線に与える影響

#### 1.3 言語別最適化戦略
- **言語別ソーシャルプルーフ**: 各言語ごとに保護者数を表示する戦略
- **文化的適応**: 各言語圏での社会的証明の受け取り方の違いを考慮

### 2. 財務的視点（CFO）

#### 2.1 インプレッション最大化効果
- **インプレッション向上予測**: ソーシャルプルーフを追加することで期待できるインプレッション向上
- **エンゲージメント率向上**: ソーシャルプルーフがエンゲージメント率に与える影響
- **コンバージョン率向上**: ソーシャルプルーフがTelegramへの導線に与える影響

#### 2.2 コスト分析
- **実装コスト**: ソーシャルプルーフをX投稿に統合するコスト（開発時間、テスト時間）
- **運用コスト**: ソーシャルプルーフのリアルタイム更新に必要なコスト（Vercel KV読み取り）
- **ROI分析**: ソーシャルプルーフ統合によるインプレッション向上とコストの比較

### 3. 技術的視点（CTO）

#### 3.1 実装設計
- **データ取得**: X投稿時にソーシャルプルーフ情報を取得する方法（Vercel KVから読み取り）
- **フォーマット生成**: ソーシャルプルーフテキストを生成する方法（既存のgetSocialProofText()を活用）
- **言語別対応**: 各言語ごとにソーシャルプルーフを表示する方法

#### 3.2 パフォーマンス最適化
- **キャッシュ戦略**: ソーシャルプルーフ情報のキャッシュ戦略（Vercel KV読み取りの最適化）
- **リアルタイム更新**: ソーシャルプルーフをリアルタイムで更新する方法（更新頻度の最適化）

#### 3.3 実装優先度
- **Phase 1（即座）**: 即座に実装すべきソーシャルプルーフ統合機能
- **Phase 2（短期）**: 短期（1-2週間）で実装すべき機能
- **Phase 3（中期）**: 中期（1-3ヶ月）で実装すべき機能

### 4. 具体的な実装シナリオ

#### シナリオ1: 無料版レポート投稿にソーシャルプルーフを追加
- メインツイートの末尾に「👥 350 Traders Saved Today」を追加
- 社会的証明として機能し、エンゲージメント向上が期待できる

#### シナリオ2: 引用リポストにソーシャルプルーフを追加
- 引用リポストテキストに「👥 350 Traders Saved Today」を追加
- インフルエンサーのフォロワーに「多くの人が使っている」ことを示す

#### シナリオ3: 動的なソーシャルプルーフ表示
- リアルタイムで更新される保護者数を表示
- 「今日X人が保護された」という数値を強調

#### シナリオ4: 言語別ソーシャルプルーフ
- 各言語（EN/ES/PT-BR/AR/JA/KO）ごとに保護者数を表示
- 言語別の社会的証明を強化

## 📋 出力形式

以下の形式で分析結果を出力してください：

### 1. エグゼクティブサマリー（300-400字）
ソーシャルプルーフ情報をX投稿・引用リポストに活用する重要性とインプレッション最大化の可能性を要約

### 2. 戦略的視点（CSO）の分析
- ソーシャルプルーフのX投稿への統合戦略
- エンゲージメント最大化戦略
- 言語別最適化戦略

### 3. 財務的視点（CFO）の分析
- インプレッション最大化効果（予測）
- エンゲージメント率向上（予測）
- コンバージョン率向上（予測）
- コスト分析（実装コスト、運用コスト）
- ROI分析（インプレッション向上 vs コスト）

### 4. 技術的視点（CTO）の分析
- 実装設計（データ取得、フォーマット生成、言語別対応）
- パフォーマンス最適化（キャッシュ戦略、リアルタイム更新）
- 実装優先度（Phase 1-3）

### 5. 具体的な実装シナリオ
- シナリオ1: 無料版レポート投稿にソーシャルプルーフを追加
- シナリオ2: 引用リポストにソーシャルプルーフを追加
- シナリオ3: 動的なソーシャルプルーフ表示
- シナリオ4: 言語別ソーシャルプルーフ
- その他の推奨シナリオ

### 6. 実装ロードマップ
- **Phase 1（即座）**: 優先度の高い統合機能（3-5項目）
- **Phase 2（1-2週間）**: 短期実装機能（5-7項目）
- **Phase 3（1-3ヶ月）**: 中期実装機能（5-7項目）

### 7. KPI設定
- ソーシャルプルーフ統合によるインプレッション向上指標
- エンゲージメント率向上指標
- コンバージョン率向上指標

### 8. 結論と次のアクション
- 総合的な結論
- 即座に実行すべき具体的なアクション（3-5項目）

日本語で回答してください。`;

  try {
    console.log('🔄 Grok CSO+CFO（grok-4-1-fast-reasoning）でソーシャルプルーフ情報のX活用戦略分析を実行中...');
    
    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are Dr. Grok, CSO (Chief Strategy Officer) and CFO (Chief Financial Officer) for Trap Defence BTC. You provide strategic analysis and financial insights for maximizing impressions and engagement on X (Twitter) through social proof integration.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const text = completion.choices[0]?.message?.content || '';
    const usage = completion.usage || {};

    console.log('✅ Grok分析完了');
    console.log(`📊 Token使用量: ${usage.prompt_tokens || 0} (prompt) + ${usage.completion_tokens || 0} (completion) = ${usage.total_tokens || 0} (total)`);
    console.log('\n' + '='.repeat(80));
    console.log('📋 Grok分析結果');
    console.log('='.repeat(80) + '\n');
    console.log(text);
    console.log('\n' + '='.repeat(80));

    // 結果をファイルに保存
    const fs = require('fs');
    const path = require('path');
    const outputDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outputFile = path.join(outputDir, `GROK_SOCIAL_PROOF_X_STRATEGY_${timestamp}.md`);
    
    const outputContent = `# ソーシャルプルーフ情報のX活用戦略分析（${timestamp}）

## Grok分析結果

${text}

---

## 分析実行情報

- **実行日時**: ${new Date().toISOString()}
- **モデル**: grok-4-1-fast-reasoning
- **Token使用量**: ${usage.prompt_tokens || 0} (prompt) + ${usage.completion_tokens || 0} (completion) = ${usage.total_tokens || 0} (total)
`;

    fs.writeFileSync(outputFile, outputContent, 'utf8');
    console.log(`\n💾 分析結果を保存しました: ${outputFile}`);

    return {
      text,
      usage,
      outputFile,
    };
  } catch (error) {
    console.error('❌ Grok分析エラー:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  askGrokSocialProofXStrategy()
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { askGrokSocialProofXStrategy };
