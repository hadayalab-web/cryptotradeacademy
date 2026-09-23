# Whopダッシュボード自動化戦略

**作成日**: 2026-01-11  
**目的**: Whop API v2でアフィリエイター作成ができないため、ダッシュボード経由の登録を自動化

---

## 🎯 自動化の必要性

### 現状の問題

- ❌ Whop API v2には`POST /affiliates`エンドポイントがない
- ❌ WhopダッシュボードにはCSVインポート機能がない
- ❌ 手動登録は何千ものアフィリエイターには非現実的

### 解決策: ブラウザ自動化

**ブラウザ自動化（Puppeteer/Playwright）**を使用してWhopダッシュボードに自動ログインし、アフィリエイターを自動登録します。

---

## 🔧 実装方法

### 方法1: Puppeteer/Playwrightによるブラウザ自動化（推奨）

#### 実装方針

1. **Whopダッシュボードに自動ログイン**
2. **アフィリエイター登録フォームを自動入力**
3. **バッチ処理で大量のアフィリエイターを自動登録**

#### 実装例

```typescript
// scripts/whop-dashboard-automation.ts
import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Whopダッシュボードでアフィリエイターを自動登録
 */
export async function automateWhopAffiliateRegistration(options: {
  candidates: Array<{
    email: string;
    name?: string;
    commissionRate?: number;
  }>;
  whopProductId: string;
  whopEmail: string; // Whopアカウントのメールアドレス
  whopPassword: string; // Whopアカウントのパスワード
  batchSize?: number;
  delayBetweenActions?: number; // アクション間の遅延（ミリ秒）
}): Promise<{
  registered: number;
  failed: number;
  errors: Array<{ candidate: any; error: string }>;
}> {
  const {
    candidates,
    whopProductId,
    whopEmail,
    whopPassword,
    batchSize = 10,
    delayBetweenActions = 2000, // 2秒
  } = options;

  const browser = await puppeteer.launch({
    headless: false, // デバッグ時はfalse、本番はtrue
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const errors: Array<{ candidate: any; error: string }> = [];
  let registered = 0;
  let failed = 0;

  try {
    // 1. Whopダッシュボードにログイン
    await page.goto('https://whop.com/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', whopEmail);
    await page.type('input[type="password"]', whopPassword);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // 2. アフィリエイターセクションに移動
    await page.goto(`https://whop.com/dashboard/products/${whopProductId}/affiliates`);
    await page.waitForSelector('[data-testid="add-affiliate-button"]', { timeout: 10000 });

    // 3. バッチ処理でアフィリエイターを登録
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);

      for (const candidate of batch) {
        try {
          // アフィリエイター追加ボタンをクリック
          await page.click('[data-testid="add-affiliate-button"]');
          await page.waitForSelector('input[name="email"]', { timeout: 5000 });

          // フォームに入力
          await page.type('input[name="email"]', candidate.email);
          if (candidate.name) {
            await page.type('input[name="name"]', candidate.name);
          }

          // コミッション率を設定
          const commissionRate = candidate.commissionRate || 0.50; // デフォルト50%
          await page.type('input[name="commission_rate"]', (commissionRate * 100).toString());

          // プロダクトを選択（既にプロダクトページにいる場合は不要）
          // await page.select('select[name="product_id"]', whopProductId);

          // 送信
          await page.click('button[type="submit"]');
          await page.waitForSelector('.success-message', { timeout: 5000 });

          registered++;
          await new Promise((resolve) => setTimeout(resolve, delayBetweenActions));
        } catch (error: any) {
          failed++;
          errors.push({
            candidate,
            error: error.message,
          });

          // エラーが発生した場合、モーダルを閉じる
          try {
            await page.click('[data-testid="close-modal"]');
          } catch (e) {
            // モーダルが開いていない場合は無視
          }
        }
      }

      // バッチ間の待機
      if (i + batchSize < candidates.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenActions * 2));
      }
    }
  } catch (error: any) {
    console.error('Browser automation error:', error);
    throw error;
  } finally {
    await browser.close();
  }

  return {
    registered,
    failed,
    errors,
  };
}
```

---

### 方法2: セレクターの動的検出（より堅牢）

WhopダッシュボードのUIが変更されても対応できるよう、セレクターを動的に検出します。

```typescript
// scripts/whop-dashboard-automation-robust.ts
import puppeteer from 'puppeteer';

/**
 * Whopダッシュボードのセレクターを動的に検出
 */
async function findWhopSelectors(page: puppeteer.Page) {
  // ログインフォームの検出
  const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
  const passwordInput = await page.$('input[type="password"], input[name="password"]');
  const loginButton = await page.$('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")');

  // アフィリエイター追加ボタンの検出
  const addAffiliateButton = await page.$(
    'button:has-text("Add Affiliate"), ' +
    'button:has-text("Invite Affiliate"), ' +
    '[data-testid="add-affiliate-button"], ' +
    'a[href*="affiliates"]:has-text("Add")'
  );

  return {
    emailInput,
    passwordInput,
    loginButton,
    addAffiliateButton,
  };
}
```

---

### 方法3: ヘッドレスブラウザ + スクリーンショット（デバッグ用）

```typescript
// scripts/whop-dashboard-automation-debug.ts
import puppeteer from 'puppeteer';

