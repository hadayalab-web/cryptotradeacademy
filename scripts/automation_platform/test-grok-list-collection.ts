#!/usr/bin/env tsx
/**
 * Grok CSOリスト収集テストスクリプト
 * 
 * 目的: Grok CSOがユーザーリストを収集し、CSVファイルに保存する機能をテスト
 * 
 * 処理内容:
 * 1. Grok CSOがEN市場のユーザーリストを収集（テスト用に10-20件）
 * 2. 収集したデータをCSVファイル（data/user-list-en.csv）に追加
 * 3. 結果をレポート
 * 
 * 注意: 実際の送信は行いません。リスト収集のみをテストします。
 */

import { callGrok41FastReasoning } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const CSV_FILE_PATH = join(__dirname, '..', 'data', 'user-list-en.csv');
const MARKET = 'EN';

interface UserRow {
  username: string;
  display_name?: string;
  market: string;
  telegram_user_id?: string;
  email?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface GrokUser {
  username: string;
  displayName?: string;
  profileUrl?: string;
  followerCount?: number;
  engagementRate?: number;
  recentTopics?: string[];
  painPoints?: string[];
  contentType?: string;
  telegramUserId?: string;
  email?: string;
  preferredChannel?: string;
  matchScore?: number;
  matchReason?: string;
}

/**
 * CSVファイルを読み込む
 */
function readCSV(): UserRow[] {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    // ヘッダー行のみのCSVを作成
    const header = 'username,display_name,market,telegram_user_id,email,status,created_at,updated_at\n';
    fs.writeFileSync(CSV_FILE_PATH, header, 'utf-8');
    return [];
  }

  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  if (!content.trim()) {
    return [];
  }

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as UserRow[];

  return records;
}

/**
 * CSVファイルに書き込む
 */
function writeCSV(rows: UserRow[]) {
  const csvContent = stringify(rows, {
    header: true,
    columns: ['username', 'display_name', 'market', 'telegram_user_id', 'email', 'status', 'created_at', 'updated_at'],
  });
  fs.writeFileSync(CSV_FILE_PATH, csvContent, 'utf-8');
}

/**
 * Grok CSOがユーザーリストを収集
 */
async function collectUsersWithGrokCSO(market: string, maxUsers: number = 20): Promise<GrokUser[]> {
  console.log(`💰 Grok（CSO）に${market}市場のユーザーリスト収集を依頼中...`);
  console.log(`📋 チャネル: Telegram、X（Twitter）投稿、Emailを想定`);
  console.log(`📊 目標: ${maxUsers}件のユーザーを収集\n`);

  const marketQueries: Record<string, string[]> = {
    EN: ['crypto trading', 'bitcoin analysis', 'trading signals', 'crypto trap', 'defensive trading'],
    AR: ['تداول العملات المشفرة', 'تحليل البيتكوين', 'إشارات التداول'],
    KO: ['암호화폐 거래', '비트코인 분석', '트레이딩 시그널'],
    JA: ['暗号通貨取引', 'ビットコイン分析', 'トレーディングシグナル'],
    ES: ['trading de criptomonedas', 'análisis de bitcoin', 'señales de trading'],
    'PT-BR': ['trading de criptomoedas', 'análise de bitcoin', 'sinais de trading'],
  };

  const queries = marketQueries[market] || marketQueries.EN;

  const prompt = `【ユーザーリスト収集 - CSO（Grok）】

市場: ${market}
プロダクト: Trap Defence BTC
目標: ${maxUsers}件のユーザーを収集

以下の3つのチャネルを想定してユーザーリストを収集してください：
1. **Telegram**: TGチャンネル/グループのメンバー、TGで活動しているトレーダー
2. **X（Twitter）**: Xで投稿しているトレーダー、Xでフォローしているユーザー
3. **Email**: メールアドレスが公開されている、またはメール配信を受け取っているトレーダー

以下の検索クエリでユーザーを探してください：
${queries.map(q => `- "${q}"`).join('\n')}

## 収集する情報

各ユーザーについて、以下の情報を収集してください：

1. **基本情報**:
   - X（Twitter）のユーザー名（@username、またはusername形式）
   - 表示名
   - プロフィールURL（もしあれば）
   - フォロワー数（もしあれば）
   - エンゲージメント率（推定、もしあれば）

2. **コンテンツ分析**:
   - 最近の投稿トピック（3-5個）
   - ペインポイント（推測）
   - コンテンツタイプ（教育、分析、シグナル配信など）

3. **連絡先情報（重要）**:
   - Telegram User ID（もしあれば）
   - X（Twitter）のユーザー名（@username）
   - メールアドレス（もしあれば）
   - 優先チャネル（TG/X/Emailのうち、どのチャネルが最適か）

4. **マッチスコア**:
   - Trap Defence BTCとの適合度（0-10点）
   - 選定理由

## 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "users": [
    {
      "username": "username（@なし、英数字のみ）",
      "displayName": "Display Name",
      "profileUrl": "https://x.com/username",
      "followerCount": 10000,
      "engagementRate": 5.2,
      "recentTopics": ["topic1", "topic2", "topic3"],
      "painPoints": ["pain1", "pain2"],
      "contentType": "教育",
      "telegramUserId": "123456789",
      "email": "user@example.com",
      "preferredChannel": "TG",
      "matchScore": 8,
      "matchReason": "選定理由"
    }
  ],
  "total": ${maxUsers},
  "market": "${market}"
}
\`\`\`

**重要**:
- usernameは@なしで、英数字とアンダースコアのみ（例: "cryptotrader123"）
- 少なくとも${maxUsers}件のユーザーを収集してください
- 各ユーザーには、telegramUserIdまたはemailのどちらかが必須です`;

  try {
    const result = await callGrok41FastReasoning(prompt, {
      temperature: 0.7,
      maxTokens: 8192,
    });

    // JSONを抽出
    const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/) || result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      const data = JSON.parse(jsonText);
      
      const users = data.users || [];
      console.log(`✅ ${market}市場: ${users.length}件のユーザーをGrokで収集\n`);
      return users;
    } else {
      console.warn(`⚠️ ${market}市場: GrokのレスポンスからJSONを抽出できませんでした`);
      console.log('📝 Grokのレスポンス:');
      console.log(result.text.substring(0, 500));
      return [];
    }
  } catch (error: any) {
    console.error(`❌ ${market}市場のGrokリスト収集エラー:`, error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    return [];
  }
}

