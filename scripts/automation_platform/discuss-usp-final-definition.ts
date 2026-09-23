#!/usr/bin/env tsx
/**
 * COOとCMOによるUSP最終定義議論
 * 
 * COO（技術的視点）とGemini CMO（マーケティング視点）で議論し、
 * USPを最終定義する
 */

import { callGemini3Pro } from '../api/unified-api.js';
import { callGPT52 } from '../api/unified-api.js';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'usp-discussions');
mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * SSOTドキュメントを読み込む
 */
function loadSSOTDocument(): string {
  const ssotPath = join(__dirname, '..', 'cryptosignal-ai', 'docs', 'SSOT_TRAP_DEFENSE_BTC.md');
  try {
    return readFileSync(ssotPath, 'utf-8');
  } catch (error: any) {
    console.error(`❌ SSOTドキュメントの読み込みエラー: ${error.message}`);
    throw error;
  }
}

/**
 * COO（GPT CFO）によるUSP最終定義の提案
 */
async function getCOOProposal(ssotContent: string): Promise<string> {
  const prompt = `あなたは最高技術責任者（CTO）兼最高財務責任者（CFO）であり、技術的実装の正確性とコスト最適化を評価する専門家です。

以下のSSOT（Single Source Of Truth）ドキュメントに記載されている現在のUSP定義を確認し、**CEOの指示に基づいて最適化**してください。

## SSOTドキュメント（現在のUSP定義）

${ssotContent.substring(0, 5000)}

---

## CEOの指示

1. **新しいUSP変更案は破棄**: Grokを外し、CryptoQuant × GPT CFOという変更案は一切破棄
2. **複雑な実装の最適化**: NanoBanana、Veo、HeyGenなどの詰め込みすぎた実装を最適化し、無理な実装は不要
3. **メール配信ニュースレター**: TG配信からメール配信のニュースレターへ生まれ変わらせる
4. **無料ミニマム版**: Trap Score表示のみの機能範囲

---

## COOとしての提案

以下の観点から、USPを最終定義してください：

### 1. 技術的実装可能性
- Veo動画、NanoBanana画像、HeyGenなどの複雑な実装を削除または無効化した場合の影響
- メール配信ニュースレター形式への最適化
- コスト最適化（API呼び出しの削減）

### 2. USP2（Gemini Show Producer）の簡素化
- 動画・画像生成を削除またはオプション化
- テキストベースの簡易版への変更
- メール配信に最適化した形式

### 3. 無料ミニマム版の機能範囲
- Trap Score表示のみの実装
- 詳細分析なしの簡易版

### 4. メール配信への完全移行
- TG配信からメール配信への移行
- ニュースレター形式への最適化

## 出力形式

以下の形式でCOOとしての最終提案を出力してください：

### 📊 COO（技術的視点）によるUSP最終定義提案

#### USP1: Trap Defense Engine
- [定義と実装方針]

#### USP2: Gemini Show Producer（簡素化版）
- [簡素化された定義と実装方針]
- [削除または無効化する機能]
- [残す機能]

#### USP3: GPT Mental Trainer + Dr. Grok Mental Coach
- [定義と実装方針]

#### 無料ミニマム版
- [機能範囲]
- [実装方針]

#### メール配信への移行
- [移行方針]
- [実装方針]

### ⚠️ 技術的課題
- [技術的な課題と対策]

### ✅ 推奨事項
- [具体的な推奨事項]

**技術的・コスト最適化の視点で、USPを最終定義してください。**`;

  try {
    console.log('💻 COO（GPT CFO）にUSP最終定義の提案を依頼中...');
    const result = await callGPT52(prompt, {
      temperature: 0.3,
      maxCompletionTokens: 8000,
    });
    
    console.log(`✅ COO提案完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ COO提案エラー: ${error.message}`);
    return `エラー: ${error.message}`;
  }
}

/**
 * CMO（Gemini）によるUSP最終定義の提案
 */
