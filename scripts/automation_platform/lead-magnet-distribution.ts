#!/usr/bin/env tsx
/**
 * リードマグネット配布システム
 * 
 * 投稿経由でリードマグネット（無料サービス）を配布し、メールアドレスを取得
 * その後、メールでリストマーケティングを展開
 */

import { sendTelegramChannelPost } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const DATA_DIR = join(__dirname, '..', 'data', 'lead-magnets');
const LEADS_DIR = join(DATA_DIR, 'leads');
const DISTRIBUTIONS_DIR = join(DATA_DIR, 'distributions');

// ディレクトリを作成
[DATA_DIR, LEADS_DIR, DISTRIBUTIONS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const LEAD_MAGNET_LANDING_URL = process.env.LEAD_MAGNET_LANDING_URL || 'https://cryptotradeacademy.io/lead-magnet';

interface LeadMagnet {
  id: string;
  name: string;
  market: string;
  type: 'free_report' | 'free_tool' | 'free_course' | 'free_checklist' | 'free_template';
  title: string;
  description: string;
  value_proposition: string;
  landing_page_url: string;
  delivery_method: 'email' | 'instant_download';
  created_at: string;
}

interface Lead {
  id: string;
  email: string;
  name?: string;
  market: string;
  lead_magnet_id: string;
  source: 'telegram' | 'x' | 'discord' | 'direct';
  source_post_id?: string;
  subscribed: boolean;
  email_sequence_started: boolean;
  created_at: string;
  updated_at: string;
}

interface Distribution {
  id: string;
  lead_magnet_id: string;
  platform: 'telegram' | 'x' | 'discord';
  market: string;
  post_content: string;
  scheduled_at: string;
  posted_at?: string;
  status: 'scheduled' | 'posted' | 'cancelled';
  metrics: {
    impressions: number;
    clicks: number;
    leads_collected: number;
    conversion_rate: number;
  };
  created_at: string;
}

/**
 * デフォルトリードマグネットを生成
 */
function createDefaultLeadMagnets(): LeadMagnet[] {
  const markets: Array<'EN' | 'AR' | 'KO' | 'JA' | 'ES' | 'PT-BR'> = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];
  const leadMagnets: LeadMagnet[] = [];

  markets.forEach(market => {
    // Free Report: "5 Common Trading Traps That Cost Traders $10,000+"
    leadMagnets.push({
      id: `free-report-${market.toLowerCase()}`,
      name: `Free Report - ${market}`,
      market,
      type: 'free_report',
      title: market === 'EN' 
        ? '5 Common Trading Traps That Cost Traders $10,000+'
        : market === 'JA'
        ? 'トレーダーが$10,000以上失う5つの一般的な罠'
        : '5 Trampas Comunes que Cuestan a los Traders $10,000+',
      description: market === 'EN'
        ? 'Download our free report revealing the 5 most common trading traps and how to avoid them.'
        : market === 'JA'
        ? '最も一般的な5つのトレーディング罠と回避方法を明らかにする無料レポートをダウンロード。'
        : 'Descarga nuestro informe gratuito que revela las 5 trampas de trading más comunes y cómo evitarlas.',
      value_proposition: market === 'EN'
        ? 'Learn from real trading mistakes. Get instant access to our comprehensive guide.'
        : market === 'JA'
        ? '実際のトレーディングミスから学ぶ。包括的なガイドに即座にアクセス。'
        : 'Aprende de errores reales de trading. Obtén acceso instantáneo a nuestra guía completa.',
      landing_page_url: `${LEAD_MAGNET_LANDING_URL}?magnet=free-report&market=${market}`,
      delivery_method: 'email',
      created_at: new Date().toISOString(),
    });

    // Free Tool: "Trap Detection Calculator"
    leadMagnets.push({
      id: `free-tool-${market.toLowerCase()}`,
      name: `Free Tool - ${market}`,
      market,
      type: 'free_tool',
      title: market === 'EN'
        ? 'Trap Detection Calculator'
        : market === 'JA'
        ? '罠検出計算機'
        : 'Calculadora de Detección de Trampas',
      description: market === 'EN'
        ? 'Free tool to calculate your trading trap risk score and get personalized recommendations.'
        : market === 'JA'
        ? 'トレーディング罠リスクスコアを計算し、パーソナライズされた推奨事項を取得する無料ツール。'
        : 'Herramienta gratuita para calcular tu puntuación de riesgo de trampas de trading y obtener recomendaciones personalizadas.',
      value_proposition: market === 'EN'
        ? 'Get instant insights into your trading patterns. No credit card required.'
        : market === 'JA'
        ? 'トレーディングパターンへの即座の洞察を取得。クレジットカード不要。'
        : 'Obtén información instantánea sobre tus patrones de trading. No se requiere tarjeta de crédito.',
      landing_page_url: `${LEAD_MAGNET_LANDING_URL}?magnet=free-tool&market=${market}`,
      delivery_method: 'instant_download',
      created_at: new Date().toISOString(),
    });
  });

  return leadMagnets;
}

