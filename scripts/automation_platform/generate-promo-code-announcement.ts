#!/usr/bin/env tsx
/**
 * Whopプロモコードの残り枠に基づいて緊急性の高いアナウンスを生成
 * 「あと何名！お早めに！」のようなメッセージを自動生成
 */

import { getWhopPromoCodeByCode } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * 残り枠に応じた緊急性メッセージを生成
 */
function generateUrgencyMessage(remainingUses: number | null, totalStock: number): {
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  emoji: string;
} {
  if (remainingUses === null) {
    return {
      urgencyLevel: 'low',
      message: '先着50名限定！今すぐ参加',
      emoji: '🎁'
    };
  }

  const percentage = (remainingUses / totalStock) * 100;

  if (remainingUses <= 5) {
    return {
      urgencyLevel: 'critical',
      message: `🚨 残り${remainingUses}名！今すぐ！`,
      emoji: '🚨'
    };
  } else if (remainingUses <= 10) {
    return {
      urgencyLevel: 'critical',
      message: `⚠️ 残り${remainingUses}名！最後のチャンス！`,
      emoji: '⚠️'
    };
  } else if (remainingUses <= 25) {
    return {
      urgencyLevel: 'high',
      message: `⚡ 残り${remainingUses}名！お早めに！`,
      emoji: '⚡'
    };
  } else if (remainingUses <= 40) {
    return {
      urgencyLevel: 'medium',
      message: `🎯 残り${remainingUses}名！今すぐ参加`,
      emoji: '🎯'
    };
  } else {
    return {
      urgencyLevel: 'low',
      message: `🎁 先着50名限定！今すぐ参加`,
      emoji: '🎁'
    };
  }
}

/**
 * Telegram/X投稿用のメッセージを生成
 */
function generatePostingMessage(
  promoCode: string,
  remainingUses: number | null,
  totalStock: number,
  whopUrl: string,
  vslUrl?: string
): string {
  const urgency = generateUrgencyMessage(remainingUses, totalStock);
  const remainingText = remainingUses !== null ? `${remainingUses}名` : '50名';

  return `${urgency.emoji} ${urgency.message}

🎬 Two Young Men Story

昨夜、2人の若者がいました。
1人は、Whale Trapですべてを失いました。
もう1人は、コーヒーを飲みながら、$5,000の利益を出しました。

違いは運ではありませんでした。
それは「ディフェンダー」になることでした。

🛡️ Trap Defence BTCは、4つのAIエンジンが連携:
• CryptoQuant AI: クジラの動きを監視
• Grok AI: リアルタイムセンチメント分析
• GPT Logic: FOMOを排除するメンタルトレーニング
• Gemini Engine: 3秒で判断できるダッシュボード

📊 Trap Score（0-100）で、機関投資家の罠を可視化。
70%の時間は待機、90%の確信がある時だけ動く。

🎁 Defender's Protocol Campaign
先着50名限定、すべて50%OFF！

• 月額プラン: $34.50（通常$69）
• 年間プラン: $294（1日あたり$1以下）

${urgency.emoji} 残り${remainingText}！${remainingUses !== null && remainingUses <= 10 ? '急いで！' : 'お早めに！'}

${vslUrl ? `🎥 このVSLで詳細を確認:\n${vslUrl}\n\n` : ''}👆 Telegram Botに参加（ワンクリック）:
@TrapDefenceBot /start minimal

または、Whopで直接確認（コード: ${promoCode}）:
${whopUrl}

#Bitcoin #CryptoTrading #TrapDefence #FreeSignals #${promoCode}`;
}

/**
 * 短縮版メッセージ（緊急告知用）
 */
function generateShortUrgencyMessage(
  promoCode: string,
  remainingUses: number | null,
  totalStock: number,
  whopUrl: string
): string {
  const urgency = generateUrgencyMessage(remainingUses, totalStock);
  const remainingText = remainingUses !== null ? `${remainingUses}名` : '50名';

  return `${urgency.emoji} ${urgency.message}

50%OFFクーポン『${promoCode}』が消滅間近。
今すぐ防御プロトコルを起動してください。

${whopUrl}?coupon=${promoCode}

#${promoCode} #TrapDefence`;
}

async function main() {
  const args = process.argv.slice(2);
  const code = args.find(arg => arg.startsWith('--code'))?.split('=')[1] || 'DEFEND50';
  const format = args.find(arg => arg.startsWith('--format'))?.split('=')[1] || 'full';
  const whopUrl = args.find(arg => arg.startsWith('--url'))?.split('=')[1] || 'https://whop.com/aio-media-llc/trap-defence-btc-en/';
  const vslUrl = args.find(arg => arg.startsWith('--vsl'))?.split('=')[1] || 'https://youtu.be/6Z7AfE9FSy4';

  try {
    console.log(`🔍 プロモコード「${code}」の残り枠を確認中...\n`);

    const result = await getWhopPromoCodeByCode(code, {
      status: 'active',
    });

    console.log('='.repeat(60));
    console.log('プロモコード残り枠情報:');
    console.log('='.repeat(60));
    console.log(`コード: ${result.code}`);
    console.log(`ステータス: ${result.status}`);
    
    if (result.unlimitedStock) {
      console.log(`残り枠: 無制限`);
      console.log('\n⚠️  無制限のプロモコードのため、緊急性メッセージは生成できません。');
      process.exit(0);
    }

    const stock = result.stock || 50;
    const remainingUses = result.remainingUses || 0;
    
    console.log(`総在庫: ${stock}件`);
    console.log(`使用済み: ${result.uses || 0}件`);
    console.log(`残り枠: ${remainingUses}件`);
    
    // 残り枠の割合を計算
    if (stock > 0) {
      const percentage = Math.round((remainingUses / stock) * 100);
      console.log(`残り割合: ${percentage}%`);
    }

    // 緊急性メッセージを生成
    const urgency = generateUrgencyMessage(remainingUses, stock);
    console.log(`\n緊急性レベル: ${urgency.urgencyLevel}`);
    console.log(`緊急性メッセージ: ${urgency.message}`);

    // 投稿用メッセージを生成
    console.log('\n' + '='.repeat(60));
    console.log('📱 投稿用メッセージ:');
    console.log('='.repeat(60));
    
    if (format === 'short') {
      const message = generateShortUrgencyMessage(code, remainingUses, stock, whopUrl);
      console.log(message);
    } else {
      const message = generatePostingMessage(code, remainingUses, stock, whopUrl, vslUrl);
      console.log(message);
    }

    // 緊急性の推奨事項
    console.log('\n' + '='.repeat(60));
    console.log('💡 推奨事項:');
    console.log('='.repeat(60));
    
    if (remainingUses <= 10) {
      console.log('🚨 緊急告知が必要です！');
      console.log('   - Telegram/Xで即座に投稿');
      console.log('   - プッシュ通知を送信');
      console.log('   - メールで緊急告知');
    } else if (remainingUses <= 25) {
      console.log('⚠️  残り枠が少なくなってきました。');
      console.log('   - 頻繁に投稿（1日2-3回）');
      console.log('   - 緊急性を強調したメッセージを使用');
    } else {
      console.log('✅ 通常の投稿頻度で問題ありません。');
      console.log('   - 1日1-2回の投稿');
    }

    if (result.expirationDatetime) {
      const expirationDate = new Date(result.expirationDatetime * 1000);
      const now = new Date();
      const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`\n有効期限: ${expirationDate.toLocaleString('ja-JP')} (残り${daysLeft}日)`);
    }

    console.log('\n' + '='.repeat(60));
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

main();
