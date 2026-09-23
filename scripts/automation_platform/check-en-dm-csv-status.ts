#!/usr/bin/env tsx
/**
 * EN版DM CSV状態確認スクリプト
 * 
 * CSVファイルから準備済みDMの状態を確認
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_FILE_PATH = join(__dirname, '..', 'data', 'user-list-en.csv');

interface CandidateRow {
  username: string;
  display_name?: string;
  market: string;
  telegram_user_id?: string;
  email?: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

function readCSV(): CandidateRow[] {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.log(`⚠️ CSVファイルが見つかりません: ${CSV_FILE_PATH}\n`);
    return [];
  }

  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as CandidateRow[];

  return records;
}

function extractDMMessage(notes: string | null | undefined): string | null {
  if (!notes) return null;
  
  const dmMessageMatch = notes.match(/DMメッセージ:\s*([\s\S]*?)(?:\n\n|$)/);
  if (dmMessageMatch && dmMessageMatch[1]) {
    return dmMessageMatch[1].trim();
  }
  
  return null;
}

async function main() {
  console.log('📊 EN版DM CSV状態確認\n');
  console.log('='.repeat(80) + '\n');

  const allRows = readCSV();

  if (allRows.length === 0) {
    console.log('⚠️ CSVファイルにデータがありません。');
    console.log('   CSVファイルを作成してください。\n');
    return;
  }

  // EN市場のデータをフィルタ
  const enRows = allRows.filter(row => row.market === 'EN');
  const totalCount = enRows.length;
  const newCount = enRows.filter(row => row.status === 'New').length;
  const contactedCount = enRows.filter(row => row.status === 'Contacted').length;

  console.log('📊 統計情報:');
  console.log(`  - EN市場の総ユーザー数: ${totalCount}件`);
  console.log(`  - 準備済み（status=New）: ${newCount}件`);
  console.log(`  - 送信済み（status=Contacted）: ${contactedCount}件\n`);

  // サンプルデータ確認
  if (newCount > 0) {
    console.log('📋 準備済みDMサンプル（最大10件）:\n');
    
    const samples = enRows
      .filter(row => row.status === 'New')
      .slice(0, 10);

    samples.forEach((sample, index) => {
      console.log(`${index + 1}. ${sample.username}`);
      console.log(`   - Display Name: ${sample.display_name || 'N/A'}`);
      console.log(`   - Telegram User ID: ${sample.telegram_user_id || 'N/A'}`);
      console.log(`   - Email: ${sample.email || 'N/A'}`);
      
      const dmMessage = extractDMMessage(sample.notes);
      if (dmMessage) {
        const dmPreview = dmMessage.substring(0, 100);
        console.log(`   - DMメッセージ: ${dmPreview}...`);
      } else {
        console.log(`   - DMメッセージ: 見つかりません`);
      }
      console.log('');
    });
  } else {
    console.log('⚠️ 準備済みDMがありません。');
    console.log('   CSVファイルにデータを追加してください。\n');
  }

  // 連絡先情報の確認
  const withTelegram = enRows.filter(row => 
    row.status === 'New' && row.telegram_user_id
  ).length;

  const withEmail = enRows.filter(row => 
    row.status === 'New' && row.email
  ).length;

  const withBoth = enRows.filter(row => 
    row.status === 'New' && row.telegram_user_id && row.email
  ).length;

  const withNeither = enRows.filter(row => 
    row.status === 'New' && !row.telegram_user_id && !row.email
  ).length;

  console.log('📞 連絡先情報:');
  console.log(`  - Telegram User IDあり: ${withTelegram}件`);
  console.log(`  - Emailあり: ${withEmail}件`);
  console.log(`  - 両方あり: ${withBoth}件`);
  console.log(`  - 両方なし: ${withNeither}件\n`);

  if (withNeither > 0) {
    console.log('⚠️ 連絡先情報がないユーザーがいます。送信できません。\n');
  }
}

main()
  .then(() => {
    console.log('='.repeat(80));
    console.log('✅ CSV状態確認完了');
    console.log('='.repeat(80) + '\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  });
