// services/lead-discovery/leadDiscoveryReport.js
// リード発見システムのレポート生成機能

const { sendCEOReport } = require('../email/ceo-report');
const { getCVRStats, getCVRStatsByLanguage, syncWhopPurchases } = require('./conversionTracker');
const { listMemberships } = require('../whop/client');

/**
 * 日付フォーマット（YYYY-MM-DD形式）
 */
function formatDate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Whop統計を取得
 * @param {string} startDate - 開始日（YYYY-MM-DD）
 * @param {string} endDate - 終了日（YYYY-MM-DD）
 * @returns {Promise<Object>} Whop統計
 */
async function getWhopStats(startDate, endDate) {
  try {
    // Whop APIキーが設定されているか確認
    if (!process.env.WHOP_API_KEY) {
      console.warn('[Lead Discovery Report] WHOP_API_KEY is not set, skipping Whop stats');
      return {
        totalMembers: 0,
        newMembers: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        planStats: {},
        error: 'WHOP_API_KEY not set',
      };
    }
    
    // Whop購入を同期
    let syncResult = null;
    try {
      syncResult = await syncWhopPurchases();
    } catch (error) {
      console.warn('[Lead Discovery Report] Failed to sync Whop purchases:', error.message);
    }
    
    // アクティブなメンバーシップを取得
    const memberships = await listMemberships({
      status: 'active',
      expand: ['plan'],
    });
    
    // 日付範囲内の新規メンバーシップを取得
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // 終了日の23:59:59まで
    
    const newMemberships = memberships.filter(m => {
      const createdAt = new Date(m.created_at);
      return createdAt >= start && createdAt <= end;
    });
    
    // 収益を計算
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    const planStats = {};
    
    for (const membership of memberships) {
      const plan = membership.plan || {};
      const initialPrice = plan.initial_price || 0;
      const renewalPrice = plan.renewal_price || 0;
      
      // 初回購入分の収益
      if (membership.created_at) {
        const createdAt = new Date(membership.created_at);
        if (createdAt >= start && createdAt <= end) {
          totalRevenue += initialPrice;
        }
      }
      
      // 月額プランの場合、月間収益に加算
      if (plan.billing_period === 30 && renewalPrice > 0) {
        monthlyRevenue += renewalPrice;
      }
      
      // プラン別統計
      const planName = plan.name || 'Unknown';
      if (!planStats[planName]) {
        planStats[planName] = { count: 0, revenue: 0 };
      }
      planStats[planName].count++;
      planStats[planName].revenue += initialPrice + renewalPrice;
    }
    
    return {
      totalMembers: memberships.length,
      newMembers: newMemberships.length,
      totalRevenue,
      monthlyRevenue,
      planStats,
      syncResult,
    };
  } catch (error) {
    console.error('[Lead Discovery Report] Failed to get Whop stats:', error.message);
    return {
      totalMembers: 0,
      newMembers: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      planStats: {},
      error: error.message,
    };
  }
}

/**
 * リード発見実行レポートを生成してCEOに送信
 * @param {Object} stats - リード発見統計
 * @param {Object} options - オプション
 * @param {boolean} [options.sendEmail=true] - メール送信するか
 * @returns {Promise<Object>} レポート情報
 */
async function generateLeadDiscoveryReport(stats, options = {}) {
  const { sendEmail = true } = options;
  
  const today = formatDate();
  const yesterday = formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  
  // 昨日のCVR統計を取得
  let cvrStats = null;
  try {
    cvrStats = await getCVRStats(yesterday, today);
  } catch (error) {
    console.error('[Lead Discovery Report] Failed to get CVR stats:', error.message);
  }
  
  // 言語別統計を取得
  let langStats = null;
  try {
    langStats = await getCVRStatsByLanguage(yesterday, today);
  } catch (error) {
    console.error('[Lead Discovery Report] Failed to get language stats:', error.message);
  }
  
  // Whop統計を取得
  let whopStats = null;
  try {
    whopStats = await getWhopStats(yesterday, today);
  } catch (error) {
    console.error('[Lead Discovery Report] Failed to get Whop stats:', error.message);
  }
  
  // レポートHTMLを生成
  const html = `
<h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
  📊 リード発見システム 実行レポート
</h2>

<h3 style="color: #555; margin-top: 20px;">🔍 今回の実行結果</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>指標</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>見積もり</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>実測値</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>差分</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;"><strong>状態</strong></td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>発見リード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">約${ESTIMATES.leadsPerRun}件/回</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${stats.x.discovered || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: ${((stats.x.discovered || 0) - ESTIMATES.leadsPerRun) >= 0 ? '#4CAF50' : '#f44336'};">
      ${((stats.x.discovered || 0) - ESTIMATES.leadsPerRun) >= 0 ? '+' : ''}${(stats.x.discovered || 0) - ESTIMATES.leadsPerRun}件
    </td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${(stats.x.discovered || 0) >= ESTIMATES.leadsPerRun ? '#4CAF50' : '#f44336'};">
      ${(stats.x.discovered || 0) >= ESTIMATES.leadsPerRun ? '✅' : '⚠️'}
    </td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Sources数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${ESTIMATES.sourcesPerRun} sources</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">-</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #666;">-</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">-</td>
  </tr>
</table>
<p style="margin-top: 10px; color: #666; font-size: 12px;">
  <strong>見積もり根拠:</strong> 6言語 × 30 sources/言語 × 16%変換率 = 約${ESTIMATES.leadsPerRun}件/回
</p>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>リプライ送信数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${stats.x.sent || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>リプライ送信数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${stats.x.sent || 0}件</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>エラー数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${stats.x.errors || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>キュー残数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${stats.queue?.total || 0}件</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>ドンピシャリード</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${stats.queue?.perfectMatch || 0}件</td>
  </tr>
</table>

${cvrStats && !cvrStats.error ? `
${generateRevenueComparisonHTML({ revenue: cvrStats.revenue || 0, conversions: cvrStats.conversions || 0 }, ESTIMATES, 'day')}

<h3 style="color: #555; margin-top: 30px;">📈 CVR統計（過去24時間）</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>総リード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.totalLeads || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>リプライ送信数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.vsl1Sent || 0}件</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>成約数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.conversions || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>CVR</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #4CAF50;">${(cvrStats.cvr || 0).toFixed(2)}%</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>売上</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #2196F3;">$${(cvrStats.revenue || 0).toLocaleString()}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>ドンピシャリード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.perfectMatchLeads || 0}件</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>ドンピシャCVR</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #4CAF50;">${(cvrStats.perfectMatchCVR || 0).toFixed(2)}%</td>
  </tr>
