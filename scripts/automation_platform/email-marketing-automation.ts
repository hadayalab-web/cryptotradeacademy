#!/usr/bin/env tsx
/**
 * Emailマーケティング自動化システム
 * 
 * CryptoTradeAcademyのダイレクトレスポンスマーケティング（DRM）用
 * Emailシーケンス、スケジュール、セグメンテーションを管理
 */

import { sendResendEmail } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const DATA_DIR = join(__dirname, '..', 'data', 'email-marketing');
const SEQUENCES_DIR = join(DATA_DIR, 'sequences');
const SUBSCRIBERS_DIR = join(DATA_DIR, 'subscribers');
const CAMPAIGNS_DIR = join(DATA_DIR, 'campaigns');

// ディレクトリを作成
[DATA_DIR, SEQUENCES_DIR, SUBSCRIBERS_DIR, CAMPAIGNS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const VSL_URL = process.env.YOUTUBE_VSL_URL || process.env.HEYGEN_VSL_SHARE_URL || 'https://youtu.be/cLoYee2iv0s';
const WHOP_URL = 'https://whop.com/aio-media-llc/trap-defence-btc-en/';

interface EmailSequence {
  id: string;
  name: string;
  market: string;
  trigger: 'trial_started' | 'trial_ending' | 'purchase' | 'cancel' | 'welcome' | 're_engagement';
  phases: EmailPhase[];
  created_at: string;
  updated_at: string;
}

interface EmailPhase {
  phase: number;
  name: string;
  delay_hours: number; // 前のフェーズからの遅延時間
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
}

interface Subscriber {
  email: string;
  name?: string;
  market: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  sequences: SubscriberSequence[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface SubscriberSequence {
  sequence_id: string;
  current_phase: number;
  started_at: string;
  last_sent_at?: string;
  completed: boolean;
}

interface Campaign {
  id: string;
  name: string;
  market: string;
  sequence_id?: string;
  subject: string;
  html: string;
  scheduled_at?: string;
  sent_at?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  recipients: CampaignRecipient[];
  metrics: CampaignMetrics;
  created_at: string;
}

interface CampaignRecipient {
  email: string;
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced?: boolean;
}

interface CampaignMetrics {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  open_rate: number;
  click_rate: number;
}

/**
 * デフォルトEmailシーケンスを生成
 */
function createDefaultSequences(): EmailSequence[] {
  const markets: Array<'EN' | 'AR' | 'KO' | 'JA' | 'ES' | 'PT-BR'> = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];
  const sequences: EmailSequence[] = [];

  markets.forEach(market => {
    // Welcome Sequence (Trial Started)
    sequences.push({
      id: `welcome-${market.toLowerCase()}`,
      name: `Welcome Sequence - ${market}`,
      market,
      trigger: 'trial_started',
      phases: [
        {
          phase: 1,
          name: 'Welcome Email',
          delay_hours: 0,
          subject: market === 'EN' ? 'Welcome to CryptoTrade Academy 🎓' : 'CryptoTrade Academyへようこそ 🎓',
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 CryptoTrade Academy</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>Your 1-Day Free Trial just started.</p>
      <p>Your first briefing arrives in 6 hours. Join Telegram now:</p>
      <a href="https://t.me/cryptosignalai_en" class="button">Join Telegram</a>
      <h3>What to expect:</h3>
      <ul>
        <li>2-6 briefings today</li>
        <li>60-second reads</li>
        <li>BUG STANDBY alerts</li>
      </ul>
      <p>Cancel anytime in Dashboard → Settings.</p>
      <p>See you in 6 hours.</p>
      <p><strong>CryptoTrade Academy</strong></p>
    </div>
    <div class="footer">
      <p>You're receiving this because you started a trial. <a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
          tags: ['welcome', 'trial_started'],
        },
        {
          phase: 2,
          name: 'First Value Email',
          delay_hours: 6,
          subject: market === 'EN' ? 'Your first briefing is live 🛡️' : '最初のブリーフィングが配信されました 🛡️',
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Your First Briefing</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>Your first BUG STANDBY briefing just arrived in Telegram.</p>
      <a href="https://t.me/cryptosignalai_en" class="button">Check Telegram</a>
      <p><strong>Context → Decision → What to watch.</strong> 60 seconds.</p>
      <p>This is what $69/month gets you. Every day.</p>
      <p>Trial ends in 18 hours.</p>
      <p><strong>CryptoTrade Academy</strong></p>
    </div>
  </div>
</body>
</html>`,
          tags: ['value', 'trial'],
        },
        {
          phase: 3,
          name: 'Trial Ending Reminder',
          delay_hours: 12,
          subject: market === 'EN' ? 'Your trial ends in 6 hours' : 'トライアルが6時間で終了します',
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Trial Ending Soon</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>Your trial ends in 6 hours.</p>
      <p>You received {{briefing_count}} trap alerts. 0 false signals.</p>
      <p>Continue protecting your trades:</p>
      <a href="${WHOP_URL}" class="button">Continue Membership</a>
      <p><strong>CryptoTrade Academy</strong></p>
    </div>
  </div>
</body>
</html>`,
          tags: ['trial_ending', 'conversion'],
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // VSL Sequence (Re-engagement)
    sequences.push({
      id: `vsl-${market.toLowerCase()}`,
      name: `VSL Sequence - ${market}`,
      market,
      trigger: 're_engagement',
      phases: [
        {
          phase: 1,
          name: 'VSL Email',
          delay_hours: 0,
          subject: market === 'EN' ? 'Why Most Traders Lose Money' : 'なぜほとんどのトレーダーが負けるのか',
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .video-container { text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 Why Most Traders Lose Money</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>The hidden trap defense protocol:</p>
      <ul>
        <li>✅ Real-time trap detection</li>
        <li>✅ Institutional-grade insights</li>
        <li>✅ High-accuracy signals</li>
        <li>✅ Emotional trading reduction</li>
      </ul>
      <div class="video-container">
        <a href="${VSL_URL}" class="button">▶️ Watch VSL</a>
      </div>
      <p>Get access: <a href="${WHOP_URL}">${WHOP_URL}</a></p>
      <p><strong>CryptoTrade Academy</strong></p>
    </div>
  </div>
</body>
</html>`,
          tags: ['vsl', 're_engagement'],
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Lead Magnet Sequence (リードマグネット配布後)
    sequences.push({
      id: `lead-magnet-${market.toLowerCase()}`,
      name: `Lead Magnet Sequence - ${market}`,
      market,
      trigger: 'welcome',
      phases: [
        {
          phase: 1,
          name: 'Lead Magnet Delivery',
          delay_hours: 0,
          subject: market === 'EN' ? 'Your Free Report is Ready! 📊' : '無料レポートの準備ができました！📊',
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #4facfe; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Your Free Report is Ready!</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>Thank you for downloading our free report!</p>
      <p>Your report "<strong>5 Common Trading Traps That Cost Traders $10,000+</strong>" is ready to download.</p>
      <a href="{{download_url}}" class="button">📥 Download Your Free Report</a>
      <p><strong>What's Next?</strong></p>
      <p>In the next email, we'll share:</p>
      <ul>
        <li>✅ How to implement these strategies</li>
        <li>✅ Real-world examples from successful traders</li>
        <li>✅ Exclusive access to our Trap Defence system</li>
      </ul>
      <p>Stay tuned!</p>
      <p><strong>CryptoTrade Academy</strong></p>
    </div>
  </div>
</body>
</html>`,
          tags: ['lead_magnet', 'delivery'],
        },
        {
          phase: 2,
          name: 'Value Follow-up',
          delay_hours: 24,
          subject: market === 'EN' ? 'How to Avoid These 5 Trading Traps' : 'この5つのトレーディング罠を回避する方法',
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💡 How to Avoid Trading Traps</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>Did you read the report? Here's how to implement these strategies:</p>
      <h3>1. Real-time Trap Detection</h3>
      <p>Our Trap Defence system monitors the market 24/7 and alerts you before traps form.</p>
      <h3>2. Institutional-Grade Insights</h3>
      <p>Get the same data that professional traders use to make decisions.</p>
      <h3>3. Emotional Trading Reduction</h3>
      <p>Let AI do the analysis, you make the decisions with confidence.</p>
      <a href="${WHOP_URL}" class="button">🚀 Try Trap Defence Free</a>
      <p><strong>CryptoTrade Academy</strong></p>
    </div>
  </div>
</body>
</html>`,
          tags: ['lead_magnet', 'value', 'follow_up'],
        },
        {
          phase: 3,
          name: 'VSL Offer',
          delay_hours: 48,
          subject: market === 'EN' ? 'Watch This: Why Most Traders Lose Money' : 'これを見て：なぜほとんどのトレーダーが負けるのか',
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .video-container { text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 Why Most Traders Lose Money</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>You downloaded our free report. Now watch this video to understand the hidden trap defense protocol:</p>
      <div class="video-container">
        <a href="${VSL_URL}" class="button">▶️ Watch VSL</a>
      </div>
      <p>After watching, get full access to Trap Defence:</p>
      <a href="${WHOP_URL}" class="button">🚀 Get Access Now</a>
      <p><strong>CryptoTrade Academy</strong></p>
    </div>
  </div>
</body>
</html>`,
          tags: ['lead_magnet', 'vsl', 'conversion'],
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  return sequences;
}

/**
 * Emailシーケンスを保存
 */
function saveSequence(sequence: EmailSequence): void {
  const filepath = join(SEQUENCES_DIR, `${sequence.id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(sequence, null, 2), 'utf-8');
}

/**
 * Emailシーケンスを読み込み
 */
function loadSequence(sequenceId: string): EmailSequence | null {
  const filepath = join(SEQUENCES_DIR, `${sequenceId}.json`);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as EmailSequence;
}

/**
 * すべてのシーケンスを読み込み
 */
function loadAllSequences(): EmailSequence[] {
  if (!fs.existsSync(SEQUENCES_DIR)) {
    return [];
  }
  const files = fs.readdirSync(SEQUENCES_DIR).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const content = fs.readFileSync(join(SEQUENCES_DIR, file), 'utf-8');
    return JSON.parse(content) as EmailSequence;
  });
}

/**
 * サブスクライバーを保存
 */
function saveSubscriber(subscriber: Subscriber): void {
  const filepath = join(SUBSCRIBERS_DIR, `${subscriber.email.replace('@', '_at_')}.json`);
  fs.writeFileSync(filepath, JSON.stringify(subscriber, null, 2), 'utf-8');
}

/**
 * サブスクライバーを読み込み
 */
function loadSubscriber(email: string): Subscriber | null {
  const filepath = join(SUBSCRIBERS_DIR, `${email.replace('@', '_at_')}.json`);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as Subscriber;
}

/**
 * シーケンスのフェーズを送信
 */
async function sendSequencePhase(
  subscriber: Subscriber,
  sequence: EmailSequence,
  phase: EmailPhase
): Promise<boolean> {
  // メール本文をパーソナライズ
  let html = phase.html;
  html = html.replace(/\{\{name\}\}/g, subscriber.name || 'Friend');
  html = html.replace(/\{\{unsubscribe_url\}\}/g, `https://cryptotradeacademy.io/unsubscribe?email=${encodeURIComponent(subscriber.email)}`);

  try {
    const result = await sendResendEmail({
      from: 'CryptoTrade Academy <noreply@cryptotradeacademy.io>',
      to: subscriber.email,
      subject: phase.subject,
      html,
      tags: phase.tags || [],
    });

    if (result.success) {
      // サブスクライバーのシーケンス状態を更新
      const subscriberSequence = subscriber.sequences.find(s => s.sequence_id === sequence.id);
      if (subscriberSequence) {
        subscriberSequence.current_phase = phase.phase;
        subscriberSequence.last_sent_at = new Date().toISOString();
        if (phase.phase === sequence.phases.length) {
          subscriberSequence.completed = true;
        }
      }
      subscriber.updated_at = new Date().toISOString();
      saveSubscriber(subscriber);

      return true;
    }
    return false;
  } catch (error: any) {
    console.error(`❌ Email送信失敗 (${subscriber.email}): ${error.message}`);
    return false;
  }
}

/**
 * シーケンスを開始
 */
async function startSequence(email: string, sequenceId: string): Promise<boolean> {
  const sequence = loadSequence(sequenceId);
  if (!sequence) {
    throw new Error(`Sequence not found: ${sequenceId}`);
  }

  let subscriber = loadSubscriber(email);
  if (!subscriber) {
    subscriber = {
      email,
      market: sequence.market,
      status: 'active',
      sequences: [],
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // シーケンスを追加
  subscriber.sequences.push({
    sequence_id: sequenceId,
    current_phase: 0,
    started_at: new Date().toISOString(),
    completed: false,
  });

  saveSubscriber(subscriber);

  // 最初のフェーズを送信
  const firstPhase = sequence.phases[0];
  return await sendSequencePhase(subscriber, sequence, firstPhase);
}

/**
 * スケジュールされたメールを処理
 */
async function processScheduledEmails(): Promise<void> {
  const subscribers = fs.readdirSync(SUBSCRIBERS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(file => {
      const content = fs.readFileSync(join(SUBSCRIBERS_DIR, file), 'utf-8');
      return JSON.parse(content) as Subscriber;
    })
    .filter(s => s.status === 'active');

  for (const subscriber of subscribers) {
    for (const subscriberSequence of subscriber.sequences) {
      if (subscriberSequence.completed) continue;

      const sequence = loadSequence(subscriberSequence.sequence_id);
      if (!sequence) continue;

      const currentPhaseIndex = subscriberSequence.current_phase;
      const nextPhaseIndex = currentPhaseIndex + 1;

      if (nextPhaseIndex >= sequence.phases.length) {
        subscriberSequence.completed = true;
        saveSubscriber(subscriber);
        continue;
      }

      const lastSentAt = subscriberSequence.last_sent_at 
        ? new Date(subscriberSequence.last_sent_at)
        : new Date(subscriberSequence.started_at);
      
      const nextPhase = sequence.phases[nextPhaseIndex];
      const delayMs = nextPhase.delay_hours * 60 * 60 * 1000;
      const shouldSend = Date.now() - lastSentAt.getTime() >= delayMs;

      if (shouldSend) {
        await sendSequencePhase(subscriber, sequence, nextPhase);
      }
    }
  }
}

async function main() {
  console.log('📧 Emailマーケティング自動化システム開始\n');
  console.log('='.repeat(80));

  const command = process.argv[2] || 'init';

  if (command === 'init') {
    console.log('📋 デフォルトシーケンスを初期化中...\n');
    const sequences = createDefaultSequences();
    sequences.forEach(seq => {
      saveSequence(seq);
      console.log(`✅ ${seq.name} を保存`);
    });
    console.log(`\n✅ ${sequences.length}件のシーケンスを初期化しました`);
  } else if (command === 'process') {
    console.log('📧 スケジュールされたメールを処理中...\n');
    await processScheduledEmails();
    console.log('✅ 処理完了');
  } else if (command === 'start') {
    const email = process.argv[3];
    const sequenceId = process.argv[4];
    if (!email || !sequenceId) {
      console.error('❌ 使用方法: npx tsx scripts/email-marketing-automation.ts start <email> <sequence_id>');
      process.exit(1);
    }
    console.log(`🚀 シーケンス開始: ${email} → ${sequenceId}\n`);
    const success = await startSequence(email, sequenceId);
    if (success) {
      console.log('✅ シーケンス開始成功');
    } else {
      console.error('❌ シーケンス開始失敗');
      process.exit(1);
    }
  } else {
    console.error(`❌ 不明なコマンド: ${command}`);
    console.log('\n使用方法:');
    console.log('  npx tsx scripts/email-marketing-automation.ts init          # デフォルトシーケンスを初期化');
    console.log('  npx tsx scripts/email-marketing-automation.ts process       # スケジュールされたメールを処理');
    console.log('  npx tsx scripts/email-marketing-automation.ts start <email> <sequence_id>  # シーケンスを開始');
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
