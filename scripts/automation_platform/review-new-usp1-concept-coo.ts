#!/usr/bin/env tsx
/**
 * 新しいUSP1コンセプトレビュー - COO/CTO
 * 
 * Grokを外し、CryptoQuant × GPT CFOによる論理的思考をUSP1とする
 * 新コンセプトについて、COO/CTOとして技術的・戦略的視点からレビュー
 */

import { callGPT52 } from '../api/unified-api.js';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'gpt-reviews');
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
 * 現在の実装を確認
 */
function loadCurrentImplementation(): string {
  const files = [
    { path: 'cryptosignal-ai/logic/core/trapDetector.js', description: 'トラップ検出ロジック' },
    { path: 'cryptosignal-ai/services/grok/client.js', description: 'Grok統合実装' },
    { path: 'cryptosignal-ai/services/gpt/client.js', description: 'GPT実装' },
    { path: 'cryptosignal-ai/api/cron.js', description: 'メイン配信ロジック' },
  ];

  let implementation = '';
  for (const file of files) {
    try {
      const filePath = join(__dirname, '..', file.path);
      const content = readFileSync(filePath, 'utf-8');
      implementation += `\n## ${file.description} (${file.path})\n\`\`\`javascript\n${content.substring(0, 2000)}...\n\`\`\`\n`;
    } catch (error: any) {
      implementation += `\n## ${file.description} (${file.path})\n読み込みエラー: ${error.message}\n`;
    }
  }

  return implementation;
}

/**
 * GPT CFOに新しいUSP1コンセプトのレビューを依頼
 */
