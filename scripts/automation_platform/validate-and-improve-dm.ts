#!/usr/bin/env tsx
/**
 * DM検証・改善サイクルスクリプト
 * 
 * 本番環境で検証して課題を可視化し、改善を実施
 * 
 * 使用方法:
 *   npx tsx scripts/validate-and-improve-dm.ts
 */

import { PrismaClient } from '@prisma/client';
import { sendResendEmail } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const CEO_EMAIL = 'admin@cryptotradeacademy.io';

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  recommendation?: string;
}

async function validateDMContent() {
  const issues: ValidationIssue[] = [];

  try {
    // 準備済みDMを取得
    const candidates = await prisma.affiliateCandidate.findMany({
      where: {
        market: 'EN',
        status: 'New',
      },
      take: 10, // サンプルとして10件
    });

    if (candidates.length === 0) {
      issues.push({
        type: 'warning',
        category: 'データ',
        message: '準備済みDMがありません',
        recommendation: 'complete-6markets-whop-and-send-dm.ts を実行してください',
      });
      return issues;
    }

    // 各DMを検証
    for (const candidate of candidates) {
      const notes = candidate.notes || '';
      
      // DMメッセージ抽出
      const dmMessageMatch = notes.match(/DMメッセージ:\s*([\s\S]*?)(?:\n\n|$)/);
      if (!dmMessageMatch || !dmMessageMatch[1]) {
        issues.push({
          type: 'error',
          category: 'メッセージ抽出',
          message: `候補者 ${candidate.username || candidate.id}: DMメッセージが見つかりません`,
          recommendation: 'notesフィールドの形式を確認してください',
        });
        continue;
      }

      const dmMessage = dmMessageMatch[1].trim();

      // メッセージ長さ検証
      if (dmMessage.length > 4096) {
        issues.push({
          type: 'error',
          category: 'メッセージ長さ',
          message: `候補者 ${candidate.username || candidate.id}: メッセージが4096文字を超えています (${dmMessage.length}文字)`,
          recommendation: 'メッセージを4096文字以内に短縮してください',
        });
      } else if (dmMessage.length > 3500) {
        issues.push({
          type: 'warning',
          category: 'メッセージ長さ',
          message: `候補者 ${candidate.username || candidate.id}: メッセージが長いです (${dmMessage.length}文字)`,
          recommendation: '読みやすさのため、メッセージを短縮することを検討してください',
        });
      }

      // 連絡先情報検証
      if (!candidate.telegramUserId && !candidate.email) {
        issues.push({
          type: 'error',
          category: '連絡先情報',
          message: `候補者 ${candidate.username || candidate.id}: Telegram User IDもEmailもありません`,
          recommendation: '連絡先情報を追加してください',
        });
      }

      // Whop URL検証
      if (!dmMessage.includes('whop.com')) {
        issues.push({
          type: 'warning',
          category: 'URL',
          message: `候補者 ${candidate.username || candidate.id}: Whop URLが見つかりません`,
          recommendation: 'Whop URLを含めてください',
        });
      }

      // HTMLタグ検証（Telegram用）
      if (dmMessage.includes('<') && dmMessage.includes('>')) {
        // HTMLタグが含まれている場合、正しい形式か確認
        const htmlTagPattern = /<[^>]+>/g;
        const tags = dmMessage.match(htmlTagPattern);
        if (tags) {
          const validTags = ['<b>', '</b>', '<i>', '</i>', '<u>', '</u>', '<s>', '</s>', '<a', '</a>', '<code>', '</code>', '<pre>', '</pre>'];
          for (const tag of tags) {
            const isValid = validTags.some(validTag => tag.toLowerCase().includes(validTag.toLowerCase()));
            if (!isValid) {
              issues.push({
                type: 'warning',
                category: 'HTMLフォーマット',
                message: `候補者 ${candidate.username || candidate.id}: 無効なHTMLタグが含まれています: ${tag}`,
                recommendation: 'TelegramでサポートされているHTMLタグのみを使用してください',
              });
            }
          }
        }
      }
    }

    // データベース統計
    const totalCount = await prisma.affiliateCandidate.count({
      where: { market: 'EN' },
    });
    const newCount = await prisma.affiliateCandidate.count({
      where: { market: 'EN', status: 'New' },
    });
    const contactedCount = await prisma.affiliateCandidate.count({
      where: { market: 'EN', status: 'Contacted' },
    });

    issues.push({
      type: 'info',
      category: '統計',
      message: `EN市場の候補者数: 総数 ${totalCount}件、準備済み ${newCount}件、送信済み ${contactedCount}件`,
    });

  } catch (error: any) {
    issues.push({
      type: 'error',
      category: 'システム',
      message: `検証エラー: ${error.message}`,
      recommendation: 'データベース接続と環境変数を確認してください',
    });
  }

  return issues;
}