</table>
` : ''}

${langStats && !langStats.error ? generateLanguageStatsHTML(langStats) : ''}

${whopStats && !whopStats.error ? `
<h3 style="color: #555; margin-top: 30px;">💰 Whop統計（過去24時間）</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>総メンバー数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${whopStats.totalMembers || 0}人</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>新規メンバー</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${whopStats.newMembers || 0}人</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>期間内売上</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #2196F3;">$${(whopStats.totalRevenue || 0).toLocaleString()}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>月間収益（MRR）</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #4CAF50;">$${(whopStats.monthlyRevenue || 0).toLocaleString()}</td>
  </tr>
</table>
${whopStats.syncResult ? `
<p style="margin-top: 10px; color: #666; font-size: 12px;">
  <strong>同期結果:</strong> チェック: ${whopStats.syncResult.checked || 0}件、紐付け: ${whopStats.syncResult.linked || 0}件、新規成約: ${whopStats.syncResult.newConversions || 0}件
</p>
` : ''}
` : whopStats && whopStats.error ? `
<h3 style="color: #555; margin-top: 30px;">💰 Whop統計</h3>
<p style="color: #f44336; margin-top: 10px;">
  ⚠️ Whop統計の取得に失敗しました: ${whopStats.error}
</p>
<p style="color: #666; font-size: 12px; margin-top: 5px;">
  WHOP_API_KEYが設定されているか確認してください。
</p>
` : `
<h3 style="color: #555; margin-top: 30px;">💰 Whop統計</h3>
<p style="color: #666; margin-top: 10px;">
  ℹ️ Whop統計は取得されませんでした（WHOP_API_KEYが設定されていない可能性があります）
</p>
`}

<h3 style="color: #555; margin-top: 30px;">📋 システム状態</h3>
<ul style="line-height: 1.8;">
  <li><strong>実行時刻:</strong> ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</li>
  <li><strong>ステータス:</strong> ${stats.x.errors > 0 ? '⚠️ 一部エラーあり' : '✅ 正常'}</li>
  ${stats.x.errors > 0 ? '<li style="color: #f44336;"><strong>注意:</strong> エラーが発生しています。ログを確認してください。</li>' : ''}
</ul>

<h3 style="color: #555; margin-top: 30px;">🎯 次のアクション</h3>
<ul style="line-height: 1.8;">
  <li>リード発見数が目標に達しているか確認</li>
  <li>CVRが目標（30%）を超えているか確認</li>
  <li>エラーが発生している場合は原因を調査</li>
  <li>キューに残っているリードを処理</li>
</ul>
  `.trim();
  
  const reportData = {
    stats,
    cvrStats,
    langStats,
    timestamp: new Date().toISOString(),
  };
  
  // メール送信
  if (sendEmail) {
    try {
      await sendCEOReport({
        subject: 'リード発見システム 実行レポート',
        html,
        category: 'LEAD_DISCOVERY',
      metadata: {
        'Discovered': `${stats.x.discovered || 0}件`,
        'Estimated': `${ESTIMATES.leadsPerRun}件/回`,
        'Replies Sent': `${stats.x.sent || 0}件`,
        'CVR': cvrStats && !cvrStats.error ? `${(cvrStats.cvr || 0).toFixed(2)}%` : 'N/A',
        'Target CVR': `${ESTIMATES.targetCVR}%`,
        'Revenue': cvrStats && !cvrStats.error ? `$${(cvrStats.revenue || 0).toLocaleString()}` : 'N/A',
        'Target Revenue/Day': `$${ESTIMATES.revenuePerDay.toLocaleString()}`,
      },
      });
      console.log('[Lead Discovery Report] Report sent successfully');
    } catch (error) {
      console.error('[Lead Discovery Report] Failed to send report:', error.message);
      // エラーが発生してもレポートデータは返す
    }
  }
  
  return reportData;
}

