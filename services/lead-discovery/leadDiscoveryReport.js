// services/lead-discovery/leadDiscoveryReport.js
// リード発見システムのレポート生成機能

const { sendCEOReport } = require('../email/ceo-report');
const { getCVRStats, syncWhopPurchases } = require('./conversionTracker');
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
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>発見リード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${stats.x.discovered || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>VSL1送信数</strong></td>
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
<h3 style="color: #555; margin-top: 30px;">📈 CVR統計（過去24時間）</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>総リード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.totalLeads || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>VSL1送信数</strong></td>
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
          'VSL1 Sent': `${stats.x.sent || 0}件`,
          'CVR': cvrStats && !cvrStats.error ? `${(cvrStats.cvr || 0).toFixed(2)}%` : 'N/A',
          'Revenue': cvrStats && !cvrStats.error ? `$${(cvrStats.revenue || 0).toLocaleString()}` : 'N/A',
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
 * @returns {Promise<Object>} レポート情報
 */
async function generateDailyReport(options = {}) {
  const { date } = options;
  const reportDate = date || formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  
  // CVR統計を取得
  let cvrStats = null;
  try {
    cvrStats = await getCVRStats(reportDate, reportDate);
  } catch (error) {
    console.error('[Lead Discovery Report] Failed to get CVR stats:', error.message);
  }
  
  // Whop統計を取得
  let whopStats = null;
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
<h3 style="color: #555; margin-top: 30px;">📈 日次統計</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>総リード数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.totalLeads || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>VSL1送信数</strong></td>
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
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>ドンピシャ成約数</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cvrStats.perfectMatchConversions || 0}件</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>ドンピシャCVR</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #4CAF50;">${(cvrStats.perfectMatchCVR || 0).toFixed(2)}%</td>
  </tr>
</table>

<h3 style="color: #555; margin-top: 30px;">💡 分析</h3>
<ul style="line-height: 1.8;">
  ${cvrStats.cvr >= 30 ? '<li style="color: #4CAF50;">✅ CVRが目標（30%）を達成しています</li>' : `<li style="color: #f44336;">⚠️ CVRが目標（30%）を下回っています（現在: ${(cvrStats.cvr || 0).toFixed(2)}%）</li>`}
  ${cvrStats.perfectMatchCVR >= 50 ? '<li style="color: #4CAF50;">✅ ドンピシャCVRが目標（50%）を達成しています</li>' : `<li style="color: #f44336;">⚠️ ドンピシャCVRが目標（50%）を下回っています（現在: ${(cvrStats.perfectMatchCVR || 0).toFixed(2)}%）</li>`}
  ${cvrStats.totalLeads >= 348 ? '<li style="color: #4CAF50;">✅ 日次リード発見数が目標（348件）を達成しています</li>' : `<li style="color: #f44336;">⚠️ 日次リード発見数が目標（348件）を下回っています（現在: ${cvrStats.totalLeads || 0}件）</li>`}
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
  <li>VSL1メッセージの最適化を検討</li>
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
          'CVR': cvrStats && !cvrStats.error ? `${(cvrStats.cvr || 0).toFixed(2)}%` : 'N/A',
          'Revenue': cvrStats && !cvrStats.error ? `$${(cvrStats.revenue || 0).toLocaleString()}` : 'N/A',
          'Whop Members': `${whopStats?.totalMembers || 0}人`,
          'Whop MRR': whopStats && !whopStats.error ? `$${(whopStats.monthlyRevenue || 0).toLocaleString()}` : 'N/A',
      },
    });
    console.log(`[Lead Discovery Report] Daily report sent for ${reportDate}`);
    
    return {
      success: true,
      date: reportDate,
      cvrStats,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Lead Discovery Report] Failed to send daily report:', error.message);
    throw error;
  }
}

module.exports = {
  generateLeadDiscoveryReport,
  generateDailyReport,
  formatDate,
};
