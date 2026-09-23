#!/usr/bin/env tsx
/**
 * CryptoTradeAcademy 統合DRM管理システム
 * 
 * Emailマーケティングと投稿マーケティングの両軸を統合管理
 * パフォーマンス追跡、レポート生成、最適化提案
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const DATA_DIR = join(__dirname, '..', 'data', 'drm');
const REPORTS_DIR = join(DATA_DIR, 'reports');

// ディレクトリを作成
[DATA_DIR, REPORTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

interface DRMMetrics {
  period: string; // YYYY-MM形式
  email: {
    total_sent: number;
    total_opened: number;
    total_clicked: number;
    total_converted: number;
    open_rate: number;
    click_rate: number;
    conversion_rate: number;
    revenue: number;
  };
  posting: {
    telegram: {
      total_posts: number;
      total_impressions: number;
      total_clicks: number;
      total_conversions: number;
      engagement_rate: number;
      ctr: number;
      conversion_rate: number;
      revenue: number;
    };
    x: {
      total_posts: number;
      total_impressions: number;
      total_clicks: number;
      total_conversions: number;
      engagement_rate: number;
      ctr: number;
      conversion_rate: number;
      revenue: number;
    };
    discord: {
      total_posts: number;
      total_impressions: number;
      total_clicks: number;
      total_conversions: number;
      engagement_rate: number;
      ctr: number;
      conversion_rate: number;
      revenue: number;
    };
  };
  total_revenue: number;
  total_conversions: number;
  roas: number; // Return on Ad Spend
}

interface DRMReport {
  id: string;
  period: string;
  generated_at: string;
  metrics: DRMMetrics;
  insights: string[];
  recommendations: string[];
}

/**
 * DRMメトリクスを集計
 */
function aggregateMetrics(period: string): DRMMetrics {
  // Emailメトリクス
  const emailDir = join(__dirname, '..', 'data', 'email-marketing', 'campaigns');
  let emailMetrics = {
    total_sent: 0,
    total_opened: 0,
    total_clicked: 0,
    total_converted: 0,
    open_rate: 0,
    click_rate: 0,
    conversion_rate: 0,
    revenue: 0,
  };

  if (fs.existsSync(emailDir)) {
    const campaigns = fs.readdirSync(emailDir)
      .filter(f => f.endsWith('.json'))
      .map(file => {
        const content = fs.readFileSync(join(emailDir, file), 'utf-8');
        return JSON.parse(content);
      })
      .filter(c => c.sent_at && c.sent_at.startsWith(period));

    campaigns.forEach(campaign => {
      emailMetrics.total_sent += campaign.metrics.total_sent || 0;
      emailMetrics.total_opened += campaign.metrics.total_opened || 0;
      emailMetrics.total_clicked += campaign.metrics.total_clicked || 0;
      emailMetrics.total_converted += campaign.metrics.total_converted || 0;
    });

    if (emailMetrics.total_sent > 0) {
      emailMetrics.open_rate = (emailMetrics.total_opened / emailMetrics.total_sent) * 100;
      emailMetrics.click_rate = (emailMetrics.total_clicked / emailMetrics.total_sent) * 100;
      emailMetrics.conversion_rate = (emailMetrics.total_converted / emailMetrics.total_sent) * 100;
    }
  }

  // 投稿メトリクス
  const postingDir = join(__dirname, '..', 'data', 'posting-marketing', 'metrics');
  const postingMetrics = {
    telegram: {
      total_posts: 0,
      total_impressions: 0,
      total_clicks: 0,
      total_conversions: 0,
      engagement_rate: 0,
      ctr: 0,
      conversion_rate: 0,
      revenue: 0,
    },
    x: {
      total_posts: 0,
      total_impressions: 0,
      total_clicks: 0,
      total_conversions: 0,
      engagement_rate: 0,
      ctr: 0,
      conversion_rate: 0,
      revenue: 0,
    },
    discord: {
      total_posts: 0,
      total_impressions: 0,
      total_clicks: 0,
      total_conversions: 0,
      engagement_rate: 0,
      ctr: 0,
      conversion_rate: 0,
      revenue: 0,
    },
  };

  if (fs.existsSync(postingDir)) {
    const metrics = fs.readdirSync(postingDir)
      .filter(f => f.endsWith('.json'))
      .map(file => {
        const content = fs.readFileSync(join(postingDir, file), 'utf-8');
        return JSON.parse(content);
      })
      .filter(m => m.posted_at && m.posted_at.startsWith(period));

    metrics.forEach(metric => {
      const platform = metric.platform;
      if (postingMetrics[platform as keyof typeof postingMetrics]) {
        postingMetrics[platform as keyof typeof postingMetrics].total_posts += 1;
        postingMetrics[platform as keyof typeof postingMetrics].total_impressions += metric.impressions || 0;
        postingMetrics[platform as keyof typeof postingMetrics].total_clicks += metric.clicks || 0;
        postingMetrics[platform as keyof typeof postingMetrics].total_conversions += metric.conversions || 0;
      }
    });

    // エンゲージメント率とCTRを計算
    Object.keys(postingMetrics).forEach(platform => {
      const pm = postingMetrics[platform as keyof typeof postingMetrics];
      if (pm.total_impressions > 0) {
        pm.ctr = (pm.total_clicks / pm.total_impressions) * 100;
        pm.conversion_rate = (pm.total_conversions / pm.total_clicks) * 100;
        pm.engagement_rate = ((pm.total_clicks + pm.total_conversions) / pm.total_impressions) * 100;
      }
    });
  }

  const totalRevenue = emailMetrics.revenue +
    postingMetrics.telegram.revenue +
    postingMetrics.x.revenue +
    postingMetrics.discord.revenue;

  const totalConversions = emailMetrics.total_converted +
    postingMetrics.telegram.total_conversions +
    postingMetrics.x.total_conversions +
    postingMetrics.discord.total_conversions;

  return {
    period,
    email: emailMetrics,
    posting: postingMetrics,
    total_revenue: totalRevenue,
    total_conversions: totalConversions,
    roas: totalRevenue > 0 ? totalRevenue / (totalRevenue * 0.1) : 0, // 仮の計算
  };
}

