// scripts/generate-monthly-engagement-report.js
// 月次エンゲージメント分析レポート自動生成
// Grok CSO+CFO推奨: 月次エンゲージメント分析レポート自動化

require('dotenv').config({ path: '.env' });
const { loadFreeUsers, getFreeUserCount } = require('../services/free-users/manager');
const fs = require('fs');
const path = require('path');

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

function normalizeLang(value) {
  if (!value) return null;
  const base = String(value).trim().toLowerCase().split('.')[0].replace('_', '-');
  return SUPPORTED_LANGS.includes(base) ? base : null;
}

/**
 * 月次エンゲージメント分析レポートを生成
 */
async function generateMonthlyEngagementReport() {
  try {
    console.log('📊 月次エンゲージメント分析レポートを生成中...\n');
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // 前月の開始日と終了日を計算
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const lastMonthStart = new Date(lastMonthYear, lastMonth - 1, 1);
    const lastMonthEnd = new Date(lastMonthYear, lastMonth, 0, 23, 59, 59, 999);
    
    console.log(`📅 対象期間: ${lastMonthStart.toISOString().split('T')[0]} ～ ${lastMonthEnd.toISOString().split('T')[0]}`);
    
    // ユーザーデータを読み込む
    const users = await loadFreeUsers();
    const totalUsers = users.length;
    
    // 言語別ユーザー数
    const usersByLang = {};
    const langStats = {};
    
    SUPPORTED_LANGS.forEach(lang => {
      usersByLang[lang] = users.filter(user => {
        const userObj = typeof user === 'string' ? { lang: null } : user;
        return normalizeLang(userObj.lang) === lang;
      });
      langStats[lang] = {
        total: usersByLang[lang].length,
        withLang: usersByLang[lang].length,
        withoutLang: 0,
      };
    });
    
    // 言語情報なしユーザー
    const usersWithoutLang = users.filter(user => {
      const userObj = typeof user === 'string' ? { lang: null } : user;
      return !normalizeLang(userObj.lang);
    });
    
    // 前月中に登録したユーザー
    const usersLastMonth = users.filter(user => {
      const userObj = typeof user === 'string' ? {
        joinedAt: new Date(0).toISOString(),
      } : user;
      const joinedAt = new Date(userObj.joinedAt);
      return joinedAt >= lastMonthStart && joinedAt <= lastMonthEnd;
    });
    
    // VSL2送信済みユーザー
    const vsl2SentUsers = users.filter(user => {
      const userObj = typeof user === 'string' ? { vsl2Sent: false } : user;
      return userObj.vsl2Sent === true;
    });
    
    // VSL2送信率
    const vsl2SendRate = totalUsers > 0 ? (vsl2SentUsers.length / totalUsers) * 100 : 0;
    
    // 言語別VSL2送信率
    const vsl2SendRateByLang = {};
    SUPPORTED_LANGS.forEach(lang => {
      const langUsers = usersByLang[lang];
      const langVSL2Sent = langUsers.filter(user => {
        const userObj = typeof user === 'string' ? { vsl2Sent: false } : user;
        return userObj.vsl2Sent === true;
      });
      vsl2SendRateByLang[lang] = langUsers.length > 0 
        ? (langVSL2Sent.length / langUsers.length) * 100 
        : 0;
    });
    
    // タイミング精度の計算（24時間±1時間以内にVSL2送信）
    const timingPrecision = {
      total: 0,
      onTime: 0,
      late: 0,
      early: 0,
    };
    
    vsl2SentUsers.forEach(user => {
      const userObj = typeof user === 'string' ? {
        joinedAt: new Date(0).toISOString(),
        vsl2Sent: true,
      } : user;
      
      const joinedAt = new Date(userObj.joinedAt);
      const elapsedHours = (now.getTime() - joinedAt.getTime()) / (60 * 60 * 1000);
      
      timingPrecision.total++;
      if (elapsedHours >= 23 && elapsedHours <= 25) {
        timingPrecision.onTime++;
      } else if (elapsedHours > 25) {
        timingPrecision.late++;
      } else {
        timingPrecision.early++;
      }
    });
    
    const timingAccuracy = timingPrecision.total > 0 
      ? (timingPrecision.onTime / timingPrecision.total) * 100 
      : 0;
    
    // レポート生成
    const report = {
      period: {
        start: lastMonthStart.toISOString(),
        end: lastMonthEnd.toISOString(),
        month: lastMonth,
        year: lastMonthYear,
      },
      summary: {
        totalUsers,
        newUsersLastMonth: usersLastMonth.length,
        usersWithoutLang: usersWithoutLang.length,
        langCoverageRate: totalUsers > 0 ? ((totalUsers - usersWithoutLang.length) / totalUsers) * 100 : 0,
      },
      vsl2: {
        sentUsers: vsl2SentUsers.length,
        sendRate: vsl2SendRate,
        sendRateByLang: vsl2SendRateByLang,
      },
      timing: {
        accuracy: timingAccuracy,
        onTime: timingPrecision.onTime,
        late: timingPrecision.late,
        early: timingPrecision.early,
        total: timingPrecision.total,
      },
      languages: langStats,
      generatedAt: now.toISOString(),
    };
    
    // レポートをMarkdown形式で生成
    const markdownReport = generateMarkdownReport(report);
    
    // レポートを保存
    const reportsDir = path.join(__dirname, '../docs/reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportFileName = `engagement-report-${lastMonthYear}-${String(lastMonth).padStart(2, '0')}.md`;
    const reportPath = path.join(reportsDir, reportFileName);
    
    fs.writeFileSync(reportPath, markdownReport, 'utf-8');
    console.log(`✅ レポートを保存しました: ${reportPath}`);
    
    // JSON形式でも保存
    const jsonReportPath = path.join(reportsDir, `engagement-report-${lastMonthYear}-${String(lastMonth).padStart(2, '0')}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`✅ JSONレポートを保存しました: ${jsonReportPath}`);
    
    // コンソールにサマリーを表示
    console.log('\n' + '='.repeat(80));
    console.log('📊 月次エンゲージメント分析レポート サマリー');
    console.log('='.repeat(80));
    console.log(`期間: ${lastMonthYear}年${lastMonth}月`);
    console.log(`総ユーザー数: ${totalUsers}`);
    console.log(`前月新規ユーザー: ${usersLastMonth.length}`);
    console.log(`言語カバレッジ率: ${report.summary.langCoverageRate.toFixed(2)}%`);
    console.log(`VSL2送信率: ${vsl2SendRate.toFixed(2)}%`);
    console.log(`タイミング精度: ${timingAccuracy.toFixed(2)}%`);
    console.log('='.repeat(80));
    
    return report;
  } catch (error) {
    console.error('❌ 月次エンゲージメント分析レポート生成エラー:', error.message);
    throw error;
  }
}

/**
 * Markdown形式のレポートを生成
 */
function generateMarkdownReport(report) {
  const { period, summary, vsl2, timing, languages } = report;
  
  let md = `# 月次エンゲージメント分析レポート

**期間**: ${period.year}年${period.month}月  
**生成日時**: ${new Date(report.generatedAt).toLocaleString('ja-JP')}

---

## 📊 サマリー

- **総ユーザー数**: ${summary.totalUsers.toLocaleString()}
- **前月新規ユーザー**: ${summary.newUsersLastMonth.toLocaleString()}
- **言語情報なしユーザー**: ${summary.usersWithoutLang.toLocaleString()}
- **言語カバレッジ率**: ${summary.langCoverageRate.toFixed(2)}%

---

## 🎯 VSL2配信状況

- **VSL2送信済みユーザー**: ${vsl2.sentUsers.toLocaleString()}
- **VSL2送信率**: ${vsl2.sendRate.toFixed(2)}%

### 言語別VSL2送信率

| 言語 | ユーザー数 | VSL2送信率 |
|------|-----------|-----------|
`;

  SUPPORTED_LANGS.forEach(lang => {
    const langName = {
      'en': 'English',
      'ja': '日本語',
      'es': 'Español',
      'pt-br': 'Português (Brasil)',
      'ar': 'العربية',
      'ko': '한국어',
    }[lang] || lang;
    
    md += `| ${langName} | ${languages[lang].total} | ${vsl2.sendRateByLang[lang].toFixed(2)}% |\n`;
  });
  
  md += `
---

## ⏰ タイミング精度

- **タイミング精度**: ${timing.accuracy.toFixed(2)}%
- **時間内送信**: ${timing.onTime}件
- **遅延送信**: ${timing.late}件
- **早期送信**: ${timing.early}件
- **総送信数**: ${timing.total}件

**目標**: VSL2遅延率<1%（精度99%以上）

---

## 🌍 言語別統計

| 言語 | ユーザー数 | 言語情報あり |
|------|-----------|------------|
`;

  SUPPORTED_LANGS.forEach(lang => {
    const langName = {
      'en': 'English',
      'ja': '日本語',
      'es': 'Español',
      'pt-br': 'Português (Brasil)',
      'ar': 'العربية',
      'ko': '한국어',
    }[lang] || lang;
    
    md += `| ${langName} | ${languages[lang].total} | ${languages[lang].withLang} |\n`;
  });
  
  md += `
---

## 📈 KPI達成状況

### 精度指標
- ✅ 言語カバレッジ率: ${summary.langCoverageRate.toFixed(2)}% (目標: 99%以上)
- ${timing.accuracy >= 99 ? '✅' : '⚠️'} タイミング精度: ${timing.accuracy.toFixed(2)}% (目標: 99%以上)

### コンバージョン率指標
- 📊 VSL2送信率: ${vsl2.sendRate.toFixed(2)}% (目標: 100%)

---

## 💡 推奨事項

`;

  // 推奨事項を生成
  if (summary.langCoverageRate < 99) {
    md += `- ⚠️ 言語カバレッジ率が99%未満です。言語補完DMキャンペーンを実行してください。\n`;
  }
  
  if (timing.accuracy < 99) {
    md += `- ⚠️ タイミング精度が99%未満です。タイムゾーン補正の確認をお願いします。\n`;
  }
  
  const lowCTRLangs = SUPPORTED_LANGS.filter(lang => vsl2.sendRateByLang[lang] < 50);
  if (lowCTRLangs.length > 0) {
    md += `- ⚠️ 以下の言語でVSL2送信率が低いです: ${lowCTRLangs.join(', ')}。メッセージテンプレートの見直しを検討してください。\n`;
  }
  
  if (summary.langCoverageRate >= 99 && timing.accuracy >= 99 && lowCTRLangs.length === 0) {
    md += `- ✅ すべてのKPIが目標を達成しています。素晴らしい成果です！\n`;
  }
  
  md += `
---

**生成日時**: ${new Date(report.generatedAt).toISOString()}
`;

  return md;
}

// 実行
if (require.main === module) {
  generateMonthlyEngagementReport()
    .then((report) => {
      console.log('\n✅ 月次エンゲージメント分析レポート生成完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { generateMonthlyEngagementReport };
