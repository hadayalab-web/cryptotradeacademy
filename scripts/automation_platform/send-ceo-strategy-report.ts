#!/usr/bin/env tsx
/**
 * CEO宛て戦略分析レポート送信
 * 
 * Grok CSO、Gemini CMO、GPT CFO、COO+CTOの分析をまとめて
 * CEO（人間）宛てにメール送信
 */

import { sendResendEmail } from '../api/unified-api.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * CEO宛てHTMLメールを生成
 */
function generateCEOReportHTML(): string {
  const date = new Date();
  const dateStr = date.toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eメールマーケティング軸戦略 - 分析レポート</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 10px;
      margin-top: 0;
    }
    h2 {
      color: #2c3e50;
      margin-top: 30px;
      border-left: 4px solid #4CAF50;
      padding-left: 15px;
    }
    h3 {
      color: #34495e;
      margin-top: 25px;
    }
    .summary-box {
      background-color: #e8f5e9;
      border-left: 4px solid #4CAF50;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .metric-box {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 15px;
      margin: 15px 0;
    }
    .metric-label {
      font-weight: bold;
      color: #495057;
      font-size: 14px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #4CAF50;
      margin-top: 5px;
    }
    .risk-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .recommendation-box {
      background-color: #d1ecf1;
      border-left: 4px solid #17a2b8;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #4CAF50;
      color: white;
      font-weight: bold;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .status-approved {
      color: #4CAF50;
      font-weight: bold;
      font-size: 18px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #6c757d;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Eメールマーケティング軸戦略 - 分析レポート</h1>
    
    <p><strong>作成日時:</strong> ${dateStr}</p>
    <p><strong>報告者:</strong> COO+CTO（Cursor/Composer 1）</p>
    
    <div class="summary-box">
      <h2 style="margin-top: 0; border-left: none; padding-left: 0;">🎯 戦略承認</h2>
      <p class="status-approved">✅ Eメールマーケティング軸戦略を正式採用し、これを我々の「正」とする</p>
    </div>

    <h2>📈 Grok CSO（最高戦略責任者）の分析</h2>
    
    <h3>メールアドレス取得ポテンシャル</h3>
    <table>
      <tr>
        <th>シナリオ</th>
        <th>1日あたり</th>
        <th>1週間</th>
        <th>1ヶ月</th>
      </tr>
      <tr>
        <td><strong>保守的予測</strong></td>
        <td>30件/日</td>
        <td>210件</td>
        <td>900件</td>
      </tr>
      <tr>
        <td><strong>現実的予測</strong></td>
        <td>100件/日</td>
        <td>700件</td>
        <td>3,000件</td>
      </tr>
      <tr>
        <td><strong>楽観的予測</strong></td>
        <td>300件/日</td>
        <td>2,100件</td>
        <td>9,000件</td>
      </tr>
    </table>

    <h3>市場別予測（現実的シナリオ）</h3>
    <table>
      <tr>
        <th>市場</th>
        <th>メール取得数/日</th>
      </tr>
      <tr><td>EN</td><td>40件/日</td></tr>
      <tr><td>AR</td><td>20件/日</td></tr>
      <tr><td>KO</td><td>15件/日</td></tr>
      <tr><td>JA</td><td>10件/日</td></tr>
      <tr><td>ES</td><td>10件/日</td></tr>
      <tr><td>PT-BR</td><td>5件/日</td></tr>
    </table>

    <h2>📊 Gemini CMO（最高マーケティング責任者）の分析</h2>
    
    <h3>CVR向上ポテンシャル</h3>
    <div class="metric-box">
      <div class="metric-label">現在のベースライン</div>
      <div class="metric-value">10.0%</div>
    </div>

    <table>
      <tr>
        <th>シナリオ</th>
        <th>Whop CR</th>
        <th>メール→Whop率</th>
        <th>改善率</th>
      </tr>
      <tr>
        <td><strong>保守的</strong></td>
        <td>15.0%</td>
        <td>18.0%</td>
        <td>+50%</td>
      </tr>
      <tr>
        <td><strong>現実的</strong></td>
        <td>22.5%</td>
        <td>28.0%</td>
        <td>+125%</td>
      </tr>
      <tr>
        <td><strong>楽観的</strong></td>
        <td>35.0%</td>
        <td>45.0%</td>
        <td>+250%</td>
      </tr>
    </table>

    <div class="summary-box">
      <p><strong>Gemini CMOの確信:</strong> 「現実的な予測としてCVRは現在の2倍以上（22.5%）まで跳ね上がると確信しています。特にKO市場とEN市場での爆発的な成長が期待できます。」</p>
    </div>

    <h2>💰 GPT CFO（最高財務責任者）の分析</h2>
    
    <h3>売上予測（現実的シナリオ）</h3>
    <div class="metric-box">
      <div class="metric-label">日次売上</div>
      <div class="metric-value">$1,552.50</div>
    </div>
    <div class="metric-box">
      <div class="metric-label">週次売上</div>
      <div class="metric-value">$10,867.50</div>
    </div>
    <div class="metric-box">
      <div class="metric-label">月次売上</div>
      <div class="metric-value">$46,575.00</div>
    </div>

    <h3>KPI達成確度</h3>
    <table>
      <tr>
        <th>KPI</th>
        <th>保守的</th>
        <th>現実的</th>
        <th>楽観的</th>
      </tr>
      <tr>
        <td>週末$100k達成</td>
        <td>0.0%</td>
        <td>0.0%</td>
        <td>0.0%</td>
      </tr>
      <tr>
        <td>日次30CV（総数）</td>
        <td>≈0.0%</td>
        <td>≈3-7%</td>
        <td>≈~100%</td>
      </tr>
    </table>

    <div class="risk-box">
      <h3 style="margin-top: 0;">⚠️ 重要な発見</h3>
      <ul>
        <li><strong>週末$100k:</strong> 現状前提では到達不可（楽観でも週$50.7kが上限）</li>
        <li><strong>日次30CV:</strong> 現実的シナリオでは射程内（期待値22.5CV）</li>
        <li><strong>各市場5CV制約:</strong> PT-BRがボトルネックで非現実的</li>
      </ul>
    </div>

    <h3>ROI分析（現実的シナリオ）</h3>
    <table>
      <tr>
        <th>指標</th>
        <th>値</th>
      </tr>
      <tr>
        <td>月次売上</td>
        <td>$46,575.00</td>
      </tr>
      <tr>
        <td>月次コスト</td>
        <td>$950.00</td>
      </tr>
      <tr>
        <td>月次利益</td>
        <td>$45,625.00</td>
      </tr>
      <tr>
        <td>利益率</td>
        <td>97.9%</td>
      </tr>
      <tr>
        <td>ROI</td>
        <td>4802.6%</td>
      </tr>
    </table>

    <h2>🔧 COO+CTO（実装責任者）の最終レビュー</h2>
    
    <h3>戦略評価</h3>
    <table>
      <tr>
        <th>評価項目</th>
        <th>評価</th>
      </tr>
      <tr>
        <td>技術的実現可能性</td>
        <td>⭐⭐⭐⭐⭐ (5/5)</td>
      </tr>
      <tr>
        <td>スケーラビリティ</td>
        <td>⭐⭐⭐⭐ (4/5)</td>
      </tr>
      <tr>
        <td>リスク管理</td>
        <td>⭐⭐⭐⭐ (4/5)</td>
      </tr>
      <tr>
        <td>実装速度</td>
        <td>⭐⭐⭐⭐⭐ (5/5)</td>
      </tr>
      <tr>
        <td>ROI</td>
        <td>⭐⭐⭐⭐⭐ (5/5)</td>
      </tr>
    </table>

    <div class="recommendation-box">
      <h3 style="margin-top: 0;">💡 実装優先順位</h3>
      <ol>
        <li><strong>最優先（即座に実装）:</strong> CVR改善（LP/メール最適化）、リスク管理（監視・ガードレール）</li>
        <li><strong>第2優先（7日以内）:</strong> メール取得数増加（投稿最適化、トラッキング強化）</li>
        <li><strong>第3優先（14日以内）:</strong> スケール準備（広告投入、アフィリエイト、ARPU引上げ）</li>
      </ol>
    </div>

    <h3>実装計画</h3>
    <table>
      <tr>
        <th>Phase</th>
        <th>期間</th>
        <th>目標</th>
        <th>KPI</th>
      </tr>
      <tr>
        <td><strong>Phase 1</strong></td>
        <td>最初の7日間</td>
        <td>CVR改善</td>
        <td>CVR 15% → 22.5%</td>
      </tr>
      <tr>
        <td><strong>Phase 2</strong></td>
        <td>7-14日目</td>
        <td>メール取得数増加</td>
        <td>30件/日 → 100件/日</td>
      </tr>
      <tr>
        <td><strong>Phase 3</strong></td>
        <td>14-30日目</td>
        <td>スケール</td>
        <td>100件/日 → 300件/日、CVR 35%</td>
      </tr>
    </table>

    <h2>✅ 最終推奨事項</h2>
    
    <div class="summary-box">
      <ol>
        <li><strong>戦略承認:</strong> Eメールマーケティング軸戦略を正式採用</li>
        <li><strong>実装方針:</strong> Phase 1（CVR改善）から開始。最初の7日間はCVR改善に集中</li>
        <li><strong>リスク管理:</strong> 日次でCPA上限・苦情率上限・返金率上限を監視</li>
        <li><strong>KPI設定:</strong> 短期: CVR 22.5%、メール100件/日。「各市場5CV」制約は削除</li>
        <li><strong>市場優先順位:</strong> ENとKOを最優先（高CVR × 十分なボリューム）</li>
      </ol>
    </div>

    <div class="summary-box" style="background-color: #e3f2fd; border-left-color: #2196F3;">
      <h3 style="margin-top: 0; color: #1976D2;">🚀 実装準備完了</h3>
      <p><strong>状態:</strong> ✅ <strong>実装準備完了、実装開始可能</strong></p>
      <p>すべての分析が完了し、実装に向けた準備が整いました。進めながら期待値が上振れしてくることを期待しています。</p>
    </div>

    <div class="footer">
      <p><strong>報告者:</strong> COO+CTO（Cursor/Composer 1）</p>
      <p><strong>分析協力:</strong> Grok CSO、Gemini CMO、GPT CFO</p>
      <p><strong>作成日時:</strong> ${dateStr}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 CEO宛て戦略分析レポート送信を開始...\n');
  console.log('='.repeat(80));

  // 環境変数チェック
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEYが設定されていません');
    process.exit(1);
  }

  const ceoEmail = 'chibaichi.work@gmail.com';

  try {
    console.log('📝 CEO宛てHTMLメールを生成中...\n');
    const html = generateCEOReportHTML();

    console.log('📧 CEO宛てにメール送信中...\n');
    const result = await sendResendEmail({
      from: 'CryptoTrade Academy - Strategy <kpi@cryptotradeacademy.io>',
      to: ceoEmail,
      subject: '📊 Eメールマーケティング軸戦略 - 分析レポート（Grok/Gemini/GPT/COO+CTO）',
      html: html,
      tags: [
        { name: 'report_type', value: 'strategy_analysis' },
        { name: 'recipient', value: 'CEO' },
        { name: 'priority', value: 'high' }
      ]
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ CEO宛てメール送信が完了しました！');
    console.log(`\n📋 送信情報:`);
    console.log(`  - 送信先: ${ceoEmail}`);
    console.log(`  - 件名: 📊 Eメールマーケティング軸戦略 - 分析レポート（Grok/Gemini/GPT/COO+CTO）`);
    console.log(`  - Email ID: ${result.emailId}`);
    console.log('\n');
  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

// スクリプト実行
main().catch((error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
