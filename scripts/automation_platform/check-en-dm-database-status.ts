#!/usr/bin/env tsx
/**
 * EN版DMデータベース状態確認スクリプト
 * 
 * 準備済みDMがデータベースに保存されているか確認
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function main() {
  console.log('📊 EN版DMデータベース状態確認\n');
  console.log('='.repeat(80) + '\n');

  try {
    // 総数確認
    const totalCount = await prisma.affiliateCandidate.count({
      where: {
        market: 'EN',
      },
    });

    const newCount = await prisma.affiliateCandidate.count({
      where: {
        market: 'EN',
        status: 'New',
      },
    });

    const contactedCount = await prisma.affiliateCandidate.count({
      where: {
        market: 'EN',
        status: 'Contacted',
      },
    });

    console.log('📊 統計情報:');
    console.log(`  - EN市場の総候補者数: ${totalCount}件`);
    console.log(`  - 準備済み（status=New）: ${newCount}件`);
    console.log(`  - 送信済み（status=Contacted）: ${contactedCount}件\n`);

    // サンプルデータ確認
    if (newCount > 0) {
      console.log('📋 準備済みDMサンプル（最大10件）:\n');
      
      const samples = await prisma.affiliateCandidate.findMany({
        where: {
          market: 'EN',
          status: 'New',
        },
        take: 10,
        select: {
          id: true,
          username: true,
          displayName: true,
          telegramUserId: true,
          email: true,
          notes: true,
        },
      });

      samples.forEach((sample, index) => {
        console.log(`${index + 1}. ${sample.username || 'N/A'} (ID: ${sample.id})`);
        console.log(`   - Display Name: ${sample.displayName || 'N/A'}`);
        console.log(`   - Telegram User ID: ${sample.telegramUserId || 'N/A'}`);
        console.log(`   - Email: ${sample.email || 'N/A'}`);
        
        // notesからDMメッセージを抽出
        const dmMessageMatch = sample.notes?.match(/DMメッセージ:\s*([\s\S]*?)(?:\n\n|$)/);
        if (dmMessageMatch && dmMessageMatch[1]) {
          const dmPreview = dmMessageMatch[1].trim().substring(0, 100);
          console.log(`   - DMメッセージ: ${dmPreview}...`);
        } else {
          console.log(`   - DMメッセージ: 見つかりません`);
        }
        console.log('');
      });
    } else {
      console.log('⚠️ 準備済みDMがありません。');
      console.log('   先にcomplete-6markets-whop-and-send-dm.tsを実行してください。\n');
    }

    // 連絡先情報の確認
    const withTelegram = await prisma.affiliateCandidate.count({
      where: {
        market: 'EN',
        status: 'New',
        telegramUserId: { not: null },
      },
    });

    const withEmail = await prisma.affiliateCandidate.count({
      where: {
        market: 'EN',
        status: 'New',
        email: { not: null },
      },
    });

    const withBoth = await prisma.affiliateCandidate.count({
      where: {
        market: 'EN',
        status: 'New',
        telegramUserId: { not: null },
        email: { not: null },
      },
    });

    const withNeither = await prisma.affiliateCandidate.count({
      where: {
        market: 'EN',
        status: 'New',
        telegramUserId: null,
        email: null,
      },
    });

    console.log('📞 連絡先情報:');
    console.log(`  - Telegram User IDあり: ${withTelegram}件`);
    console.log(`  - Emailあり: ${withEmail}件`);
    console.log(`  - 両方あり: ${withBoth}件`);
    console.log(`  - 両方なし: ${withNeither}件\n`);

    if (withNeither > 0) {
      console.log('⚠️ 連絡先情報がない候補者がいます。送信できません。\n');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('='.repeat(80));
    console.log('✅ データベース状態確認完了');
    console.log('='.repeat(80) + '\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  });
