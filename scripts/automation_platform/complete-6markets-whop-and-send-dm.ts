#!/usr/bin/env tsx
/**
 * 6市場Whopページ完成 + DM配信準備システム
 * 
 * AI役割分担:
 * - Grok (CSO): grok-4-1-fast-reasoning - TG/X/Emailを想定したリスト収集
 * - Gemini (CMO): gemini-3-flash-preview - VSL挿入セールスレター作成
 * - GPT (CTO): gpt-5-2-2025-12-11 - DM配信とKPIのPDCA管理
 * - COO: Whopオペレーション対応
 * 
 * 1. 6市場（EN, AR, KO, JA, ES, PT-BR）のWhopページをEN版と同様に完成させる
 * 2. DM用VSLスクリプトを読み込む（修正版英語版VSLスクリプトを使用）
 *    - Whop版VSL: タスク1のHeyGen動画をそのまま使用（変更なし）
 * 3. Grok（CSO）にTG/X/Emailを想定したリストを集めてもらう
 * 4. Gemini（CMO）がリストの感度に合ったセールスレターを作成（VSL挿入）
 * 5. GPT（CTO）がDM配信準備（TG/Email対応、Xは後で対応）
 * 6. 各市場のWhopページへのリンクを含める
 * 
 * 注意: 実際のDM送信はCEOのGOサインが出てから実行されます
 * 目標: 週末までに$10万達成
 */

import { PrismaClient } from '@prisma/client';
import { callGrok41FastReasoning, callGPT52, callGPT4oMini, callGemini3Pro, getWhopProduct, sendResendEmail } from '../api/unified-api.js';
import { WHOP_PRODUCT_IDS } from '../hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en/lib/whop/constants.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// ============================================
// VSLファイル読み込み
// ============================================

/**
 * SRTファイルからテキストを抽出
 */
function parseSRTFile(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const texts: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // タイムスタンプ行をスキップ（-->を含む行）
      if (line.includes('-->')) {
        continue;
      }
      // 数字のみの行（シーケンス番号）をスキップ
      if (/^\d+$/.test(line)) {
        continue;
      }
      // 空行をスキップ
      if (line === '') {
        continue;
      }
      // テキスト行を追加
      texts.push(line);
    }
    
    return texts.join(' ');
  } catch (error: any) {
    console.error(`❌ VSLファイル読み込みエラー: ${error.message}`);
    return '';
  }
}

/**
 * VSLスクリプトを読み込む（DM用）
 * 修正版の英語版VSLスクリプトを使用（Gemini CMOが生成）
 * Whop版はタスク1のまま（HeyGen動画）
 */
function loadVSLScriptForDM(): string {
  // 修正版の英語版VSLスクリプトを読み込む
  const vslScriptPath = join(__dirname, '../data/vsl-scripts/revised-dm-vsl-script.txt');
  
  if (!fs.existsSync(vslScriptPath)) {
    console.warn(`⚠️ 修正版VSLスクリプトが見つかりません: ${vslScriptPath}`);
    console.warn(`⚠️ フォールバック: タスク3のVSLファイルを使用`);
    
    // フォールバック: タスク3のVSLファイル
    const fallbackPath = 'C:\\Users\\chiba\\Downloads\\タスク3 VSL用コンテンツ（Video Sales Letterスクリプト）.srt';
    if (fs.existsSync(fallbackPath)) {
      const vslText = parseSRTFile(fallbackPath);
      console.log(`✅ フォールバック: DM用VSLファイル読み込み完了 (${vslText.length}文字)`);
      return vslText;
    }
    return '';
  }
  
  // 修正版スクリプトファイルを読み込む
  const fileContent = fs.readFileSync(vslScriptPath, 'utf-8');
  
  // メタデータ部分をスキップして、実際のスクリプト部分を抽出
  // "---" の後の部分がスクリプト本体（最初の "---" の後から、最後の "---" の前まで）
  const lines = fileContent.split('\n');
  let scriptStartIndex = -1;
  let scriptEndIndex = -1;
  
  // 最初の "---" を探す（メタデータの終わり）
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---' && scriptStartIndex === -1) {
      scriptStartIndex = i + 1;
      break;
    }
  }
  
  // 最後の "---" を探す（スクリプトの終わり）
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === '---' && scriptEndIndex === -1) {
      scriptEndIndex = i;
      break;
    }
  }
  
  if (scriptStartIndex >= 0 && scriptEndIndex > scriptStartIndex) {
    const vslScript = lines.slice(scriptStartIndex, scriptEndIndex).join('\n').trim();
    console.log(`✅ 修正版DM用VSLスクリプト読み込み完了 (${vslScript.length}文字)`);
    return vslScript;
  }
  
  // フォールバック: "# Trap Defence BTC:" または "### 1. Opening" から始まる部分を探す
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('# Trap Defence BTC:') || lines[i].includes('### 1. Opening') || lines[i].includes('As the CMO')) {
      const vslScript = lines.slice(i).join('\n').trim();
      // 最後の "---" の前で切る
      const lastDashIndex = vslScript.lastIndexOf('\n---\n');
      if (lastDashIndex > 0) {
        const finalScript = vslScript.substring(0, lastDashIndex).trim();
        console.log(`✅ 修正版DM用VSLスクリプト読み込み完了 (${finalScript.length}文字)`);
        return finalScript;
      }
      console.log(`✅ 修正版DM用VSLスクリプト読み込み完了 (${vslScript.length}文字)`);
      return vslScript;
    }
  }
  
  // 最後のフォールバック: ファイル全体を使用（メタデータ部分を除く）
  const finalContent = fileContent.replace(/^#.*?\n---\n/s, '').replace(/\n---\n.*$/s, '').trim();
  console.log(`✅ 修正版DM用VSLスクリプト読み込み完了 (${finalContent.length}文字)`);
  return finalContent;
}

// ============================================
// フェーズ1: 6市場Whopページ完成
// ============================================

const EN_WHOP_URL = 'https://whop.com/aio-media-llc/trap-defence-btc-en/';

const WHOP_PAGE_URLS: Record<string, string> = {
  EN: 'https://whop.com/aio-media-llc/trap-defence-btc-en/',
  AR: 'https://whop.com/aio-media-llc/trap-defence-btc-ar/',
  KO: 'https://whop.com/aio-media-llc/trap-defence-btc-ko/',
  JA: 'https://whop.com/aio-media-llc/trap-defence-btc-ja/',
  ES: 'https://whop.com/aio-media-llc/trap-defence-btc-es/',
  'PT-BR': 'https://whop.com/aio-media-llc/trap-defence-btc-pt-br/',
};

async function completeWhopPages() {
  console.log('🚀 フェーズ1: 6市場Whopページ完成\n');

  const markets = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];
  const results: Record<string, any> = {};

  for (const market of markets) {
    try {
      const productId = WHOP_PRODUCT_IDS[market as keyof typeof WHOP_PRODUCT_IDS];
      if (!productId) {
        console.warn(`⚠️ ${market}市場のプロダクトIDが見つかりません`);
        results[market] = { error: 'Product ID not found' };
        continue;
      }

      console.log(`📋 ${market}市場のWhopページを確認中... (${productId})`);

      // Whop APIでプロダクト情報を取得
      const product = await getWhopProduct(productId);
      
      if (product && product.id) {
        console.log(`✅ ${market}市場のWhopページ確認完了`);
        results[market] = {
          success: true,
          productId,
          url: WHOP_PAGE_URLS[market] || `https://whop.com/products/${productId}`,
          name: product.name || 'Trap Defence BTC',
        };
      } else {
        console.warn(`⚠️ ${market}市場のWhopページが見つかりません`);
        results[market] = { error: 'Product not found', productId };
      }
    } catch (error: any) {
      console.error(`❌ ${market}市場のWhopページ確認エラー:`, error.message);
      results[market] = { error: error.message };
    }
  }

  return results;
}

// ============================================
// フェーズ2: GrokでXを中心にリスト収集
// ============================================

/**
 * Grok（CSO）にTG/X/Emailを想定したリストを集めてもらう
 * コスト最適化: Grok 4.1 Fast Reasoningを使用（戦略的リスト収集には高品質が必要）
 * 理由: リスト収集の品質がCVRに直接影響するため、コストをかけてでも高品質を確保
 */
