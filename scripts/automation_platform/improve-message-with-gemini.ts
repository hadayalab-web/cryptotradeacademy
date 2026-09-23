#!/usr/bin/env tsx
/**
 * Gemini CMOと協力してメッセージ改善案を作成
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { callGemini3Pro } from '../api/unified-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function main() {
  console.log('🤖 Gemini CMOと協力してメッセージ改善案を作成します...\n');

  const improvementPrompt = `あなたはGemini CMO（Chief Marketing Officer）として、Trap Defense BTCのマーケティング戦略を担当しています。

先ほどレビューしたTelegramメッセージの改善案を実装するため、以下の具体的な改善を提案してください：

【改善項目】
1. **Trade Verdictの表記最適化**: TRAP_STANDBY状態の時、Entry/TP/SLを「Waiting for Trigger」や「TBD」と表記する具体的なコード変更案
2. **セクションの統合**: Story ArcとData Presentationの重複を排除し、統合する具体的な方法
3. **USPラベルの改善**: 「USP」という言葉を使わず、ユーザー向けの自然な表現に変更（例: 「3つの独自機能」→「3つの強み」など）
4. **Dr. Grokの心理的ガイダンス強化**: 具体的な心理的アドバイス（例: 「ドーパミンの動き」など）を含む改善案
5. **データの不整合修正**: Trap Detectorの矛盾を修正する方法

【現在のコード構造】
- \`formatRegularBriefing\`関数: \`cryptosignal-ai/services/telegram/messages/user/en/regular.en.js\`
- \`produceShow\`関数: \`cryptosignal-ai/services/gemini/showProducer.js\`

【出力形式】
以下の形式で具体的な改善案を提供してください：

## 1. Trade Verdictの表記最適化
\`\`\`javascript
// 具体的なコード変更案
// 例: 
const entryLine = isNoTrade 
  ? '• Entry: Waiting for Clear Trigger' 
  : \`• Entry (spot ref.): \${formatUsd(priceUsd)}\`;
\`\`\`

## 2. セクションの統合
\`\`\`javascript
// Story ArcとData Presentationを統合する具体的な方法
\`\`\`

## 3. USPラベルの改善
\`\`\`javascript
// 「USP」を自然な表現に変更
// 例: '✨ Today\'s Highlights (3 USPs)' → '✨ Today\'s Highlights (3 Core Features)'
\`\`\`

## 4. Dr. Grokの心理的ガイダンス強化
\`\`\`javascript
// 具体的な心理的アドバイスを含む改善案
\`\`\`

## 5. データの不整合修正
\`\`\`javascript
// Trap Detectorの矛盾を修正する方法
\`\`\`

各改善案は、実際のコードに適用できる具体的な形式で提供してください。`;

  try {
    console.log('🤖 Gemini CMOに改善案を依頼中...\n');
    
    const result = await callGemini3Pro(improvementPrompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 4000,
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Gemini CMO 改善案');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(result.text);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 API使用量:', JSON.stringify(result.usage, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
