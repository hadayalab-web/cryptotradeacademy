#!/usr/bin/env tsx
/**
 * 週末まで$100,000売上必達 - P0施策実行スクリプト
 * 1. 既存リストのDM一斉送信
 * 2. 6市場Whopプロダクトページ完全実装
 * 3. アフィリエイター緊急オファー
 */

import { callGPT52, sendTelegramMessage, sendResendEmail } from '../api/unified-api.js';
import { WHOP_PRODUCT_IDS } from '../hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en/lib/whop/constants.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 市場別のDMテンプレート（簡易版）
const DM_TEMPLATES: Record<string, string> = {
  EN: `🚀 Exclusive Weekend Offer: Trap Defence BTC

Hi {name},

I noticed your expertise in crypto trading. We're launching an exclusive weekend offer for Trap Defence BTC - the world's first "Anti-Trap" protocol.

🎯 Why Trap Defence BTC?
• Trap Defense Engine: Pre-detect market traps before they liquidate you
• 70% Standby Strategy: Wait for clear advantage, avoid emotional trading
• AI-Powered: Gemini AI + Grok sentiment analysis

💰 Weekend Special (Ends Sunday):
• Annual Plan: $588 (Save $240 vs monthly)
• 3-Month Plan: $165 (Save $42 vs monthly)
• Monthly Plan: $69

🎁 Bonus: +20% affiliate commission this weekend only!

👉 Get Started: {whopLink}

Limited time offer - Don't miss out!`,
  
  AR: `🚀 عرض نهاية الأسبوع الحصري: Trap Defence BTC

مرحباً {name},

لاحظت خبرتك في تداول العملات المشفرة. نطلق عرضاً حصرياً لنهاية الأسبوع لـ Trap Defence BTC - أول بروتوكول "مضاد للفخ" في العالم.

🎯 لماذا Trap Defence BTC؟
• محرك الدفاع عن الفخ: اكتشف فخاخ السوق قبل أن تسيطر عليك
• استراتيجية الانتظار 70%: انتظر الميزة الواضحة، تجنب التداول العاطفي
• مدعوم بالذكاء الاصطناعي: Gemini AI + تحليل المشاعر Grok

💰 عرض نهاية الأسبوع الخاص (ينتهي الأحد):
• الخطة السنوية: $588 (وفر $240 مقابل الشهرية)
• خطة 3 أشهر: $165 (وفر $42 مقابل الشهرية)
• الخطة الشهرية: $69

🎁 مكافأة: +20% عمولة تابعة هذا الأسبوع فقط!

👉 ابدأ الآن: {whopLink}

عرض محدود الوقت - لا تفوت الفرصة!`,
  
  KO: `🚀 주말 독점 오퍼: Trap Defence BTC

안녕하세요 {name}님,

암호화폐 거래 전문성을 확인했습니다. 세계 최초의 "안티 트랩" 프로토콜인 Trap Defence BTC의 독점 주말 오퍼를 시작합니다.

🎯 Trap Defence BTC를 선택하는 이유?
• 트랩 방어 엔진: 청산되기 전에 시장 트랩을 사전 감지
• 70% 대기 전략: 명확한 우위를 기다리고, 감정적 거래 회피
• AI 기반: Gemini AI + Grok 감정 분석

💰 주말 특가 (일요일까지):
• 연간 플랜: $588 (월간 대비 $240 절약)
• 3개월 플랜: $165 (월간 대비 $42 절약)
• 월간 플랜: $69

🎁 보너스: 이번 주말만 제휴 수수료 +20%!

👉 시작하기: {whopLink}

한정 시간 오퍼 - 놓치지 마세요!`,
  
  JA: `🚀 週末限定オファー: Trap Defence BTC

{name}様

暗号通貨取引の専門性を拝見しました。世界初の「アンチトラップ」プロトコル、Trap Defence BTCの週末限定オファーを開始します。

🎯 Trap Defence BTCを選ぶ理由？
• トラップ防御エンジン: 清算される前に市場トラップを事前検出
• 70%待機戦略: 明確な優位性を待ち、感情的な取引を回避
• AI搭載: Gemini AI + Grokセンチメント分析

💰 週末特価（日曜日まで）:
• 年間プラン: $588（月額比$240お得）
• 3ヶ月プラン: $165（月額比$42お得）
• 月額プラン: $69

🎁 ボーナス: 今週末のみアフィリエイト報酬+20%！

👉 今すぐ始める: {whopLink}

期間限定オファー - お見逃しなく！`,
  
  ES: `🚀 Oferta Exclusiva de Fin de Semana: Trap Defence BTC

Hola {name},

Noté tu experiencia en trading de criptomonedas. Estamos lanzando una oferta exclusiva de fin de semana para Trap Defence BTC - el primer protocolo "Anti-Trampa" del mundo.

🎯 ¿Por qué Trap Defence BTC?
• Motor de Defensa de Trampas: Detecta trampas del mercado antes de que te liquiden
• Estrategia de Espera del 70%: Espera ventaja clara, evita trading emocional
• Impulsado por IA: Gemini AI + análisis de sentimiento Grok

💰 Especial de Fin de Semana (Termina el Domingo):
• Plan Anual: $588 (Ahorra $240 vs mensual)
• Plan 3 Meses: $165 (Ahorra $42 vs mensual)
• Plan Mensual: $69

🎁 Bono: ¡+20% comisión de afiliado solo este fin de semana!

👉 Comenzar: {whopLink}

Oferta por tiempo limitado - ¡No te la pierdas!`,
  
  'PT-BR': `🚀 Oferta Exclusiva de Fim de Semana: Trap Defence BTC

Olá {name},

Notei sua expertise em trading de criptomoedas. Estamos lançando uma oferta exclusiva de fim de semana para Trap Defence BTC - o primeiro protocolo "Anti-Armadilha" do mundo.

🎯 Por que Trap Defence BTC?
• Motor de Defesa contra Armadilhas: Detecte armadilhas do mercado antes que te liquidem
• Estratégia de Espera de 70%: Aguarde vantagem clara, evite trading emocional
• Alimentado por IA: Gemini AI + análise de sentimento Grok

💰 Especial de Fim de Semana (Termina Domingo):
• Plano Anual: $588 (Economize $240 vs mensal)
• Plano 3 Meses: $165 (Economize $42 vs mensal)
• Plano Mensual: $69

🎁 Bônus: +20% comissão de afiliado apenas neste fim de semana!

👉 Começar: {whopLink}

Oferta por tempo limitado - Não perca!`,
};