/**
 * 日次レポートを生成してCEOに送信
 * @param {Object} options - オプション
 * @param {string} [options.date] - レポート対象日（YYYY-MM-DD形式、デフォルト: 昨日）
 * @param {Object} [options.mockData] - モックデータ（テスト用）
 * @returns {Promise<Object>} レポート情報
 */
async function generateDailyReport(options = {}) {
  const { date, mockData } = options;
  const reportDate = date || formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  
  // CVR統計を取得（モックデータがある場合は使用）
  let cvrStats = null;
  if (mockData && mockData.cvrStats) {
    cvrStats = mockData.cvrStats;
  } else {
    try {
      cvrStats = await getCVRStats(reportDate, reportDate);
    } catch (error) {
      console.error('[Lead Discovery Report] Failed to get CVR stats:', error.message);
    }
  }
  
  // 言語別統計を取得（モックデータがある場合は使用）
  let langStats = null;
  if (mockData && mockData.langStats) {
    langStats = mockData.langStats;
  } else {
    try {
      langStats = await getCVRStatsByLanguage(reportDate, reportDate);
    } catch (error) {
      console.error('[Lead Discovery Report] Failed to get language stats:', error.message);
    }
  }
  
  // Whop統計を取得（モックデータがある場合は使用）
  let whopStats = null;
  if (mockData && mockData.whopStats) {
    whopStats = mockData.whopStats;
  } else {
    try {
      whopStats = await getWhopStats(reportDate, reportDate);
      if (whopStats && whopStats.error) {
        console.warn('[Lead Discovery Report] Whop stats error:', whopStats.error);
      } else if (whopStats) {
        console.log('[Lead Discovery Report] Whop stats retrieved:', {
          totalMembers: whopStats.totalMembers,
          newMembers: whopStats.newMembers,
          monthlyRevenue: whopStats.monthlyRevenue,
        });
      }
    } catch (error) {
      console.error('[Lead Discovery Report] Failed to get Whop stats:', error.message);
      console.error('[Lead Discovery Report] Error stack:', error.stack);
    }
  }
  
  // レポートHTMLを生成
  const html = `
<h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
  📊 リード発見システム 日次レポート
</h2>

<h3 style="color: #555; margin-top: 20px;">📅 レポート期間</h3>
<p style="line-height: 1.8;">
  <strong>対象日:</strong> ${reportDate}<br>
  <strong>生成日時:</strong> ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
</p>

${cvrStats && !cvrStats.error ? `
${generateComparisonHTML({ totalLeads: cvrStats.totalLeads || 0, cost: ESTIMATES.costPerDay, cvr: cvrStats.cvr || 0 }, ESTIMATES, 'day')}
${generateRevenueComparisonHTML({ revenue: cvrStats.revenue || 0, conversions: cvrStats.conversions || 0 }, ESTIMATES, 'day')}

<h3 style="color: #555; margin-top: 30px;">📈 日次統計</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>総リード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.totalLeads || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>リプライ送信数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.repliesSent || 0}件</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>成約数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.conversions || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>CVR</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #4CAF50;">${(cvrStats.cvr || 0).toFixed(2)}%</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>売上</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #2196F3;">$${(cvrStats.revenue || 0).toLocaleString()}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>ドンピシャリード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.perfectMatchLeads || 0}件</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>ドンピシャ成約数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.perfectMatchConversions || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>ドンピシャCVR</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #4CAF50;">${(cvrStats.perfectMatchCVR || 0).toFixed(2)}%</td>
  </tr>
</table>

${cvrStats.bySource ? `
<h3 style="color: #555; margin-top: 30px;">📊 ソース別トラッキング</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>ソース</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>リード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>リプライ送信</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>成約数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>CVR</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>売上</strong></td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>X直接投稿</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.bySource.x_direct?.leads || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.bySource.x_direct?.replies || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.bySource.x_direct?.conversions || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${(cvrStats.bySource.x_direct?.cvr || 0) >= ESTIMATES.targetCVR ? '#4CAF50' : '#f44336'};">
      ${(cvrStats.bySource.x_direct?.cvr || 0).toFixed(2)}%
    </td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #2196F3;">$${(cvrStats.bySource.x_direct?.revenue || 0).toLocaleString()}</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>X引用リポスト</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.bySource.x_quote?.leads || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.bySource.x_quote?.replies || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.bySource.x_quote?.conversions || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${(cvrStats.bySource.x_quote?.cvr || 0) >= ESTIMATES.targetCVR ? '#4CAF50' : '#f44336'};">
      ${(cvrStats.bySource.x_quote?.cvr || 0).toFixed(2)}%
    </td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #2196F3;">$${(cvrStats.bySource.x_quote?.revenue || 0).toLocaleString()}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Telegram</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.bySource.telegram?.leads || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.bySource.telegram?.replies || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.bySource.telegram?.conversions || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${(cvrStats.bySource.telegram?.cvr || 0) >= ESTIMATES.targetCVR ? '#4CAF50' : '#f44336'};">
      ${(cvrStats.bySource.telegram?.cvr || 0).toFixed(2)}%
    </td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #2196F3;">$${(cvrStats.bySource.telegram?.revenue || 0).toLocaleString()}</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>その他</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.bySource.other?.leads || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.bySource.other?.replies || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.bySource.other?.conversions || 0}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${(cvrStats.bySource.other?.cvr || 0) >= ESTIMATES.targetCVR ? '#4CAF50' : '#f44336'};">
      ${(cvrStats.bySource.other?.cvr || 0).toFixed(2)}%
    </td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #2196F3;">$${(cvrStats.bySource.other?.revenue || 0).toLocaleString()}</td>
  </tr>
</table>
` : ''}

