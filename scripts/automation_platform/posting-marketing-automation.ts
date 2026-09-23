#!/usr/bin/env tsx
/**
 * 投稿マーケティング自動化システム
 * 
 * CryptoTradeAcademyのダイレクトレスポンスマーケティング（DRM）用
 * Telegram/X/Discord投稿のスケジュール、A/Bテスト、パフォーマンス追跡を管理
 */

import { sendTelegramChannelPost } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const DATA_DIR = join(__dirname, '..', 'data', 'posting-marketing');
const SCHEDULES_DIR = join(DATA_DIR, 'schedules');
const AB_TESTS_DIR = join(DATA_DIR, 'ab-tests');
const METRICS_DIR = join(DATA_DIR, 'metrics');

// ディレクトリを作成
[DATA_DIR, SCHEDULES_DIR, AB_TESTS_DIR, METRICS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

interface PostingSchedule {
  id: string;
  name: string;
  platform: 'telegram' | 'x' | 'discord';
  market: string;
  content_type: 'market-analysis' | 'vsl-post' | 'engagement';
  content_file: string; // posting-contentディレクトリのJSONファイル
  scheduled_at: string; // ISO 8601形式
  timezone?: string;
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed';
  sent_at?: string;
  error?: string;
  created_at: string;
}

interface ABTest {
  id: string;
  name: string;
  platform: 'telegram' | 'x' | 'discord';
  market: string;
  content_type: 'market-analysis' | 'vsl-post' | 'engagement';
  variants: ABTestVariant[];
  start_date: string;
  end_date: string;
  status: 'draft' | 'running' | 'completed';
  winner?: string; // variant_id
  metrics: ABTestMetrics;
  created_at: string;
}

interface ABTestVariant {
  id: string;
  name: string;
  content_file: string;
  weight: number; // 0-100 (トラフィック配分)
}

interface ABTestMetrics {
  variant_a: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    conversion_rate: number;
  };
  variant_b: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    conversion_rate: number;
  };
}

interface PostingMetrics {
  id: string;
  platform: 'telegram' | 'x' | 'discord';
  market: string;
  content_type: string;
  posted_at: string;
  impressions: number;
  clicks: number;
  conversions: number;
  engagement_rate: number;
  ctr: number;
  conversion_rate: number;
  updated_at: string;
}

/**
 * スケジュールを保存
 */
function saveSchedule(schedule: PostingSchedule): void {
  const filepath = join(SCHEDULES_DIR, `${schedule.id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(schedule, null, 2), 'utf-8');
}

/**
 * スケジュールを読み込み
 */
function loadSchedule(scheduleId: string): PostingSchedule | null {
  const filepath = join(SCHEDULES_DIR, `${scheduleId}.json`);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as PostingSchedule;
}

/**
 * すべてのスケジュールを読み込み
 */
function loadAllSchedules(): PostingSchedule[] {
  if (!fs.existsSync(SCHEDULES_DIR)) {
    return [];
  }
  const files = fs.readdirSync(SCHEDULES_DIR).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const content = fs.readFileSync(join(SCHEDULES_DIR, file), 'utf-8');
    return JSON.parse(content) as PostingSchedule;
  });
}

/**
 * スケジュールされた投稿を処理
 */
async function processScheduledPosts(): Promise<void> {
  const schedules = loadAllSchedules()
    .filter(s => s.status === 'scheduled')
    .filter(s => new Date(s.scheduled_at) <= new Date());

  console.log(`📅 ${schedules.length}件のスケジュールされた投稿を処理中...\n`);

  for (const schedule of schedules) {
    try {
      console.log(`📱 ${schedule.platform.toUpperCase()}投稿処理: ${schedule.name}`);

      // コンテンツファイルを読み込み
      const contentPath = join(__dirname, '..', schedule.content_file);
      if (!fs.existsSync(contentPath)) {
        throw new Error(`コンテンツファイルが見つかりません: ${contentPath}`);
      }

      const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));

      // プラットフォーム別に投稿
      if (schedule.platform === 'telegram') {
        const result = await sendTelegramChannelPost({
          market: schedule.market as 'EN' | 'AR' | 'KO' | 'JA' | 'ES' | 'PT-BR',
          message: content.content,
          parseMode: 'HTML',
          photoPath: content.thumbnailPath && fs.existsSync(content.thumbnailPath)
            ? content.thumbnailPath
            : undefined,
        });

        if (result.success) {
          schedule.status = 'sent';
          schedule.sent_at = new Date().toISOString();
          console.log(`✅ Telegram投稿成功 (Message ID: ${result.messageId})`);
        } else {
          schedule.status = 'failed';
          schedule.error = result.error;
          console.error(`❌ Telegram投稿失敗: ${result.error}`);
        }
      } else if (schedule.platform === 'x') {
        // X投稿は別スクリプトを使用
        console.log(`⚠️ X投稿は scripts/post-to-x.ts を使用してください`);
        schedule.status = 'failed';
        schedule.error = 'X投稿は別スクリプトを使用';
      } else if (schedule.platform === 'discord') {
        // Discord投稿は別スクリプトを使用
        console.log(`⚠️ Discord投稿は別スクリプトを使用してください`);
        schedule.status = 'failed';
        schedule.error = 'Discord投稿は別スクリプトを使用';
      }

      saveSchedule(schedule);
    } catch (error: any) {
      console.error(`❌ 投稿処理エラー (${schedule.id}): ${error.message}`);
      schedule.status = 'failed';
      schedule.error = error.message;
      saveSchedule(schedule);
    }
  }

  console.log(`\n✅ ${schedules.length}件のスケジュール処理完了`);
}

/**
 * スケジュールを作成
 */
function createSchedule(
  name: string,
  platform: 'telegram' | 'x' | 'discord',
  market: string,
  contentType: 'market-analysis' | 'vsl-post' | 'engagement',
  contentFile: string,
  scheduledAt: string
): PostingSchedule {
  const schedule: PostingSchedule = {
    id: `schedule-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name,
    platform,
    market,
    content_type: contentType,
    content_file: contentFile,
    scheduled_at: scheduledAt,
    status: 'scheduled',
    created_at: new Date().toISOString(),
  };

  saveSchedule(schedule);
  return schedule;
}