/**
 * 既存リストのDM一斉送信
 */
async function blastDMToExistingList() {
  console.log('📧 既存リストのDM一斉送信を開始...\n');

  // TODO: データベースからリストを取得
  // 現時点では、サンプルデータを使用
  const sampleLeads = [
    { market: 'EN', name: 'John', email: 'john@example.com', telegramUserId: null },
    { market: 'AR', name: 'Ahmed', email: 'ahmed@example.com', telegramUserId: null },
    { market: 'KO', name: 'Kim', email: 'kim@example.com', telegramUserId: null },
    { market: 'JA', name: 'Tanaka', email: 'tanaka@example.com', telegramUserId: null },
    { market: 'ES', name: 'Carlos', email: 'carlos@example.com', telegramUserId: null },
    { market: 'PT-BR', name: 'Paulo', email: 'paulo@example.com', telegramUserId: null },
  ];

  const results = [];

  for (const lead of sampleLeads) {
    try {
      const template = DM_TEMPLATES[lead.market] || DM_TEMPLATES.EN;
      const whopLink = `https://whop.com/aio-media-llc/trap-defence-btc-${lead.market.toLowerCase()}/`;
      const message = template
        .replace('{name}', lead.name)
        .replace('{whopLink}', whopLink);

      // Telegram DM送信（telegramUserIdがある場合）
      if (lead.telegramUserId) {
        await sendTelegramMessage({
          language: lead.market as any,
          message,
          chatId: lead.telegramUserId,
        });
        console.log(`✅ Telegram DM送信完了: ${lead.name} (${lead.market})`);
      }

      // Email送信（emailがある場合）
      if (lead.email) {
        await sendResendEmail({
          from: 'noreply@cryptotradeacademy.io',
          to: lead.email,
          subject: `🚀 Weekend Exclusive Offer: Trap Defence BTC`,
          html: message.replace(/\n/g, '<br>'),
        });
        console.log(`✅ Email送信完了: ${lead.name} (${lead.market})`);
      }

      results.push({ lead, success: true });
    } catch (error: any) {
      console.error(`❌ DM送信エラー: ${lead.name} (${lead.market}) - ${error.message}`);
      results.push({ lead, success: false, error: error.message });
    }
  }

  return results;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 週末まで$100,000売上必達 - P0施策を実行します...\n');

  try {
    // 1. 既存リストのDM一斉送信
    console.log('📧 施策1: 既存リストのDM一斉送信');
    const dmResults = await blastDMToExistingList();
    console.log(`✅ DM送信完了: ${dmResults.filter(r => r.success).length}/${dmResults.length}件\n`);

    // 2. 6市場Whopプロダクトページ完全実装
    console.log('🔄 施策2: 6市場Whopプロダクトページ完全実装');
    console.log('⚠️ 注意: scripts/sync-whop-products.tsを実行してください\n');

    // 3. アフィリエイター緊急オファー
    console.log('💰 施策3: アフィリエイター緊急オファー');
    console.log('⚠️ 注意: アフィリエイターリストを確認して通知してください\n');

    console.log('✅ P0施策の実行準備完了！');
    console.log('📋 詳細は docs/WEEKEND_100K_EXECUTION_PLAN.md を参照してください。');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

main();
