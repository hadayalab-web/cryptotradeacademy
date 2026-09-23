# Whopダッシュボード自動化 - 実装完了

**作成日**: 2026-01-11  
**目的**: Whop API v2でアフィリエイター作成ができないため、ダッシュボード経由の登録を自動化

---

## ✅ 実装完了

### 実装ファイル

- ✅ `scripts/whop-dashboard-automation.ts` - Whopダッシュボード自動化スクリプト

### 機能

- ✅ **Puppeteerによるブラウザ自動化**
- ✅ **Whopダッシュボードへの自動ログイン**
- ✅ **アフィリエイター登録フォームの自動入力**
- ✅ **バッチ処理対応**（デフォルト: 10件ずつ）
- ✅ **エラーハンドリング**
- ✅ **データベースからの候補取得**
- ✅ **セレクターの動的検出**（複数のセレクターを試行）
- ✅ **スクリーンショット機能**（デバッグ用）

---

## 🚀 使用方法

### 1. 依存関係のインストール

```bash
npm install puppeteer
```

### 2. 環境変数の設定

`.env`ファイルに以下を追加:

```env
# Whopダッシュボード自動化用
WHOP_EMAIL=your-email@example.com
WHOP_PASSWORD=your-password
```

### 3. スクリプトの実行

```bash
# npmスクリプト経由
npm run whop:auto-register prod_xxx EN 100

# または直接実行
npx tsx scripts/whop-dashboard-automation.ts prod_xxx EN 100
```

### パラメータ

- `whopProductId` (必須): WhopプロダクトID（例: `prod_xxx`）
- `marketCode` (オプション): 市場コード（例: `EN`, `JA`）
- `limit` (オプション): 登録する候補の最大数（デフォルト: 100）

---

## 🔄 完全なフロー統合

### 統合ワークフロー

```typescript
// 1. 候補検索・データベース化
const searchResult = await executeIntegratedWorkflow({
  marketCode: 'EN',
  whopProductId: 'prod_xxx',
  searchQueries: ['crypto trading'],
  maxCandidates: 100,
  analyzeCandidates: true,
  sendTelegramDM: false,
});

// 2. Whopダッシュボードでアフィリエイターを自動登録
import { registerCandidatesFromDatabase } from '@/scripts/whop-dashboard-automation';

const registrationResult = await registerCandidatesFromDatabase({
  marketCode: 'EN',
  status: 'New',
  whopProductId: 'prod_xxx',
  batchSize: 10,
  limit: 100,
});

console.log(`Registered: ${registrationResult.registered}, Failed: ${registrationResult.failed}`);

// 3. DM送信・LP遷移（登録済みのアフィリエイターに）
const dmResult = await callInternalApi('/api/workflows/affiliate-dm', {
  body: {
    marketCode: 'EN',
    candidateIds: candidateIds,
    whopProductId: 'prod_xxx',
  },
});

// 4. LP導線からWhopアフィリエイトリンク取得
// 候補がLPにアクセスした時、/api/affiliate-link を呼び出す
```

---

## 📋 実装詳細

### セレクターの動的検出

WhopダッシュボードのUI変更に対応するため、複数のセレクターを試行:

```typescript
// ログインフォーム
const emailSelectors = [
  'input[type="email"]',
  'input[name="email"]',
  'input[placeholder*="email" i]',
  'input[id*="email" i]',
];

// アフィリエイター追加ボタン
const addButtonSelectors = [
  'button:has-text("Add Affiliate")',
  'button:has-text("Invite Affiliate")',
  '[data-testid="add-affiliate-button"]',
  'a[href*="affiliates"]:has-text("Add")',
];
```

### エラーハンドリング

- エラーが発生した場合、スクリーンショットを保存（デバッグ用）
- モーダルを自動的に閉じる
- エラーが発生しても次の候補の処理を続行

### バッチ処理

- デフォルト: 10件ずつ処理
- バッチ間の待機時間: 2秒（レート制限対策）
- アクション間の遅延: 2秒（デフォルト）

---

## ⚠️ 注意事項

### 1. **Whopの利用規約**

- ブラウザ自動化がWhopの利用規約に違反しないか確認
- 必要に応じてWhopサポートに問い合わせ

### 2. **セキュリティ**

- Whopアカウント情報は環境変数で管理
- 2FAが有効な場合、対応が必要（現在は未対応）

### 3. **レート制限**

- アクション間の遅延を設定（デフォルト: 2秒）
- バッチ間の待機時間を設定（デフォルト: 4秒）

### 4. **UI変更への対応**

- セレクターの動的検出を実装
- UIが変更された場合、スクリーンショットを確認してセレクターを更新

---

## 🎯 次のステップ

### 実装済み ✅

1. ✅ Puppeteerによるブラウザ自動化
2. ✅ Whopダッシュボードへの自動ログイン
3. ✅ アフィリエイター登録フォームの自動入力
4. ✅ バッチ処理
5. ✅ エラーハンドリング

### 改善の余地

1. **2FA対応**: 2要素認証が有効な場合の対応
2. **Playwright対応**: Puppeteerの代替としてPlaywrightをサポート
3. **UI変更検出**: WhopダッシュボードのUI変更を自動検出
4. **並列処理**: 複数のブラウザインスタンスで並列処理

---

## 📊 期待される効果

### 自動化による効果

- ✅ **手動登録時間**: **90%以上短縮**
- ✅ **大量処理**: 何千ものアフィリエイターを自動登録可能
- ✅ **エラー処理**: エラーが発生しても処理を続行
- ✅ **スケーラビリティ**: バッチ処理により大量処理に対応

---

**最終更新**: 2026-01-11  
**ステータス**: ✅ 実装完了
