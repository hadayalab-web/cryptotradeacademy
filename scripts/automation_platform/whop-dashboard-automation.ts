#!/usr/bin/env tsx
/**
 * Whopダッシュボード自動化スクリプト
 * 
 * Whop API v2ではアフィリエイター作成ができないため、
 * Puppeteer/Playwrightを使用してWhopダッシュボードに自動ログインし、
 * アフィリエイターを自動登録します。
 * 
 * 使用方法:
 *   npx tsx scripts/whop-dashboard-automation.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// .envファイルを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

/**
 * Whopダッシュボードでアフィリエイターを自動登録
 * 
 * 注意: PuppeteerまたはPlaywrightが必要です
 * インストール: npm install puppeteer または npm install playwright
 */
export async function automateWhopAffiliateRegistration(options: {
  candidates: Array<{
    email: string;
    name?: string;
    commissionRate?: number;
  }>;
  whopProductId: string;
  whopEmail?: string; // 環境変数から取得可能
  whopPassword?: string; // 環境変数から取得可能
  batchSize?: number;
  delayBetweenActions?: number;
  headless?: boolean;
}): Promise<{
  registered: number;
  failed: number;
  errors: Array<{ candidate: any; error: string }>;
}> {
  const {
    candidates,
    whopProductId,
    whopEmail = process.env.WHOP_EMAIL,
    whopPassword = process.env.WHOP_PASSWORD,
    batchSize = 10,
    delayBetweenActions = 2000,
    headless = false, // デバッグ時はfalse
  } = options;

  // PuppeteerまたはPlaywrightのインポートを試行
  let puppeteer: any;
  let playwright: any;

  try {
    puppeteer = await import('puppeteer');
  } catch (e) {
    try {
      playwright = await import('playwright');
    } catch (e2) {
      throw new Error(
        'PuppeteerまたはPlaywrightが必要です。インストールしてください: ' +
        'npm install puppeteer または npm install playwright'
      );
    }
  }

  const errors: Array<{ candidate: any; error: string }> = [];
  let registered = 0;
  let failed = 0;

  // Puppeteerを使用する場合
  if (puppeteer) {
    const browser = await puppeteer.default.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    try {
      // 1. Whopダッシュボードにログイン
      console.log('[Whop Automation] Logging in to Whop dashboard...');
      await page.goto('https://whop.com/login', { waitUntil: 'networkidle0' });

      // ログインフォームの検出（複数のセレクターを試行）
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]',
        'input[id*="email" i]',
      ];

      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[id*="password" i]',
      ];

      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Log in")',
        'button:has-text("Sign in")',
        'button:has-text("Login")',
      ];

      let emailInput = null;
      let passwordInput = null;
      let submitButton = null;

      for (const selector of emailSelectors) {
        emailInput = await page.$(selector);
        if (emailInput) break;
      }

      for (const selector of passwordSelectors) {
        passwordInput = await page.$(selector);
        if (passwordInput) break;
      }

      for (const selector of submitSelectors) {
        submitButton = await page.$(selector);
        if (submitButton) break;
      }

      if (!emailInput || !passwordInput || !submitButton) {
        throw new Error('Login form not found. Please check Whop dashboard UI.');
      }

      await emailInput.type(whopEmail!);
      await passwordInput.type(whopPassword!);
      await submitButton.click();

      // ログイン完了を待つ
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });

      // 2. アフィリエイターセクションに移動
      console.log(`[Whop Automation] Navigating to affiliates section for product ${whopProductId}...`);
      await page.goto(
        `https://whop.com/dashboard/products/${whopProductId}/affiliates`,
        { waitUntil: 'networkidle0' }
      );

      // アフィリエイター追加ボタンの検出（複数のセレクターを試行）
      const addButtonSelectors = [
        'button:has-text("Add Affiliate")',
        'button:has-text("Invite Affiliate")',
        'button:has-text("Add")',
        '[data-testid="add-affiliate-button"]',
        'a[href*="affiliates"]:has-text("Add")',
        'button[class*="add"]',
      ];

      let addButton = null;
      for (const selector of addButtonSelectors) {
        try {
          addButton = await page.$(selector);
          if (addButton) break;
        } catch (e) {
          continue;
        }
      }

      if (!addButton) {
        // スクリーンショットを保存（デバッグ用）
        await page.screenshot({ path: 'whop-dashboard-debug.png' });
        throw new Error(
          'Add affiliate button not found. Screenshot saved to whop-dashboard-debug.png'
        );
      }

      // 3. バッチ処理でアフィリエイターを登録
      console.log(`[Whop Automation] Starting batch registration of ${candidates.length} candidates...`);

      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        console.log(`[Whop Automation] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidates.length / batchSize)}...`);

        for (const candidate of batch) {
          try {
            // アフィリエイター追加ボタンをクリック
            await addButton.click();
            await page.waitForTimeout(1000); // モーダルが開くのを待つ

            // フォームフィールドの検出
            const emailFieldSelectors = [
              'input[name="email"]',
              'input[type="email"]',
              'input[placeholder*="email" i]',
            ];

            const nameFieldSelectors = [
              'input[name="name"]',
              'input[placeholder*="name" i]',
            ];

            const commissionFieldSelectors = [
              'input[name="commission_rate"]',
              'input[name="commission"]',
              'input[type="number"]',
            ];

            let emailField = null;
            for (const selector of emailFieldSelectors) {
              emailField = await page.$(selector);
              if (emailField) break;
            }

            if (!emailField) {
              throw new Error('Email field not found in affiliate form');
            }

            // フォームに入力
            await emailField.type(candidate.email);

            if (candidate.name) {
              let nameField = null;
              for (const selector of nameFieldSelectors) {
                nameField = await page.$(selector);
                if (nameField) break;
              }
              if (nameField) {
                await nameField.type(candidate.name);
              }
            }

            // コミッション率を設定
            const commissionRate = candidate.commissionRate || 0.50; // デフォルト50%
            let commissionField = null;
            for (const selector of commissionFieldSelectors) {
              commissionField = await page.$(selector);
              if (commissionField) break;
            }
            if (commissionField) {
              await commissionField.type((commissionRate * 100).toString());
            }

            // 送信ボタンをクリック
            const submitSelectors = [
              'button[type="submit"]',
              'button:has-text("Invite")',
              'button:has-text("Add")',
              'button:has-text("Save")',
            ];

            let submitBtn = null;
            for (const selector of submitSelectors) {
              submitBtn = await page.$(selector);
              if (submitBtn) break;
            }

            if (!submitBtn) {
              throw new Error('Submit button not found in affiliate form');
            }

            await submitBtn.click();

            // 成功メッセージを待つ（またはエラーメッセージをチェック）
            await page.waitForTimeout(2000);

            // 成功を確認
            const successIndicators = [
      '.success-message',
      '[data-testid="success"]',
      'text="Success"',
      'text="Invited"',
    ];

            let success = false;
            for (const selector of successIndicators) {
              try {
                await page.waitForSelector(selector, { timeout: 3000 });
                success = true;
                break;
              } catch (e) {
                continue;
              }
            }

            if (success) {
              registered++;
              console.log(`[Whop Automation] ✅ Registered: ${candidate.email}`);
            } else {
              // エラーメッセージをチェック
              const errorSelectors = [
                '.error-message',
                '[data-testid="error"]',
                'text="Error"',
              ];

              let errorMessage = 'Unknown error';
              for (const selector of errorSelectors) {
                try {
                  const errorElement = await page.$(selector);
                  if (errorElement) {
                    errorMessage = await page.evaluate((el) => el.textContent, errorElement);
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }

              throw new Error(errorMessage);
            }

            // モーダルを閉じる（必要に応じて）
            try {
              const closeButton = await page.$('[data-testid="close-modal"], button:has-text("Close"), .close-button');
              if (closeButton) {
                await closeButton.click();
                await page.waitForTimeout(500);
              }
            } catch (e) {
              // モーダルが自動的に閉じられた場合は無視
            }

            await new Promise((resolve) => setTimeout(resolve, delayBetweenActions));
          } catch (error: any) {
            failed++;
            errors.push({
              candidate,
              error: error.message,
            });
            console.error(`[Whop Automation] ❌ Failed to register ${candidate.email}:`, error.message);

            // エラーが発生した場合、モーダルを閉じる
            try {
              const closeButton = await page.$('[data-testid="close-modal"], button:has-text("Close"), .close-button');
              if (closeButton) {
                await closeButton.click();
                await page.waitForTimeout(500);
              }
            } catch (e) {
              // モーダルが開いていない場合は無視
            }
          }

          // 次の候補の前に、再度追加ボタンを取得
          try {
            addButton = await page.$('button:has-text("Add Affiliate"), button:has-text("Invite Affiliate"), [data-testid="add-affiliate-button"]');
          } catch (e) {
            // ボタンが見つからない場合はページをリロード
            await page.reload({ waitUntil: 'networkidle0' });
            addButton = await page.$('button:has-text("Add Affiliate"), button:has-text("Invite Affiliate"), [data-testid="add-affiliate-button"]');
          }
        }

        // バッチ間の待機
        if (i + batchSize < candidates.length) {
          console.log(`[Whop Automation] Waiting ${delayBetweenActions * 2}ms before next batch...`);
          await new Promise((resolve) => setTimeout(resolve, delayBetweenActions * 2));
        }
      }

      console.log(`[Whop Automation] ✅ Registration complete: ${registered} registered, ${failed} failed`);
    } catch (error: any) {
      console.error('[Whop Automation] ❌ Browser automation error:', error);
      // スクリーンショットを保存（デバッグ用）
      await page.screenshot({ path: 'whop-dashboard-error.png' });
      throw error;
    } finally {
      await browser.close();
    }
  }
  // Playwrightを使用する場合（実装は同様）
  else if (playwright) {
    // Playwrightの実装は同様のロジックで実装可能
    throw new Error('Playwright implementation not yet implemented. Please use Puppeteer for now.');
  }

  return {
    registered,
    failed,
    errors,
  };
}

