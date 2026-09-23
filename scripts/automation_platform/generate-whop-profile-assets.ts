#!/usr/bin/env tsx
/**
 * Whop CEOプロフィールページ用アセット生成スクリプト
 * 
 * 目的: NanoBanana Proを使用して、Whop CEOプロフィールページ用の画像を生成
 * - バナー画像（横長）
 * - ロゴ（円形切り抜き対応）
 * 
 * 指示元: Gemini CMO（gemini-3-flash-preview）
 */

import { callNanoBananaPro } from '../api/unified-api.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 出力ディレクトリ
const OUTPUT_DIR = join(__dirname, '../data/whop-profile-assets');
const IMAGES_DIR = join(OUTPUT_DIR, 'images');

// プロンプト定義（Gemini CMO指示）
const PROMPTS = {
  // バナー画像（横長）- 1188px×396px（3:1）に最適化
  // 演出意図: CryptoQuantのオンチェーンデータマップが表示されたホログラフィックディスプレイの画像
  // 全体のデザインや構成は変えず、サイズのみを最適化
  banner: `A premium wide cinematic banner (1188px × 396px, 3:1 aspect ratio) showing a curved transparent holographic display in a high-end office environment. On the display, a detailed Bitcoin on-chain data map provided by CryptoQuant is visible. In the top-left corner, the "+Q CryptoQuant" logo and text with "INSTITUTIONAL WALLETS" label. The main title reads "CRYPTOQUANT ON-CHAIN DATA MAP" and "BITCOIN NETWORK FLOWS". A detailed digital world map is projected on the screen: the left hemisphere (Americas, Europe, parts of Africa) shows glowing amber/orange data nodes and network lines, while the right hemisphere (Asia, Australia) shows teal/cyan glowing data nodes and network lines. Interconnecting light lines span across continents showing global network activity. Below the map, three horizontal progress bar indicators: "TOTAL BTC BALANCE" (amber bar), "TRANSACTION VOLUME" (amber bar), and "NETWORK ACTIVITY" (teal bar). Small text labels in the top-right: "IWONCARE", "MIERS", "BCIAMMES", "HOBLars" with colored dots (orange, green, teal). On the desk in front of the screen, a sleek dark keyboard with teal backlighting and a matching dark computer mouse. In the background, a blurred city skyline at dusk/night visible through large windows on the left, with soft glowing spherical lighting fixtures on side tables. On the right, a dim luxurious office interior with dark wood furniture and white-shaded table lamps, with potted plants adding green accents. The overall atmosphere is high-tech, professional, and futuristic, emphasizing data reliability and institutional-level intelligence. Deep navy blue and black dominate from the office and city view, while the data display's vibrant amber/orange and teal glows create contrast. Premium Bloomberg-terminal style aesthetic, 8k resolution, cinematic lighting.`,

  // ロゴ - パターン1: 背景透過版
  // 演出意図: 添付画像から抽出したロゴデザイン。スタイリッシュな黒いアウトラインのシールド、金色の曲線的な「C」、3本の金色のローソク足チャートが一体化
  logoTransparent: `A minimalist luxury logo design for "CryptoTradeAcademy". A stylized black outline shield icon. Inside the shield, a curved metallic gold letter "C" integrated with three rising candlestick charts (the center candlestick is the highest, showing an upward trend). The "C" and candlesticks are seamlessly merged. Professional flat vector style, bold lines, metallic gold and deep charcoal colors. Transparent background, no background, high contrast, symmetry, premium fintech branding. Isolated logo on transparent background.`,

  // ロゴ - パターン2: 白背景版
  // 演出意図: 同じロゴデザインを白背景で生成
  logoWhiteBg: `A minimalist luxury logo design for "CryptoTradeAcademy". A stylized black outline shield icon. Inside the shield, a curved metallic gold letter "C" integrated with three rising candlestick charts (the center candlestick is the highest, showing an upward trend). The "C" and candlesticks are seamlessly merged. Professional flat vector style, bold lines, metallic gold and deep charcoal colors. White background, high contrast, symmetry, premium fintech branding.`
};

// バイオテキスト（Gemini CMO指示 - Whopの200字制限に合わせて最適化）
// 重要要素: AIO Media LLC, CryptoTradeAcademy, Defense-First, CryptoQuant/Grok/Gemini, Anti-Trap, ドメイン, アクティブユーザー数
// 文字数制限: 200字以内（改行・絵文字含む）
// 最適化版: 約195字（200字制限に準拠）- "World's first"を削除、"leader"を削除して短縮
const BIO_TEXT = `AIO Media LLC | CryptoTradeAcademy
Defense-First Bitcoin trading. CryptoQuant, Grok-X, Gemini AI. "Anti-Trap" protocol.
Stop being liquidity. Start defending your capital.
🌐 cryptotradeacademy.io 🛡️ 2,000+ Defenders`;

/**
 * ディレクトリを作成
 */