async function reviewNewUSP1Concept(ssotContent: string, implementation: string): Promise<any> {
  const prompt = `あなたは最高技術責任者（CTO）兼最高財務責任者（CFO）であり、技術的実装の正確性と戦略的整合性を評価する専門家です。

以下のSSOT（Single Source Of Truth）ドキュメントに記載されている現在のUSP定義と、**新しいUSP1コンセプトの提案**を比較して、技術的・戦略的観点からレビューしてください。

## SSOTドキュメント（現在のUSP定義）

${ssotContent}

---

## 現在の実装状況

${implementation}

---

## 新しいUSP1コンセプトの提案

### 変更の背景
現在の「CryptoQuantオンチェーンデータ + Grok Xセンチメント解析の統合」によるトラップ検出ロジックは成立しないことが判明しました。そのため、Grokを外し、新しいアプローチを検討しています。

### 新しいUSP1の定義

**USP1: CryptoQuant高解像度オンチェーンデータ × GPT CFO（gpt-5.2-2025-12-11）の論理的思考**

1. **トラップ検出**: GPT CFO（gpt-5.2-2025-12-11）がCryptoQuantの主要オンチェーンデータを徹底検証し、トラップを見抜く
   - CryptoQuantデータソース:
     - Exchange Flows（取引所流入・流出）
     - Market Indicator（市場指標）
     - Miner Flows（マイナーフロー）
     - Fund Data（ファンドデータ）
   - GPT CFOの役割: 高解像度オンチェーンデータを論理的に分析し、トラップパターンを検出

2. **メンタルトレーナー**: GPT CFOをメンタルトレーナーとして確立
   - 感情依存のトレードから脱却
   - 完全ロジカルなトレードスタイルに導く
   - 「罠に嵌るな！」をモットーにTrap Defenceの心得を指導

3. **統合アプローチ**: トラップ検出とメンタルトレーニングを統合
   - オンチェーンデータの論理的分析によるトラップ検出
   - 論理的思考によるメンタルトレーニング
   - 感情に依存しない、データ駆動型のトレードスタイルの確立

### その他の変更

- **USP2（Gemini Show Producer）**: 削除
- **USP3（Dr. Grok）**: 維持（ただしUSP1からは外す）

---

## レビュー依頼（COO/CTO視点）

この新しいUSP1コンセプトについて、以下の観点から評価してください：

### 1. 技術的実装可能性

- **CryptoQuantデータのみでのトラップ検出精度**: Grok X解析なしで、CryptoQuantデータのみでトラップを検出できるか？精度は維持できるか？
- **GPT CFO（gpt-5.2-2025-12-11）の論理的思考能力**: GPT CFOがCryptoQuantデータを徹底検証し、トラップを見抜く能力は十分か？
- **Grok X解析なしでの検出精度への影響**: Grok X解析を外すことで、検出精度は低下するか？それとも向上するか？

### 2. 戦略的整合性

- **ブルーオーシャン戦略との整合性**: 新しいUSP1はブルーオーシャン戦略と整合しているか？
- **差別化ポイントの明確性**: 「CryptoQuant × GPTの論理的思考」は明確な差別化ポイントになるか？
- **競合優位性の維持可能性**: 競合が模倣困難な優位性を維持できるか？

### 3. USP1の再定義

- **「高解像度オンチェーンデータCQ × GPTの論理的思考」の明確性**: この定義は明確で理解しやすいか？
- **メンタルトレーナーとしてのGPT CFOの位置づけ**: トラップ検出とメンタルトレーニングを統合することは適切か？
- **統合の効果**: トラップ検出とメンタルトレーニングを統合することで、どのような効果が期待できるか？

### 4. USP2削除の影響

- **ストーリーブランド戦略2.0の扱い**: USP2を削除することで、ストーリーブランド戦略2.0はどうなるか？
- **エンゲージメントへの影響**: 視覚的コンテンツ（Veo動画、NanoBanana画像）がなくなることで、エンゲージメントは低下するか？
- **ニュース番組構造の変更**: ニュース番組構造はどう変更すべきか？

### 5. USP3の再定義

- **Dr. Grokの役割の明確化**: USP1からGrokを外すことで、Dr. Grokの役割はどうなるか？
- **USP1との関係性**: 新しいUSP1（GPT CFO）とUSP3（Dr. Grok）の関係性はどうあるべきか？

### 6. 実装上の課題

- **既存コードへの影響**: Grok統合を外すことで、既存コードへの影響は？
- **移行の複雑さ**: 現在の実装から新しい実装への移行は複雑か？
- **パフォーマンスへの影響**: GPT CFOのみに依存することで、パフォーマンスやコストへの影響は？

## 出力形式

以下の形式で詳細なレビューを出力してください：

### 📊 新しいUSP1コンセプトレビュー（COO/CTO視点）

#### 1. 技術的実装可能性

- **CryptoQuantデータのみでのトラップ検出精度**: [評価と根拠]
- **GPT CFOの論理的思考能力**: [評価と根拠]
- **Grok X解析なしでの検出精度への影響**: [評価と根拠]

#### 2. 戦略的整合性

- **ブルーオーシャン戦略との整合性**: [評価と根拠]
- **差別化ポイントの明確性**: [評価と根拠]
- **競合優位性の維持可能性**: [評価と根拠]

#### 3. USP1の再定義

- **定義の明確性**: [評価と根拠]
- **メンタルトレーナーとしてのGPT CFO**: [評価と根拠]
- **統合の効果**: [評価と根拠]

#### 4. USP2削除の影響

- **ストーリーブランド戦略2.0**: [影響と対策]
- **エンゲージメント**: [影響と対策]
- **ニュース番組構造**: [変更案]

#### 5. USP3の再定義

- **Dr. Grokの役割**: [再定義案]
- **USP1との関係性**: [関係性の整理]

#### 6. 実装上の課題

- **既存コードへの影響**: [影響範囲と対策]
- **移行の複雑さ**: [複雑さの評価]
- **パフォーマンスへの影響**: [影響と対策]

### 🎯 総合評価

- **技術的実装可能性**: [%]
- **戦略的整合性**: [%]
- **推奨度**: [推奨/条件付き推奨/非推奨]

### ⚠️ 重要な課題

[技術的・戦略的な重要な課題をリストアップ]

### ✅ 推奨事項

[新しいUSP1コンセプトを実装するための具体的な推奨事項]

### 📝 次のステップ

[実装に向けた優先順位付きアクションプラン]

**技術的・戦略的視点で、新しいUSP1コンセプトの実装可能性、戦略的整合性、競合優位性を評価してください。具体的で実践的な評価をお願いします。**`;

  try {
    console.log('💻 GPT CFO（COO/CTO）に新しいUSP1コンセプトのレビューを依頼中...');
    const result = await callGPT52(prompt, {
      temperature: 0.3,
      maxCompletionTokens: 8000,
    });
    
    console.log(`✅ GPT CFOレビュー完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ GPT CFOレビューエラー: ${error.message}`);
    if (error.stack) {
      console.error('スタック:', error.stack.substring(0, 200));
    }
    return { error: error.message };
  }
}

