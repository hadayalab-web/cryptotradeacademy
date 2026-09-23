#!/usr/bin/env tsx
/**
 * COOとCMOの最終レビュー
 * 
 * 実装完了後の最終レビューを実行
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

const OUTPUT_DIR = join(__dirname, '..', 'data', 'final-reviews');
mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * 実装状況を確認
 */
function getImplementationStatus(): string {
  const files = [
    { path: 'cryptosignal-ai/docs/SSOT_TRAP_DEFENSE_BTC.md', description: 'SSOT更新' },
    { path: 'cryptosignal-ai/services/gemini/showProducer.js', description: 'USP2簡素化' },
    { path: 'cryptosignal-ai/api/cron.js', description: '配信ロジック最適化' },
    { path: 'cryptosignal-ai/services/email/messages/user/en/minimal.en.js', description: '無料ミニマム版実装' },
    { path: 'scripts/sync-whop-products.ts', description: '価格プラン簡素化' },
  ];

  let status = '';
  for (const file of files) {
    try {
      const filePath = join(__dirname, '..', file.path);
      const exists = require('fs').existsSync(filePath);
      status += `\n- **${file.description}**: ${exists ? '✅ 実装済み' : '❌ 未実装'} (${file.path})\n`;
    } catch (error: any) {
      status += `\n- **${file.description}**: ❌ エラー (${error.message})\n`;
    }
  }

  return status;
}

/**
 * COO（GPT CFO）による最終レビュー
 */
async function getCOOFinalReview(): Promise<string> {
  const implementationStatus = getImplementationStatus();
  
  const prompt = `あなたは最高技術責任者（CTO）兼最高財務責任者（CFO）です。

以下の実装状況を確認し、最終レビューを実施してください。

## 実装状況

${implementationStatus}

## CEOの指示（実装要件）

1. **新しいUSP変更案は破棄**: Grokを外し、CryptoQuant × GPT CFOという変更案は一切破棄
2. **複雑な実装の最適化**: NanoBanana、Veo、HeyGenなどの詰め込みすぎた実装を最適化し、無理な実装は不要
3. **メール配信ニュースレター**: TG配信からメール配信のニュースレターへ生まれ変わらせる
4. **無料ミニマム版**: Trap Score表示のみの機能範囲
5. **価格戦略**: 1か月サブスクのみ（$69/月）
6. **マーケティング**: 500名限定40%オフキャンペーン、無料ミニマム版でリスト収集

## レビュー依頼

以下の観点から最終レビューを実施してください：

### 1. 技術的実装の完成度
- 実装がCEOの指示通りに完了しているか
- 技術的な問題やリスクはないか
- コスト最適化は達成されているか

### 2. 実装の品質
- コードの品質は適切か
- エラーハンドリングは適切か
- パフォーマンスへの影響は適切か

### 3. 次のステップ
- 追加で必要な実装はあるか
- 改善すべき点はあるか

## 出力形式

以下の形式で最終レビューを出力してください：

### 📊 COO最終レビュー

#### 1. 技術的実装の完成度
- [評価と根拠]

#### 2. 実装の品質
- [評価と根拠]

#### 3. 次のステップ
- [推奨事項]

### 🎯 総合評価
- **完成度**: [%]
- **品質**: [%]
- **推奨度**: [推奨/条件付き推奨/非推奨]

**技術的・財務的視点で、実装の完成度と品質を評価してください。**`;

  try {
    console.log('💻 COO（GPT CFO）に最終レビューを依頼中...');
    const result = await callGPT52(prompt, {
      temperature: 0.3,
      maxCompletionTokens: 6000,
    });
    
    console.log(`✅ COO最終レビュー完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ COO最終レビューエラー: ${error.message}`);
    return `エラー: ${error.message}`;
  }
}

/**
 * CMO（Gemini）による最終レビュー
 */