async function getCMOProposal(ssotContent: string, cooProposal: string): Promise<string> {
  const prompt = `あなたは最高マーケティング責任者（CMO）であり、マーケティング戦略と顧客価値提案を評価する専門家です。

以下のSSOT（Single Source Of Truth）ドキュメントと、COO（技術責任者）の提案を確認し、**CEOの指示に基づいて最適化**してください。

## SSOTドキュメント（現在のUSP定義）

${ssotContent.substring(0, 5000)}

---

## COO（技術責任者）の提案

${cooProposal.substring(0, 4000)}

---

## CEOの指示

1. **新しいUSP変更案は破棄**: Grokを外し、CryptoQuant × GPT CFOという変更案は一切破棄
2. **複雑な実装の最適化**: NanoBanana、Veo、HeyGenなどの詰め込みすぎた実装を最適化し、無理な実装は不要
3. **メール配信ニュースレター**: TG配信からメール配信のニュースレターへ生まれ変わらせる
4. **無料ミニマム版**: Trap Score表示のみの機能範囲
5. **価格戦略**: 1か月サブスクのみ（$69/月）
6. **マーケティング**: 500名限定40%オフキャンペーン、無料ミニマム版でリスト収集

---

## CMOとしての提案

以下の観点から、USPを最終定義してください：

### 1. マーケティングメッセージ
- 簡素化されたUSPの訴求力
- 差別化メッセージの明確性
- ターゲット顧客への訴求力

### 2. ストーリーブランド戦略
- USP2簡素化による影響
- メール配信ニュースレター形式での物語の円環
- エンゲージメントへの影響

### 3. 無料ミニマム版のマーケティング戦略
- リスト収集戦略
- 無料→有料へのコンバージョン施策

### 4. 価格戦略とマーケティング
- 1か月サブスクのみの訴求
- 500名限定40%オフキャンペーンの展開

## 出力形式

以下の形式でCMOとしての最終提案を出力してください：

### 📊 CMO（マーケティング視点）によるUSP最終定義提案

#### USP1: Trap Defense Engine
- [マーケティングメッセージと訴求力]

#### USP2: Gemini Show Producer（簡素化版）
- [簡素化されたマーケティングメッセージ]
- [メール配信ニュースレター形式での訴求]

#### USP3: GPT Mental Trainer + Dr. Grok Mental Coach
- [マーケティングメッセージと訴求力]

#### 無料ミニマム版のマーケティング戦略
- [リスト収集戦略]
- [コンバージョン施策]

#### 価格戦略とマーケティング
- [1か月サブスクのみの訴求]
- [500名限定40%オフキャンペーンの展開]

### ⚠️ マーケティング上の課題
- [マーケティング上の課題と対策]

### ✅ 推奨事項
- [具体的な推奨事項]

**マーケティング視点で、USPを最終定義してください。COOの提案と整合性を取りながら、マーケティング効果を最大化してください。**`;

  try {
    console.log('📢 CMO（Gemini）にUSP最終定義の提案を依頼中...');
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.3,
      maxOutputTokens: 8000,
    });
    
    console.log(`✅ CMO提案完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ CMO提案エラー: ${error.message}`);
    return `エラー: ${error.message}`;
  }
}

/**
 * COOとCMOの議論を統合
 */