/**
 * レポートを生成
 */
function generateReport(gptResponse: any): string {
  return `# 新しいUSP1コンセプトレビュー（COO/CTO視点）

**作成日**: ${new Date().toISOString()}  
**レビュー者**: GPT CFO（COO/CTO - 最高技術責任者・最高財務責任者）  
**目的**: Grokを外し、CryptoQuant × GPT CFOによる論理的思考をUSP1とする新コンセプトの技術的・戦略的評価

---

## 📊 GPT CFOのレビュー結果

${typeof gptResponse === 'string' ? gptResponse : JSON.stringify(gptResponse, null, 2)}

---

## 📝 レビューサマリー

このレビューは、Grokを外し、CryptoQuant高解像度オンチェーンデータ × GPT CFO（gpt-5.2-2025-12-11）の論理的思考をUSP1とする新コンセプトについて、技術的実装可能性と戦略的整合性を評価したものです。

### 主要な評価項目

1. **技術的実装可能性**
2. **戦略的整合性**
3. **USP1の再定義**
4. **USP2削除の影響**
5. **USP3の再定義**
6. **実装上の課題**

---

**作成者**: COO兼CTO（Cursor/Composer）  
**状態**: ✅ レビュー完了
`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 新しいUSP1コンセプトレビュー（COO/CTO視点）を開始...\n');
  console.log('='.repeat(80));

  // 環境変数チェック
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEYが設定されていません');
    process.exit(1);
  }
  
  console.log('✅ 環境変数チェック完了\n');

  try {
    // SSOTドキュメントを読み込む
    console.log('📚 SSOTドキュメントを読み込み中...');
    const ssotContent = loadSSOTDocument();
    console.log(`✅ SSOTドキュメント読み込み完了\n`);

    // 現在の実装を確認
    console.log('📚 現在の実装を確認中...');
    const implementation = loadCurrentImplementation();
    console.log(`✅ 実装確認完了\n`);

    // GPT CFOにレビューを依頼
    console.log('📞 GPT CFOに新しいUSP1コンセプトのレビューを依頼中...\n');
    const gptResponse = await reviewNewUSP1Concept(ssotContent, implementation);

    console.log('\n✅ GPT CFOからのレビューを受信しました\n');

    // レスポンスを保存
    const timestamp = Date.now();
    writeFileSync(
      join(OUTPUT_DIR, `new-usp1-concept-review-coo-${timestamp}.json`),
      JSON.stringify(gptResponse, null, 2),
      'utf-8'
    );

    // レポートを生成
    const report = generateReport(gptResponse);
    writeFileSync(
      join(OUTPUT_DIR, `new-usp1-concept-review-coo-${timestamp}.md`),
      report,
      'utf-8'
    );

    // ドキュメントディレクトリにも保存
    const docsDir = join(__dirname, '..', 'docs');
    writeFileSync(
      join(docsDir, `NEW_USP1_CONCEPT_REVIEW_COO.md`),
      report,
      'utf-8'
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ 新しいUSP1コンセプトレビュー（COO/CTO視点）が完了しました！');
    console.log(`\n📋 結果ファイル:`);
    console.log(`  - JSON: ${join(OUTPUT_DIR, `new-usp1-concept-review-coo-${timestamp}.json`)}`);
    console.log(`  - レポート: ${join(OUTPUT_DIR, `new-usp1-concept-review-coo-${timestamp}.md`)}`);
    console.log(`  - ドキュメント: ${join(docsDir, `NEW_USP1_CONCEPT_REVIEW_COO.md`)}`);
    
    // レスポンスの一部を表示
    console.log('\n📊 GPT CFOのレビュー結果（一部）:');
    if (typeof gptResponse === 'string') {
      console.log(gptResponse.substring(0, 2000) + '...\n');
    } else {
      console.log(JSON.stringify(gptResponse, null, 2).substring(0, 2000) + '...\n');
    }
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
