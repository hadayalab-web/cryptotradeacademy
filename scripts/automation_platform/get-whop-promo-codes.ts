#!/usr/bin/env tsx
/**
 * Whopプロモーションコード取得スクリプト
 * Whop APIを使用してプロモーションコード（クーポンコード）を取得します
 */

import { getWhopPromoCodes, getWhopPromoCode } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'list' || !command) {
      // プロモーションコード一覧を取得
      const page = args.find(arg => arg.startsWith('--page'))?.split('=')[1] 
        ? parseInt(args.find(arg => arg.startsWith('--page'))!.split('=')[1]) 
        : 1;
      const perPage = args.find(arg => arg.startsWith('--perPage'))?.split('=')[1] 
        ? parseInt(args.find(arg => arg.startsWith('--perPage'))!.split('=')[1]) 
        : 50;
      const status = args.find(arg => arg.startsWith('--status'))?.split('=')[1] as 
        'active' | 'inactive' | 'archived' | undefined;

      console.log('📋 Whopプロモーションコード一覧を取得中...\n');
      
      const result = await getWhopPromoCodes({
        page,
        perPage,
        status,
        expand: ['plans']
      });

      console.log('='.repeat(60));
      console.log('プロモーションコード一覧:');
      console.log('='.repeat(60));
      console.log(`総数: ${result.pagination.total_count}`);
      console.log(`ページ: ${result.pagination.current_page}/${result.pagination.total_page}\n`);

      if (result.promoCodes.length === 0) {
        console.log('プロモーションコードが見つかりませんでした。');
      } else {
        result.promoCodes.forEach((promo: any, index: number) => {
          console.log(`\n[${index + 1}] ${promo.code || promo.id}`);
          console.log(`  ID: ${promo.id}`);
          console.log(`  コード: ${promo.code || 'N/A'}`);
          console.log(`  タイプ: ${promo.promo_type || 'N/A'}`);
          console.log(`  割引額: ${promo.amount_off || 0} ${promo.base_currency || 'USD'}`);
          console.log(`  ステータス: ${promo.status || 'N/A'}`);
          console.log(`  在庫: ${promo.unlimited_stock ? '無制限' : `${promo.stock || 0}件`}`);
          console.log(`  使用回数: ${promo.uses || 0}回`);
          console.log(`  新規ユーザーのみ: ${promo.new_users_only ? 'はい' : 'いいえ'}`);
          if (promo.expiration_datetime) {
            const expirationDate = new Date(promo.expiration_datetime * 1000);
            console.log(`  有効期限: ${expirationDate.toLocaleString('ja-JP')}`);
          }
          if (promo.created_at) {
            const createdDate = new Date(promo.created_at * 1000);
            console.log(`  作成日時: ${createdDate.toLocaleString('ja-JP')}`);
          }
        });
      }

      console.log('\n' + '='.repeat(60));
    } else if (command === 'get') {
      // 特定のプロモーションコードを取得
      const promoCodeId = args.find(arg => arg.startsWith('--id'))?.split('=')[1] || args[1];
      
      if (!promoCodeId) {
        console.error('❌ エラー: プロモーションコードIDを指定してください');
        console.error('使用方法: npx tsx scripts/get-whop-promo-codes.ts get --id=promo_1234567890');
        process.exit(1);
      }

      console.log(`🔍 プロモーションコード「${promoCodeId}」を取得中...\n`);
      
      const result = await getWhopPromoCode(promoCodeId, {
        expand: ['plans']
      });

      console.log('='.repeat(60));
      console.log('プロモーションコード詳細:');
      console.log('='.repeat(60));
      console.log(`ID: ${result.promoCodeId}`);
      console.log(`コード: ${result.code || 'N/A'}`);
      console.log(`タイプ: ${result.promoType || 'N/A'}`);
      console.log(`割引額: ${result.amountOff || 0} ${result.baseCurrency || 'USD'}`);
      console.log(`ステータス: ${result.status || 'N/A'}`);
      console.log(`在庫: ${result.unlimitedStock ? '無制限' : `${result.stock || 0}件`}`);
      console.log(`使用回数: ${result.uses || 0}回`);
      if (result.remainingUses !== null && result.remainingUses !== undefined) {
        console.log(`残り枠: ${result.remainingUses}件`);
      } else if (result.unlimitedStock) {
        console.log(`残り枠: 無制限`);
      }
      console.log(`新規ユーザーのみ: ${result.newUsersOnly ? 'はい' : 'いいえ'}`);
      console.log(`既存メンバーシップのみ: ${result.existingMembershipsOnly ? 'はい' : 'いいえ'}`);
      console.log(`期間: ${result.duration || 'N/A'}`);
      if (result.expirationDatetime) {
        const expirationDate = new Date(result.expirationDatetime * 1000);
        console.log(`有効期限: ${expirationDate.toLocaleString('ja-JP')}`);
      }
      if (result.createdAt) {
        const createdDate = new Date(result.createdAt * 1000);
        console.log(`作成日時: ${createdDate.toLocaleString('ja-JP')}`);
      }
      console.log('\n' + '='.repeat(60));
    } else {
      console.error('❌ 不明なコマンド:', command);
      console.error('\n使用方法:');
      console.error('  npx tsx scripts/get-whop-promo-codes.ts [list] [--page=1] [--perPage=50] [--status=active]');
      console.error('  npx tsx scripts/get-whop-promo-codes.ts get --id=promo_1234567890');
      console.error('\n例:');
      console.error('  npx tsx scripts/get-whop-promo-codes.ts list');
      console.error('  npx tsx scripts/get-whop-promo-codes.ts list --status=active');
      console.error('  npx tsx scripts/get-whop-promo-codes.ts get --id=promo_1234567890');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

main();