/**
 * A/Bテストを作成
 */
function createABTest(
  name: string,
  platform: 'telegram' | 'x' | 'discord',
  market: string,
  contentType: 'market-analysis' | 'vsl-post' | 'engagement',
  variants: Array<{ name: string; content_file: string; weight: number }>,
  startDate: string,
  endDate: string
): ABTest {
  const abTest: ABTest = {
    id: `abtest-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name,
    platform,
    market,
    content_type: contentType,
    variants: variants.map((v, i) => ({
      id: `variant-${i + 1}`,
      name: v.name,
      content_file: v.content_file,
      weight: v.weight,
    })),
    start_date: startDate,
    end_date: endDate,
    status: 'draft',
    metrics: {
      variant_a: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        conversion_rate: 0,
      },
      variant_b: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        conversion_rate: 0,
      },
    },
    created_at: new Date().toISOString(),
  };

  const filepath = join(AB_TESTS_DIR, `${abTest.id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(abTest, null, 2), 'utf-8');

  return abTest;
}

/**
 * 定期的な投稿スケジュールを生成（デフォルト）
 */
function createDefaultSchedules(): void {
  const markets: Array<'EN' | 'AR' | 'KO' | 'JA' | 'ES' | 'PT-BR'> = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];
  const platforms: Array<'telegram' | 'x' | 'discord'> = ['telegram', 'x'];
  const contentTypes: Array<'market-analysis' | 'vsl-post' | 'engagement'> = ['market-analysis', 'vsl-post', 'engagement'];

  // 今日の日付を取得
  const today = new Date();
  today.setHours(9, 0, 0, 0); // 9:00 AM

  markets.forEach(market => {
    platforms.forEach(platform => {
      contentTypes.forEach(contentType => {
        // 最新のコンテンツファイルを検索
        const contentDir = join(__dirname, '..', 'data', 'posting-content');
        if (!fs.existsSync(contentDir)) {
          return;
        }

        const files = fs.readdirSync(contentDir)
          .filter(f => f.startsWith(`${platform}-${contentType}-${market}`))
          .sort()
          .reverse();

        if (files.length > 0) {
          const contentFile = `data/posting-content/${files[0]}`;
          const scheduledAt = new Date(today);
          scheduledAt.setDate(scheduledAt.getDate() + Math.floor(Math.random() * 7)); // 1週間以内

          createSchedule(
            `${platform.toUpperCase()} ${contentType} - ${market}`,
            platform,
            market,
            contentType,
            contentFile,
            scheduledAt.toISOString()
          );
        }
      });
    });
  });
}

async function main() {
  console.log('📱 投稿マーケティング自動化システム開始\n');
  console.log('='.repeat(80));

  const command = process.argv[2] || 'process';

  if (command === 'process') {
    await processScheduledPosts();
  } else if (command === 'init') {
    console.log('📋 デフォルトスケジュールを生成中...\n');
    createDefaultSchedules();
    console.log('✅ デフォルトスケジュール生成完了');
  } else if (command === 'schedule') {
    const name = process.argv[3];
    const platform = process.argv[4] as 'telegram' | 'x' | 'discord';
    const market = process.argv[5];
    const contentType = process.argv[6] as 'market-analysis' | 'vsl-post' | 'engagement';
    const contentFile = process.argv[7];
    const scheduledAt = process.argv[8];

    if (!name || !platform || !market || !contentType || !contentFile || !scheduledAt) {
      console.error('❌ 使用方法: npx tsx scripts/posting-marketing-automation.ts schedule <name> <platform> <market> <content_type> <content_file> <scheduled_at>');
      process.exit(1);
    }

    const schedule = createSchedule(name, platform, market, contentType, contentFile, scheduledAt);
    console.log(`✅ スケジュール作成: ${schedule.id}`);
  } else {
    console.error(`❌ 不明なコマンド: ${command}`);
    console.log('\n使用方法:');
    console.log('  npx tsx scripts/posting-marketing-automation.ts process              # スケジュールされた投稿を処理');
    console.log('  npx tsx scripts/posting-marketing-automation.ts init                # デフォルトスケジュールを生成');
    console.log('  npx tsx scripts/posting-marketing-automation.ts schedule <...>      # スケジュールを作成');
    process.exit(1);
  }

  console.log('='.repeat(80) + '\n');
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