/**
 * インサイトを生成
 */
function generateInsights(metrics: DRMMetrics): string[] {
  const insights: string[] = [];

  // Emailインサイト
  if (metrics.email.open_rate > 25) {
    insights.push(`✅ Email開封率が良好です (${metrics.email.open_rate.toFixed(1)}%)`);
  } else if (metrics.email.open_rate < 15) {
    insights.push(`⚠️ Email開封率が低いです (${metrics.email.open_rate.toFixed(1)}%)。件名の最適化を検討してください`);
  }

  if (metrics.email.click_rate > 5) {
    insights.push(`✅ Emailクリック率が良好です (${metrics.email.click_rate.toFixed(1)}%)`);
  } else if (metrics.email.click_rate < 2) {
    insights.push(`⚠️ Emailクリック率が低いです (${metrics.email.click_rate.toFixed(1)}%)。CTAの最適化を検討してください`);
  }

  // 投稿インサイト
  if (metrics.posting.telegram.ctr > metrics.posting.x.ctr) {
    insights.push(`📱 TelegramのCTRがXより高いです (Telegram: ${metrics.posting.telegram.ctr.toFixed(1)}% vs X: ${metrics.posting.x.ctr.toFixed(1)}%)`);
  }

  if (metrics.posting.telegram.conversion_rate > 3) {
    insights.push(`✅ Telegramのコンバージョン率が良好です (${metrics.posting.telegram.conversion_rate.toFixed(1)}%)`);
  }

  // 総合インサイト
  if (metrics.total_revenue > 0) {
    insights.push(`💰 総収益: $${metrics.total_revenue.toFixed(2)}`);
  }

  return insights;
}

/**
 * 推奨事項を生成
 */