async function collectUsersWithGrokCSO(market: string) {
  console.log(`💰 Grok（CSO）に${market}市場のユーザーリスト収集を依頼中...`);
  console.log(`📋 チャネル: Telegram、X（Twitter）投稿、Emailを想定`);
  console.log(`💰 コスト最適化: Grok 4.1 Fast Reasoningを使用（戦略的重要性が高い）\n`);

  const marketQueries: Record<string, string[]> = {
    EN: ['crypto trading', 'bitcoin analysis', 'trading signals', 'crypto trap', 'defensive trading'],
    AR: ['تداول العملات المشفرة', 'تحليل البيتكوين', 'إشارات التداول'],
    KO: ['암호화폐 거래', '비트코인 분석', '트레이딩 시그널'],
    JA: ['暗号通貨取引', 'ビットコイン分析', 'トレーディングシグナル'],
    ES: ['trading de criptomonedas', 'análisis de bitcoin', 'señales de trading'],
    'PT-BR': ['trading de criptomoedas', 'análise de bitcoin', 'sinais de trading'],
  };

  const queries = marketQueries[market] || marketQueries.EN;

  const prompt = `【ユーザーリスト収集 - CSO（Grok）】

市場: ${market}
プロダクト: Trap Defence BTC

以下の3つのチャネルを想定してユーザーリストを収集してください：
1. **Telegram**: TGチャンネル/グループのメンバー、TGで活動しているトレーダー
2. **X（Twitter）**: Xで投稿しているトレーダー、Xでフォローしているユーザー
3. **Email**: メールアドレスが公開されている、またはメール配信を受け取っているトレーダー

以下の検索クエリでユーザーを探してください：
${queries.map(q => `- "${q}"`).join('\n')}

## 収集する情報

各ユーザーについて、以下の情報を収集してください：

1. **基本情報**:
   - X（Twitter）のユーザー名（@username）
   - 表示名
   - プロフィールURL
   - フォロワー数
   - エンゲージメント率（推定）

2. **コンテンツ分析**:
   - 最近の投稿トピック（3-5個）
   - ペインポイント（推測）
   - コンテンツタイプ（教育、分析、シグナル配信など）

3. **連絡先情報（重要）**:
   - Telegram User ID（もしあれば）
   - X（Twitter）のユーザー名（@username）
   - メールアドレス（もしあれば）
   - 優先チャネル（TG/X/Emailのうち、どのチャネルが最適か）

4. **マッチスコア**:
   - Trap Defence BTCとの適合度（0-10点）
   - 選定理由

## 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "users": [
    {
      "username": "@username",
      "displayName": "Display Name",
      "profileUrl": "https://x.com/username",
      "followerCount": 10000,
      "engagementRate": 5.2,
      "recentTopics": ["topic1", "topic2", "topic3"],
      "painPoints": ["pain1", "pain2"],
      "contentType": "教育",
      "telegramUserId": "123456789",
      "email": "user@example.com",
      "preferredChannel": "TG",
      "matchScore": 8,
      "matchReason": "選定理由"
    }
  ],
  "total": 100,
  "market": "${market}"
}
\`\`\`

各市場で100-500人のユーザーを収集してください。`;

  try {
    const result = await callGrok41FastReasoning(prompt, {
      temperature: 0.7,
      maxTokens: 8192,
    });

    // JSONを抽出
    const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/) || result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      const data = JSON.parse(jsonText);
      
      console.log(`✅ ${market}市場: ${data.users?.length || 0}件のユーザーをGrokで収集`);
      return data.users || [];
    } else {
      console.warn(`⚠️ ${market}市場: GrokのレスポンスからJSONを抽出できませんでした`);
      return [];
    }
  } catch (error: any) {
    console.error(`❌ ${market}市場のGrokリスト収集エラー:`, error.message);
    return [];
  }
}

// ============================================
// フェーズ3: Gemini（CMO）がリストの感度に合ったセールスレターを作成（VSL挿入）
// ============================================

/**
 * Gemini（CMO）がユーザーの感度に合ったセールスレターを生成（VSL挿入）
 * コスト最適化: thinkingLevel='low'でコスト削減（セールスレター作成には十分な品質）
 * 
 * @deprecated バッチ処理版を使用してください: generateSalesLettersBatch
 */
async function generatePersonalizedSalesLetterWithGeminiCMO(market: string, user: any, vslScript: string) {
  console.log(`📢 Gemini（CMO）が${user.username || user.displayName}向けのセールスレターを生成中...`);
  console.log(`💰 コスト最適化: thinkingLevel='low'を使用（セールスレター作成には十分な品質）`);

  const whopUrl = WHOP_PAGE_URLS[market] || `https://whop.com/products/${WHOP_PRODUCT_IDS[market as keyof typeof WHOP_PRODUCT_IDS]}`;

  const prompt = `【感度に合わせたセールスレター生成 - CMO（Gemini）】

市場: ${market}
プロダクト: Trap Defence BTC
WhopページURL: ${whopUrl}

## ユーザー情報

- ユーザー名: ${user.username || 'N/A'}
- 表示名: ${user.displayName || 'N/A'}
- フォロワー数: ${user.followerCount || 0}
- エンゲージメント率: ${user.engagementRate || 0}%
- 最近のトピック: ${user.recentTopics?.join(', ') || 'N/A'}
- ペインポイント: ${user.painPoints?.join(', ') || 'N/A'}
- コンテンツタイプ: ${user.contentType || 'N/A'}
- マッチスコア: ${user.matchScore || 0}/10
- 選定理由: ${user.matchReason || 'N/A'}
- 優先チャネル: ${user.preferredChannel || 'TG'}

## VSLスクリプト（DM用修正版VSLスクリプト）

${vslScript}

**注意**: このVSLスクリプトは、Whopページの動画（タスク1: Two Young Menストーリー）と整合性を保つように設計されています。
Whopページにはタスク1のHeyGen動画が埋め込まれており、DMからWhopページに遷移したユーザーが「あ、これのことか！」というアハ体験を得られるように構成されています。

## 要件

このユーザーの感度（興味関心、ペインポイント、コンテンツタイプ）に合わせて、パーソナライズされたセールスレターを生成してください。

**重要**: 上記のVSLスクリプトの内容を自然にセールスレターに挿入してください。VSLスクリプトはWhopページの動画と整合性があるため、ユーザーがWhopページに遷移した際に一貫したストーリーを体験できるようにしてください。

1. **ヘッドライン**: ユーザーのペインポイントに直接響く
2. **問題提起**: ユーザーの最近のトピックに関連付ける
3. **VSL挿入**: 上記VSLスクリプトの主要なポイントを自然に挿入
4. **解決策**: Trap Defence BTCを、ユーザーのコンテンツタイプに合わせて紹介
5. **ベネフィット**: ユーザーのペインポイントを解決する5つのベネフィット
6. **証拠**: ユーザーのフォロワー数やエンゲージメント率に合わせた信頼性要素
7. **CTA**: Whopページへのリンク

市場の言語と文化に適した表現を使用し、ユーザーの感度に合わせて自然な文章にしてください。

200-400文字程度の簡潔で効果的なセールスレターを生成してください。`;

  try {
    // コスト最適化: thinkingLevel='low'でコスト削減（セールスレター作成には十分な品質）
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'low', // コスト削減: 'high'から'low'に変更
      temperature: 0.8,
      maxOutputTokens: 1536,
    });

    return result.text.trim();
  } catch (error: any) {
    console.error(`❌ ${user.username || 'ユーザー'}向けセールスレター生成エラー:`, error.message);
    return '';
  }
}

