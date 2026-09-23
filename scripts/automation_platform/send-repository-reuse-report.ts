#!/usr/bin/env tsx
/**
 * リポジトリ再利用分析レポートのCEO報告
 */

import { sendResendEmail } from '../api/unified-api.js';

async function main() {
  const emailContent = `📊 リポジトリ再利用分析完了

⏱️ 分析時刻: ${new Date().toISOString()}

## 📊 分析結果

2つのリポジトリの内容を確認しました。

### ✅ affiliate-recruitment-workflow
- **状態**: 既に統合済み（workflows/affiliate-recruitment/）
- **主要コンポーネント**:
  - API呼び出しユーティリティ（レート制限、リトライ、エラーハンドリング）
  - 統合ワークフロー
  - Grok/GPT検索・分析機能

### ✅ cryptotradeacademy-database
- **状態**: 既に統合済み（database/）
- **主要コンポーネント**:
  - Prismaスキーマ（19テーブル）
  - PostgreSQL/SQLiteスキーマ
  - CSV移行スクリプト

## 🔍 再利用可能なコンポーネント

1. **API呼び出しユーティリティ**
   - レート制限管理
   - 指数バックオフによるリトライ
   - タイムアウト設定
   - エラーハンドリング

2. **DM送信ロジック**
   - データベース統合
   - 送信履歴記録
   - エラーハンドリング

3. **Telegram Client**
   - 市場別Bot Token管理
   - DM送信機能

## 🚀 推奨アクション

### Phase 1: 即座に実行
1. データベース接続設定（DATABASE_URL）
2. データベースの状態確認
3. テスト送信実行

### Phase 2: 改善
1. scripts/send-en-dm.tsの改善（レート制限ロジック統合）
2. api/unified-api.tsの改善（TelegramClient参考）

---

詳細は docs/REPOSITORY_REUSE_ANALYSIS.md を参照してください。

**結論: 両方のリポジトリは既にプロジェクトに統合済みです。再利用可能なコンポーネントを特定しました。**`;

  try {
    await sendResendEmail({
      from: 'COO兼CTO <noreply@cryptotradeacademy.io>',
      to: 'admin@cryptotradeacademy.io',
      subject: '📊 リポジトリ再利用分析完了',
      html: emailContent.replace(/\n/g, '<br>'),
    });
    console.log('✅ CEOにメール報告完了\n');
  } catch (error: any) {
    console.error(`❌ CEOメール通知失敗: ${error.message}\n`);
    throw error;
  }
}

main().catch(console.error);