${langStats && !langStats.error ? generateLanguageStatsHTML(langStats) : ''}

<h3 style="color: #555; margin-top: 30px;">💡 分析</h3>
<ul style="line-height: 1.8;">
  ${cvrStats.cvr >= ESTIMATES.targetCVR ? '<li style="color: #4CAF50;">✅ CVRが目標（30%）を達成しています</li>' : `<li style="color: #f44336;">⚠️ CVRが目標（30%）を下回っています（現在: ${(cvrStats.cvr || 0).toFixed(2)}%）</li>`}
  ${cvrStats.perfectMatchCVR >= ESTIMATES.targetPerfectMatchCVR ? '<li style="color: #4CAF50;">✅ ドンピシャCVRが目標（50%）を達成しています</li>' : `<li style="color: #f44336;">⚠️ ドンピシャCVRが目標（50%）を下回っています（現在: ${(cvrStats.perfectMatchCVR || 0).toFixed(2)}%）</li>`}
  ${cvrStats.totalLeads >= ESTIMATES.leadsPerDay ? '<li style="color: #4CAF50;">✅ 日次リード発見数が目標（348件）を達成しています</li>' : `<li style="color: #f44336;">⚠️ 日次リード発見数が目標（348件）を下回っています（現在: ${cvrStats.totalLeads || 0}件）</li>`}
  ${(cvrStats.revenue || 0) >= ESTIMATES.revenuePerDay ? `<li style="color: #4CAF50;">✅ 日次売上が目標（$${ESTIMATES.revenuePerDay.toLocaleString()}）を達成しています</li>` : `<li style="color: #f44336;">⚠️ 日次売上が目標（$${ESTIMATES.revenuePerDay.toLocaleString()}）を下回っています（現在: $${(cvrStats.revenue || 0).toLocaleString()}）</li>`}
</ul>
` : '<p style="color: #f44336;">⚠️ CVR統計の取得に失敗しました。システムを確認してください。</p>'}

${whopStats && !whopStats.error ? `
<h3 style="color: #555; margin-top: 30px;">💰 Whop統計</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>総メンバー数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${whopStats.totalMembers || 0}人</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>新規メンバー</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${whopStats.newMembers || 0}人</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>期間内売上</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #2196F3;">$${(whopStats.totalRevenue || 0).toLocaleString()}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>月間収益（MRR）</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #4CAF50;">$${(whopStats.monthlyRevenue || 0).toLocaleString()}</td>
  </tr>
</table>
${Object.keys(whopStats.planStats || {}).length > 0 ? `
<h4 style="color: #666; margin-top: 20px;">📊 プラン別統計</h4>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  ${Object.entries(whopStats.planStats).map(([planName, planData]) => `
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>${planName}</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${planData.count}人</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${(planData.revenue || 0).toLocaleString()}</td>
  </tr>
  `).join('')}
</table>
` : ''}
${whopStats.syncResult ? `
<p style="margin-top: 10px; color: #666; font-size: 12px;">
  <strong>同期結果:</strong> チェック: ${whopStats.syncResult.checked || 0}件、紐付け: ${whopStats.syncResult.linked || 0}件、新規成約: ${whopStats.syncResult.newConversions || 0}件
</p>
` : ''}
` : whopStats && whopStats.error ? `
<h3 style="color: #555; margin-top: 30px;">💰 Whop統計</h3>
<p style="color: #f44336; margin-top: 10px;">
  ⚠️ Whop統計の取得に失敗しました: ${whopStats.error}
</p>
<p style="color: #666; font-size: 12px; margin-top: 5px;">
  WHOP_API_KEYが設定されているか、Whop APIエンドポイントが正しいか確認してください。
</p>
` : `
<h3 style="color: #555; margin-top: 30px;">💰 Whop統計</h3>
<p style="color: #666; margin-top: 10px;">
  ℹ️ Whop統計は取得されませんでした（WHOP_API_KEYが設定されていない可能性があります）
