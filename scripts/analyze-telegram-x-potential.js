#!/usr/bin/env node
/**
 * Telegram + X（Twitter）同時展開のポテンシャル分析
 * Grok CSO+CFO（grok-4-1-fast-reasoning）を使用
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const OpenAI = require('openai');

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
 * Grok CSO+CFO（grok-4-1-fast-reasoning）で分析を実行
 */
async function analyzeTelegramXPotential() {
  const prompt = `あなたはTrap Defence BTCのCSO（Chief Strategy Officer）兼CFO（Chief Financial Officer）として、Telegram + X（Twitter）同時展開のポテンシャルを戦略的・財務的視点から分析してください。

## 現状のVSLワークフロー

### 実装済み
- VSL1投稿: Telegram MINIMALチャンネル（1日2回: 9時、21時 UTC）
- VSL2配信: Telegram DM（24時間後）
- VSL1リマインダー: Telegram DM（12時間後）
- VSL2ラストコール: Telegram DM（22時間後）

### 未実装
- VSL1投稿: X（Twitter）投稿（TODOコメントあり）

## X API料金プラン

### Freeプラン: $0/month
- 読み取り: 100 posts/month
- 書き込み: 500 posts/month
- VSL1投稿頻度: 1日2回 = 月60回 → 十分対応可能

### Basicプラン: $200/month
- 読み取り: 15,000 posts/month
- 書き込み: 50,000 posts/month
- エンゲージメント分析が可能

## 分析依頼事項

以下の視点から、Telegram + X（Twitter）同時展開のポテンシャルを分析してください：

### 1. 戦略的視点（CSO）
- **リーチ拡大のポテンシャル**: Telegramのみ vs Telegram + Xのリーチ範囲の比較
- **マーケティングチャネル戦略**: マルチチャネル展開の優位性
- **ブランド認知度向上**: X展開によるブランド露出の拡大効果
- **競合優位性**: 競合他社との差別化要因
- **リスク分析**: X展開によるリスクと対策

### 2. 財務的視点（CFO）
- **ROI分析**: X API統合の投資対効果
- **コスト分析**: Freeプラン vs Basicプランのコスト比較
- **収益予測**: X展開によるコンバージョン率向上の予測
- **損益分岐点**: どの時点でBasicプランに移行すべきか
- **財務リスク**: X API統合による財務リスク

### 3. 実装優先度
- **実装の優先度**: どの機能から実装すべきか
- **段階的展開**: 初期段階から成長段階までの展開計画
- **KPI設定**: 成功指標の設定

### 4. 具体的な推奨事項
- **即座に実行すべき施策**: 優先度の高い施策
- **中期戦略**: 3-6ヶ月の戦略
- **長期戦略**: 6ヶ月以上の戦略

## 出力形式

以下の形式で分析結果を出力してください：

### 1. エグゼクティブサマリー（200-300字）
### 2. 戦略的視点（CSO）の分析
### 3. 財務的視点（CFO）の分析
### 4. 実装優先度とロードマップ
### 5. 具体的な推奨事項
### 6. 結論と次のアクション

日本語で回答してください。`;

  try {
    console.log('🔄 Grok CSO+CFO（grok-4-1-fast-reasoning）で分析を実行中...\n');

    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのCSO（Chief Strategy Officer）兼CFO（Chief Financial Officer）です。戦略的・財務的視点から、データに基づいた分析と推奨事項を提供してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const analysis = completion.choices[0]?.message?.content || '';
    const usage = completion.usage || {};

    console.log('='.repeat(80));
    console.log('📊 Telegram + X（Twitter）同時展開のポテンシャル分析');
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
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '../docs/TELEGRAM_X_POTENTIAL_ANALYSIS.md');
    
    const output = `# Telegram + X（Twitter）同時展開のポテンシャル分析

**作成日**: ${new Date().toISOString().split('T')[0]}  
**分析AI**: Grok CSO+CFO（grok-4-1-fast-reasoning）  
**目的**: Telegram + X（Twitter）同時展開の戦略的・財務的ポテンシャル分析

---

${analysis}

---

**API使用量**:
- 入力トークン: ${usage.prompt_tokens || 0}
- 出力トークン: ${usage.completion_tokens || 0}
- 合計トークン: ${usage.total_tokens || 0}
`;

    fs.writeFileSync(outputPath, output, 'utf8');
    console.log(`\n✅ 分析結果を保存しました: ${outputPath}`);

    return { analysis, usage };
  } catch (error) {
    console.error('❌ Grok API呼び出しエラー:', error.message);
    throw error;
  }
}

// メイン実行
if (require.main === module) {
  analyzeTelegramXPotential()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 分析失敗:', error);
      process.exit(1);
    });
}

module.exports = { analyzeTelegramXPotential };
