// scripts/consult-gemini-cmo-workflow-review.ts
// Gemini CMO（gemini-3-flash-preview）にVSLワークフローの完成度レビューを依頼

import { callGemini3Pro } from '../api/unified-api.js';
import { join, dirname } from 'path';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function consultGeminiCMOForWorkflowReview() {
  console.log('📢 Gemini CMO（gemini-3-flash-preview）にワークフロー完成度レビューを依頼中...\n');

  const prompt = `あなたはGemini: CMO（gemini-3-flash-preview）です。Trap Defence BTCのVSL（Video Sales Letter）ワークフローの完成度をレビューし、不足や改善提案をしてください。

## 📋 レビュー対象: VSLワークフロー

### 現在のワークフロー実装状況

#### 1. VSL1投稿機能（api/vsl1-post.js）
- **実装状況**: ✅ 完了
- **機能**: Telegram MINIMALチャンネル（EN）にVSL1を自動投稿（1日2回: 9時・21時 UTC）
- **メッセージ内容**: 
  - 「Two traders started with the same capital...」ストーリー型
  - 損失回避（Loss Aversion）の心理的トリガーを活用
  - CTA: 「⚠️ Before you lose your capital, watch this 4-minute video (VSL1).」
  - 「🚀 Get the trap avoidance logic that pros use (FREE): → @TrapDefenceBot /start minimal」
- **YouTubeリンク**: https://youtu.be/zdLFYwFJQd4
- **Cron設定**: 0 9,21 * * * (UTC)

#### 2. Botコマンド処理（services/telegram/bot-commands.js）
- **実装状況**: ✅ 完了
- **機能**: /start minimalコマンドで無料版ユーザーを登録
- **登録内容**: chatId, joinedAt（参加日時）, userName, vsl2Sent（VSL2送信済みフラグ）
- **ウェルカムメッセージ**: 
  - 「✅ You've been registered! Get the trap avoidance logic that pros use (FREE).」
  - 「⚠️ Don't lose your capital. Get free daily trap alerts now.」
  - 「Daily Trap Score (0-100) - Identify Bitcoin traps before they hit」

#### 3. 無料ユーザー管理（services/free-users/manager.js）
- **実装状況**: ✅ 完了
- **機能**: 
  - 無料版ユーザーの追加・削除・確認
  - 24時間経過したユーザーの取得（VSL2配信対象）
  - 12-24時間経過したユーザーの取得（VSL1リマインド対象）
  - VSL2送信済みフラグの管理
- **データ保存**: data/free-users.json（JSON形式）

#### 4. VSL1リマインド機能（api/vsl1-reminder.js）
- **実装状況**: ✅ 完了
- **機能**: 12-24時間経過した無料版ユーザーにVSL1リマインドメッセージを送信
- **メッセージ内容**: 
  - 「💡 Quick Reminder, {userName}!」
  - 「📊 Yesterday's Performance: Trap Defence identified a potential trap...」
  - VSL1 YouTubeリンク
  - CTA: 「🚀 Get the trap avoidance logic that pros use (FREE): → @TrapDefenceBot /start minimal」
- **Cron設定**: 0 */12 * * * (12時間ごと)

#### 5. VSL2配信機能（api/vsl2-free-users.js）
- **実装状況**: ✅ 完了
- **機能**: 24時間経過した無料版ユーザーにVSL2を自動配信
- **メッセージ内容**: 
  - 「⏰ **24-HOUR LIMITED**: This offer expires in 24 hours!」
  - 共感→証明→提案の構成:
    - 共感: 「💭 Still manually watching charts every day?」
    - 証明: 「📊 **Proof**: Over the past 30 days, Trap Defence BTC has: ...」
    - 提案: 「🚀 Get the pro's weapon at half price:」
  - YouTubeリンク: https://youtu.be/vjz896hTPPw
  - クーポンコード: DEFEND50（50%オフ）
  - Whopリンク: {WHOP_PRODUCT_URL_EN}?promo=DEFEND50
- **Cron設定**: 0 * * * * (1時間ごと)

#### 6. Cron設定（vercel.json）
- **実装状況**: ✅ 完了
- **設定内容**:
  - VSL1投稿: 0 9,21 * * * (1日2回)
  - VSL2配信: 0 * * * * (1時間ごと)
  - VSL1リマインド: 0 */12 * * * (12時間ごと)

#### 7. テストスクリプト
- **実装状況**: ✅ 完了
- **スクリプト**:
  - test-vsl1-manual.js
  - test-vsl2-manual.js
  - test-vsl1-reminder.js
  - test-bot-command.js
  - test-add-free-user.js
  - test-vsl-workflow-complete.js

## 🎯 レビュー依頼内容

以下の観点から、**VSLワークフローの完成度をレビュー**し、**不足や改善提案**をしてください：

### 1. ワークフロー全体の完成度
- ✅ 実装されている機能は十分か？
- ❌ 不足している機能はあるか？
- 🔄 改善すべき点はあるか？

### 2. マーケティング戦略の最適化
- 📊 メッセージ内容は最適か？
- ⏰ タイミング（12時間、24時間）は最適か？
- 🎯 CTAは効果的か？
- 💡 心理的トリガーは適切に活用されているか？

### 3. ユーザーエクスペリエンス
- 👤 ユーザー登録フローはスムーズか？
- 📱 メッセージの可読性・理解しやすさは？
- 🔔 リマインドの頻度は適切か？
- ⚠️ スパムリスクはあるか？

### 4. 技術的な実装
- 🔧 エラーハンドリングは適切か？
- 📈 スケーラビリティは考慮されているか？
- 🔒 セキュリティは適切か？
- 📊 データ管理は適切か？

### 5. コンバージョン最適化
- 💰 Whopへの導線は最適か？
- 🎁 クーポンコード戦略は効果的か？
- 📊 コンバージョン率を向上させる方法は？

### 6. 不足している機能
- ❌ 実装すべき機能はあるか？
- 🔄 追加すべき自動化はあるか？
- 📊 追加すべき分析・追跡機能はあるか？

## 💡 回答形式

以下の形式で回答してください：

### 1. ワークフロー完成度評価
- **総合評価**: ⭐⭐⭐⭐⭐ (5段階評価)
- **完成度**: XX% (具体的な数値)
- **実装済み機能**: リスト
- **不足機能**: リスト（あれば）

### 2. マーケティング戦略レビュー
- **メッセージ内容**: 評価と改善提案
- **タイミング**: 評価と改善提案
- **CTA**: 評価と改善提案
- **心理的トリガー**: 評価と改善提案

### 3. ユーザーエクスペリエンスレビュー
- **登録フロー**: 評価と改善提案
- **メッセージ**: 評価と改善提案
- **リマインド**: 評価と改善提案
- **スパムリスク**: 評価と対策提案

### 4. 技術的実装レビュー
- **エラーハンドリング**: 評価と改善提案
- **スケーラビリティ**: 評価と改善提案
- **セキュリティ**: 評価と改善提案
- **データ管理**: 評価と改善提案

### 5. コンバージョン最適化レビュー
- **Whop導線**: 評価と改善提案
- **クーポンコード**: 評価と改善提案
- **コンバージョン率向上**: 具体的な提案

### 6. 追加実装推奨事項
- **優先度: 高** (即座に実装すべき)
- **優先度: 中** (今週中に実装すべき)
- **優先度: 低** (将来的に実装すべき)

### 7. 期待される成果
- **オプトイン率**: 期待値と改善後の期待値
- **コンバージョン率**: 期待値と改善後の期待値
- **ROI**: 期待値と改善後の期待値

マーケティングの専門家として、データドリブンで実践的なレビューと改善提案をしてください。`;

  try {
    console.log('📡 Gemini CMO API呼び出し中...\n');
    const result = await callGemini3Pro(prompt, {
      temperature: 0.7,
      maxOutputTokens: 8000,
      thinkingLevel: 'high',
    });

    console.log('✅ Gemini CMOからのレビューを受領\n');
    console.log('='.repeat(80));
    console.log('📊 Gemini CMOのレビュー:');
    console.log('='.repeat(80));
    console.log(result.text);
    console.log('='.repeat(80));

    // 結果をファイルに保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputPath = join(__dirname, '..', 'docs', `GEMINI_CMO_WORKFLOW_REVIEW_${timestamp}.md`);
    
    const output = `# Gemini CMOレビュー: VSLワークフロー完成度評価

**作成日**: ${new Date().toISOString()}  
**レビュー依頼者**: COO（Cursor/Composer 1）  
**レビュー者**: Gemini CMO（gemini-3-flash-preview）

---

## 📋 レビュー対象

**VSLワークフローの完成度レビュー**

### 実装済み機能

1. ✅ VSL1投稿機能（api/vsl1-post.js）
2. ✅ Botコマンド処理（services/telegram/bot-commands.js）
3. ✅ 無料ユーザー管理（services/free-users/manager.js）
4. ✅ VSL1リマインド機能（api/vsl1-reminder.js）
5. ✅ VSL2配信機能（api/vsl2-free-users.js）
6. ✅ Cron設定（vercel.json）
7. ✅ テストスクリプト

---

## 🎯 Gemini CMOのレビュー

${result.text || result}

---

**作成者**: Gemini CMO（gemini-3-flash-preview）  
**状態**: ✅ **レビュー完了**
`;

    writeFileSync(outputPath, output, 'utf8');
    console.log(`\n✅ 結果を保存しました: ${outputPath}`);

    return result;
  } catch (error: any) {
    console.error('❌ Gemini CMOへのレビュー依頼エラー:', error.message);
    throw error;
  }
}

consultGeminiCMOForWorkflowReview()
  .then(() => {
    console.log('\n✅ Gemini CMOレビュー依頼完了');
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