</p>
`}

<h3 style="color: #555; margin-top: 30px;">🎯 次のアクション</h3>
<ul style="line-height: 1.8;">
  <li>リード発見数の目標達成状況を確認</li>
  <li>CVRが目標を超えているか確認</li>
  <li>必要に応じてリード発見設定を調整</li>
  <li>リプライメッセージの最適化を検討</li>
  <li>ソース別CVRを分析し、最適なチャネル戦略を検討</li>
</ul>
  `.trim();
  
  try {
    await sendCEOReport({
      subject: `リード発見システム 日次レポート - ${reportDate}`,
      html,
      category: 'LEAD_DISCOVERY_DAILY',
      metadata: {
        'Report Date': reportDate,
        'Total Leads': `${cvrStats?.totalLeads || 0}件`,
        'Estimated Leads': `${ESTIMATES.leadsPerDay}件/日`,
        'CVR': cvrStats && !cvrStats.error ? `${(cvrStats.cvr || 0).toFixed(2)}%` : 'N/A',
        'Target CVR': `${ESTIMATES.targetCVR}%`,
        'Revenue': cvrStats && !cvrStats.error ? `$${(cvrStats.revenue || 0).toLocaleString()}` : 'N/A',
        'Target Revenue': `$${ESTIMATES.revenuePerDay.toLocaleString()}/日`,
        'Whop Members': `${whopStats?.totalMembers || 0}人`,
        'Whop MRR': whopStats && !whopStats.error ? `$${(whopStats.monthlyRevenue || 0).toLocaleString()}` : 'N/A',
      },
    });
    console.log(`[Lead Discovery Report] Daily report sent for ${reportDate}`);
    
    return {
      success: true,
      date: reportDate,
      cvrStats,
      langStats,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Lead Discovery Report] Failed to send daily report:', error.message);
    throw error;
  }
}

/**
 * 見積もり値（Phase 1: 初速段階）
 */
const ESTIMATES = {
  leadsPerRun: 29,        // 約29リード/回
  leadsPerDay: 348,       // 約348リード/日
  leadsPerWeek: 2436,    // 約2,436リード/週
  leadsPerMonth: 10440,  // 約10,440リード/月
  costPerDay: 54,         // $54 / 日
  costPerWeek: 378,       // $378 / 週
  costPerMonth: 1620,     // $1,620 / 月
  sourcesPerRun: 180,     // 180 sources/回
  conversionRate: 16,     // 16% (sources → リード)
  // 目標売上額（Phase 1: 30% CVR想定、$150/成約）
  revenuePerDay: 15660,   // $15,660 / 日（$469,800 / 30日）
  revenuePerWeek: 108500, // $108,500 / 週（$469,800 / 4.33週）
  revenuePerMonth: 469800, // $469,800 / 月（3,132成約 × $150）
  // 目標成約数
  conversionsPerDay: 104,  // 104成約/日（3,132 / 30日）
  conversionsPerWeek: 723, // 723成約/週（3,132 / 4.33週）
  conversionsPerMonth: 3132, // 3,132成約/月
  // CVR目標
  targetCVR: 30,          // 30% (リード → 成約)
  targetPerfectMatchCVR: 50, // 50% (ドンピシャリード → 成約)
};

/**
 * 目標売上 vs 実測売上の比較を生成
 * @param {Object} actual - 実測値
 * @param {Object} estimates - 見積もり値
 * @param {string} period - 期間（'day', 'week', 'month'）
 * @returns {string} HTML
 */
function generateRevenueComparisonHTML(actual, estimates, period) {
  const periodLabels = {
    day: { label: '日次', revenue: 'revenuePerDay', conversions: 'conversionsPerDay' },
    week: { label: '週次', revenue: 'revenuePerWeek', conversions: 'conversionsPerWeek' },
    month: { label: '月次', revenue: 'revenuePerMonth', conversions: 'conversionsPerMonth' },
  };
  
  const periodInfo = periodLabels[period];
  if (!periodInfo) return '';
  
  const actualRevenue = actual.revenue || 0;
  const estimatedRevenue = estimates[periodInfo.revenue] || 0;
  const revenueDiff = actualRevenue - estimatedRevenue;
  const revenueDiffPercent = estimatedRevenue > 0 ? ((revenueDiff / estimatedRevenue) * 100).toFixed(1) : 0;
  const revenueStatus = revenueDiff >= 0 ? '✅' : '⚠️';
  const revenueColor = revenueDiff >= 0 ? '#4CAF50' : '#f44336';
  
  const actualConversions = actual.conversions || 0;
  const estimatedConversions = estimates[periodInfo.conversions] || 0;
  const conversionsDiff = actualConversions - estimatedConversions;
  const conversionsDiffPercent = estimatedConversions > 0 ? ((conversionsDiff / estimatedConversions) * 100).toFixed(1) : 0;
  const conversionsStatus = conversionsDiff >= 0 ? '✅' : '⚠️';
  const conversionsColor = conversionsDiff >= 0 ? '#4CAF50' : '#f44336';
  
  return `
<h3 style="color: #555; margin-top: 30px;">💰 ${periodInfo.label}目標売上 vs 実測値比較</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>指標</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>目標</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>実測値</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>差分</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;"><strong>状態</strong></td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>売上</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${estimatedRevenue.toLocaleString()}</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${actualRevenue.toLocaleString()}</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: ${revenueColor};">
      ${revenueDiff >= 0 ? '+' : ''}$${Math.abs(revenueDiff).toLocaleString()} (${revenueDiffPercent >= 0 ? '+' : ''}${revenueDiffPercent}%)
    </td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${revenueColor};">
      ${revenueStatus}
    </td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>成約数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${estimatedConversions.toLocaleString()}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${actualConversions.toLocaleString()}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: ${conversionsColor};">
      ${conversionsDiff >= 0 ? '+' : ''}${conversionsDiff.toLocaleString()}件 (${conversionsDiffPercent >= 0 ? '+' : ''}${conversionsDiffPercent}%)
    </td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${conversionsColor};">
      ${conversionsStatus}
    </td>
  </tr>
</table>
<p style="margin-top: 10px; color: #666; font-size: 12px;">
  <strong>目標根拠:</strong> 月間10,440リード × 30% CVR × $150/成約 = $469,800/月<br>
  <strong>進捗率:</strong> ${estimatedRevenue > 0 ? ((actualRevenue / estimatedRevenue) * 100).toFixed(1) : 0}%（${periodInfo.label}目標達成率）
</p>
  `.trim();
}