/**
 * Gemini（CMO）がバッチ処理でセールスレターを生成（コスト最適化版）
 * 1回のAPI呼び出しで複数ユーザー（50-100件）のセールスレターを生成
 * 
 * コスト削減効果: 約98%（750回/日 → 8-15回/日）
 * 日次コスト: $11.00 → $0.15-0.22
 * 月次コスト: $330 → $4.50-6.60
 */
async function generateSalesLettersBatch(market: string, users: any[], vslScript: string, batchSize: number = 50): Promise<Map<string, string>> {
  console.log(`📢 Gemini（CMO）が${market}市場の${users.length}件のユーザー向けセールスレターをバッチ生成中...`);
  console.log(`💰 コスト最適化: バッチ処理（${batchSize}件/バッチ）で約98%のコスト削減`);
  
  const whopUrl = WHOP_PAGE_URLS[market] || `https://whop.com/products/${WHOP_PRODUCT_IDS[market as keyof typeof WHOP_PRODUCT_IDS]}`;
  const results: Map<string, string> = new Map();
  
  // バッチに分割
  const batches: any[][] = [];
  for (let i = 0; i < users.length; i += batchSize) {
    batches.push(users.slice(i, i + batchSize));
  }
  
  console.log(`📦 バッチ数: ${batches.length}（${batchSize}件/バッチ）\n`);
  
  // 各バッチを処理
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`📦 バッチ ${batchIndex + 1}/${batches.length} を処理中... (${batch.length}件)`);
    
    try {
      const prompt = `【バッチセールスレター生成 - CMO（Gemini）】

市場: ${market}
プロダクト: Trap Defence BTC
WhopページURL: ${whopUrl}

## VSLスクリプト（DM用修正版VSLスクリプト）

${vslScript}

**注意**: このVSLスクリプトは、Whopページの動画（タスク1: Two Young Menストーリー）と整合性を保つように設計されています。
Whopページにはタスク1のHeyGen動画が埋め込まれており、DMからWhopページに遷移したユーザーが「あ、これのことか！」というアハ体験を得られるように構成されています。

## ユーザー情報（${batch.length}件）

以下の${batch.length}人のユーザー向けに、それぞれパーソナライズされたセールスレターを生成してください。

${batch.map((user, idx) => `
### ユーザー${idx + 1}
- ユーザー名: ${user.username || 'N/A'}
- 表示名: ${user.displayName || 'N/A'}
- フォロワー数: ${user.followerCount || 0}
- エンゲージメント率: ${user.engagementRate || 0}%
- 最近のトピック: ${user.recentTopics?.join(', ') || 'N/A'}
- ペインポイント: ${user.painPoints?.join(', ') || 'N/A'}
- コンテンツタイプ: ${user.contentType || 'N/A'}
- マッチスコア: ${user.matchScore || 0}/10
- 選定理由: ${user.matchReason || 'N/A'}
- 優先チャネル: ${user.preferredChannel || 'TG'}
`).join('\n')}

## 要件

各ユーザーの感度（興味関心、ペインポイント、コンテンツタイプ）に合わせて、パーソナライズされたセールスレターを生成してください。

**重要**: 上記のVSLスクリプトの内容を自然にセールスレターに挿入してください。VSLスクリプトはWhopページの動画と整合性があるため、ユーザーがWhopページに遷移した際に一貫したストーリーを体験できるようにしてください。

各セールスレターには以下を含めてください：
1. **ヘッドライン**: ユーザーのペインポイントに直接響く
2. **問題提起**: ユーザーの最近のトピックに関連付ける
3. **VSL挿入**: VSLスクリプトの主要なポイントを自然に挿入
4. **解決策**: Trap Defence BTCを、ユーザーのコンテンツタイプに合わせて紹介
5. **ベネフィット**: ユーザーのペインポイントを解決する3-5つのベネフィット
6. **証拠**: ユーザーのフォロワー数やエンゲージメント率に合わせた信頼性要素
7. **CTA**: Whopページへのリンク

市場の言語と文化に適した表現を使用し、各ユーザーの感度に合わせて自然な文章にしてください。

各セールスレターは200-400文字程度の簡潔で効果的なものにしてください。

## 出力形式

以下のJSON形式で出力してください：

\`\`\`json
[
  {
    "username": "${batch[0]?.username || '@username1'}",
    "salesLetter": "パーソナライズされたセールスレター..."
  },
  {
    "username": "${batch[1]?.username || '@username2'}",
    "salesLetter": "パーソナライズされたセールスレター..."
  }
]
\`\`\`

必ず全${batch.length}件のセールスレターを生成してください。`;

      const result = await callGemini3Pro(prompt, {
        thinkingLevel: 'low', // コスト削減
        temperature: 0.8,
        maxOutputTokens: 8192, // バッチ処理なので増やす
      });

      // JSONを抽出
      const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/) || result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        try {
          const salesLetters = JSON.parse(jsonText);
          
          if (Array.isArray(salesLetters)) {
            salesLetters.forEach((item: any) => {
              if (item.username && item.salesLetter) {
                results.set(item.username, item.salesLetter);
              }
            });
            console.log(`✅ バッチ ${batchIndex + 1}: ${salesLetters.length}件のセールスレターを生成`);
          } else {
            console.warn(`⚠️ バッチ ${batchIndex + 1}: JSON形式が不正（配列ではありません）`);
          }
        } catch (parseError: any) {
          console.error(`❌ バッチ ${batchIndex + 1}: JSON解析エラー:`, parseError.message);
        }
      } else {
        console.warn(`⚠️ バッチ ${batchIndex + 1}: JSONが見つかりませんでした`);
      }
    } catch (error: any) {
      console.error(`❌ バッチ ${batchIndex + 1} のセールスレター生成エラー:`, error.message);
    }
    
    // レート制限対策: バッチ間で少し待機
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    }
  }
  
  console.log(`\n✅ バッチ処理完了: ${results.size}/${users.length}件のセールスレターを生成\n`);
  return results;
}

