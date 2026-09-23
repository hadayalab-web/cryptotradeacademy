#!/usr/bin/env tsx
/**
 * Whopプロダクトページ用画像・動画生成スクリプト
 * 
 * 目的: NanoBanana ProとVeo 3.1を使用して、Whopプロダクトページ用の画像・動画を生成
 * - ① 統合エンジンの権威性可視化（静止画）
 * - ② 実機UIによる証拠（静止画）
 * - ③ インテリジェンス・フロー（動画）
 */

import { callNanoBananaPro, callVeo31 } from '../api/unified-api.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 出力ディレクトリ
const OUTPUT_DIR = join(__dirname, '../data/whop-product-assets');
const IMAGES_DIR = join(OUTPUT_DIR, 'images');
const VIDEOS_DIR = join(OUTPUT_DIR, 'videos');

// プロンプト定義（Gemini CMO指示によるブラッシュアップ版）
const PROMPTS = {
  // 【旧版 - 保持】① 統合エンジンの権威性可視化（The Core of Intelligence）
  coreIntelligence: `Cinematic wide-angle shot of a massive, glowing hexagonal command center floating in deep space. Four powerful data streams converge from the corners: electric blue (CryptoQuant on-chain data), vibrant orange (Grok social sentiment), pure white (GPT logic engine), and golden yellow (Gemini visual AI). These streams merge into a central, pulsing Bitcoin shield that radiates protective amber light. The shield rotates slowly, revealing intricate patterns of real-time market data flowing across its surface. In the background, holographic Bloomberg terminals and financial charts are blurred but recognizable, creating depth. The atmosphere is dark, high-tech, and premium - like a military command center meets Wall Street. Dramatic cinematic lighting with rim lights on the shield, volumetric fog, and lens flares. 8k resolution, ultra-sharp focus on the shield, shallow depth of field for background. Professional fintech aesthetic, photorealistic, epic scale.`,

  // 【旧版 - 保持】② 実機UIによる証拠（The Evidence of Detection）
  uiEvidence: `Ultra-high-resolution macro shot of a professional crypto trading terminal screen. The UI is sleek, dark mode with glassmorphism design. In the top-left corner, a 'Data Sources' panel clearly shows three small logos: CryptoQuant (blue), Grok (orange), and Gemini (yellow), each pulsing with activity. The center of the screen displays a massive, urgent orange alert banner: "🚨 AVOID LONG - Whale Trap Detected" with a countdown timer showing "00:03:42". Below the alert, detailed candlestick charts show Bitcoin price action with red bearish candles. Real-time sentiment meters on the right show "Fear: 85%" and "Whale Activity: HIGH". The screen has subtle reflections and a slight tilt, making it feel like you're looking over a trader's shoulder. The lighting is dramatic - cool blue from the screen, warm orange from the alert, creating contrast. Ultra-detailed, professional financial software aesthetic, photorealistic, cinematic composition.`,

  // 【新版 - Gemini CMO指示】① CryptoQuantの権威性を象徴化（Data Reliability）
  // 演出意図: 「生のデータ」を扱っているプロフェッショナル感を演出。「機関投資家データ採用」という信頼の裏付けとして配置。
  cryptoquantAuthority: `A high-end cinematic close-up of a glass financial terminal. In the center, a glowing, detailed Bitcoin on-chain data map provided by CryptoQuant. Shimmering data nodes and network lines connecting institutional wallets. Premium dark mode aesthetic with amber and teal neon accents. Sharp focus on technical accuracy, Bloomberg-terminal style, 8k resolution.`,

  // 【新版 - Gemini CMO指示】② Grok × GPT × Gemini のAIハイブリッド（The Intelligence Nexus）
  // 演出意図: 3つの異なる知性が融合し、最強の判断を下している様子を象徴化。「3大AI搭載」というキャプションで脳へのインパクトを与える。
  aiHybridNexus: `A futuristic, glowing tri-hexagonal crystal core floating in a dark digital space. Each facet of the crystal glows with a distinct color representing Grok, GPT, and Gemini. Light rays emerge from the core to form a protective Bitcoin shield. High-tech, clean, sophisticated AI architecture visualization. 8k, photorealistic, cinematic lighting.`,

  // 【新版 - Gemini CMO指示】③ スマホでのTelegram配信（User Experience/Convenience）
  // 演出意図: 「実際にどう届くか」を見せ、購入後のイメージを具体化させます。「スマホ一台で完了」という手軽さ（利便性）を訴求。
  telegramSmartphone: `Close-up shot of a hand holding a high-end modern smartphone (iPhone style). On the screen, a Telegram notification from "Trap Defence BTC" is visible. The message says "🚨 WHALE TRAP DETECTED: AVOID LONG" with a clean visual chart attached. Background is a blurred, luxury modern lounge. Sharp focus on the screen, realistic lighting, 8k.`,

  // 【旧版 - 保持】③ インテリジェンス・フロー（動的な権威性）
  intelligenceFlow: `A 10-second cinematic loop. Micro-data particles flow rapidly from logos of CryptoQuant and Grok into a 3D Bitcoin shield that pulses with a protective amber light. The camera slowly pans around the shield, showing high-speed code and charts reflecting on its surface. Dark, sleek, high-end technology atmosphere, 4k.`,

  // 【旧版 - 保持】④ Telegram受信シーン（実体感の証明）
  telegramNotification: `Cinematic close-up shot of a modern smartphone screen displaying Telegram app. The phone is held in someone's hand, with natural lighting from above. A new message notification appears from "Trap Defence BTC" channel with an orange alert icon. The message preview shows: "🚨 AVOID LONG - Whale Trap Detected" with timestamp "Just now". The Telegram interface is sleek, dark mode with blue accent colors. The phone screen has subtle reflections and realistic depth. The camera slowly zooms in on the notification, revealing the urgency. In the background, soft bokeh of a modern workspace. The atmosphere is professional, trustworthy, and immediate - like receiving a critical alert on your phone. 10-second cinematic loop, 4k resolution, photorealistic, natural lighting, cinematic composition.`,

  // 【新版 - Gemini CMO指示】統合ディフェンス・ループ（The Protocol Flow）
  // 演出意図: USP1（検知）、USP2（解説）、USP3（心理）が流れるように動くイメージ。ページに「生命（ライブ感）」を吹き込む。
  protocolFlow: `A 10-second cinematic loop starting with a red whale-trap alert on a trading screen (USP1), which instantly transforms into a clean, visual AI-generated story card (USP2), and finally showing a calming, golden mental discipline pulse (USP3). The camera glides through a 3D digital space filled with floating data particles. Sleek, professional, futuristic, 4k.`
};

/**
 * ディレクトリを作成
 */
function ensureDirectories() {
  [OUTPUT_DIR, IMAGES_DIR, VIDEOS_DIR].forEach(dir => {
    try {
      mkdirSync(dir, { recursive: true });
      console.log(`✅ ディレクトリ作成: ${dir}`);
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  });
}

/**
 * ① 統合エンジンの権威性可視化画像を生成
 */
async function generateCoreIntelligenceImage() {
  console.log('\n🎨 ① 統合エンジンの権威性可視化画像を生成中...');
  console.log(`プロンプト: ${PROMPTS.coreIntelligence.substring(0, 100)}...`);

  try {
    const result = await callNanoBananaPro(PROMPTS.coreIntelligence, {
      aspectRatio: '16:9', // LP用に16:9
      imageSize: '4K', // 高解像度
      savePath: join(IMAGES_DIR, 'core-intelligence-hexagonal-shield.png')
    });

    console.log(`✅ 画像生成成功:`);
    console.log(`  - 画像数: ${result.images.length}`);
    result.images.forEach((img, idx) => {
      console.log(`  - 画像 ${idx + 1}:`);
      console.log(`    - MIME Type: ${img.mimeType}`);
      console.log(`    - 保存先: ${img.filePath || 'N/A'}`);
      console.log(`    - Data URL: ${img.dataUrl?.substring(0, 50)}...`);
    });

    return result;
  } catch (error: any) {
    console.error(`❌ 画像生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * ② 実機UIによる証拠画像を生成
 */
async function generateUIEvidenceImage() {
  console.log('\n🎨 ② 実機UIによる証拠画像を生成中...');
  console.log(`プロンプト: ${PROMPTS.uiEvidence.substring(0, 100)}...`);

  try {
    const result = await callNanoBananaPro(PROMPTS.uiEvidence, {
      aspectRatio: '16:9', // LP用に16:9
      imageSize: '4K', // 高解像度
      savePath: join(IMAGES_DIR, 'ui-evidence-trading-terminal.png')
    });

    console.log(`✅ 画像生成成功:`);
    console.log(`  - 画像数: ${result.images.length}`);
    result.images.forEach((img, idx) => {
      console.log(`  - 画像 ${idx + 1}:`);
      console.log(`    - MIME Type: ${img.mimeType}`);
      console.log(`    - 保存先: ${img.filePath || 'N/A'}`);
      console.log(`    - Data URL: ${img.dataUrl?.substring(0, 50)}...`);
    });

    return result;
  } catch (error: any) {
    console.error(`❌ 画像生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * ③ インテリジェンス・フロー動画を生成（旧バージョン - 保持）
 */
async function generateIntelligenceFlowVideo() {
  console.log('\n🎬 ③ インテリジェンス・フロー動画を生成中...');
  console.log(`プロンプト: ${PROMPTS.intelligenceFlow.substring(0, 100)}...`);

  try {
    const result = await callVeo31(PROMPTS.intelligenceFlow, {
      pollInterval: 10, // 10秒ごとにポーリング
      maxPollAttempts: 60, // 最大10分待機
      savePath: join(VIDEOS_DIR, 'intelligence-flow-bitcoin-shield.mp4')
    });

    console.log(`✅ 動画生成成功:`);
    console.log(`  - 動画数: ${result.videos.length}`);
    result.videos.forEach((video, idx) => {
      console.log(`  - 動画 ${idx + 1}:`);
      console.log(`    - URI: ${video.uri || 'N/A'}`);
      console.log(`    - Name: ${video.name || 'N/A'}`);
      console.log(`    - 保存先: ${video.filePath || 'N/A'}`);
    });

    return result;
  } catch (error: any) {
    console.error(`❌ 動画生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * ④ Telegram受信シーン動画を生成（旧版 - 保持）
 */
async function generateTelegramNotificationVideo() {
  console.log('\n📱 ④ Telegram受信シーン動画を生成中...');
  console.log(`プロンプト: ${PROMPTS.telegramNotification.substring(0, 100)}...`);

  try {
    const result = await callVeo31(PROMPTS.telegramNotification, {
      pollInterval: 10, // 10秒ごとにポーリング
      maxPollAttempts: 60, // 最大10分待機
      savePath: join(VIDEOS_DIR, 'telegram-notification-trap-defence.mp4') // 新しいファイル名で保存
    });

    console.log(`✅ 動画生成成功:`);
    console.log(`  - 動画数: ${result.videos.length}`);
    result.videos.forEach((video, idx) => {
      console.log(`  - 動画 ${idx + 1}:`);
      console.log(`    - URI: ${video.uri || 'N/A'}`);
      console.log(`    - Name: ${video.name || 'N/A'}`);
      console.log(`    - 保存先: ${video.filePath || 'N/A'}`);
    });

    return result;
  } catch (error: any) {
    console.error(`❌ 動画生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * 【新版】① CryptoQuantの権威性を象徴化画像を生成
 */
async function generateCryptoQuantAuthorityImage() {
  console.log('\n🎨 【新版】① CryptoQuantの権威性を象徴化画像を生成中...');
  console.log(`プロンプト: ${PROMPTS.cryptoquantAuthority.substring(0, 100)}...`);

  try {
    const result = await callNanoBananaPro(PROMPTS.cryptoquantAuthority, {
      aspectRatio: '16:9',
      imageSize: '4K',
      savePath: join(IMAGES_DIR, 'cryptoquant-authority-data-reliability.png')
    });

    console.log(`✅ 画像生成成功:`);
    console.log(`  - 画像数: ${result.images.length}`);
    result.images.forEach((img, idx) => {
      console.log(`  - 画像 ${idx + 1}:`);
      console.log(`    - MIME Type: ${img.mimeType}`);
      console.log(`    - 保存先: ${img.filePath || 'N/A'}`);
      console.log(`    - Data URL: ${img.dataUrl?.substring(0, 50)}...`);
    });

    return result;
  } catch (error: any) {
    console.error(`❌ 画像生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * 【新版】② AIハイブリッド画像を生成
 */
async function generateAIHybridNexusImage() {
  console.log('\n🎨 【新版】② AIハイブリッド画像を生成中...');
  console.log(`プロンプト: ${PROMPTS.aiHybridNexus.substring(0, 100)}...`);

  try {
    const result = await callNanoBananaPro(PROMPTS.aiHybridNexus, {
      aspectRatio: '16:9',
      imageSize: '4K',
      savePath: join(IMAGES_DIR, 'ai-hybrid-nexus-intelligence.png')
    });

    console.log(`✅ 画像生成成功:`);
    console.log(`  - 画像数: ${result.images.length}`);
    result.images.forEach((img, idx) => {
      console.log(`  - 画像 ${idx + 1}:`);
      console.log(`    - MIME Type: ${img.mimeType}`);
      console.log(`    - 保存先: ${img.filePath || 'N/A'}`);
      console.log(`    - Data URL: ${img.dataUrl?.substring(0, 50)}...`);
    });

    return result;
  } catch (error: any) {
    console.error(`❌ 画像生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * 【新版】③ スマホでのTelegram配信画像を生成
 */
async function generateTelegramSmartphoneImage() {
  console.log('\n🎨 【新版】③ スマホでのTelegram配信画像を生成中...');
  console.log(`プロンプト: ${PROMPTS.telegramSmartphone.substring(0, 100)}...`);

  try {
    const result = await callNanoBananaPro(PROMPTS.telegramSmartphone, {
      aspectRatio: '16:9',
      imageSize: '4K',
      savePath: join(IMAGES_DIR, 'telegram-smartphone-convenience.png')
    });

    console.log(`✅ 画像生成成功:`);
    console.log(`  - 画像数: ${result.images.length}`);
    result.images.forEach((img, idx) => {
      console.log(`  - 画像 ${idx + 1}:`);
      console.log(`    - MIME Type: ${img.mimeType}`);
      console.log(`    - 保存先: ${img.filePath || 'N/A'}`);
      console.log(`    - Data URL: ${img.dataUrl?.substring(0, 50)}...`);
    });

    return result;
  } catch (error: any) {
    console.error(`❌ 画像生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * 【新版】統合ディフェンス・ループ動画を生成
 */
async function generateProtocolFlowVideo() {
  console.log('\n🎬 【新版】統合ディフェンス・ループ動画を生成中...');
  console.log(`プロンプト: ${PROMPTS.protocolFlow.substring(0, 100)}...`);

  try {
    const result = await callVeo31(PROMPTS.protocolFlow, {
      pollInterval: 10,
      maxPollAttempts: 60,
      savePath: join(VIDEOS_DIR, 'protocol-flow-usps-loop.mp4')
    });

    console.log(`✅ 動画生成成功:`);
    console.log(`  - 動画数: ${result.videos.length}`);
    result.videos.forEach((video, idx) => {
      console.log(`  - 動画 ${idx + 1}:`);
      console.log(`    - URI: ${video.uri || 'N/A'}`);
      console.log(`    - Name: ${video.name || 'N/A'}`);
      console.log(`    - 保存先: ${video.filePath || 'N/A'}`);
    });

    return result;
  } catch (error: any) {
    console.error(`❌ 動画生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * メタデータファイルを生成
 */
function generateMetadata(results: {
  coreIntelligence?: any;
  uiEvidence?: any;
  intelligenceFlow?: any;
  telegramNotification?: any;
  cryptoquantAuthority?: any;
  aiHybridNexus?: any;
  telegramSmartphone?: any;
  protocolFlow?: any;
}) {
  const metadata = {
    generatedAt: new Date().toISOString(),
    product: 'Trap Defence BTC - English',
    assets: {
      images: [
        {
          id: 'core-intelligence',
          name: '統合エンジンの権威性可視化（The Core of Intelligence）【旧版】',
          file: 'core-intelligence-hexagonal-shield.png',
          path: join(IMAGES_DIR, 'core-intelligence-hexagonal-shield.png'),
          prompt: PROMPTS.coreIntelligence,
          description: 'CryptoQuant, Grok, GPT, Geminiの4つが「一つの最強の盾」になっていることを示す画像',
          usage: 'VSLの直下に配置。PC版は右側、モバイル版は下に配置',
          generated: !!results.coreIntelligence,
          version: 'legacy'
        },
        {
          id: 'ui-evidence',
          name: '実機UIによる証拠（The Evidence of Detection）【旧版】',
          file: 'ui-evidence-trading-terminal.png',
          path: join(IMAGES_DIR, 'ui-evidence-trading-terminal.png'),
          prompt: PROMPTS.uiEvidence,
          description: '「本当に4つのデータが統合されている」ことをUI上で視覚化した画像',
          usage: 'VSLの直下に配置。モバイル版では統合コア画像の上に配置',
          generated: !!results.uiEvidence,
          version: 'legacy'
        },
        {
          id: 'cryptoquant-authority',
          name: 'CryptoQuantの権威性を象徴化（Data Reliability）【新版】',
          file: 'cryptoquant-authority-data-reliability.png',
          path: join(IMAGES_DIR, 'cryptoquant-authority-data-reliability.png'),
          prompt: PROMPTS.cryptoquantAuthority,
          description: '「生のデータ」を扱っているプロフェッショナル感を演出。「機関投資家データ採用」という信頼の裏付け',
          usage: 'VSLの横または下に配置。「機関投資家データ採用」というキャプションで信頼の裏付けとして配置',
          generated: !!results.cryptoquantAuthority,
          version: 'gemini-cmo-v2'
        },
        {
          id: 'ai-hybrid-nexus',
          name: 'AIハイブリッド（The Intelligence Nexus）【新版】',
          file: 'ai-hybrid-nexus-intelligence.png',
          path: join(IMAGES_DIR, 'ai-hybrid-nexus-intelligence.png'),
          prompt: PROMPTS.aiHybridNexus,
          description: '3つの異なる知性が融合し、最強の判断を下している様子を象徴化',
          usage: 'VSLのすぐ横に配置。「3大AI搭載」というキャプションで脳へのインパクトを与える',
          generated: !!results.aiHybridNexus,
          version: 'gemini-cmo-v2'
        },
        {
          id: 'telegram-smartphone',
          name: 'スマホでのTelegram配信（User Experience/Convenience）【新版】',
          file: 'telegram-smartphone-convenience.png',
          path: join(IMAGES_DIR, 'telegram-smartphone-convenience.png'),
          prompt: PROMPTS.telegramSmartphone,
          description: '「実際にどう届くか」を見せ、購入後のイメージを具体化。「スマホ一台で完了」という手軽さ（利便性）を訴求',
          usage: 'ファーストビューの目立つ位置に配置。ユーザーが最も「自分が使っている姿」を想像しやすい素材',
          generated: !!results.telegramSmartphone,
          version: 'gemini-cmo-v2'
        }
      ],
      videos: [
        {
          id: 'intelligence-flow',
          name: 'インテリジェンス・フロー（動的な権威性）【旧版】',
          file: 'intelligence-flow-bitcoin-shield.mp4',
          path: join(VIDEOS_DIR, 'intelligence-flow-bitcoin-shield.mp4'),
          prompt: PROMPTS.intelligenceFlow,
          description: 'システムが常に稼働している「ライブ感」を出すループ動画',
          usage: '静止画の隣でループ再生。PC版は右側、モバイル版は下に配置',
          generated: !!results.intelligenceFlow,
          version: 'legacy'
        },
        {
          id: 'telegram-notification',
          name: 'Telegram受信シーン（実体感の証明）【旧版】',
          file: 'telegram-notification-trap-defence.mp4',
          path: join(VIDEOS_DIR, 'telegram-notification-trap-defence.mp4'),
          prompt: PROMPTS.telegramNotification,
          description: 'Trap Defence BTCの配信メッセージをスマホでTelegramで受信している瞬間を演出',
          usage: 'VSLの直下またはUI実機デモ画像の下に配置。実体感と信頼性を高める',
          generated: !!results.telegramNotification,
          version: 'legacy'
        },
        {
          id: 'protocol-flow',
          name: '統合ディフェンス・ループ（The Protocol Flow）【新版】',
          file: 'protocol-flow-usps-loop.mp4',
          path: join(VIDEOS_DIR, 'protocol-flow-usps-loop.mp4'),
          prompt: PROMPTS.protocolFlow,
          description: 'USP1（検知）、USP2（解説）、USP3（心理）が流れるように動くイメージ。ページに「生命（ライブ感）」を吹き込む',
          usage: '全てのセクションの背景や、区切りとして配置し、ページに「生命（ライブ感）」を吹き込む',
          generated: !!results.protocolFlow,
          version: 'gemini-cmo-v2'
        }
      ]
    },
    layout: {
      pc: {
        description: '左側: VSL動画（メイン）、右側: 4大エンジン統合コア画像 + テキスト',
        order: ['VSL', 'core-intelligence', 'ui-evidence', 'intelligence-flow']
      },
      mobile: {
        description: '上から順に: VSL動画 → UI実機デモ画像 → 統合コア画像',
        order: ['VSL', 'ui-evidence', 'core-intelligence', 'intelligence-flow']
      }
    },
    textSupplement: {
      title: 'The World\'s First Integrated Defense Protocol',
      items: [
        'CryptoQuant: 機関投資家のクジラの動きを監視。',
        'Grok / GPT: 市場のセンチメントと論理を解析。',
        'Gemini: 複雑なデータを一瞬で視覚ストーリーへ。'
      ]
    }
  };

  const metadataPath = join(OUTPUT_DIR, 'metadata.json');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`\n📝 メタデータを生成しました: ${metadataPath}`);

  return metadata;
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 Whopプロダクトページ用画像・動画生成を開始');
    console.log(`📦 出力ディレクトリ: ${OUTPUT_DIR}`);

    // ディレクトリを作成
    ensureDirectories();

    const results: any = {};

    // ① 統合エンジンの権威性可視化画像を生成
    try {
      results.coreIntelligence = await generateCoreIntelligenceImage();
    } catch (error: any) {
      console.error(`⚠️ ①の生成に失敗しましたが、続行します: ${error.message}`);
    }

    // ② 実機UIによる証拠画像を生成
    try {
      results.uiEvidence = await generateUIEvidenceImage();
    } catch (error: any) {
      console.error(`⚠️ ②の生成に失敗しましたが、続行します: ${error.message}`);
    }

    // ③ インテリジェンス・フロー動画を生成（スキップ - 既に生成済み）
    console.log('\n⏭️ ③ インテリジェンス・フロー動画は既に生成済みのためスキップします');

    // ④ Telegram受信シーン動画を生成（スキップ - 既に生成済み）
    console.log('\n⏭️ ④ Telegram受信シーン動画は既に生成済みのためスキップします');

    // 【新版 - Gemini CMO指示】① CryptoQuantの権威性を象徴化画像を生成
    try {
      results.cryptoquantAuthority = await generateCryptoQuantAuthorityImage();
    } catch (error: any) {
      console.error(`⚠️ 【新版】①の生成に失敗しましたが、続行します: ${error.message}`);
    }

    // 【新版 - Gemini CMO指示】② AIハイブリッド画像を生成
    try {
      results.aiHybridNexus = await generateAIHybridNexusImage();
    } catch (error: any) {
      console.error(`⚠️ 【新版】②の生成に失敗しましたが、続行します: ${error.message}`);
    }

    // 【新版 - Gemini CMO指示】③ スマホでのTelegram配信画像を生成
    try {
      results.telegramSmartphone = await generateTelegramSmartphoneImage();
    } catch (error: any) {
      console.error(`⚠️ 【新版】③の生成に失敗しましたが、続行します: ${error.message}`);
    }

    // 【新版 - Gemini CMO指示】統合ディフェンス・ループ動画を生成
    try {
      results.protocolFlow = await generateProtocolFlowVideo();
    } catch (error: any) {
      console.error(`⚠️ 【新版】統合ディフェンス・ループ動画の生成に失敗しましたが、続行します: ${error.message}`);
    }

    // メタデータを生成
    const metadata = generateMetadata(results);

    console.log('\n✅ 生成完了！');
    console.log('\n📝 次のステップ:');
    console.log('1. 生成された画像・動画を確認: data/whop-product-assets/');
    console.log('2. Whop Dashboardでプロダクトページを編集');
    console.log('3. VSLの直下に画像・動画を配置');
    console.log('4. テキスト補足を追加: "The World\'s First Integrated Defense Protocol"');
    console.log('\n📋 メタデータ: data/whop-product-assets/metadata.json');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// スクリプトとして実行された場合のみmainを実行
main().catch(console.error);

export { 
  generateCoreIntelligenceImage, 
  generateUIEvidenceImage, 
  generateIntelligenceFlowVideo, 
  generateTelegramNotificationVideo,
  generateCryptoQuantAuthorityImage,
  generateAIHybridNexusImage,
  generateTelegramSmartphoneImage,
  generateProtocolFlowVideo,
  PROMPTS 
};