function generateIntegratedReport(cooProposal: string, cmoProposal: string): string {
  return `# COOとCMOによるUSP最終定義議論

**作成日**: ${new Date().toISOString()}  
**参加者**: 
- COO（GPT CFO - 最高技術責任者・最高財務責任者）
- CMO（Gemini - 最高マーケティング責任者）

**目的**: CEOの指示に基づき、USPを最終定義し、Trap Defence BTCを究極に磨き上げる

---

## 📊 COO（技術的視点）によるUSP最終定義提案

${cooProposal}

---

## 📊 CMO（マーケティング視点）によるUSP最終定義提案

${cmoProposal}

---

## 🎯 統合されたUSP最終定義

### USP1: Trap Defense Engine（トラップ防御エンジン）
- CryptoQuantオンチェーンデータ + Grok Xセンチメント解析の統合
- 市場トラップ（Whale Dump、Retail FOMO Trap、Miner Selling、Liquidation Cascade）の先取り検出
- トラップアラート生成: \`AVOID_LONG\`、\`AVOID_SHORT\`、\`STANDBY\`
- 70%の時間は\`TRAP_STANDBY\`で待機 = 明確な優位性が出るまで防御

### USP2: Gemini Show Producer（簡素化版）
- **変更**: Veo動画、NanoBanana画像、HeyGenを削除または無効化
- **新形式**: テキストベースの簡易版番組プロデューサー
- **メール配信ニュースレター形式**: ストーリーブランド戦略2.0の7つのフレームワークをテキストベースで適用
- **番組構成**: Opening（テキスト）→ Data Presentation（テキスト表）→ Analysis（GPT Mental Trainer）→ Commentary（Dr. Grok）→ Call to Action

### USP3: GPT Mental Trainer + Dr. Grok Mental Coach
- GPT Mental Trainer: CryptoQuantオンチェーンデータを心理的視点から深掘り解説
- Dr. Grok Mental Coach: リアルタイムXセンチメント分析 + メンタルブロック検出・解除

### 無料ミニマム版
- **機能範囲**: Trap Score表示のみ（詳細分析なし）
- **配信形式**: メール配信のみ
- **目的**: リスト収集と無料→有料へのコンバージョン

### メール配信への完全移行
- TG配信からメール配信のニュースレターへ完全移行
- Resend APIを使用したメール配信
- HTML形式のニュースレター

---

## 📝 次のステップ

1. SSOTを更新（簡素化版USP、メール配信、無料版定義）
2. 複雑な実装を削除または無効化
3. メール配信を主要配信手段として確立
4. 無料ミニマム版を実装

---

**状態**: ✅ 議論完了
`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 COOとCMOによるUSP最終定義議論を開始...\n');
  console.log('='.repeat(80));

  // 環境変数チェック
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEYが設定されていません');
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEYが設定されていません');
    process.exit(1);
  }
  
  console.log('✅ 環境変数チェック完了\n');

  try {
    // SSOTドキュメントを読み込む
    console.log('📚 SSOTドキュメントを読み込み中...');
    const ssotContent = loadSSOTDocument();
    console.log(`✅ SSOTドキュメント読み込み完了\n`);

    // COOによる提案
    console.log('📞 COO（GPT CFO）にUSP最終定義の提案を依頼中...\n');
    const cooProposal = await getCOOProposal(ssotContent);
    console.log('\n✅ COOからの提案を受信しました\n');

    // CMOによる提案
    console.log('📞 CMO（Gemini）にUSP最終定義の提案を依頼中...\n');
    const cmoProposal = await getCMOProposal(ssotContent, cooProposal);
    console.log('\n✅ CMOからの提案を受信しました\n');

    // 統合レポートを生成
    const integratedReport = generateIntegratedReport(cooProposal, cmoProposal);

    // レスポンスを保存
    const timestamp = Date.now();
    writeFileSync(
      join(OUTPUT_DIR, `usp-final-definition-discussion-${timestamp}.md`),
      integratedReport,
      'utf-8'
    );

    // ドキュメントディレクトリにも保存
    const docsDir = join(__dirname, '..', 'docs');
    writeFileSync(
      join(docsDir, `USP_FINAL_DEFINITION_DISCUSSION.md`),
      integratedReport,
      'utf-8'
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ COOとCMOによるUSP最終定義議論が完了しました！');
    console.log(`\n📋 結果ファイル:`);
    console.log(`  - 議論結果: ${join(OUTPUT_DIR, `usp-final-definition-discussion-${timestamp}.md`)}`);
    console.log(`  - ドキュメント: ${join(docsDir, `USP_FINAL_DEFINITION_DISCUSSION.md`)}`);
    
    // 提案の一部を表示
    console.log('\n📊 COOの提案（一部）:');
    console.log(cooProposal.substring(0, 1000) + '...\n');
    console.log('\n📊 CMOの提案（一部）:');
    console.log(cmoProposal.substring(0, 1000) + '...\n');
  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

// スクリプト実行
main().catch((error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
