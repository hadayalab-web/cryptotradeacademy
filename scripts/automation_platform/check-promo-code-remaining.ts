#!/usr/bin/env tsx
/**
 * Whopプロモコードの残り枠を確認するスクリプト
 * プロモコード名（コード）で残り枠を取得します
 */

import { getWhopPromoCodeByCode } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function main() {
  const args = process.argv.slice(2);
  const code = args[0] || args.find(arg => arg.startsWith('--code'))?.split('=')[1] || 'DEFEND50';

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
    } else {
      console.log(`総在庫: ${result.stock || 0}件`);
      console.log(`使用済み: ${result.uses || 0}件`);
      console.log(`残り枠: ${result.remainingUses || 0}件`);
      
      // 残り枠の割合を計算
      if (result.stock && result.stock > 0) {
        const percentage = Math.round(((result.remainingUses || 0) / result.stock) * 100);
        console.log(`残り割合: ${percentage}%`);
      }
    }

    // 緊急性の表示
    if (result.remainingUses !== null && result.remainingUses !== undefined) {
      if (result.remainingUses <= 10) {
        console.log(`\n⚠️  残り${result.remainingUses}枠！緊急告知が必要です。`);
      } else if (result.remainingUses <= 25) {
        console.log(`\n⚠️  残り${result.remainingUses}枠。残り枠が少なくなってきました。`);
      }
    }

    if (result.expirationDatetime) {
      const expirationDate = new Date(result.expirationDatetime * 1000);
      const now = new Date();
      const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`有効期限: ${expirationDate.toLocaleString('ja-JP')} (残り${daysLeft}日)`);
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
