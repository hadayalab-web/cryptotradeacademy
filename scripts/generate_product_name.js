// scripts/generate_product_name.js
// GrokにXでバズるプロダクト名を命名させるスクリプト

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { generateProductNames } = require('../services/grok/client');

async function main() {
  const productConcept = `CryptoTradeAcademyブランドのサービス

【主要特徴】
1. SELL/SHORT専門の80%勝率シグナル配信
   - トレンド転換を捉える高精度アルゴリズム
   - 緊急配信（15分間隔）で機会を逃さない
   - バックテスト検証済みの80%以上勝率

2. Gemini生成コンテンツ搭載のセンチメントニュース配信
   - AI生成画像・動画による視覚的な市場分析
   - 定期配信（4時間ごと）で市場の全体像を提供
   - ユーザーインパクトレポート（非利用者の機会損失を報告）

3. 独自のポジショニング
   - CryptoQuantオンチェーンデータ + X（Twitter）リアルタイム分析
   - 多市場対応（EN/AR/KO/JA/ES/PT-BR）
   - 市場別ペルソナ（Precision Sniper, Shield Wall, Kimchi Sniper等）

【ターゲット】
- アクティブなBTCトレーダー
- ショートポジションを重視するトレーダー
- AI生成コンテンツに興味のある投資家
- データドリブンな意思決定を求めるトレーダー

【Xでバズる要素】
- 80%勝率という具体的な数値
- SELL/SHORT専門という差別化
- AI生成コンテンツの新しさ
- 機会損失を可視化するインパクトレポート`;

  try {
    console.log('🚀 Grokにプロダクト名生成を依頼中...');
    console.log(`📝 コンセプト長: ${productConcept.length}文字\n`);

    const result = await generateProductNames(productConcept, 'en');

    console.log('\n' + '='.repeat(80));
    console.log('🎯 Xでバズるプロダクト名提案（Grok生成）');
    console.log('='.repeat(80));
    console.log('\n' + result);
    console.log('\n' + '='.repeat(80));
    console.log('✅ プロダクト名生成完了');
  } catch (error) {
    console.error('❌ エラー:', error?.message);
    if (error?.stack) {
      console.error('スタック:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