function ensureDirectories() {
  [OUTPUT_DIR, IMAGES_DIR].forEach(dir => {
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
 * バナー画像を生成
 */
async function generateBannerImage() {
  console.log('\n🎨 バナー画像を生成中...');
  console.log(`プロンプト: ${PROMPTS.banner.substring(0, 100)}...`);

  try {
    const result = await callNanoBananaPro(PROMPTS.banner, {
      aspectRatio: '21:9', // 3:1に最も近いアスペクト比（1188px×396pxに最適化）
      imageSize: '4K', // 高解像度
      savePath: join(IMAGES_DIR, 'profile-banner-cryptotradeacademy-1188x396.png')
    });

    console.log(`✅ バナー画像生成成功:`);
    console.log(`  - 画像数: ${result.images.length}`);
    result.images.forEach((img, idx) => {
      console.log(`  - 画像 ${idx + 1}:`);
      console.log(`    - MIME Type: ${img.mimeType}`);
      console.log(`    - 保存先: ${img.filePath || 'N/A'}`);
      console.log(`    - Data URL: ${img.dataUrl?.substring(0, 50)}...`);
    });

    return result;
  } catch (error: any) {
    console.error(`❌ バナー画像生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * ロゴ画像を生成（背景透過版）
 */
async function generateLogoTransparent() {
  console.log('\n🎨 ロゴ画像（背景透過版）を生成中...');
  console.log(`プロンプト: ${PROMPTS.logoTransparent.substring(0, 100)}...`);

  try {
    const result = await callNanoBananaPro(PROMPTS.logoTransparent, {
      aspectRatio: '1:1', // 正方形（円形切り抜き対応）
      imageSize: '4K', // 高解像度
      savePath: join(IMAGES_DIR, 'profile-logo-cryptotradeacademy-transparent.png')
    });

    console.log(`✅ ロゴ画像（背景透過版）生成成功:`);
    console.log(`  - 画像数: ${result.images.length}`);
    result.images.forEach((img, idx) => {
      console.log(`  - 画像 ${idx + 1}:`);
      console.log(`    - MIME Type: ${img.mimeType}`);
      console.log(`    - 保存先: ${img.filePath || 'N/A'}`);
      console.log(`    - Data URL: ${img.dataUrl?.substring(0, 50)}...`);
    });

    return result;
  } catch (error: any) {
    console.error(`❌ ロゴ画像（背景透過版）生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * ロゴ画像を生成（白背景版）
 */
async function generateLogoWhiteBg() {
  console.log('\n🎨 ロゴ画像（白背景版）を生成中...');
  console.log(`プロンプト: ${PROMPTS.logoWhiteBg.substring(0, 100)}...`);

  try {
    const result = await callNanoBananaPro(PROMPTS.logoWhiteBg, {
      aspectRatio: '1:1', // 正方形（円形切り抜き対応）
      imageSize: '4K', // 高解像度
      savePath: join(IMAGES_DIR, 'profile-logo-cryptotradeacademy-white-bg.png')
    });

    console.log(`✅ ロゴ画像（白背景版）生成成功:`);
    console.log(`  - 画像数: ${result.images.length}`);
    result.images.forEach((img, idx) => {
      console.log(`  - 画像 ${idx + 1}:`);
      console.log(`    - MIME Type: ${img.mimeType}`);
      console.log(`    - 保存先: ${img.filePath || 'N/A'}`);
      console.log(`    - Data URL: ${img.dataUrl?.substring(0, 50)}...`);
    });

    return result;
  } catch (error: any) {
    console.error(`❌ ロゴ画像（白背景版）生成失敗: ${error.message}`);
    throw error;
  }
}

/**
 * メタデータファイルを生成
 */
function generateMetadata(results: {
  banner?: any;
  logoTransparent?: any;
  logoWhiteBg?: any;
}) {
  const metadata = {
    generatedAt: new Date().toISOString(),
    profile: 'Whop CEO Profile - AIO Media LLC | CryptoTradeAcademy',
    assets: {
      images: [
        {
          id: 'banner',
          name: 'プロフィールバナー（横長）- 1188px×396px最適化版',
          file: 'profile-banner-cryptotradeacademy-1188x396.png',
          path: join(IMAGES_DIR, 'profile-banner-cryptotradeacademy-1188x396.png'),
          prompt: PROMPTS.banner,
          description: 'CryptoQuantのオンチェーンデータマップが表示されたホログラフィックディスプレイ。1188px×396px（3:1）に最適化。全体のデザインや構成は変更なし',
          usage: 'Whopプロフィールページの上部バナーとして使用。指定サイズ: 1188px×396px',
          aspectRatio: '21:9', // 3:1に最も近いアスペクト比
          targetSize: '1188px × 396px',
          generated: !!results.banner
        },
        {
          id: 'logo-transparent',
          name: 'プロフィールロゴ（背景透過版）',
          file: 'profile-logo-cryptotradeacademy-transparent.png',
          path: join(IMAGES_DIR, 'profile-logo-cryptotradeacademy-transparent.png'),
          prompt: PROMPTS.logoTransparent,
          description: '添付画像から抽出したロゴデザイン。スタイリッシュな黒いアウトラインのシールド、金色の曲線的な「C」、3本の金色のローソク足チャートが一体化。背景透過版',
          usage: 'Whopプロフィールページのプロフィール画像として使用。背景透過により、任意の背景色に配置可能',
          aspectRatio: '1:1',
          generated: !!results.logoTransparent
        },
        {
          id: 'logo-white-bg',
          name: 'プロフィールロゴ（白背景版）',
          file: 'profile-logo-cryptotradeacademy-white-bg.png',
          path: join(IMAGES_DIR, 'profile-logo-cryptotradeacademy-white-bg.png'),
          prompt: PROMPTS.logoWhiteBg,
          description: '添付画像から抽出したロゴデザイン。スタイリッシュな黒いアウトラインのシールド、金色の曲線的な「C」、3本の金色のローソク足チャートが一体化。白背景版',
          usage: 'Whopプロフィールページのプロフィール画像として使用。白背景で統一感のあるデザイン',
          aspectRatio: '1:1',
          generated: !!results.logoWhiteBg
        }
      ]
    },
    bioText: BIO_TEXT,
    bioTextLength: BIO_TEXT.length,
    brandColors: {
      primary: 'Deep Navy',
      accent: 'Amber/Orange',
      logo: 'Metallic Gold & Deep Charcoal'
    },
    strategicAdvice: {
      domainExposure: 'バイオの最後に必ずドメインを記載。Whop外でも実体があることを示すことで、信頼スコアが跳ね上がる',
      companyRole: 'バイオの冒頭に会社名を入れることで、「個人が片手間でやっているツール」ではなく「法人が運営するアカデミー」であることを明示',
      colorConsistency: 'バナーとロゴ、そして商品ページのVSLで使っている「オレンジ×ダークネイビー」の配色をここでも徹底。ブランドの一貫性が「本物感」を生む'
    }
  };

  const metadataPath = join(OUTPUT_DIR, 'metadata.json');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`\n📝 メタデータを生成しました: ${metadataPath}`);

  // バイオテキストファイルも個別に保存
  const bioTextPath = join(OUTPUT_DIR, 'bio-text.txt');
  writeFileSync(bioTextPath, BIO_TEXT, 'utf-8');
  console.log(`📝 バイオテキストを保存しました: ${bioTextPath}`);

  return metadata;
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 Whop CEOプロフィールページ用アセット生成を開始');
    console.log(`📦 出力ディレクトリ: ${OUTPUT_DIR}`);

    // ディレクトリを作成
    ensureDirectories();

    const results: any = {};

    // バナー画像を生成
    try {
      results.banner = await generateBannerImage();
    } catch (error: any) {
      console.error(`⚠️ バナー画像の生成に失敗しましたが、続行します: ${error.message}`);
    }

    // ロゴ画像（背景透過版）を生成
    try {
      results.logoTransparent = await generateLogoTransparent();
    } catch (error: any) {
      console.error(`⚠️ ロゴ画像（背景透過版）の生成に失敗しましたが、続行します: ${error.message}`);
    }

    // ロゴ画像（白背景版）を生成
    try {
      results.logoWhiteBg = await generateLogoWhiteBg();
    } catch (error: any) {
      console.error(`⚠️ ロゴ画像（白背景版）の生成に失敗しましたが、続行します: ${error.message}`);
    }

    // メタデータを生成
    const metadata = generateMetadata(results);
    
    // バイオテキストの文字数を確認
    const bioLength = BIO_TEXT.length;
    console.log(`\n📊 バイオテキスト文字数: ${bioLength}文字（Whop制限: 200字以内）`);
    if (bioLength > 200) {
      console.warn(`⚠️ 警告: バイオテキストが200字を超えています（${bioLength}文字）。Whopの制限に合わせて短縮してください。`);
      console.warn(`💡 推奨: 不要な単語を削除するか、より簡潔な表現に変更してください。`);
    } else {
      console.log(`✅ バイオテキストは200字以内です（${bioLength}文字）。`);
    }

    console.log('\n✅ 生成完了！');
    console.log('\n📝 次のステップ:');
    console.log('1. 生成された画像を確認: data/whop-profile-assets/images/');
    console.log('2. Whop Dashboardでプロフィールページを編集');
    console.log('3. バナー画像をアップロード（プロフィール上部）');
    console.log('4. ロゴ画像をアップロード（プロフィール画像）');
    console.log('   - 背景透過版: profile-logo-cryptotradeacademy-transparent.png');
    console.log('   - 白背景版: profile-logo-cryptotradeacademy-white-bg.png');
    console.log('5. バイオテキストをコピー&ペースト: data/whop-profile-assets/bio-text.txt');
    console.log('\n📋 メタデータ: data/whop-profile-assets/metadata.json');
    console.log('\n💡 戦略的アドバイス:');
    console.log('- ドメインの露出: バイオの最後に必ずドメインを記載');
    console.log('- AIO Media LLCの役割: バイオの冒頭に会社名を入れる');
    console.log('- 色の統一: 「オレンジ×ダークネイビー」の配色を徹底');

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

export { generateBannerImage, generateLogoTransparent, generateLogoWhiteBg, PROMPTS, BIO_TEXT };