/**
 * データベースから候補を取得してWhopダッシュボードに自動登録
 */
export async function registerCandidatesFromDatabase(options: {
  marketCode?: string;
  status?: 'New' | 'Contacted' | 'Responded';
  whopProductId: string;
  batchSize?: number;
  limit?: number;
}): Promise<{
  registered: number;
  failed: number;
  errors: Array<{ candidate: any; error: string }>;
}> {
  const {
    marketCode,
    status = 'New',
    whopProductId,
    batchSize = 10,
    limit = 100,
  } = options;

  // データベースから候補を取得
  const candidates = await prisma.affiliateCandidate.findMany({
    where: {
      ...(marketCode && { market: marketCode as any }),
      status: status as any,
      email: { not: null },
    },
    take: limit,
    orderBy: { matchScore: 'desc' },
  });

  console.log(`[Whop Automation] Found ${candidates.length} candidates to register`);

  if (candidates.length === 0) {
    return {
      registered: 0,
      failed: 0,
      errors: [],
    };
  }

  // Whopダッシュボードに自動登録
  const result = await automateWhopAffiliateRegistration({
    candidates: candidates.map((c) => ({
      email: c.email!,
      name: c.displayName || undefined,
      commissionRate: 0.50, // デフォルト50%
    })),
    whopProductId,
    batchSize,
  });

  // データベースのステータスを更新
  for (const candidate of candidates) {
    if (result.errors.find((e) => e.candidate.email === candidate.email)) {
      // エラーが発生した候補はスキップ
      continue;
    }

    // 登録成功した候補のステータスを更新
    await prisma.affiliateCandidate.update({
      where: { id: candidate.id },
      data: {
        status: 'Approved',
        // whopAffiliateIdは後でWhop APIで取得して更新
      },
    });
  }

  return result;
}

/**
 * CLI実行用
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('使用方法:');
    console.error('  npx tsx scripts/whop-dashboard-automation.ts <whopProductId> [marketCode] [limit]');
    console.error('');
    console.error('例:');
    console.error('  npx tsx scripts/whop-dashboard-automation.ts prod_xxx EN 100');
    process.exit(1);
  }

  const whopProductId = args[0];
  const marketCode = args[1] as any;
  const limit = args[2] ? parseInt(args[2], 10) : 100;

  // 環境変数の確認
  if (!process.env.WHOP_EMAIL || !process.env.WHOP_PASSWORD) {
    console.error('❌ エラー: WHOP_EMAIL と WHOP_PASSWORD 環境変数が必要です');
    console.error('');
    console.error('.envファイルに以下を追加してください:');
    console.error('  WHOP_EMAIL=your-email@example.com');
    console.error('  WHOP_PASSWORD=your-password');
    process.exit(1);
  }

  try {
    console.log(`[Whop Automation] Starting affiliate registration...`);
    console.log(`[Whop Automation] Product ID: ${whopProductId}`);
    console.log(`[Whop Automation] Market: ${marketCode || 'All'}`);
    console.log(`[Whop Automation] Limit: ${limit}`);

    const result = await registerCandidatesFromDatabase({
      marketCode,
      whopProductId,
      limit,
    });

    console.log('');
    console.log('📊 結果:');
    console.log(`  ✅ 登録成功: ${result.registered}`);
    console.log(`  ❌ 登録失敗: ${result.failed}`);
    console.log(`  📝 エラー数: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ エラー詳細:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.candidate.email}: ${error.error}`);
      });
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.message.includes('Puppeteer') || error.message.includes('Playwright')) {
      console.error('');
      console.error('Puppeteerをインストールしてください:');
      console.error('  npm install puppeteer');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// CLI実行時のみmainを実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