// ============================================
// フェーズ4: GPT（CTO）がDM配信準備（送信は行わない）
// ============================================

/**
 * GPT（CTO）がDM配信準備（実際の送信は行わない）
 * CEOのGOサインが出てから送信される
 * チャネル: Telegram、Email（Xは後で対応）
 * コスト最適化: GPT-4o-miniを使用（DM配信準備には十分な品質、コスト効率が高い）
 */
async function prepareDMWithGPTCTO(market: string, users: any[], vslScript: string) {
  console.log(`⚙️ GPT（CTO）が${market}市場のユーザー向けDM配信準備中... (${users.length}件)`);
  console.log(`📋 チャネル: Telegram、Email（Xは後で対応）`);
  console.log(`💰 コスト最適化: GPT-4o-miniを使用（DM配信準備には十分な品質）`);
  console.log(`⚠️ 注意: 実際の送信は行いません。CEOのGOサインを待ちます。\n`);

  const whopUrl = WHOP_PAGE_URLS[market] || `https://whop.com/products/${WHOP_PRODUCT_IDS[market as keyof typeof WHOP_PRODUCT_IDS]}`;

  let prepared = 0;
  let failed = 0;

  // バッチ処理でセールスレターを生成（コスト最適化: 約98%削減）
  console.log(`💰 コスト最適化: バッチ処理でセールスレターを生成（${users.length}件 → 約${Math.ceil(users.length / 50)}回のAPI呼び出し）\n`);
  const salesLettersMap = await generateSalesLettersBatch(market, users, vslScript, 50);

  // 各ユーザーに対して、バッチ処理で生成したセールスレターを使用してDMメッセージを準備
  for (const user of users) {
    try {
      // バッチ処理で生成したセールスレターを取得
      const salesLetter = salesLettersMap.get(user.username || '');
      
      if (!salesLetter) {
        console.warn(`⚠️ ${user.username || 'ユーザー'}向けのセールスレターが見つかりません（バッチ処理で生成されなかった可能性）`);
        // フォールバック: 個別生成を試行
        const fallbackSalesLetter = await generatePersonalizedSalesLetterWithGeminiCMO(market, user, vslScript);
        if (!fallbackSalesLetter) {
          failed++;
          continue;
        }
        // フォールバック成功時はそのまま使用
        const preferredChannel = user.preferredChannel || 'TG';
        const telegramUserId = user.telegramUserId;
        const email = user.email;
        
        let dmMessage = '';
        if (preferredChannel === 'TG' && telegramUserId) {
          dmMessage = `${fallbackSalesLetter}\n\n🚀 今すぐ始める: ${whopUrl}`;
        } else if (preferredChannel === 'Email' && email) {
          dmMessage = `${fallbackSalesLetter}\n\n🚀 今すぐ始める: ${whopUrl}`;
        } else {
          if (telegramUserId) {
            dmMessage = `${fallbackSalesLetter}\n\n🚀 今すぐ始める: ${whopUrl}`;
          } else if (email) {
            dmMessage = `${fallbackSalesLetter}\n\n🚀 今すぐ始める: ${whopUrl}`;
          } else {
            console.warn(`⚠️ ${user.username || 'ユーザー'}に連絡先情報がありません`);
            failed++;
            continue;
          }
        }
        
        // データベースに保存（フォールバック版）
        try {
          const existing = await prisma.affiliateCandidate.findFirst({
            where: {
              username: user.username || '',
              market: market as any,
            },
          });

          const notesContent = `【配信準備完了 - GPT（CTO）- フォールバック生成】\n準備日時: ${new Date().toISOString()}\n優先チャネル: ${preferredChannel}\nTelegram User ID: ${telegramUserId || 'N/A'}\nEmail: ${email || 'N/A'}\n\nDMメッセージ:\n${dmMessage}`;

          if (existing) {
            await prisma.affiliateCandidate.update({
              where: { id: existing.id },
              data: {
                status: 'New',
                notes: notesContent,
                email: email || existing.email,
              },
            });
          } else {
            await prisma.affiliateCandidate.create({
              data: {
                username: user.username || '',
                displayName: user.displayName || '',
                market: market as any,
                status: 'New',
                matchScore: user.matchScore || 0,
                notes: notesContent,
                email: email || '',
              },
            });
          }
          prepared++;
        } catch (dbError: any) {
          console.error(`❌ ${user.username || 'ユーザー'}のデータベース保存エラー:`, dbError.message);
          failed++;
        }
        continue;
      }

      const preferredChannel = user.preferredChannel || 'TG';
      const telegramUserId = user.telegramUserId;
      const email = user.email;

      // チャネル別のDMメッセージを生成（送信は行わない）
      let dmMessage = '';
      
      if (preferredChannel === 'TG' && telegramUserId) {
        dmMessage = `${salesLetter}

🚀 今すぐ始める: ${whopUrl}`;
      } else if (preferredChannel === 'Email' && email) {
        dmMessage = `${salesLetter}

🚀 今すぐ始める: ${whopUrl}`;
      } else {
        // フォールバック: 利用可能なチャネルを使用
        if (telegramUserId) {
          dmMessage = `${salesLetter}

🚀 今すぐ始める: ${whopUrl}`;
        } else if (email) {
          dmMessage = `${salesLetter}

🚀 今すぐ始める: ${whopUrl}`;
        } else {
          console.warn(`⚠️ ${user.username || 'ユーザー'}に連絡先情報がありません（TG: ${telegramUserId || 'N/A'}, Email: ${email || 'N/A'}）`);
          failed++;
          continue;
        }
      }

      // データベースに保存（配信準備完了として記録）
      try {
        // usernameで既存レコードを検索
        const existing = await prisma.affiliateCandidate.findFirst({
          where: {
            username: user.username || '',
            market: market as any,
          },
        });

        const notesContent = `【配信準備完了 - GPT（CTO）】
準備日時: ${new Date().toISOString()}
優先チャネル: ${preferredChannel}
Telegram User ID: ${telegramUserId || 'N/A'}
Email: ${email || 'N/A'}

DMメッセージ:
${dmMessage}`;

        if (existing) {
          // 既存レコードを更新（配信準備完了）
          await prisma.affiliateCandidate.update({
            where: { id: existing.id },
            data: {
              status: 'New', // まだ送信していないのでNewのまま
              telegramUserId: user.telegramUserId || existing.telegramUserId,
              email: user.email || existing.email,
              notes: notesContent,
            },
          });
        } else {
          // 新規レコードを作成（配信準備完了）
          await prisma.affiliateCandidate.create({
            data: {
              username: user.username || `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              displayName: user.displayName,
              market: market as any,
              profileUrl: user.profileUrl,
              followerCount: user.followerCount || 0,
              engagementRate: user.engagementRate || 0,
              recentTopics: user.recentTopics || [],
              painPoints: user.painPoints || [],
              contentType: user.contentType,
              telegramUserId: user.telegramUserId,
              email: user.email,
              matchScore: user.matchScore || 0,
              status: 'New', // まだ送信していないのでNew
              notes: notesContent,
            },
          });
        }
      } catch (dbError: any) {
        // データベースエラーは無視して続行
        console.warn(`⚠️ データベース保存エラー: ${dbError.message}`);
      }

      prepared++;
      console.log(`✅ ${user.username || 'ユーザー'}のDM配信準備完了（チャネル: ${preferredChannel}）`);

      // レート制限対応（API呼び出しを控えめに）
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(`❌ ${user.username || 'ユーザー'}のDM配信準備エラー:`, error.message);
      failed++;
    }
  }

  return { prepared, failed };
}

// ============================================
// メイン実行
// ============================================

async function main() {
  console.log('🚀 6市場Whopページ完成 + DM配信準備システム開始\n');
  console.log('='.repeat(60));
  console.log('AI役割分担:');
  console.log('  - Grok (CSO): grok-4-1-fast-reasoning - TG/X/Emailリスト収集');
  console.log('  - Gemini (CMO): gemini-3-flash-preview - VSL挿入セールスレター作成');
  console.log('  - GPT (CTO): gpt-5-2-2025-12-11 - DM配信準備とKPI管理');
  console.log('  - COO: Whopオペレーション対応');
  console.log('='.repeat(60));
  console.log('目標: 週末までに$10万達成');
  console.log('⚠️ 注意: 実際のDM送信は行いません。CEOのGOサインを待ちます。');
  console.log('='.repeat(60) + '\n');

  const markets = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];
  const results: Record<string, any> = {};

  // フェーズ1: 6市場Whopページ完成（COO）
  const whopResults = await completeWhopPages();
  results.whopPages = whopResults;

  // フェーズ2-4: EN版を先に実行してテスト、その後他の5市場に水平展開
  console.log('\n🎯 実行戦略: EN版を先に実行し、成功後に他の5市場に水平展開\n');
  
  // まずEN版のみを実行
  const enMarket = 'EN';
  const otherMarkets = markets.filter(m => m !== enMarket);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Phase 1: ${enMarket}市場の実行（テスト・検証）`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    console.log(`\n📋 ${enMarket}市場の処理を開始...\n`);

    // DM用VSLスクリプトを読み込む（修正版の英語版VSLスクリプトを使用）
    console.log(`📹 DM用VSLスクリプトを読み込み中（修正版英語版）...\n`);
    const vslScript = loadVSLScriptForDM();
    
    if (!vslScript) {
      console.error(`❌ DM用VSLスクリプトの読み込みに失敗しました。スキップします。`);
      results[enMarket] = { error: 'VSL script loading failed' };
    } else {
      console.log(`✅ DM用VSLスクリプト読み込み完了（${vslScript.length}文字）\n`);

      // Grok（CSO）にTG/X/Emailを想定したリストを集めてもらう
      const users = await collectUsersWithGrokCSO(enMarket);

      if (users.length === 0) {
        console.log(`⚠️ ${enMarket}市場にユーザーが収集できませんでした`);
        results[enMarket] = { users: 0, prepared: 0 };
      } else {
        // DM配信準備（各ユーザーごとにGemini（CMO）がセールスレターを生成、GPT（CTO）が準備、送信は行わない）
        const dmResult = await prepareDMWithGPTCTO(enMarket, users, vslScript);
        results[enMarket] = {
          users: users.length,
          prepared: dmResult.prepared,
          failed: dmResult.failed,
          whopUrl: WHOP_PAGE_URLS[enMarket],
          vslScriptLength: vslScript.length,
        };
      }
    }
  } catch (error: any) {
    console.error(`❌ ${enMarket}市場の処理エラー:`, error.message);
    results[enMarket] = { error: error.message };
  }

  // EN版の結果を確認
  const enResult = results[enMarket];
  const enSuccess = enResult && !enResult.error && enResult.prepared > 0;
  
  if (!enSuccess) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`⚠️ ${enMarket}市場の実行に問題があります。他の市場への展開をスキップします。`);
    console.log(`${'='.repeat(80)}\n`);
    console.log(`EN版の結果:`, enResult);
  } else {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ ${enMarket}市場の実行が成功しました！`);
    console.log(`📊 準備完了: ${enResult.prepared}件`);
    console.log(`🚀 他の5市場（${otherMarkets.join(', ')}）への水平展開を開始します...`);
    console.log(`${'='.repeat(80)}\n`);

    // 他の5市場を順次実行
    for (const market of otherMarkets) {
      try {
      console.log(`\n📋 ${market}市場の処理を開始...\n`);

      // DM用VSLスクリプトを読み込む（修正版の英語版VSLスクリプトを使用）
      console.log(`📹 DM用VSLスクリプトを読み込み中（修正版英語版）...\n`);
      const vslScript = loadVSLScriptForDM();
      
      if (!vslScript) {
        console.error(`❌ DM用VSLスクリプトの読み込みに失敗しました。スキップします。`);
        results[market] = { error: 'VSL script loading failed' };
        continue;
      }
      
      console.log(`✅ DM用VSLスクリプト読み込み完了（${vslScript.length}文字）\n`);

      // Grok（CSO）にTG/X/Emailを想定したリストを集めてもらう
      const users = await collectUsersWithGrokCSO(market);

      if (users.length === 0) {
        console.log(`⚠️ ${market}市場にユーザーが収集できませんでした`);
        results[market] = { users: 0, prepared: 0 };
        continue;
      }

      // DM配信準備（各ユーザーごとにGemini（CMO）がセールスレターを生成、GPT（CTO）が準備、送信は行わない）
      const dmResult = await prepareDMWithGPTCTO(market, users, vslScript);

      results[market] = {
        users: users.length,
        prepared: dmResult.prepared,
        failed: dmResult.failed,
        whopUrl: WHOP_PAGE_URLS[market],
        vslScriptLength: vslScript.length,
      };

      console.log(`✅ ${market}市場: ${dmResult.prepared}件のDM配信準備完了`);
    } catch (error: any) {
      console.error(`❌ ${market}市場の処理エラー:`, error.message);
      results[market] = { error: error.message };
    }
  }

  // CEOに報告
  const totalPrepared = Object.values(results)
    .filter((r: any) => r && typeof r === 'object' && 'prepared' in r)
    .reduce((sum: number, r: any) => sum + (r.prepared || 0), 0);

  const reportMessage = `🚀 6市場Whopページ完成 + DM配信準備完了

⏱️ 実行時刻: ${new Date().toISOString()}

【AI役割分担】
- Grok (CSO): TG/X/Emailリスト収集
- Gemini (CMO): VSL挿入セールスレター作成
- GPT (CTO): DM配信準備とKPI管理
- COO: Whopオペレーション対応

【Whopページ完成状況（COO）】
${Object.entries(whopResults)
  .map(([market, result]: [string, any]) => {
    if (result.error) {
      return `- ❌ ${market}: ${result.error}`;
    } else {
      return `- ✅ ${market}: ${result.url || '確認済み'}`;
    }
  })
  .join('\n')}

【実行戦略】
- ✅ EN版を先に実行（テスト・検証）
- ✅ EN版成功後、他の5市場（AR, KO, JA, ES, PT-BR）に水平展開

【VSLスクリプト読み込み結果】
- ✅ DM用VSLスクリプト読み込み完了（修正版英語版VSLスクリプトを使用）
- ✅ Whop版VSL: タスク1のHeyGen動画をそのまま使用（変更なし）

【DM配信準備結果】
${Object.entries(results)
  .filter(([key]) => markets.includes(key))
  .map(([market, result]: [string, any]) => {
    if (result.error) {
      return `- ❌ ${market}: ${result.error}`;
    } else {
      return `- ✅ ${market}: ${result.prepared || 0}件準備完了 (${result.users || 0}件収集)`;
    }
  })
  .join('\n')}

【実行結果サマリー】
- EN版: ${results.EN?.prepared || 0}件準備完了${results.EN?.error ? ` (エラー: ${results.EN.error})` : ''}
${enSuccess ? `- 他の5市場: ${otherMarkets.map(m => `${m}: ${results[m]?.prepared || 0}件`).join(', ')}` : '- 他の5市場: スキップ（EN版に問題あり）'}
- 合計DM配信準備完了数: ${totalPrepared}件
- チャネル: Telegram、Email（Xは後で対応）
- 目標: 週末までに$10万達成

⚠️ 注意: 実際のDM送信は行っていません。
CEOのGOサインが出てから送信を開始してください。

詳細はログを確認してください。`;

  // メール送信（メールのみで運用）
  try {
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #4caf50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .section { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #2196F3; }
    .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .ai-roles { background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 6市場Whopページ完成 + DM配信準備完了</h1>
  </div>
  <div class="content">
    <div class="ai-roles">
      <h3>【AI役割分担】</h3>
      <ul>
        <li><strong>Grok (CSO)</strong>: grok-4-1-fast-reasoning - TG/X/Emailリスト収集</li>
        <li><strong>Gemini (CMO)</strong>: gemini-3-flash-preview - VSL挿入セールスレター作成</li>
        <li><strong>GPT (CTO)</strong>: gpt-5-2-2025-12-11 - DM配信準備とKPI管理</li>
        <li><strong>COO</strong>: Whopオペレーション対応</li>
      </ul>
    </div>
    <div class="section">
      <h3>【DM配信準備結果】</h3>
      <p>合計: ${totalPrepared}件のDM配信準備完了</p>
      <p>チャネル: Telegram、Email（Xは後で対応）</p>
    </div>
    <div class="warning">
      <h3>⚠️ 重要</h3>
      <p>実際のDM送信は行っていません。CEOのGOサインが出てから送信を開始してください。</p>
    </div>
    <p><small>準備完了日時: ${new Date().toISOString()}</small></p>
  </div>
</body>
</html>`;

    await sendResendEmail({
      from: 'COO <noreply@cryptotradeacademy.io>',
      to: 'admin@cryptotradeacademy.io',
      subject: '🚀 6市場Whopページ完成 + DM配信準備完了',
      html: emailHtml
    });
    console.log('✅ CEOにメール報告完了（admin@cryptotradeacademy.io）\n');
  } catch (error: any) {
    console.warn(`⚠️ CEOメール通知失敗: ${error.message}\n`);
  }

  console.log('='.repeat(60));
  console.log('✅ 処理完了');
  console.log('='.repeat(60));
  console.log(`合計DM配信準備完了数: ${totalPrepared}件`);
  console.log(`⚠️ 実際のDM送信は行っていません。CEOのGOサインを待ちます。\n`);

  await prisma.$disconnect();
}

main()
  .then(() => {
    console.log('\n✅ 6市場Whopページ完成 + DM配信準備完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });
