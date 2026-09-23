#!/usr/bin/env tsx
/**
 * Gemini CMOレビュー依頼スクリプト
 * 4つのAI相乗効果の最大化とUI改善のレビューを依頼
 */

import { callGemini3Pro } from '../api/unified-api.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function requestGeminiCMOReview() {
  console.log('📢 Gemini CMOレビュー依頼を開始します...\n');

  // レビュー依頼内容を読み込む
  const reviewRequestPath = join(__dirname, '..', 'docs', 'GEMINI_CMO_REVIEW_REQUEST.md');
  const reviewRequestContent = readFileSync(reviewRequestPath, 'utf-8');

  // レビュー対象ファイルを読み込む
  const regularEnPath = join(__dirname, '..', 'cryptosignal-ai', 'services', 'telegram', 'messages', 'user', 'en', 'regular.en.js');
  const minimalEnPath = join(__dirname, '..', 'cryptosignal-ai', 'services', 'telegram', 'messages', 'user', 'en', 'minimal-high-quality.en.js');
  const whopContentPath = join(__dirname, '..', 'data', 'whop-content-improved.md');

  const regularEnContent = readFileSync(regularEnPath, 'utf-8');
  const minimalEnContent = readFileSync(minimalEnPath, 'utf-8');
  const whopContent = readFileSync(whopContentPath, 'utf-8');

  // Gemini CMOへのプロンプトを作成
  const prompt = `あなたはGemini CMO（gemini-3-flash-preview）です。Trap Defence BTCのマーケティング戦略とプロダクト価値の伝達を最適化する専門家として、以下のレビュー依頼に基づいて詳細なレビューと改善提案をお願いします。

## 📋 レビュー依頼内容

${reviewRequestContent}

---

## 📝 レビュー対象ファイル

### 1. レギュラー版（regular.en.js）
\`\`\`javascript
${regularEnContent.substring(0, 5000)}...
\`\`\`
（ファイル全体は285-360行目付近の改善箇所を重点的に確認してください）

### 2. ミニマム版（minimal-high-quality.en.js）
\`\`\`javascript
${minimalEnContent.substring(0, 5000)}...
\`\`\`
（ファイル全体は181-215行目付近の改善箇所を重点的に確認してください）

### 3. Whopプロダクトページ改善版コピー
\`\`\`markdown
${whopContent}
\`\`\`

---

## 🎯 レビュー依頼項目

### 1. マーケティングメッセージの最適化
- 「4つのAIが連携」のメッセージは明確か？
- 「5つのベネフィット」の表現は効果的か？
- 「他のAIサービスとの違い」は差別化できているか？
- より効果的なマーケティングメッセージの提案
- コンバージョン率を向上させるコピーの改善案
- 各言語版への適用方法

### 2. UI実装の評価
- レギュラー版のストーリー構造は明確か？
- ミニマム版のニュース番組形式は効果的か？
- 「70%待機戦略」の証拠ベース説明は心理的に受け入れやすいか？
- UI/UXの最適化提案
- ユーザーエクスペリエンスの向上案
- 各言語版への適用方法

### 3. プロダクト価値の伝達力
- 4つのAIの相乗効果が伝わっているか？
- ユーザーベネフィットが明確か？
- 競合との差別化が明確か？
- プロダクト価値の伝達方法の改善案
- 差別化ポイントの強調方法
- マーケティング戦略の最適化提案

---

## 📊 期待される出力形式

以下の形式でレビュー結果を出力してください：

### 1. マーケティングメッセージの最適化
- **現状評価**: [評価コメント]
- **改善提案**: [具体的な改善案]
- **改善後のコピー例**: [改善後のコピー]

### 2. UI実装の評価
- **現状評価**: [評価コメント]
- **改善提案**: [具体的な改善案]
- **改善後のコード例**: [改善後のコード]

### 3. プロダクト価値の伝達力
- **現状評価**: [評価コメント]
- **改善提案**: [具体的な改善案]
- **マーケティング戦略の最適化**: [戦略提案]

### 4. 総合評価と優先順位
- **総合評価**: [評価コメント]
- **優先度の高い改善項目**: [優先順位付きリスト]
- **各言語版への適用方法**: [適用方法]

---

**レビューをお願いします。**`;

  try {
    console.log('🔄 Gemini CMOにレビュー依頼を送信しています...\n');
    
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 8000
    });

    console.log('✅ Gemini CMOレビュー完了\n');
    console.log('='.repeat(80));
    console.log('📊 Gemini CMOレビュー結果');
    console.log('='.repeat(80));
    console.log(result.text);
    console.log('='.repeat(80));
    console.log(`\n📈 使用トークン: ${JSON.stringify(result.usage, null, 2)}`);
    console.log(`🧠 Thinking Level: ${result.thinkingLevel}\n`);

    // レビュー結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'GEMINI_CMO_REVIEW_RESULT.md');
    const reviewResult = `# Gemini CMOレビュー結果

**レビュー日時**: ${new Date().toISOString()}
**レビュー依頼**: docs/GEMINI_CMO_REVIEW_REQUEST.md
**レビュー対象**: 
- cryptosignal-ai/services/telegram/messages/user/en/regular.en.js
- cryptosignal-ai/services/telegram/messages/user/en/minimal-high-quality.en.js
- data/whop-content-improved.md

---

## 📊 レビュー結果

${result.text}

---

## 📈 使用トークン

\`\`\`json
${JSON.stringify(result.usage, null, 2)}
\`\`\`

**Thinking Level**: ${result.thinkingLevel}

---

**作成者**: Gemini CMO（gemini-3-flash-preview）  
**依頼者**: COO（Cursor/Composer 1）
`;

    const fs = await import('fs');
    fs.writeFileSync(outputPath, reviewResult, 'utf-8');
    console.log(`✅ レビュー結果を保存しました: ${outputPath}\n`);

    return result;
  } catch (error: any) {
    console.error('❌ Gemini CMOレビュー依頼エラー:', error.message);
    throw error;
  }
}

requestGeminiCMOReview()
  .then(() => {
    console.log('✅ Gemini CMOレビュー依頼完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  });
