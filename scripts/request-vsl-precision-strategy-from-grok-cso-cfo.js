// scripts/request-vsl-precision-strategy-from-grok-cso-cfo.js
// Grok CSO+CFOに6言語版VSLワークフローの精度最大化戦略を依頼

require('dotenv').config({ path: '.env' });
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const XAI_API_KEY = process.env.XAI_API_KEY;
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
 * Grok CSO+CFO（grok-4-1-fast-reasoning）に6言語版VSLワークフローの精度最大化戦略を依頼
 */
async function requestVSLPrecisionStrategy() {
  const prompt = `あなたはTrap Defence BTCのCSO（Chief Strategy Officer）兼CFO（Chief Financial Officer）として、6言語版でのリスト抽出～DB登録～投稿配信（TG/X）のフローにおける精度を最大化する戦略を分析してください。

## 🎯 現状の実装状況（最新）

### 1. 多言語メッセージテンプレート（実装完了）
- **VSL1**: services/telegram/messages/vsl1.js - 6言語対応（EN, JA, ES, PT-BR, AR, KO）
- **VSL2**: services/telegram/messages/vsl2.js - 6言語対応
- **VSL2 Last Call**: services/telegram/messages/vsl2-last-call.js - 6言語対応
- **戦略**: 各言語で文化的に最適化されたコピーライティング（Gemini CMO作成）

### 2. YouTubeリンクの修正とガード（実装完了）
- **VSL1**: https://youtu.be/OqvqngJOiXc（Trap Defence BTC Trial Opt-in）
- **VSL2**: https://youtu.be/fXgVsKhqDjI（Trap Defence BTC Trial Coupon）
- **誤設定ガード**: 環境変数の誤設定を自動検出・修正

### 3. 多言語配信の実装（実装完了）
- **環境変数制御**: VSL1_MULTI_LANG=true で6言語一斉配信
- **言語別チャンネルID解決**: resolveMinimalChatId() で別名対応（JP/KR/PTBR）
- **配信前検証**: Bot Token/Chat IDの不足を検出してエラーログ出力

### 4. Deep Linkの修正（実装完了）
- **@記号の自動削除**: getTelegramDeepLink() で正規化
- **言語別パラメータ**: minimal_ja, minimal_en など

### 5. サムネイル画像の追加（実装完了）
- **生成スクリプト**: scripts/generate-vsl-thumbnails.js
- **使用モデル**: Gemini 3 Pro Image (Nano Banana Pro)
- **VSL1サムネイル**: 「SAME CAPITAL, DIFFERENT OUTCOME」- 対比ビジュアル
- **VSL2サムネイル**: 「STOP LOSING. START WINNING.」- サイバーパンクHUD
- **画像付き配信**: Telegram Photo Messageとして配信

### 6. 配信スケジュール
- **VSL1投稿**: 1日2回（9時、21時 UTC = JST 18時、6時）
- **VSL2配信**: 24時間後（Telegram DM）
- **VSL1リマインダー**: 12時間ごと（Telegram DM）
- **VSL2ラストコール**: 22時間後（Telegram DM）

### 7. データベース・ストレージ
- **ユーザー情報**: Vercel KV またはファイルストレージ
- **保存データ**: \`chatId\`, \`joinedAt\`, \`vsl2Sent\`, \`vsl2LastCallSent\`, \`userName\`, \`lang\`
- **言語情報**: ユーザー登録時に言語を保存（\`/start minimal_ja\` など）

## 🚨 発見された問題と修正

### 問題1: JST 18時に全言語で配信されない
**原因**:
- VSL1_LANGS が設定されていると VSL1_MULTI_LANG より優先される
- 言語別チャンネルID（TELEGRAM_CHAT_ID_MINIMAL_{LANG}）が未設定
- Bot Token（TELEGRAM_BOT_TOKEN）が未設定

**修正内容**:
- 環境変数チェック強化（getTelegramConfigStatus()）
- 別名対応（JP/KR/PTBR）の追加
- Bot Tokenフォールバック（TELEGRAM_BOT_TOKEN_MINIMAL）
- 診断スクリプト強化（scripts/diagnose-vsl1-issues.js）

### 問題2: 誤ったYouTubeリンクの配信
**原因**: 環境変数の誤設定
**修正内容**: 自動検出・修正ガードの実装

### 問題3: Deep Linkの不正な形式
**原因**: @記号が含まれていた
**修正内容**: 自動削除ロジックの実装

## 📊 6言語版フローの全体像

### フロー1: リスト抽出（VSL1投稿）
1. **Cron実行**: UTC 9時、21時（vercel.json）
2. **言語判定**: getTargetLanguages() で対象言語を決定
   - VSL1_LANGS が設定されている場合 → そのリストを使用
   - VSL1_MULTI_LANG=true の場合 → 全6言語
   - それ以外 → LANG 環境変数のみ
3. **メッセージ生成**: 各言語で generateVSL1Message() を呼び出し
4. **配信**: Telegram MINIMALチャンネル + X投稿
   - サムネイル画像付き（sendPhotoToAsset()）
   - 言語別チャンネルIDを解決（resolveMinimalChatId()）

### フロー2: DB登録（ユーザー登録）
1. **ユーザーアクション**: Telegram Botで /start minimal_ja など
2. **言語抽出**: parseStartParam() で言語を抽出
3. **DB登録**: addFreeUser() でユーザー情報を保存
   - chatId, joinedAt, lang, userName を保存
4. **ストレージ**: Vercel KV またはファイルストレージ

### フロー3: 投稿配信（VSL2/リマインダー）
1. **タイミング判定**: getFreeUsersForVSL2() などで対象ユーザーを抽出
2. **言語判定**: ユーザーの保存された lang を使用
3. **メッセージ生成**: 言語別テンプレートで生成
4. **配信**: Telegram DM（サムネイル画像付き）

## 🎯 分析依頼事項

以下の視点から、**6言語版でのリスト抽出～DB登録～投稿配信（TG/X）のフローにおける精度を最大化する戦略**を分析してください：

### 1. 戦略的視点（CSO）

#### 1.1 リスト抽出の精度最大化
- **VSL1投稿の最適化**: 6言語同時配信の成功率を100%にする方法
- **環境変数管理**: 誤設定を防ぐ仕組み
- **エラーハンドリング**: 一部言語が失敗しても他は成功させる方法
- **フォールバック戦略**: 言語別チャンネルIDが無い場合の対応

#### 1.2 DB登録の精度最大化
- **言語情報の正確な保存**: Deep Linkから言語を正確に抽出する方法
- **データ整合性**: ユーザー情報の重複登録を防ぐ方法
- **ストレージ最適化**: Vercel KV vs ファイルストレージの使い分け
- **データ移行**: 既存ユーザーの言語情報を補完する方法

#### 1.3 投稿配信の精度最大化
- **タイミング最適化**: 24時間/12時間/22時間の判定精度
- **言語マッチング**: ユーザーの言語とメッセージ言語の一致保証
- **配信失敗のリトライ**: 一時的なエラー時の再送信ロジック
- **配信状態の追跡**: 送信済みフラグの正確な管理

#### 1.4 マルチチャネル戦略
- **Telegram + X同時展開**: 両チャネルでの配信精度
- **言語別X投稿**: 6言語でのX投稿戦略
- **エンゲージメント分析**: 各言語でのエンゲージメント差の分析

### 2. 財務的視点（CFO）

#### 2.1 コスト最適化
- **API呼び出しコスト**: Grok API、X API、Telegram Bot APIのコスト最適化
- **ストレージコスト**: Vercel KV vs ファイルストレージのコスト比較
- **エラーコスト**: 配信失敗による機会損失の最小化
- **スケール時のコスト**: 成長フェーズごとのコスト予測

#### 2.2 ROI分析
- **精度向上によるコンバージョン率向上**: 精度100% vs 80%のコンバージョン率差
- **リスト収集速度**: 精度向上によるリスト収集速度の向上
- **収益予測**: 精度最大化による収益最大化シナリオ

#### 2.3 リスク管理
- **データ損失リスク**: ユーザー情報の損失を防ぐ方法
- **配信失敗リスク**: 一部言語の配信失敗が全体に与える影響
- **コスト急増リスク**: スケール時のコスト急増を防ぐ方法

### 3. 技術的視点（CTO）

#### 3.1 精度向上の技術的施策
- **環境変数検証**: デプロイ前の環境変数チェック
- **エラーハンドリング**: 詳細なエラーログとリトライロジック
- **データ整合性**: トランザクション管理とロールバック
- **モニタリング**: 配信成功率のリアルタイム監視

#### 3.2 スケーラビリティ
- **データベース設計**: 大量ユーザーに対応できる設計
- **APIレート制限**: レート制限を考慮した配信ロジック
- **並列処理**: 6言語同時配信の並列処理最適化

#### 3.3 実装優先度
- **Phase 1（即座）**: 精度向上のための即座に実装すべき施策
- **Phase 2（短期）**: 1-3ヶ月で実装すべき施策
- **Phase 3（中期）**: 3-6ヶ月で実装すべき施策

## 📋 出力形式

以下の形式で分析結果を出力してください：

### 1. エグゼクティブサマリー（300-400字）
6言語版VSLワークフローの精度最大化の重要性と期待されるインパクトを要約

### 2. 戦略的視点（CSO）の分析
- リスト抽出の精度最大化戦略
- DB登録の精度最大化戦略
- 投稿配信の精度最大化戦略
- マルチチャネル戦略

### 3. 財務的視点（CFO）の分析
- コスト最適化（詳細なコスト計算を含む）
- ROI分析（精度向上によるコンバージョン率向上）
- リスク管理

### 4. 技術的視点（CTO）の分析
- 精度向上の技術的施策
- スケーラビリティ
- 実装優先度（Phase 1-3）

### 5. 具体的な推奨事項
- **即座に実行すべき施策**: 優先度の高い施策（5-7項目）
- **短期戦略**: 1-3ヶ月で実装すべき施策（5-7項目）
- **中期戦略**: 3-6ヶ月で実装すべき施策（3-5項目）

### 6. KPI設定
- 精度指標（配信成功率、言語別成功率など）
- コンバージョン率指標
- コスト効率指標

### 7. 結論と次のアクション
- 総合的な結論
- 即座に実行すべき具体的なアクション（5-7項目）

日本語で回答してください。`;

  try {
    console.log('🔄 Grok CSO+CFO（grok-4-1-fast-reasoning）に6言語版VSLワークフローの精度最大化戦略を依頼中...\n');

    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのCSO（Chief Strategy Officer）兼CFO（Chief Financial Officer）です。6言語版でのリスト抽出～DB登録～投稿配信（TG/X）のフローにおける精度を最大化する戦略を、戦略的・財務的・技術的視点から分析してください。成果を最大化するための具体的な施策を提案してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 6000,
    });

    const analysis = completion.choices[0]?.message?.content || '';
    const usage = completion.usage || {};

    console.log('='.repeat(80));
    console.log('📊 6言語版VSLワークフローの精度最大化戦略（Grok CSO+CFO分析）');
    console.log('='.repeat(80));
    console.log('\n');
    console.log(analysis);
    console.log('\n');
    console.log('='.repeat(80));
    console.log('📈 API使用量:');
    console.log(`  - 入力トークン: ${usage.prompt_tokens || 0}`);
    console.log(`  - 出力トークン: ${usage.completion_tokens || 0}`);
    console.log(`  - 合計トークン: ${usage.total_tokens || 0}`);
    console.log('='.repeat(80));

    // 分析結果をファイルに保存
    const outputDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) + 'Z';
    const outputPath = path.join(outputDir, `VSL_PRECISION_MAXIMIZATION_STRATEGY_${timestamp}.md`);
    
    const output = `# 6言語版VSLワークフローの精度最大化戦略

**作成日**: ${new Date().toISOString()}  
**分析者**: Grok CSO+CFO (grok-4-1-fast-reasoning)  
**依頼者**: COO (Cursor/Composer 1)

---

${analysis}

---

**API使用量**:
- 入力トークン: ${usage.prompt_tokens || 0}
- 出力トークン: ${usage.completion_tokens || 0}
- 合計トークン: ${usage.total_tokens || 0}
`;

    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`\n✅ 分析結果を保存しました: ${outputPath}`);

    return analysis;
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
  requestVSLPrecisionStrategy()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { requestVSLPrecisionStrategy };