export async function automateWhopAffiliateRegistrationWithDebug(options: {
  candidates: Array<{ email: string; name?: string }>;
  whopProductId: string;
  whopEmail: string;
  whopPassword: string;
  screenshotPath?: string;
}): Promise<void> {
  const browser = await puppeteer.launch({
    headless: false, // デバッグ時はfalse
    slowMo: 250, // 動作を遅くして確認しやすくする
  });

  const page = await browser.newPage();

  // スクリーンショットを保存
  if (options.screenshotPath) {
    page.on('response', async (response) => {
      if (response.url().includes('whop.com')) {
        await page.screenshot({ path: `${options.screenshotPath}/page-${Date.now()}.png` });
      }
    });
  }

  // ... 自動化処理
}
```

---

## 📋 実装チェックリスト

### ブラウザ自動化

- [ ] PuppeteerまたはPlaywrightのインストール
- [ ] Whopダッシュボードのログイン処理
- [ ] アフィリエイター登録フォームの自動入力
- [ ] バッチ処理の実装
- [ ] エラーハンドリング
- [ ] スクリーンショット機能（デバッグ用）

### セキュリティ

- [ ] Whopアカウント情報の安全な管理（環境変数）
- [ ] 2要素認証（2FA）の対応
- [ ] レート制限対策（アクション間の遅延）

### 堅牢性

- [ ] セレクターの動的検出
- [ ] UI変更への対応
- [ ] リトライロジック

---

## 🎯 実装優先順位

### 高優先度

1. **Puppeteer/Playwrightのセットアップ**
2. **Whopダッシュボードへのログイン処理**
3. **アフィリエイター登録フォームの自動入力**

### 中優先度

4. **バッチ処理の実装**
5. **エラーハンドリング**
6. **セレクターの動的検出**

### 低優先度

7. **スクリーンショット機能（デバッグ用）**
8. **2FA対応**

---

## ⚠️ 注意事項

### 1. **Whopの利用規約**

- ブラウザ自動化がWhopの利用規約に違反しないか確認
- 必要に応じてWhopサポートに問い合わせ

### 2. **セキュリティ**

- Whopアカウント情報は環境変数で管理
- 2FAが有効な場合、対応が必要

### 3. **レート制限**

- アクション間の遅延を設定
- Whopのレート制限に引っかからないように注意

### 4. **UI変更への対応**

- WhopダッシュボードのUIが変更される可能性がある
- セレクターの動的検出を実装

---

## 🔄 代替案

### 代替案1: アフィリエイター登録用LP

候補が自分でWhopアフィリエイター登録を行うLPを作成。

**メリット**:
- ブラウザ自動化が不要
- Whopの利用規約に違反しない
- スケーラブル

**デメリット**:
- 候補の行動に依存
- 登録率が下がる可能性

### 代替案2: Whop APIの将来対応を待つ

Whop APIがアフィリエイター作成をサポートする可能性を待つ。

**メリット**:
- 最もクリーンな実装

**デメリット**:
- 時期が不明
- 現実的ではない

---

## ✅ 推奨実装

### 推奨: Puppeteer/Playwrightによるブラウザ自動化

**理由**:
1. 即座に実装可能
2. 大量のアフィリエイターに対応可能
3. 完全自動化が可能

**実装ファイル**: `scripts/whop-dashboard-automation.ts`

---

---

## ✅ 実装完了

### 実装ファイル

- ✅ `scripts/whop-dashboard-automation.ts` - Whopダッシュボード自動化スクリプト

### 機能

- ✅ Puppeteerによるブラウザ自動化
- ✅ Whopダッシュボードへの自動ログイン
- ✅ アフィリエイター登録フォームの自動入力
- ✅ バッチ処理対応
- ✅ エラーハンドリング
- ✅ データベースからの候補取得
- ✅ セレクターの動的検出（複数のセレクターを試行）

### 使用方法

```bash
# 1. Puppeteerをインストール
npm install puppeteer

# 2. 環境変数を設定（.envファイル）
WHOP_EMAIL=your-email@example.com
WHOP_PASSWORD=your-password

# 3. スクリプトを実行
npm run whop:auto-register prod_xxx EN 100

# または直接実行
npx tsx scripts/whop-dashboard-automation.ts prod_xxx EN 100
```

### パラメータ

- `whopProductId`: WhopプロダクトID（必須）
- `marketCode`: 市場コード（オプション、例: EN, JA）
- `limit`: 登録する候補の最大数（オプション、デフォルト: 100）

---

**最終更新**: 2026-01-11  
**ステータス**: ✅ 実装完了
