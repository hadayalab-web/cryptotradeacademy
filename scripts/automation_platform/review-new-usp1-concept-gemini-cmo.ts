#!/usr/bin/env tsx
/**
 * 新しいUSP1コンセプトレビュー - Gemini CMO
 * 
 * Grokを外し、CryptoQuant × GPT CFOによる論理的思考をUSP1とする
 * 新コンセプトについて、Gemini CMOとしてマーケティング視点からレビュー
 */

import { callGemini3Pro } from '../api/unified-api.js';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'gemini-reviews');
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
 * Gemini CMOに新しいUSP1コンセプトのレビューを依頼
 */
async function reviewNewUSP1ConceptWithGeminiCMO(ssotContent: string): Promise<any> {
  const prompt = `あなたは最高マーケティング責任者（CMO）であり、マーケティング戦略と顧客価値提案を評価する専門家です。

以下のSSOT（Single Source Of Truth）ドキュメントに記載されている現在のUSP定義と、**新しいUSP1コンセプトの提案**を比較して、マーケティング視点からレビューしてください。

## SSOTドキュメント（現在のUSP定義）

${ssotContent}

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

## レビュー依頼（CMO視点）

この新しいUSP1コンセプトについて、以下の観点から評価してください：

### 1. マーケティングメッセージ

- **新しいUSP1の訴求力**: 「CryptoQuant × GPTの論理的思考」は顧客に訴求できるか？
- **差別化メッセージの明確性**: 競合との差別化が明確に伝わるか？
- **ターゲット顧客への訴求力**: 感情依存のトレードから脱却したい顧客に響くか？

### 2. ストーリーブランド戦略

- **USP2削除による影響**: ストーリーブランド戦略2.0の7つのフレームワークはどうなるか？
- **物語の円環の維持可能性**: USP2を削除しても物語の円環を維持できるか？
- **エンゲージメントへの影響**: 視覚的コンテンツ（Veo動画、NanoBanana画像）がなくなることで、エンゲージメントは低下するか？

### 3. 競合差別化

- **新しいUSP1による差別化の明確性**: 「論理的思考」は明確な差別化ポイントになるか？
- **ブルーオーシャン戦略との整合性**: 新しいUSP1はブルーオーシャン戦略と整合しているか？
- **競合優位性の維持可能性**: 競合が模倣困難な優位性を維持できるか？

### 4. 顧客価値提案

- **感情依存からの脱却**: 「完全ロジカルなトレードスタイル」は顧客のニーズに応えるか？
- **メンタルトレーナーとしてのGPT CFO**: GPT CFOをメンタルトレーナーとして位置づけることは適切か？
- **統合の効果**: トラップ検出とメンタルトレーニングを統合することで、顧客価値は向上するか？

### 5. ブランドメッセージ

- **一貫性**: 新しいUSP1は既存のブランドメッセージと一貫しているか？
- **記憶に残る**: 「CryptoQuant × GPTの論理的思考」は記憶に残るメッセージか？
- **タグラインとの整合性**: 「70%の時間、何もするな。明確な優位性が出るまで防御。」との整合性は？

### 6. ニュースレターとしての価値

- **購入者への価値提供**: 購入済みユーザーにとって、新しいUSP1は価値があるか？
- **継続的なエンゲージメント**: USP2を削除しても、ユーザーは継続的にエンゲージできるか？
- **リテンション**: 新しいUSP1はリテンション向上に寄与するか？

## 出力形式

以下の形式で詳細なレビューを出力してください：

### 📊 新しいUSP1コンセプトレビュー（CMO視点）

#### 1. マーケティングメッセージ

- **新しいUSP1の訴求力**: [評価と根拠]
- **差別化メッセージの明確性**: [評価と根拠]
- **ターゲット顧客への訴求力**: [評価と根拠]

#### 2. ストーリーブランド戦略

- **USP2削除による影響**: [影響と対策]
- **物語の円環の維持可能性**: [維持方法]
- **エンゲージメントへの影響**: [影響と対策]

#### 3. 競合差別化

- **新しいUSP1による差別化の明確性**: [評価と根拠]
- **ブルーオーシャン戦略との整合性**: [評価と根拠]
- **競合優位性の維持可能性**: [評価と根拠]

#### 4. 顧客価値提案

- **感情依存からの脱却**: [価値提案の評価]
- **メンタルトレーナーとしてのGPT CFO**: [評価と根拠]
- **統合の効果**: [効果の評価]

#### 5. ブランドメッセージ

- **一貫性**: [評価と根拠]
- **記憶に残る**: [評価と根拠]
- **タグラインとの整合性**: [評価と根拠]

#### 6. ニュースレターとしての価値

- **購入者への価値提供**: [評価と根拠]
- **継続的なエンゲージメント**: [評価と根拠]
- **リテンション**: [評価と根拠]

### 🎯 総合評価

- **マーケティング効果**: [%]
- **差別化の明確性**: [%]
- **推奨度**: [推奨/条件付き推奨/非推奨]

### ⚠️ マーケティング上の重要な課題

[マーケティング上の重要な課題をリストアップ]

### ✅ マーケティング推奨事項

[新しいUSP1コンセプトをマーケティング的に成功させるための具体的な推奨事項]

### 📝 次のステップ

[マーケティング改善に向けた優先順位付きアクションプラン]

**マーケティング視点で、新しいUSP1コンセプトの訴求力、差別化の明確性、顧客価値提案を評価してください。具体的で実践的な評価をお願いします。**`;

  try {
    console.log('📢 Gemini CMO（マーケティング）に新しいUSP1コンセプトのレビューを依頼中...');
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.3,
      maxOutputTokens: 8000,
    });
    
    console.log(`✅ Gemini CMOレビュー完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ Gemini CMOレビューエラー: ${error.message}`);
    if (error.stack) {
      console.error('スタック:', error.stack.substring(0, 200));
    }
    return { error: error.message };
  }
}

/**
 * レポートを生成
 */
function generateReport(geminiResponse: any): string {
  return `# 新しいUSP1コンセプトレビュー（CMO視点）

**作成日**: ${new Date().toISOString()}  
**レビュー者**: Gemini CMO（最高マーケティング責任者）  
**目的**: Grokを外し、CryptoQuant × GPT CFOによる論理的思考をUSP1とする新コンセプトのマーケティング評価

---

## 📊 Gemini CMOのレビュー結果

${typeof geminiResponse === 'string' ? geminiResponse : JSON.stringify(geminiResponse, null, 2)}

---

## 📝 レビューサマリー

このレビューは、Grokを外し、CryptoQuant高解像度オンチェーンデータ × GPT CFO（gpt-5.2-2025-12-11）の論理的思考をUSP1とする新コンセプトについて、マーケティング視点から評価したものです。

### 主要な評価項目

1. **マーケティングメッセージ**
2. **ストーリーブランド戦略**
3. **競合差別化**
4. **顧客価値提案**
5. **ブランドメッセージ**
6. **ニュースレターとしての価値**

---

**作成者**: COO兼CTO（Cursor/Composer）  
**状態**: ✅ レビュー完了
`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 新しいUSP1コンセプトレビュー（CMO視点）を開始...\n');
  console.log('='.repeat(80));

  // 環境変数チェック
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

    // Gemini CMOにレビューを依頼
    console.log('📞 Gemini CMOに新しいUSP1コンセプトのレビューを依頼中...\n');
    const geminiResponse = await reviewNewUSP1ConceptWithGeminiCMO(ssotContent);

    console.log('\n✅ Gemini CMOからのレビューを受信しました\n');

    // レスポンスを保存
    const timestamp = Date.now();
    writeFileSync(
      join(OUTPUT_DIR, `new-usp1-concept-review-cmo-${timestamp}.json`),
      JSON.stringify(geminiResponse, null, 2),
      'utf-8'
    );

    // レポートを生成
    const report = generateReport(geminiResponse);
    writeFileSync(
      join(OUTPUT_DIR, `new-usp1-concept-review-cmo-${timestamp}.md`),
      report,
      'utf-8'
    );

    // ドキュメントディレクトリにも保存
    const docsDir = join(__dirname, '..', 'docs');
    writeFileSync(
      join(docsDir, `NEW_USP1_CONCEPT_REVIEW_CMO.md`),
      report,
      'utf-8'
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ 新しいUSP1コンセプトレビュー（CMO視点）が完了しました！');
    console.log(`\n📋 結果ファイル:`);
    console.log(`  - JSON: ${join(OUTPUT_DIR, `new-usp1-concept-review-cmo-${timestamp}.json`)}`);
    console.log(`  - レポート: ${join(OUTPUT_DIR, `new-usp1-concept-review-cmo-${timestamp}.md`)}`);
    console.log(`  - ドキュメント: ${join(docsDir, `NEW_USP1_CONCEPT_REVIEW_CMO.md`)}`);
    
    // レスポンスの一部を表示
    console.log('\n📊 Gemini CMOのレビュー結果（一部）:');
    if (typeof geminiResponse === 'string') {
      console.log(geminiResponse.substring(0, 2000) + '...\n');
    } else {
      console.log(JSON.stringify(geminiResponse, null, 2).substring(0, 2000) + '...\n');
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