async function generateImprovementReport(issues: ValidationIssue[]) {
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const infoCount = issues.filter(i => i.type === 'info').length;

  const reportContent = `📊 DM検証・改善レポート

⏱️ 検証時刻: ${new Date().toISOString()}

## 📊 検証結果サマリー

- **エラー**: ${errorCount}件
- **警告**: ${warningCount}件
- **情報**: ${infoCount}件
- **合計**: ${issues.length}件

## 🔴 エラー（即座に対応が必要）

${issues.filter(i => i.type === 'error').map(issue => 
  `- **${issue.category}**: ${issue.message}${issue.recommendation ? `\n  → 推奨対応: ${issue.recommendation}` : ''}`
).join('\n\n') || 'なし'}

## 🟡 警告（改善推奨）

${issues.filter(i => i.type === 'warning').map(issue => 
  `- **${issue.category}**: ${issue.message}${issue.recommendation ? `\n  → 推奨対応: ${issue.recommendation}` : ''}`
).join('\n\n') || 'なし'}

## ℹ️ 情報

${issues.filter(i => i.type === 'info').map(issue => 
  `- **${issue.category}**: ${issue.message}`
).join('\n\n') || 'なし'}

## 🚀 改善アクション

${errorCount > 0 ? `
### Phase 1: エラー修正（最優先）
1. 上記のエラーをすべて修正
2. 再度検証を実行
3. エラーが0件になるまで繰り返す
` : ''}

${warningCount > 0 ? `
### Phase 2: 警告対応（改善）
1. 警告項目を確認
2. 優先順位をつけて改善
3. 改善後、再度検証
` : ''}

### Phase 3: 継続的改善
1. 定期的に検証を実行
2. 課題を可視化
3. 改善を実施
4. 検証→改善のサイクルを回す

---

**次のステップ**: エラーを修正後、再度検証を実行してください。`;

  return reportContent;
}

async function main() {
  console.log('🔍 DM検証・改善サイクルスクリプト開始\n');
  console.log('='.repeat(80));
  console.log('📋 処理内容:');
  console.log('  1. 準備済みDMを検証');
  console.log('  2. 課題を可視化');
  console.log('  3. 改善レポートを生成');
  console.log('  4. CEOにレポートを送信');
  console.log('='.repeat(80) + '\n');

  try {
    // 検証実行
    console.log('🔍 DM検証中...\n');
    const issues = await validateDMContent();

    // レポート生成
    console.log('📊 改善レポート生成中...\n');
    const reportContent = await generateImprovementReport(issues);

    // 結果表示
    console.log('='.repeat(80));
    console.log('📊 検証結果');
    console.log('='.repeat(80));
    console.log(reportContent);
    console.log('='.repeat(80) + '\n');

    // CEOにレポート送信
    console.log('📧 CEOにレポート送信中...\n');
    try {
      await sendResendEmail({
        from: 'COO兼CTO <noreply@cryptotradeacademy.io>',
        to: CEO_EMAIL,
        subject: '📊 DM検証・改善レポート',
        html: reportContent.replace(/\n/g, '<br>'),
      });
      console.log('✅ CEOにレポートを送信しました\n');
    } catch (error: any) {
      console.warn(`⚠️ レポート送信失敗: ${error.message}\n`);
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('='.repeat(80));
    console.log('✅ DM検証・改善サイクルスクリプト完了');
    console.log('='.repeat(80) + '\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  });