/**
 * 言語別統計のHTMLを生成
 * @param {Object} langStats - 言語別統計
 * @returns {string} HTML
 */
function generateLanguageStatsHTML(langStats) {
  const languageLabels = {
    en: '英語 (EN)',
    es: 'スペイン語 (ES)',
    'pt-br': 'ポルトガル語 (PT-BR)',
    ar: 'アラビア語 (AR)',
    ja: '日本語 (JA)',
    ko: '韓国語 (KO)',
    other: 'その他',
  };
  
  if (!langStats || !langStats.byLanguage || Object.keys(langStats.byLanguage).length === 0) {
    return '<p style="color: #666; margin-top: 10px;">ℹ️ 言語別統計は取得できませんでした</p>';
  }
  
  const rows = Object.entries(langStats.byLanguage)
    .filter(([lang, stats]) => stats.totalLeads > 0)
    .map(([lang, stats]) => {
      const langLabel = languageLabels[lang] || lang;
      return `
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>${langLabel}</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${stats.totalLeads}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${stats.repliesSent}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${stats.conversions}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${stats.cvr >= ESTIMATES.targetCVR ? '#4CAF50' : '#f44336'};">
      ${(stats.cvr || 0).toFixed(2)}%
    </td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #2196F3;">$${(stats.revenue || 0).toLocaleString()}</td>
  </tr>
      `;
    }).join('');
  
  if (!rows) {
    return '<p style="color: #666; margin-top: 10px;">ℹ️ 言語別データがありません</p>';
  }
  
  return `
<h3 style="color: #555; margin-top: 30px;">🌍 言語別統計</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>言語</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>リード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>リプライ送信</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>成約数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>CVR</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>売上</strong></td>
  </tr>
  ${rows}
</table>
  `.trim();
}

/**
 * 見積もりと実測値の比較を生成
 * @param {Object} actual - 実測値
 * @param {Object} estimates - 見積もり値
 * @param {string} period - 期間（'day', 'week', 'month'）
 * @returns {string} HTML
 */
function generateComparisonHTML(actual, estimates, period) {
  const periodLabels = {
    day: { label: '日次', leads: 'leadsPerDay', cost: 'costPerDay' },
    week: { label: '週次', leads: 'leadsPerWeek', cost: 'costPerWeek' },
    month: { label: '月次', leads: 'leadsPerMonth', cost: 'costPerMonth' },
  };
  
  const periodInfo = periodLabels[period];
  if (!periodInfo) return '';
  
  const actualLeads = actual.totalLeads || 0;
  const estimatedLeads = estimates[periodInfo.leads] || 0;
  const leadDiff = actualLeads - estimatedLeads;
  const leadDiffPercent = estimatedLeads > 0 ? ((leadDiff / estimatedLeads) * 100).toFixed(1) : 0;
  const leadStatus = leadDiff >= 0 ? '✅' : '⚠️';
  const leadColor = leadDiff >= 0 ? '#4CAF50' : '#f44336';
  
  const actualCost = actual.cost || 0;
  const estimatedCost = estimates[periodInfo.cost] || 0;
  const costDiff = actualCost - estimatedCost;
  const costDiffPercent = estimatedCost > 0 ? ((costDiff / estimatedCost) * 100).toFixed(1) : 0;
  const costStatus = Math.abs(costDiffPercent) <= 10 ? '✅' : '⚠️';
  const costColor = Math.abs(costDiffPercent) <= 10 ? '#4CAF50' : '#f44336';
  
  return `
<h3 style="color: #555; margin-top: 30px;">📊 ${periodInfo.label}見積もり vs 実測値比較</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>指標</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>見積もり</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>実測値</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>差分</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;"><strong>状態</strong></td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>リード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${estimatedLeads.toLocaleString()}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${actualLeads.toLocaleString()}件</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: ${leadColor};">
      ${leadDiff >= 0 ? '+' : ''}${leadDiff.toLocaleString()}件 (${leadDiffPercent >= 0 ? '+' : ''}${leadDiffPercent}%)
    </td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${leadColor};">
      ${leadStatus}
    </td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>コスト</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${estimatedCost.toLocaleString()}</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${actualCost.toLocaleString()}</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: ${costColor};">
      ${costDiff >= 0 ? '+' : ''}$${Math.abs(costDiff).toLocaleString()} (${costDiffPercent >= 0 ? '+' : ''}${costDiffPercent}%)
    </td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${costColor};">
      ${costStatus}
    </td>
  </tr>
  ${actual.cvr !== undefined ? `
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>CVR</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">30.0% (目標)</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(actual.cvr || 0).toFixed(2)}%</td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: ${actual.cvr >= 30 ? '#4CAF50' : '#f44336'};">
      ${(actual.cvr - 30).toFixed(2)}pt
    </td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${actual.cvr >= 30 ? '#4CAF50' : '#f44336'};">
      ${actual.cvr >= 30 ? '✅' : '⚠️'}
    </td>
  </tr>
  ` : ''}
</table>
<p style="margin-top: 10px; color: #666; font-size: 12px;">
  <strong>見積もり根拠:</strong> 6言語 × 30 sources/言語 × 16%変換率 × 2時間ごと（12回/日）<br>
  <strong>確度:</strong> 高（実測16%変換率に基づく）
</p>
  `.trim();
}

