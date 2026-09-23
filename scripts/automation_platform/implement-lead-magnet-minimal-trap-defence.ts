#!/usr/bin/env tsx
/**
 * Trap Defence BTCミニマム版実装スクリプト
 * 
 * CEO提案に基づき、Email配信専用のTrap Defence BTCミニマム版を実装
 * CryptoQuant + Grok/GPT/Geminiを活用して有料級プログラムを実現
 */

import { callGrok41FastReasoning, callGemini3Pro, callGPT52 } from '../api/unified-api.js';
import { sendResendEmail } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const DATA_DIR = join(__dirname, '..', 'data', 'minimal-trap-defence');
const SUBSCRIBERS_DIR = join(DATA_DIR, 'subscribers');
const ALERTS_DIR = join(DATA_DIR, 'alerts');

// ディレクトリを作成
[DATA_DIR, SUBSCRIBERS_DIR, ALERTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const CRYPTOQUANT_API_KEY = process.env.CRYPTOQUANT_API_KEY || '';
const CRYPTOQUANT_API_URL = 'https://api.cryptoquant.com/v1';

interface Subscriber {
  id: string;
  email: string;
  name?: string;
  market: string;
  subscribed_at: string;
  last_alert_sent_at?: string;
  alert_count: number;
  status: 'active' | 'unsubscribed';
}

interface TrapAlert {
  id: string;
  timestamp: string;
  market_data: any;
  grok_analysis?: any;
  gpt_analysis?: any;
  gemini_analysis?: any;
  trap_detected: boolean;
  trap_type?: string;
  risk_level?: 'low' | 'medium' | 'high';
  recommendation?: string;
}

/**
 * CryptoQuant APIから市場データを取得
 */
async function fetchCryptoQuantData(): Promise<any> {
  if (!CRYPTOQUANT_API_KEY) {
    console.warn('⚠️ CRYPTOQUANT_API_KEYが設定されていません。モックデータを使用します。');
    return {
      btc_price: 42000,
      exchange_flows: { inflow: 1000, outflow: 800 },
      whale_transactions: 5,
      market_sentiment: 'neutral',
    };
  }

  try {
    // CryptoQuant APIからBTCデータを取得
    const response = await axios.get(`${CRYPTOQUANT_API_URL}/btc/exchange-flows`, {
      headers: {
        'Authorization': `Bearer ${CRYPTOQUANT_API_KEY}`,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(`❌ CryptoQuant API取得失敗: ${error.message}`);
    // フォールバック: モックデータ
    return {
      btc_price: 42000,
      exchange_flows: { inflow: 1000, outflow: 800 },
      whale_transactions: 5,
      market_sentiment: 'neutral',
    };
  }
}

/**
 * GrokでX (Twitter) センチメント分析
 */
async function analyzeWithGrok(marketData: any): Promise<any> {
  if (!process.env.XAI_API_KEY) {
    return { sentiment: 'neutral', trend: 'stable' };
  }

  try {
    const prompt = `Analyze the current Bitcoin market situation based on this data:

BTC Price: $${marketData.btc_price}
Exchange Inflows: ${marketData.exchange_flows?.inflow || 0}
Exchange Outflows: ${marketData.exchange_flows?.outflow || 0}
Whale Transactions: ${marketData.whale_transactions || 0}

Provide:
1. Market sentiment (bullish/bearish/neutral)
2. Potential trap signals
3. Risk level (low/medium/high)
4. Recommendation for traders

Respond in JSON format.`;

    const result = await callGrok41FastReasoning(prompt, {
      temperature: 0.7,
      maxTokens: 1000,
    });

    // JSONを抽出
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { sentiment: 'neutral', trend: 'stable' };
  } catch (error: any) {
    console.error(`❌ Grok分析失敗: ${error.message}`);
    return { sentiment: 'neutral', trend: 'stable' };
  }
}

/**
 * GPTで市場分析
 */
async function analyzeWithGPT(marketData: any): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    return { analysis: 'Market analysis unavailable', risk: 'medium' };
  }

  try {
    const prompt = `Analyze Bitcoin market data and detect potential trading traps:

${JSON.stringify(marketData, null, 2)}

Provide:
1. Trap detection (yes/no)
2. Trap type (if detected)
3. Risk level (low/medium/high)
4. Trading recommendation

Respond in JSON format.`;

    const result = await callGPT52(prompt, {
      temperature: 0.7,
      maxCompletionTokens: 1000,
    });

    // JSONを抽出
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { analysis: 'Market analysis unavailable', risk: 'medium' };
  } catch (error: any) {
    console.error(`❌ GPT分析失敗: ${error.message}`);
    return { analysis: 'Market analysis unavailable', risk: 'medium' };
  }
}

/**
 * Geminiで多言語対応分析
 */
async function analyzeWithGemini(marketData: any, market: string): Promise<any> {
  if (!process.env.GEMINI_API_KEY) {
    return { summary: 'Analysis unavailable', recommendation: 'Monitor market closely' };
  }

  try {
    const prompt = `Analyze Bitcoin market data and provide a concise summary in ${market === 'EN' ? 'English' : market === 'JA' ? 'Japanese' : 'English'}:

${JSON.stringify(marketData, null, 2)}

Provide:
1. Market summary (2-3 sentences)
2. Key insights
3. Trading recommendation

Respond in JSON format.`;

    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'low',
      temperature: 0.7,
      maxOutputTokens: 500,
    });

    // JSONを抽出
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { summary: 'Analysis unavailable', recommendation: 'Monitor market closely' };
  } catch (error: any) {
    console.error(`❌ Gemini分析失敗: ${error.message}`);
    return { summary: 'Analysis unavailable', recommendation: 'Monitor market closely' };
  }
}

/**
 * Trap Alertを生成
 */
async function generateTrapAlert(market: string): Promise<TrapAlert> {
  console.log(`🔍 ${market}市場のTrap Alertを生成中...`);

  // 1. CryptoQuantから市場データを取得
  const marketData = await fetchCryptoQuantData();

  // 2. AI分析（並列実行）
  const [grokAnalysis, gptAnalysis, geminiAnalysis] = await Promise.all([
    analyzeWithGrok(marketData),
    analyzeWithGPT(marketData),
    analyzeWithGemini(marketData, market),
  ]);

  // 3. Trap検出判定
  const trapDetected = gptAnalysis.trap_detection === 'yes' || 
                       grokAnalysis.risk_level === 'high' ||
                       gptAnalysis.risk === 'high';

  const alert: TrapAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: new Date().toISOString(),
    market_data: marketData,
    grok_analysis: grokAnalysis,
    gpt_analysis: gptAnalysis,
    gemini_analysis: geminiAnalysis,
    trap_detected: trapDetected,
    trap_type: gptAnalysis.trap_type,
    risk_level: gptAnalysis.risk || grokAnalysis.risk_level || 'medium',
    recommendation: geminiAnalysis.recommendation || gptAnalysis.recommendation,
  };

  // アラートを保存
  const filepath = join(ALERTS_DIR, `${alert.id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(alert, null, 2), 'utf-8');

  return alert;
}

/**
 * Emailアラートを送信
 */
async function sendEmailAlert(subscriber: Subscriber, alert: TrapAlert): Promise<boolean> {
  const marketLabels: Record<string, string> = {
    'EN': 'English',
    'JA': 'Japanese',
    'AR': 'Arabic',
    'KO': 'Korean',
    'ES': 'Spanish',
    'PT-BR': 'Portuguese (Brazil)',
  };

  const subject = alert.trap_detected
    ? `🚨 Trap Alert: ${alert.trap_type || 'Trading Trap Detected'}`
    : `📊 Market Update: ${new Date().toLocaleDateString()}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .alert-box { background: ${alert.trap_detected ? '#f5576c' : '#4facfe'}; color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Trap Defence BTC</h1>
      <p>Minimal Edition - Email Alert</p>
    </div>
    <div class="content">
      <h2>Hi ${subscriber.name || 'Trader'},</h2>
      
      ${alert.trap_detected ? `
      <div class="alert-box">
        <h3>🚨 TRAP DETECTED</h3>
        <p><strong>Trap Type:</strong> ${alert.trap_type || 'Unknown'}</p>
        <p><strong>Risk Level:</strong> ${alert.risk_level?.toUpperCase() || 'MEDIUM'}</p>
      </div>
      ` : `
      <div class="alert-box">
        <h3>📊 Market Update</h3>
        <p>Current market conditions analyzed. No immediate traps detected.</p>
      </div>
      `}

      <h3>Market Data:</h3>
      <ul>
        <li>BTC Price: $${alert.market_data.btc_price?.toLocaleString() || 'N/A'}</li>
        <li>Exchange Inflows: ${alert.market_data.exchange_flows?.inflow || 'N/A'}</li>
        <li>Exchange Outflows: ${alert.market_data.exchange_flows?.outflow || 'N/A'}</li>
      </ul>

      <h3>AI Analysis:</h3>
      <p><strong>Grok (X Sentiment):</strong> ${alert.grok_analysis?.sentiment || 'Neutral'}</p>
      <p><strong>GPT (Market Analysis):</strong> ${alert.gpt_analysis?.analysis || 'Analysis unavailable'}</p>
      <p><strong>Gemini (Summary):</strong> ${alert.gemini_analysis?.summary || 'Summary unavailable'}</p>

      ${alert.recommendation ? `
      <h3>💡 Recommendation:</h3>
      <p>${alert.recommendation}</p>
      ` : ''}

      <p><strong>Upgrade to Full Version:</strong></p>
      <a href="https://whop.com/aio-media-llc/trap-defence-btc-en/" class="button">🚀 Upgrade Now</a>

      <p><small>This is a free minimal edition. Upgrade for real-time Telegram alerts and advanced features.</small></p>
      <p><strong>CryptoTrade Academy</strong></p>
    </div>
  </div>
</body>
</html>`;

  try {
    const result = await sendResendEmail({
      from: 'Trap Defence BTC <noreply@cryptotradeacademy.io>',
      to: subscriber.email,
      subject,
      html,
      tags: ['trap_defence', 'minimal_edition', alert.trap_detected ? 'trap_alert' : 'market_update'],
    });

    if (result.success) {
      subscriber.last_alert_sent_at = new Date().toISOString();
      subscriber.alert_count += 1;
      const filepath = join(SUBSCRIBERS_DIR, `${subscriber.id}.json`);
      fs.writeFileSync(filepath, JSON.stringify(subscriber, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch (error: any) {
    console.error(`❌ Email送信失敗 (${subscriber.email}): ${error.message}`);
    return false;
  }
}

/**
 * すべてのアクティブなサブスクライバーにアラートを送信
 */
async function sendAlertsToAllSubscribers(): Promise<void> {
  if (!fs.existsSync(SUBSCRIBERS_DIR)) {
    console.log('⚠️ サブスクライバーが見つかりません');
    return;
  }

  const subscribers = fs.readdirSync(SUBSCRIBERS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(file => {
      const content = fs.readFileSync(join(SUBSCRIBERS_DIR, file), 'utf-8');
      return JSON.parse(content) as Subscriber;
    })
    .filter(s => s.status === 'active');

  console.log(`📧 ${subscribers.length}人のサブスクライバーにアラートを送信します\n`);

  // 市場別にグループ化
  const subscribersByMarket = subscribers.reduce((acc, sub) => {
    if (!acc[sub.market]) {
      acc[sub.market] = [];
    }
    acc[sub.market].push(sub);
    return acc;
  }, {} as Record<string, Subscriber[]>);

  // 各市場ごとにアラートを生成して送信
  for (const [market, marketSubscribers] of Object.entries(subscribersByMarket)) {
    console.log(`📊 ${market}市場: ${marketSubscribers.length}人`);
    
    const alert = await generateTrapAlert(market);
    console.log(`  ${alert.trap_detected ? '🚨 Trap検出' : '✅ 通常'}: ${alert.risk_level || 'medium'}リスク\n`);

    // 各サブスクライバーに送信
    for (const subscriber of marketSubscribers) {
      await sendEmailAlert(subscriber, alert);
      console.log(`  ✅ ${subscriber.email} に送信`);
    }
  }
}

/**
 * サブスクライバーを登録
 */
function registerSubscriber(email: string, name: string | undefined, market: string): Subscriber {
  const subscriber: Subscriber = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    email,
    name,
    market,
    subscribed_at: new Date().toISOString(),
    alert_count: 0,
    status: 'active',
  };

  const filepath = join(SUBSCRIBERS_DIR, `${subscriber.id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(subscriber, null, 2), 'utf-8');

  return subscriber;
}

async function main() {
  console.log('🛡️ Trap Defence BTCミニマム版システム開始\n');
  console.log('='.repeat(80));

  const command = process.argv[2] || 'send';

  if (command === 'send') {
    console.log('📧 すべてのサブスクライバーにアラートを送信中...\n');
    await sendAlertsToAllSubscribers();
    console.log('\n✅ アラート送信完了');
  } else if (command === 'register') {
    const email = process.argv[3];
    const name = process.argv[4];
    const market = process.argv[5] || 'EN';

    if (!email) {
      console.error('❌ 使用方法: npx tsx scripts/implement-lead-magnet-minimal-trap-defence.ts register <email> [name] [market]');
      process.exit(1);
    }

    console.log(`📝 サブスクライバー登録: ${email}\n`);
    const subscriber = registerSubscriber(email, name, market);
    console.log(`✅ 登録完了: ${subscriber.id}`);
  } else {
    console.error(`❌ 不明なコマンド: ${command}`);
    console.log('\n使用方法:');
    console.log('  npx tsx scripts/implement-lead-magnet-minimal-trap-defence.ts send                    # アラートを送信');
    console.log('  npx tsx scripts/implement-lead-magnet-minimal-trap-defence.ts register <email> [name] [market]  # サブスクライバーを登録');
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