/**
 * GrokユーザーをCSV行に変換
 */
function convertGrokUserToCSVRow(user: GrokUser): UserRow {
  // usernameから@を削除、英数字とアンダースコアのみに正規化
  const username = (user.username || '').replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '_');
  
  // 優先チャネルに基づいて送信先を決定
  const preferredChannel = user.preferredChannel || 'TG';
  const telegramUserId = preferredChannel === 'TG' && user.telegramUserId ? user.telegramUserId : undefined;
  const email = preferredChannel === 'Email' && user.email ? user.email : undefined;

  // どちらもない場合は、利用可能な方を優先
  const finalTelegramUserId = telegramUserId || user.telegramUserId;
  const finalEmail = email || user.email;

  const now = new Date().toISOString();

  return {
    username: username || `user_${Date.now()}`,
    display_name: user.displayName || undefined,
    market: MARKET,
    telegram_user_id: finalTelegramUserId || undefined,
    email: finalEmail || undefined,
    status: 'New',
    created_at: now,
    updated_at: now,
  };
}

async function main() {
  console.log('🚀 Grok CSOリスト収集テスト開始\n');
  console.log('='.repeat(80));
  console.log('📋 処理内容:');
  console.log('  1. Grok CSOがEN市場のユーザーリストを収集（テスト用: 10-20件）');
  console.log('  2. 収集したデータをCSVファイルに追加');
  console.log('  3. 結果をレポート');
  console.log('='.repeat(80) + '\n');

  // 環境変数チェック
  if (!process.env.XAI_API_KEY) {
    throw new Error('XAI_API_KEY環境変数が設定されていません');
  }

  // 既存のCSVを読み込む
  const existingRows = readCSV();
  const existingUsernames = new Set(existingRows.map(row => row.username));
  console.log(`📊 既存のユーザー数: ${existingRows.length}件\n`);

  // Grok CSOがリストを収集
  const grokUsers = await collectUsersWithGrokCSO(MARKET, 20);

  if (grokUsers.length === 0) {
    console.log('⚠️ Grok CSOがユーザーを収集できませんでした。');
    console.log('   プロンプトやAPIキーを確認してください。\n');
    return;
  }

  // CSV行に変換（重複を除外）
  const newRows: UserRow[] = [];
  let skipped = 0;

  for (const user of grokUsers) {
    const csvRow = convertGrokUserToCSVRow(user);
    
    // 重複チェック
    if (existingUsernames.has(csvRow.username)) {
      skipped++;
      continue;
    }

    // 送信先情報の確認
    if (!csvRow.telegram_user_id && !csvRow.email) {
      console.warn(`⚠️ ${csvRow.username}: 送信先情報がありません（スキップ）`);
      skipped++;
      continue;
    }

    newRows.push(csvRow);
    existingUsernames.add(csvRow.username);
  }

  // CSVに追加
  if (newRows.length > 0) {
    const allRows = [...existingRows, ...newRows];
    writeCSV(allRows);
    console.log(`✅ ${newRows.length}件のユーザーをCSVファイルに追加しました`);
  } else {
    console.log('⚠️ 追加できるユーザーがありませんでした（すべて重複または送信先情報なし）');
  }

  if (skipped > 0) {
    console.log(`⚠️ ${skipped}件のユーザーをスキップしました（重複または送信先情報なし）`);
  }

  // 結果レポート
  console.log('\n' + '='.repeat(80));
  console.log('📊 結果サマリー');
  console.log('='.repeat(80));
  console.log(`- Grok CSOが収集: ${grokUsers.length}件`);
  console.log(`- CSVに追加: ${newRows.length}件`);
  console.log(`- スキップ: ${skipped}件`);
  console.log(`- 総ユーザー数: ${existingRows.length + newRows.length}件`);
  console.log('='.repeat(80) + '\n');

  // 追加されたユーザーのサンプル表示
  if (newRows.length > 0) {
    console.log('📋 追加されたユーザー（サンプル）:\n');
    newRows.slice(0, 5).forEach((row, index) => {
      console.log(`${index + 1}. ${row.username} (${row.display_name || 'N/A'})`);
      console.log(`   - Telegram: ${row.telegram_user_id || 'N/A'}`);
      console.log(`   - Email: ${row.email || 'N/A'}`);
      console.log('');
    });
  }
}

main()
  .then(() => {
    console.log('='.repeat(80));
    console.log('✅ Grok CSOリスト収集テスト完了');
    console.log('='.repeat(80) + '\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });
