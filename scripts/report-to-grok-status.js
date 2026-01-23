// scripts/report-to-grok-status.js
// Grokに現在の進捗状況を報告

const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

/**
 * Grokに現在の進捗状況を報告
 */
async function reportStatusToGrok() {
  const report = `あなたはTrap Defence BTCのCOO（Chief Operating Officer）として、現在のシステム状況を把握しています。

## 📊 現在の状況報告（2026-01-22）

### ✅ 完了した作業

**1. 17個のCron Jobs設定完了**
全17個のCron Jobsが正常に設定され、Vercelで稼働中です：

1. /api/cron - メイン市場監視・配信（15分ごと）
2. /api/weekly-report - 週次レポート（毎週日曜00:00）
3. /api/vsl1-post - VSL1自動投稿（14:00, 20:00）
4. /api/vsl2-free-users - VSL2無料ユーザー配信（毎時）
5. /api/vsl1-reminder - VSL1リマインダー（12時間ごと）
6. /api/vsl2-last-call - VSL2最終呼びかけ（毎時）
7. /api/promo-stock-monitor - プロモコード在庫監視（15分ごと）
8. /api/monthly-engagement-report - 月次エンゲージメントレポート（毎月1日）
9. /api/lead-discovery - リード発見（2時間ごと）
10. /api/lead-discovery/process - リードキュー処理（5分ごと）← 修正完了
11. /api/lead-discovery/cvr-dashboard - CVRダッシュボード（毎週日曜）
12. /api/lead-discovery/sync-purchases - Whop購入同期（6時間ごと）
13. /api/lead-discovery-daily-report - 日次リードレポート（毎日09:00）
14. /api/lead-discovery-weekly-report - 週次リードレポート（毎週月曜09:00）
15. /api/x-post-free-report - X無料レポート投稿（06:05, 18:05）
16. /api/x-quote-repost - X引用リポスト（12:00-22:00毎時）
17. /api/x-quote-repost-metrics - 引用リポストメトリクス追跡（毎時）

**2. lead-discovery/processの修正完了**

**修正内容**:
- ✅ jobIdバグ修正（未定義のjobIdをjob.jobIdに修正）
- ✅ 詳細ログ追加（デバッグ改善）
  - キュー処理開始ログ
  - 各ジョブの処理状況ログ
  - リプライ送信結果ログ（SUCCESS/SKIPPED/FAILED）
- ✅ ログ分析スクリプト追加（scripts/analyze-process-queue-logs.js）

**修正前の問題**:
- キューに69件のリードがあるが、リプライ送信が0件
- ログ分析の結果、403エラー（削除されたツイート）でスキップされている
- 成功したリプライ送信のログが見つからない（0件）

**3. 再デプロイ完了**
修正内容をプッシュし、Vercelで再デプロイが正常に完了しました。

### 🔍 現在の課題

**lead-discovery/process - リプライ送信数0件**

**問題の詳細**:
- キューに69件のリードがあるが、リプライ送信が0件
- ログ分析の結果、403エラー（削除されたツイート）でスキップされている
- 成功したリプライ送信のログが見つからない（0件）
- tweetIdがないリードがキューに入っている可能性

**原因分析**:
1. キュー内のリードのtweetIdが欠落している可能性
2. すべてのリードが403エラー（削除されたツイート）でスキップされている可能性
3. replyVSL1ToLead関数が正常に動作していない可能性

**次のステップ**:
1. 再デプロイ後、新しいログで動作確認
2. 成功したリプライ送信の有無を確認
3. キュー内のリードのtweetId有無を確認

### 📈 収益化への道のり

#### Phase 1: システム安定化 ✅
- [x] 17個のCron Jobs設定完了
- [x] エラーハンドリング実装
- [x] ログ記録システム構築
- [x] レポート生成機能実装

#### Phase 2: エラー率0%達成 🔧
- [x] x-quote-repost-metricsの405エラー修正（GET/POST両対応）
- [x] lead-discovery/processのjobIdバグ修正
- [x] 詳細ログ追加によるデバッグ改善
- [ ] リプライ送信数0件問題の解決 ← 現在の課題

#### Phase 3: 収益化開始 🚀
- [ ] 全17個のCron Jobsが正常動作
- [ ] エラー率0%達成
- [ ] リード発見→リプライ送信→コンバージョン追跡の完全自動化
- [ ] 月次$1.8M収益目標への準備完了

### 🎯 次のマイルストーン

1. lead-discovery/processの修正完了
   - リプライ送信が正常に動作することを確認
   - エラー率0%達成

2. **全17個のCron Jobs正常動作確認**
   - 24時間連続動作テスト
   - エラー率0%維持

3. **収益化フェーズ開始**
   - リード発見→リプライ送信→コンバージョン追跡の完全自動化
   - 月次$1.8M収益目標への本格稼働

## 📝 依頼事項

時間を置いてログとレポートを共有する予定です。その前に、以下の点について分析・アドバイスをお願いします：

1. lead-discovery/processのリプライ送信数0件問題
   - 考えられる原因と解決策
   - デバッグのための追加ログやチェックポイント

2. **17個のCron Jobsの正常動作確認**
   - エラー率0%達成のためのベストプラクティス
   - 監視・アラートの推奨事項

3. **収益化フェーズへの移行準備**
   - リード発見→リプライ送信→コンバージョン追跡の最適化
   - 月次$1.8M収益目標達成のための戦略

現在地を共有し、次のステップについてのアドバイスをお願いします。`;

  try {
    console.log('🔄 Grokに現在の進捗状況を報告中...\n');
    
    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのCOO（Chief Operating Officer）として、システムの運用状況を分析し、改善提案を行います。技術的な問題の解決と収益化への道のりをサポートします。'
        },
        {
          role: 'user',
          content: report
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const response = completion.choices[0]?.message?.content || '';
    
    console.log('✅ Grokからの応答:\n');
    console.log('='.repeat(80));
    console.log(response);
    console.log('='.repeat(80));
    
    // 応答をファイルに保存
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `docs/GROK_STATUS_REPORT_${timestamp}.md`;
    const content = `# Grok Status Report\n\n**日時**: ${new Date().toISOString()}\n\n## 報告内容\n\n${report}\n\n---\n\n## Grokからの応答\n\n${response}\n`;
    
    fs.writeFileSync(filename, content, 'utf-8');
    console.log(`\n📄 応答を保存しました: ${filename}`);
    
  } catch (error) {
    console.error('❌ Grokへの報告に失敗:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

reportStatusToGrok();