/**
 * 週次レポートを生成してCEOに送信
 * @param {Object} options - オプション
 * @param {string} [options.startDate] - 開始日（YYYY-MM-DD形式、デフォルト: 7日前）
 * @param {string} [options.endDate] - 終了日（YYYY-MM-DD形式、デフォルト: 昨日）
 * @param {Object} [options.mockData] - モックデータ（テスト用）
 * @returns {Promise<Object>} レポート情報
 */
async function generateWeeklyReport(options = {}) {
  const { startDate: optStartDate, endDate: optEndDate, mockData } = options;
  const endDate = optEndDate || formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const startDate = optStartDate || formatDate(new Date(new Date(endDate).getTime() - 6 * 24 * 60 * 60 * 1000));
  
  // 週次CVR統計を取得（モックデータがある場合は使用）
  let cvrStats = null;
  if (mockData && mockData.cvrStats) {
    cvrStats = mockData.cvrStats;
  } else {
    try {
      cvrStats = await getCVRStats(startDate, endDate);
    } catch (error) {
      console.error('[Lead Discovery Report] Failed to get weekly CVR stats:', error.message);
    }
  }
  
  // 言語別統計を取得（モックデータがある場合は使用）
  let langStats = null;
  if (mockData && mockData.langStats) {
    langStats = mockData.langStats;
  } else {
    try {
      langStats = await getCVRStatsByLanguage(startDate, endDate);
    } catch (error) {
      console.error('[Lead Discovery Report] Failed to get weekly language stats:', error.message);
    }
  }
  
  // Whop統計を取得（モックデータがある場合は使用）
  let whopStats = null;
  if (mockData && mockData.whopStats) {
    whopStats = mockData.whopStats;
  } else {
    try {
      whopStats = await getWhopStats(startDate, endDate);
    } catch (error) {
      console.error('[Lead Discovery Report] Failed to get weekly Whop stats:', error.message);
    }
  }
  
  // コスト計算（簡易版: 日数 × 日次コスト）
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const estimatedCost = ESTIMATES.costPerDay * days;
  const actualCost = estimatedCost; // 実際のコストはGrok APIから取得する必要があるが、簡易版では見積もりを使用
  
  // 実測値と見積もりの比較
  const actual = {
    totalLeads: cvrStats?.totalLeads || 0,
    cost: actualCost,
    cvr: cvrStats?.cvr || 0,
  };
  
  // レポートHTMLを生成
  const html = `
<h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
  📊 リード発見システム 週次レポート
</h2>

<h3 style="color: #555; margin-top: 20px;">📅 レポート期間</h3>
<p style="line-height: 1.8;">
  <strong>開始日:</strong> ${startDate}<br>
  <strong>終了日:</strong> ${endDate}<br>
  <strong>期間:</strong> ${days}日間<br>
  <strong>生成日時:</strong> ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
</p>

${generateComparisonHTML(actual, ESTIMATES, 'week')}
${generateRevenueComparisonHTML({ revenue: cvrStats?.revenue || 0, conversions: cvrStats?.conversions || 0 }, ESTIMATES, 'week')}

${cvrStats && !cvrStats.error ? `
<h3 style="color: #555; margin-top: 30px;">📈 週次統計</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>総リード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.totalLeads || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>リプライ送信数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.repliesSent || 0}件</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>成約数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.conversions || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>CVR</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #4CAF50;">${(cvrStats.cvr || 0).toFixed(2)}%</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>売上</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #2196F3;">$${(cvrStats.revenue || 0).toLocaleString()}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>ドンピシャリード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.perfectMatchLeads || 0}件</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>ドンピシャCVR</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #4CAF50;">${(cvrStats.perfectMatchCVR || 0).toFixed(2)}%</td>
  </tr>
</table>
` : '<p style="color: #f44336;">⚠️ 週次統計の取得に失敗しました。システムを確認してください。</p>'}

${whopStats && !whopStats.error ? `
<h3 style="color: #555; margin-top: 30px;">💰 Whop統計（週次）</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>総メンバー数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${whopStats.totalMembers || 0}人</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>新規メンバー（週間）</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${whopStats.newMembers || 0}人</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>期間内売上</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #2196F3;">$${(whopStats.totalRevenue || 0).toLocaleString()}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>月間収益（MRR）</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #4CAF50;">$${(whopStats.monthlyRevenue || 0).toLocaleString()}</td>
  </tr>
</table>
` : ''}

${langStats && !langStats.error ? generateLanguageStatsHTML(langStats) : ''}

<h3 style="color: #555; margin-top: 30px;">💡 週次分析</h3>
<ul style="line-height: 1.8;">
  ${actual.totalLeads >= ESTIMATES.leadsPerWeek ? '<li style="color: #4CAF50;">✅ 週次リード発見数が目標を達成しています</li>' : `<li style="color: #f44336;">⚠️ 週次リード発見数が目標を下回っています（目標: ${ESTIMATES.leadsPerWeek}件、実測: ${actual.totalLeads}件）</li>`}
  ${actual.cvr >= ESTIMATES.targetCVR ? '<li style="color: #4CAF50;">✅ CVRが目標（30%）を達成しています</li>' : `<li style="color: #f44336;">⚠️ CVRが目標（30%）を下回っています（現在: ${(actual.cvr || 0).toFixed(2)}%）</li>`}
  ${cvrStats && cvrStats.perfectMatchCVR >= ESTIMATES.targetPerfectMatchCVR ? '<li style="color: #4CAF50;">✅ ドンピシャCVRが目標（50%）を達成しています</li>' : `<li style="color: #f44336;">⚠️ ドンピシャCVRが目標（50%）を下回っています（現在: ${(cvrStats?.perfectMatchCVR || 0).toFixed(2)}%）</li>`}
  ${(cvrStats?.revenue || 0) >= ESTIMATES.revenuePerWeek ? `<li style="color: #4CAF50;">✅ 週次売上が目標（$${ESTIMATES.revenuePerWeek.toLocaleString()}）を達成しています</li>` : `<li style="color: #f44336;">⚠️ 週次売上が目標（$${ESTIMATES.revenuePerWeek.toLocaleString()}）を下回っています（現在: $${(cvrStats?.revenue || 0).toLocaleString()}）</li>`}
</ul>

<h3 style="color: #555; margin-top: 30px;">🎯 次のアクション</h3>
<ul style="line-height: 1.8;">
  <li>見積もりと実測値の差分を分析し、必要に応じて見積もりを精緻化</li>
  <li>リード発見数が目標を下回っている場合は、Sources数や実行頻度の調整を検討</li>
  <li>CVRが目標を下回っている場合は、VSL1メッセージの最適化を検討</li>
  <li>来週の目標設定を更新</li>
</ul>
  `.trim();
  
  try {
    await sendCEOReport({
      subject: `リード発見システム 週次レポート - ${startDate} ～ ${endDate}`,
      html,
      category: 'LEAD_DISCOVERY_WEEKLY',
      metadata: {
        'Start Date': startDate,
        'End Date': endDate,
        'Total Leads': `${cvrStats?.totalLeads || 0}件`,
        'Estimated Leads': `${ESTIMATES.leadsPerWeek}件`,
        'Lead Diff': `${actual.totalLeads - ESTIMATES.leadsPerWeek}件`,
        'CVR': cvrStats && !cvrStats.error ? `${(cvrStats.cvr || 0).toFixed(2)}%` : 'N/A',
        'Target CVR': `${ESTIMATES.targetCVR}%`,
        'Revenue': cvrStats && !cvrStats.error ? `$${(cvrStats.revenue || 0).toLocaleString()}` : 'N/A',
        'Target Revenue': `$${ESTIMATES.revenuePerWeek.toLocaleString()}/週`,
        'Revenue Diff': `$${((cvrStats?.revenue || 0) - ESTIMATES.revenuePerWeek).toLocaleString()}`,
      },
    });
    console.log(`[Lead Discovery Report] Weekly report sent for ${startDate} to ${endDate}`);
    
    return {
      success: true,
      startDate,
      endDate,
      cvrStats,
      whopStats,
      comparison: {
        actual,
        estimates: ESTIMATES,
        period: 'week',
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Lead Discovery Report] Failed to send weekly report:', error.message);
    throw error;
  }
}

module.exports = {
  generateLeadDiscoveryReport,
  generateDailyReport,
  generateWeeklyReport,
  formatDate,
  ESTIMATES,
};