/**
 * リードマグネットを保存
 */
function saveLeadMagnet(leadMagnet: LeadMagnet): void {
  const filepath = join(DATA_DIR, `lead-magnet-${leadMagnet.id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(leadMagnet, null, 2), 'utf-8');
}

/**
 * リードマグネットを読み込み
 */
function loadLeadMagnet(leadMagnetId: string): LeadMagnet | null {
  const filepath = join(DATA_DIR, `lead-magnet-${leadMagnetId}.json`);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as LeadMagnet;
}

/**
 * リードを保存
 */
function saveLead(lead: Lead): void {
  const filepath = join(LEADS_DIR, `${lead.id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(lead, null, 2), 'utf-8');
}

/**
 * リードを読み込み
 */
function loadLead(leadId: string): Lead | null {
  const filepath = join(LEADS_DIR, `${leadId}.json`);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as Lead;
}

/**
 * メールアドレスでリードを検索
 */
function findLeadByEmail(email: string): Lead | null {
  if (!fs.existsSync(LEADS_DIR)) {
    return null;
  }
  const files = fs.readdirSync(LEADS_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const content = fs.readFileSync(join(LEADS_DIR, file), 'utf-8');
    const lead = JSON.parse(content) as Lead;
    if (lead.email.toLowerCase() === email.toLowerCase()) {
      return lead;
    }
  }
  return null;
}

/**
 * リードマグネット配布用の投稿コンテンツを生成
 */
function generateDistributionPost(leadMagnet: LeadMagnet, platform: 'telegram' | 'x' | 'discord'): string {
  const emoji = leadMagnet.type === 'free_report' ? '📊' 
              : leadMagnet.type === 'free_tool' ? '🛠️'
              : leadMagnet.type === 'free_course' ? '🎓'
              : leadMagnet.type === 'free_checklist' ? '✅'
              : '📄';

  if (platform === 'telegram') {
    return `${emoji} <b>${leadMagnet.title}</b>

${leadMagnet.description}

${leadMagnet.value_proposition}

🎁 <b>Get it FREE:</b> ${leadMagnet.landing_page_url}

#CryptoTrading #FreeTool #TradingTips`;
  } else if (platform === 'x') {
    return `${emoji} ${leadMagnet.title}

${leadMagnet.description}

${leadMagnet.value_proposition}

🎁 Get it FREE: ${leadMagnet.landing_page_url}

#CryptoTrading #FreeTool #TradingTips`;
  } else {
    // Discord
    return `**${emoji} ${leadMagnet.title}**

${leadMagnet.description}

${leadMagnet.value_proposition}

🎁 **Get it FREE:** ${leadMagnet.landing_page_url}`;
  }
}

/**
 * リードマグネット配布を投稿
 */
async function distributeLeadMagnet(
  leadMagnetId: string,
  platform: 'telegram' | 'x' | 'discord',
  market: string
): Promise<boolean> {
  const leadMagnet = loadLeadMagnet(leadMagnetId);
  if (!leadMagnet) {
    throw new Error(`Lead magnet not found: ${leadMagnetId}`);
  }

  const postContent = generateDistributionPost(leadMagnet, platform);

  if (platform === 'telegram') {
    const result = await sendTelegramChannelPost({
      market: market as 'EN' | 'AR' | 'KO' | 'JA' | 'ES' | 'PT-BR',
      message: postContent,
      parseMode: 'HTML',
    });

    if (result.success) {
      // 配布記録を保存
      const distribution: Distribution = {
        id: `dist-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        lead_magnet_id: leadMagnetId,
        platform,
        market,
        post_content: postContent,
        scheduled_at: new Date().toISOString(),
        posted_at: new Date().toISOString(),
        status: 'posted',
        metrics: {
          impressions: 0,
          clicks: 0,
          leads_collected: 0,
          conversion_rate: 0,
        },
        created_at: new Date().toISOString(),
      };

      const filepath = join(DISTRIBUTIONS_DIR, `${distribution.id}.json`);
      fs.writeFileSync(filepath, JSON.stringify(distribution, null, 2), 'utf-8');

      return true;
    }
    return false;
  } else {
    // X/Discordは別スクリプトを使用
    console.log(`⚠️ ${platform}投稿は別スクリプトを使用してください`);
    return false;
  }
}

/**
 * リードを登録（メールアドレス収集）
 */
function registerLead(
  email: string,
  name: string | undefined,
  market: string,
  leadMagnetId: string,
  source: 'telegram' | 'x' | 'discord' | 'direct',
  sourcePostId?: string
): Lead {
  // 既存のリードを確認
  let lead = findLeadByEmail(email);
  
  if (lead) {
    // 既存のリードを更新
    lead.updated_at = new Date().toISOString();
    if (name && !lead.name) {
      lead.name = name;
    }
  } else {
    // 新しいリードを作成
    lead = {
      id: `lead-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      email,
      name,
      market,
      lead_magnet_id: leadMagnetId,
      source,
      source_post_id: sourcePostId,
      subscribed: true,
      email_sequence_started: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  saveLead(lead);
  return lead;
}

/**
 * リードマグネット配布後のメールシーケンスを開始
 */
async function startEmailSequenceForLead(leadId: string): Promise<void> {
  const lead = loadLead(leadId);
  if (!lead || lead.email_sequence_started) {
    return;
  }

  // Emailマーケティング自動化システムを使用
  // リードマグネット配布後のシーケンスを開始
  const { execSync } = await import('child_process');
  
  try {
    // リードマグネット配布後のシーケンスIDを生成
    const sequenceId = `lead-magnet-${lead.market.toLowerCase()}`;
    
    // Emailシーケンスを開始（email-marketing-automation.tsを使用）
    execSync(`npx tsx scripts/email-marketing-automation.ts start ${lead.email} ${sequenceId}`, {
      stdio: 'inherit',
    });

    lead.email_sequence_started = true;
    lead.updated_at = new Date().toISOString();
    saveLead(lead);
  } catch (error: any) {
    console.error(`❌ Emailシーケンス開始失敗 (${lead.email}): ${error.message}`);
  }
}

async function main() {
  console.log('🎁 リードマグネット配布システム開始\n');
  console.log('='.repeat(80));

  const command = process.argv[2] || 'init';

  if (command === 'init') {
    console.log('📋 デフォルトリードマグネットを生成中...\n');
    const leadMagnets = createDefaultLeadMagnets();
    leadMagnets.forEach(lm => {
      saveLeadMagnet(lm);
      console.log(`✅ ${lm.name} を保存`);
    });
    console.log(`\n✅ ${leadMagnets.length}件のリードマグネットを生成しました`);
  } else if (command === 'distribute') {
    const leadMagnetId = process.argv[3];
    const platform = process.argv[4] as 'telegram' | 'x' | 'discord';
    const market = process.argv[5];

    if (!leadMagnetId || !platform || !market) {
      console.error('❌ 使用方法: npx tsx scripts/lead-magnet-distribution.ts distribute <lead_magnet_id> <platform> <market>');
      process.exit(1);
    }

    console.log(`📱 リードマグネット配布: ${leadMagnetId} → ${platform} (${market})\n`);
    const success = await distributeLeadMagnet(leadMagnetId, platform, market);
    if (success) {
      console.log('✅ 配布成功');
    } else {
      console.error('❌ 配布失敗');
      process.exit(1);
    }
  } else if (command === 'register') {
    const email = process.argv[3];
    const name = process.argv[4];
    const market = process.argv[5];
    const leadMagnetId = process.argv[6];
    const source = process.argv[7] as 'telegram' | 'x' | 'discord' | 'direct' || 'direct';

    if (!email || !market || !leadMagnetId) {
      console.error('❌ 使用方法: npx tsx scripts/lead-magnet-distribution.ts register <email> [name] <market> <lead_magnet_id> [source]');
      process.exit(1);
    }

    console.log(`📝 リード登録: ${email}\n`);
    const lead = registerLead(email, name, market, leadMagnetId, source);
    console.log(`✅ リード登録成功: ${lead.id}`);
    
    // Emailシーケンスを開始
    await startEmailSequenceForLead(lead.id);
    console.log('✅ Emailシーケンス開始');
  } else {
    console.error(`❌ 不明なコマンド: ${command}`);
    console.log('\n使用方法:');
    console.log('  npx tsx scripts/lead-magnet-distribution.ts init                                    # デフォルトリードマグネットを生成');
    console.log('  npx tsx scripts/lead-magnet-distribution.ts distribute <id> <platform> <market>   # リードマグネットを配布');
    console.log('  npx tsx scripts/lead-magnet-distribution.ts register <email> [name] <market> <id> [source]  # リードを登録');
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