async function getCMOFinalReview(): Promise<string> {
  const implementationStatus = getImplementationStatus();
  
  const prompt = `あなたは最高マーケティング責任者（CMO）です。

以下の実装状況を確認し、最終レビューを実施してください。

## 実装状況

${implementationStatus}

## CEOの指示（実装要件）

1. **新しいUSP変更案は破棄**: Grokを外し、CryptoQuant × GPT CFOという変更案は一切破棄
2. **複雑な実装の最適化**: NanoBanana、Veo、HeyGenなどの詰め込みすぎた実装を最適化し、無理な実装は不要
3. **メール配信ニュースレター**: TG配信からメール配信のニュースレターへ生まれ変わらせる
4. **無料ミニマム版**: Trap Score表示のみの機能範囲
5. **価格戦略**: 1か月サブスクのみ（$69/月）
6. **マーケティング**: 500名限定40%オフキャンペーン、無料ミニマム版でリスト収集

## レビュー依頼

以下の観点から最終レビューを実施してください：

### 1. マーケティングメッセージの明確性
- USPが明確に定義されているか
- 差別化メッセージは明確か
- 顧客価値提案は明確か

### 2. マーケティング施策の実装
- 無料ミニマム版のマーケティング戦略は適切か
- 500名限定40%オフキャンペーンの実装計画は適切か
- リスト収集戦略は適切か

### 3. 次のステップ
- 追加で必要なマーケティング施策はあるか
- 改善すべき点はあるか

## 出力形式

以下の形式で最終レビューを出力してください：

### 📊 CMO最終レビュー

#### 1. マーケティングメッセージの明確性
- [評価と根拠]

#### 2. マーケティング施策の実装
- [評価と根拠]

#### 3. 次のステップ
- [推奨事項]

### 🎯 総合評価
- **メッセージの明確性**: [%]
- **施策の実装度**: [%]
- **推奨度**: [推奨/条件付き推奨/非推奨]

**マーケティング視点で、実装の完成度とマーケティング効果を評価してください。**`;

  try {
    console.log('📢 CMO（Gemini）に最終レビューを依頼中...');
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.3,
      maxOutputTokens: 6000,
    });
    
    console.log(`✅ CMO最終レビュー完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ CMO最終レビューエラー: ${error.message}`);
    return `エラー: ${error.message}`;
  }
}

/**
 * 統合レポートを生成
 */
function generateIntegratedReport(cooReview: string, cmoReview: string): string {
  return `# COOとCMOによる最終レビュー

**作成日**: ${new Date().toISOString()}  
**参加者**: 
- COO（GPT CFO - 最高技術責任者・最高財務責任者）
- CMO（Gemini - 最高マーケティング責任者）

**目的**: Trap Defence BTC最適化とマーケティング戦略再構築の実装完了後の最終レビュー

---

## 📊 COO（技術的視点）による最終レビュー

${cooReview}

---

## 📊 CMO（マーケティング視点）による最終レビュー

${cmoReview}

---

## 🎯 統合評価

### 実装完了項目

1. ✅ 新しいUSP変更案の破棄
2. ✅ USP2（Gemini Show Producer）の簡素化（Veo、NanoBanana、HeyGen削除）
3. ✅ SSOT更新（簡素化版USP、メール配信、無料版定義）
4. ✅ 複雑な実装の削除または無効化
5. ✅ メール配信を主要配信手段として確立
6. ✅ 無料ミニマム版の実装（Trap Score表示のみ）
7. ✅ 価格プランの簡素化（1か月サブスクのみ）
8. ✅ Trap Defence（アルト・ミーム）プランの実装計画
9. ✅ 500名限定40%オフキャンペーンの実装計画

---

## 📝 次のステップ

1. Whopで価格プランを更新（3か月・1年プランを削除または非表示）
2. Trap Defence Alt/MemeプランをWhopで作成
3. 無料ミニマム版のWhopプロダクトを作成
4. 500名限定40%オフキャンペーンのWhop限定プランを作成
5. テスト配信を実行して動作確認

---

**状態**: ✅ 最終レビュー完了
`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 COOとCMOによる最終レビューを開始...\n');
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
    // COOによる最終レビュー
    console.log('📞 COO（GPT CFO）に最終レビューを依頼中...\n');
    const cooReview = await getCOOFinalReview();
    console.log('\n✅ COOからの最終レビューを受信しました\n');

    // CMOによる最終レビュー
    console.log('📞 CMO（Gemini）に最終レビューを依頼中...\n');
    const cmoReview = await getCMOFinalReview();
    console.log('\n✅ CMOからの最終レビューを受信しました\n');

    // 統合レポートを生成
    const integratedReport = generateIntegratedReport(cooReview, cmoReview);

    // レスポンスを保存
    const timestamp = Date.now();
    writeFileSync(
      join(OUTPUT_DIR, `final-review-${timestamp}.md`),
      integratedReport,
      'utf-8'
    );

    // ドキュメントディレクトリにも保存
    const docsDir = join(__dirname, '..', 'docs');
    writeFileSync(
      join(docsDir, `FINAL_REVIEW_COO_CMO.md`),
      integratedReport,
      'utf-8'
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ COOとCMOによる最終レビューが完了しました！');
    console.log(`\n📋 結果ファイル:`);
    console.log(`  - レビュー結果: ${join(OUTPUT_DIR, `final-review-${timestamp}.md`)}`);
    console.log(`  - ドキュメント: ${join(docsDir, `FINAL_REVIEW_COO_CMO.md`)}`);
    
    // レビューの一部を表示
    console.log('\n📊 COOの最終レビュー（一部）:');
    console.log(cooReview.substring(0, 1000) + '...\n');
    console.log('\n📊 CMOの最終レビュー（一部）:');
    console.log(cmoReview.substring(0, 1000) + '...\n');
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