function generateRecommendations(metrics: DRMMetrics): string[] {
  const recommendations: string[] = [];

  // Email推奨事項
  if (metrics.email.open_rate < 20) {
    recommendations.push('📧 Email件名のA/Bテストを実施し、開封率を向上させましょう');
  }

  if (metrics.email.click_rate < 3) {
    recommendations.push('📧 Email本文のCTAを最適化し、クリック率を向上させましょう');
  }

  // 投稿推奨事項
  if (metrics.posting.telegram.total_posts < 10) {
    recommendations.push('📱 Telegram投稿頻度を増やし、エンゲージメントを向上させましょう');
  }

  if (metrics.posting.x.ctr < 1) {
    recommendations.push('🐦 X投稿のコンテンツを最適化し、CTRを向上させましょう');
  }

  // VSL投稿の推奨事項
  recommendations.push('🎬 VSL投稿の頻度を増やし、コンバージョン機会を増やしましょう');

  return recommendations;
}

/**
 * レポートを生成
 */
function generateReport(period: string): DRMReport {
  const metrics = aggregateMetrics(period);
  const insights = generateInsights(metrics);
  const recommendations = generateRecommendations(metrics);

  const report: DRMReport = {
    id: `report-${period}-${Date.now()}`,
    period,
    generated_at: new Date().toISOString(),
    metrics,
    insights,
    recommendations,
  };

  const filepath = join(REPORTS_DIR, `${report.id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');

  return report;
}

/**
 * レポートを表示
 */
function displayReport(report: DRMReport): void {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 CryptoTradeAcademy DRMレポート - ${report.period}`);
  console.log('='.repeat(80));

  console.log('\n📧 Emailマーケティング:');
  console.log(`  送信数: ${report.metrics.email.total_sent}`);
  console.log(`  開封数: ${report.metrics.email.total_opened} (開封率: ${report.metrics.email.open_rate.toFixed(1)}%)`);
  console.log(`  クリック数: ${report.metrics.email.total_clicked} (クリック率: ${report.metrics.email.click_rate.toFixed(1)}%)`);
  console.log(`  コンバージョン数: ${report.metrics.email.total_converted} (コンバージョン率: ${report.metrics.email.conversion_rate.toFixed(1)}%)`);

  console.log('\n📱 投稿マーケティング:');
  console.log(`  Telegram:`);
  console.log(`    投稿数: ${report.metrics.posting.telegram.total_posts}`);
  console.log(`    インプレッション: ${report.metrics.posting.telegram.total_impressions}`);
  console.log(`    CTR: ${report.metrics.posting.telegram.ctr.toFixed(1)}%`);
  console.log(`    コンバージョン率: ${report.metrics.posting.telegram.conversion_rate.toFixed(1)}%`);
  console.log(`  X (Twitter):`);
  console.log(`    投稿数: ${report.metrics.posting.x.total_posts}`);
  console.log(`    インプレッション: ${report.metrics.posting.x.total_impressions}`);
  console.log(`    CTR: ${report.metrics.posting.x.ctr.toFixed(1)}%`);
  console.log(`    コンバージョン率: ${report.metrics.posting.x.conversion_rate.toFixed(1)}%`);

  console.log('\n💰 総合:');
  console.log(`  総収益: $${report.metrics.total_revenue.toFixed(2)}`);
  console.log(`  総コンバージョン数: ${report.metrics.total_conversions}`);
  console.log(`  ROAS: ${report.metrics.roas.toFixed(2)}`);

  if (report.insights.length > 0) {
    console.log('\n💡 インサイト:');
    report.insights.forEach(insight => console.log(`  ${insight}`));
  }

  if (report.recommendations.length > 0) {
    console.log('\n🎯 推奨事項:');
    report.recommendations.forEach(rec => console.log(`  ${rec}`));
  }

  console.log('\n' + '='.repeat(80));
}

async function main() {
  console.log('🚀 CryptoTradeAcademy 統合DRM管理システム開始\n');

  const command = process.argv[2] || 'report';
  const period = process.argv[3] || new Date().toISOString().substring(0, 7); // YYYY-MM

  if (command === 'report') {
    console.log(`📊 レポート生成中: ${period}\n`);
    const report = generateReport(period);
    displayReport(report);
    console.log(`\n✅ レポート保存: ${join(REPORTS_DIR, `${report.id}.json`)}`);
  } else {
    console.error(`❌ 不明なコマンド: ${command}`);
    console.log('\n使用方法:');
    console.log('  npx tsx scripts/drm-unified-manager.ts report [YYYY-MM]  # レポートを生成');
    process.exit(1);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });
