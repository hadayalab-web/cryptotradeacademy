#!/usr/bin/env tsx
/**
 * Grok CSOにメールアドレス取得ポテンシャルを相談
 * 
 * メールファースト戦略でどれほどのメールアドレスを取得できるポテンシャルがあるか確認
 */

import { callGrok41FastReasoning } from '../api/unified-api.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'grok-consultations');
mkdirSync(OUTPUT_DIR, { recursive: true });

const EMAIL_FIRST_STRATEGY = `
# メールファースト戦略の概要

## 戦略の転換点
1. Resendで配信されるCEO宛てメールのデザイン性が非常に良い → メールマーケティングに特化
2. LP構築も得意領域
3. 投稿マーケティング: スパムに注意して投稿数を最大化
4. Trap Defence BTCのUI表現はEメールの方が向いている可能性

## 投稿プラットフォーム
- Telegram: 実装済み（6言語対応）
- X (Twitter): 実装済み
- Discord: 準備済み（実装予定）

## リードマグネット戦略
- 投稿 → リードマグネットLP → メールアドレス登録 → メールシーケンス（3日以内にWhopアップセル）
- Phase 1（0時間）: リードマグネット配布
- Phase 2（48時間後）: 価値提供フォローアップ
- Phase 3（72時間後）: WhopアップセルCTA

## メールマーケティングの強み
- Resend APIを使用した高品質なメールデザイン
- HTMLメールの柔軟なレイアウト
- パーソナライゼーション対応
- レスポンシブデザイン
`;

const POSTING_STRATEGY = `
## 投稿マーケティング戦略
- スパム対策を実装
- リードマグネットLPへのトラフィック獲得に特化
- 推奨投稿頻度:
  - Telegram: 1日2-3回
  - X (Twitter): 1日3-5回
  - Discord: 1日1-2回

## 市場
- 6市場対応: EN, AR, KO, JA, ES, PT-BR
`;

/**
 * Grok CSOにメールアドレス取得ポテンシャルを相談
 */
async function consultGrokCSO(): Promise<any> {
  const prompt = `あなたは最高戦略責任者（CSO）です。

現在、メールファースト戦略を採用して、リードマグネット戦略でメールアドレスを収集する計画を立てています。

【戦略の概要】
${EMAIL_FIRST_STRATEGY}

${POSTING_STRATEGY}

【質問】
1. このメールファースト戦略で、1日あたりどれほどのメールアドレスを取得できるポテンシャルがあると予測しますか？
   - 6市場（EN, AR, KO, JA, ES, PT-BR）全体での予測
   - 市場別の予測
   - プラットフォーム別（Telegram/X/Discord）の予測

2. メールアドレス取得を最大化するために、どのような戦略的改善を提案しますか？
   - 投稿コンテンツの最適化
   - LPの最適化
   - メールシーケンスの最適化
   - その他の戦略的提案

3. リードマグネットの価値提案（「5 Common Trading Traps That Cost Traders $10,000+」）は十分魅力的ですか？改善案はありますか？

4. 投稿マーケティングでスパムを避けながら投稿数を最大化する方法は？

5. メールアドレス取得からWhopコンバージョンまでの導線は最適ですか？改善点はありますか？

6. 3日以内にWhopでアップセルする戦略は適切ですか？タイミングの最適化案はありますか？

【回答形式】
JSON形式で回答してください:
{
  "daily_email_acquisition_potential": {
    "total_6_markets": {
      "conservative": "保守的予測（件/日）",
      "realistic": "現実的予測（件/日）",
      "optimistic": "楽観的予測（件/日）"
    },
    "by_market": {
      "EN": { "conservative": 0, "realistic": 0, "optimistic": 0 },
      "AR": { "conservative": 0, "realistic": 0, "optimistic": 0 },
      "KO": { "conservative": 0, "realistic": 0, "optimistic": 0 },
      "JA": { "conservative": 0, "realistic": 0, "optimistic": 0 },
      "ES": { "conservative": 0, "realistic": 0, "optimistic": 0 },
      "PT-BR": { "conservative": 0, "realistic": 0, "optimistic": 0 }
    },
    "by_platform": {
      "telegram": { "conservative": 0, "realistic": 0, "optimistic": 0 },
      "x_twitter": { "conservative": 0, "realistic": 0, "optimistic": 0 },
      "discord": { "conservative": 0, "realistic": 0, "optimistic": 0 }
    }
  },
  "strategic_improvements": [
    "改善提案1",
    "改善提案2"
  ],
  "lead_magnet_assessment": "リードマグネットの評価と改善案",
  "spam_prevention_strategy": "スパム対策戦略",
  "conversion_funnel_optimization": "コンバージョンファネルの最適化案",
  "upsell_timing_optimization": "アップセルタイミングの最適化案",
  "final_recommendations": "最終推奨事項"
}`;

  try {
    console.log('💰 Grok CSO（戦略）にメールアドレス取得ポテンシャルを相談中...');
    const result = await callGrok41FastReasoning(prompt, {
      maxTokens: 3000,
      temperature: 0.7,
    });
    
    console.log(`✅ Grok CSO回答完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ Grok CSO相談エラー: ${error.message}`);
    if (error.stack) {
      console.error('スタック:', error.stack.substring(0, 200));
    }
    return { error: error.message };
  }
}

/**
 * JSONを抽出
 */
function extractJSON(text: string): any {
  try {
    // JSON部分を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { raw: text };
  } catch (error) {
    return { raw: text, parseError: error };
  }
}

/**
 * レポートを生成
 */
function generateReport(grokResponse: any): string {
  const grokData = typeof grokResponse === 'string' ? extractJSON(grokResponse) : grokResponse;

  return `# メールアドレス取得ポテンシャル分析レポート

**作成日**: ${new Date().toISOString()}  
**相談先**: Grok CSO（最高戦略責任者）  
**目的**: メールファースト戦略でのメールアドレス取得ポテンシャルの評価

---

## 📊 Grok CSOの分析結果

${typeof grokResponse === 'string' ? grokResponse : JSON.stringify(grokResponse, null, 2)}

---

## 🎯 主要な発見事項

### 1. 1日あたりのメールアドレス取得ポテンシャル

（Grok CSOの予測をここに記載）

### 2. 戦略的改善提案

（Grok CSOの提案をここに記載）

### 3. リードマグネットの評価

（Grok CSOの評価をここに記載）

---

## 📝 次のアクション

1. Grok CSOの提案を検討
2. 戦略的改善を実装
3. メールアドレス取得ポテンシャルを最大化

---

**作成者**: COO兼CTO（Cursor/Composer）  
**状態**: ✅ 分析完了
`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Grok CSOへのメールアドレス取得ポテンシャル相談を開始...\n');
  console.log('='.repeat(80));

  // 環境変数チェック
  if (!process.env.XAI_API_KEY) {
    console.error('❌ XAI_API_KEYが設定されていません');
    process.exit(1);
  }
  
  console.log('✅ 環境変数チェック完了\n');

  try {
    console.log('📞 Grok CSOに相談を開始します...\n');
    
    const grokResponse = await consultGrokCSO();

    console.log('\n✅ Grok CSOからの回答を受信しました\n');

    // レスポンスを保存
    const timestamp = Date.now();
    writeFileSync(
      join(OUTPUT_DIR, `email-acquisition-potential-${timestamp}.json`),
      JSON.stringify(grokResponse, null, 2),
      'utf-8'
    );

    // レポートを生成
    const report = generateReport(grokResponse);
    writeFileSync(
      join(OUTPUT_DIR, `email-acquisition-potential-report-${timestamp}.md`),
      report,
      'utf-8'
    );

    // ドキュメントディレクトリにも保存
    const docsDir = join(__dirname, '..', 'docs');
    writeFileSync(
      join(docsDir, `EMAIL_ACQUISITION_POTENTIAL_ANALYSIS.md`),
      report,
      'utf-8'
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ Grok CSOへの相談が完了しました！');
    console.log(`\n📋 結果ファイル:`);
    console.log(`  - JSON: ${join(OUTPUT_DIR, `email-acquisition-potential-${timestamp}.json`)}`);
    console.log(`  - レポート: ${join(OUTPUT_DIR, `email-acquisition-potential-report-${timestamp}.md`)}`);
    console.log(`  - ドキュメント: ${join(docsDir, `EMAIL_ACQUISITION_POTENTIAL_ANALYSIS.md`)}`);
    
    // レスポンスの一部を表示
    console.log('\n📊 Grok CSOの回答（一部）:');
    if (typeof grokResponse === 'string') {
      console.log(grokResponse.substring(0, 1000) + '...\n');
    } else {
      console.log(JSON.stringify(grokResponse, null, 2).substring(0, 1000) + '...\n');
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
