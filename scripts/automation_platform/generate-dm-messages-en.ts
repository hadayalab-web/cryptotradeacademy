#!/usr/bin/env tsx
/**
 * Gemini CMOがDMメッセージを作成するスクリプト（EN版）
 * 
 * 目的: CSVファイルからユーザーリストを読み込み、Gemini CMOが各ユーザー向けに
 *       パーソナライズされたDMメッセージを作成し、data/dm-messages-en.jsonに保存
 * 
 * 処理内容:
 * 1. data/user-list-en.csvを読み込む
 * 2. Gemini CMOが各ユーザー向けにDMメッセージを生成（バッチ処理）
 * 3. data/dm-messages-en.jsonに保存
 * 4. 結果をレポート
 * 
 * 注意: 実際の送信は行いません。DMメッセージの作成のみを行います。
 */

import { callGemini3Pro } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const CSV_FILE_PATH = join(__dirname, '..', 'data', 'user-list-en.csv');
const DM_MESSAGES_FILE_PATH = join(__dirname, '..', 'data', 'dm-messages-en.json');
const MARKET = 'EN';
const WHOP_URL = 'https://whop.com/aio-media-llc/trap-defence-btc-en/';

// VSLリンク: YouTube優先、なければHeyGen
const YOUTUBE_VSL_URL = process.env.YOUTUBE_VSL_URL; // YouTubeリンク（例: https://www.youtube.com/watch?v=VIDEO_ID）
const HEYGEN_VSL_EMBED_URL = 'https://app.heygen.com/embedded-player/3aaf47b98f4b49c59c14999a16038af3'; // Email用（iframe）
const HEYGEN_VSL_SHARE_URL = process.env.HEYGEN_VSL_SHARE_URL || 'https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3'; // Telegram用（動画の直接URL）

// YouTubeリンクから埋め込みURLを生成する関数
function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  // https://www.youtube.com/watch?v=VIDEO_ID または https://youtu.be/VIDEO_ID からVIDEO_IDを抽出
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
}

// 使用するVSL URLを決定
const VSL_EMBED_URL = YOUTUBE_VSL_URL ? getYouTubeEmbedUrl(YOUTUBE_VSL_URL) : HEYGEN_VSL_EMBED_URL;
const VSL_SHARE_URL = YOUTUBE_VSL_URL || HEYGEN_VSL_SHARE_URL;
const VSL_TYPE = YOUTUBE_VSL_URL ? 'YouTube' : 'HeyGen';

interface UserRow {
  username: string;
  display_name?: string;
  market: string;
  telegram_user_id?: string;
  email?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface DMMessage {
  username: string;
  message_id: string;
  created_at: string;
  created_by: string;
  preferred_channel: string;
  dm_message: string;
}

interface DMMessagesFile {
  messages: DMMessage[];
}

/**
 * CSVファイルを読み込む
 */
function readCSV(): UserRow[] {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    throw new Error(`CSVファイルが見つかりません: ${CSV_FILE_PATH}`);
  }

  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  if (!content.trim()) {
    return [];
  }

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as UserRow[];

  return records.filter(row => row.market === MARKET && row.status === 'New');
}

/**
 * DMメッセージファイルを読み込む
 */
function readDMMessages(): DMMessagesFile {
  if (!fs.existsSync(DM_MESSAGES_FILE_PATH)) {
    return { messages: [] };
  }

  const content = fs.readFileSync(DM_MESSAGES_FILE_PATH, 'utf-8');
  try {
    return JSON.parse(content) as DMMessagesFile;
  } catch (e) {
    return { messages: [] };
  }
}

/**
 * DMメッセージファイルに保存
 */
function saveDMMessages(messages: DMMessage[]) {
  const existing = readDMMessages();
  const allMessages = [...existing.messages, ...messages];
  
  // usernameで重複を除去（最新のものを残す）
  const uniqueMessages = new Map<string, DMMessage>();
  for (const msg of allMessages) {
    uniqueMessages.set(msg.username, msg);
  }

  const fileData: DMMessagesFile = {
    messages: Array.from(uniqueMessages.values()),
  };

  fs.writeFileSync(DM_MESSAGES_FILE_PATH, JSON.stringify(fileData, null, 2), 'utf-8');
}

/**
 * Gemini CMOがバッチ処理でDMメッセージを生成
 */
async function generateDMMessagesBatch(users: UserRow[], batchSize: number = 20): Promise<DMMessage[]> {
  console.log(`📢 Gemini（CMO）が${users.length}件のユーザー向けDMメッセージをバッチ生成中...`);
  console.log(`💰 コスト最適化: バッチ処理（${batchSize}件/バッチ）\n`);

  const results: DMMessage[] = [];
  
  // バッチに分割
  const batches: UserRow[][] = [];
  for (let i = 0; i < users.length; i += batchSize) {
    batches.push(users.slice(i, i + batchSize));
  }
  
  console.log(`📦 バッチ数: ${batches.length}（${batchSize}件/バッチ）\n`);

  // 各バッチを処理
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`📦 バッチ ${batchIndex + 1}/${batches.length} を処理中... (${batch.length}件)`);
    
    try {
      const prompt = `【バッチDMメッセージ生成 - CMO（Gemini）】

市場: ${MARKET}
プロダクト: Trap Defence BTC
WhopページURL: ${WHOP_URL}

## VSL埋め込み

以下の${VSL_TYPE} VSLをDMメッセージに埋め込んでください：

**VSL共有リンク**: ${VSL_SHARE_URL}

**Email用埋め込みコード**:
<iframe width="560" height="315" src="${VSL_EMBED_URL}" title="${VSL_TYPE} ビデオプレーヤー" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

**注意**: 
- このVSLは、Whopページの動画と整合性を保つように設計されています。DMからWhopページに遷移したユーザーが「あ、これのことか！」というアハ体験を得られるように構成されています。
- **Telegram用には、必ずVSL共有リンク（${VSL_SHARE_URL}）をテキストリンクとして明示的に含めてください**。iframeタグはTelegramでは表示されないため、テキストリンクが必要です。

## ユーザー情報（${batch.length}件）

以下の${batch.length}人のユーザー向けに、それぞれパーソナライズされたDMメッセージを生成してください。

${batch.map((user, idx) => `
### ユーザー${idx + 1}
- ユーザー名: ${user.username}
- 表示名: ${user.display_name || 'N/A'}
- 優先チャネル: ${user.telegram_user_id ? 'TG' : user.email ? 'Email' : 'TG'}
`).join('\n')}

## 要件

各ユーザー向けに、以下の要素を含むパーソナライズされたDMメッセージを生成してください：

1. **パーソナライズされた挨拶**: ユーザーの表示名を使用
2. **問題提起**: 暗号通貨トレーダーが直面するトラップ（損失）の問題
3. **VSL埋め込み**: 
   - Email用: 上記の${VSL_TYPE} VSL iframeを埋め込む
   - Telegram用: 共有リンクURL（${VSL_SHARE_URL}）をテキストリンクとして使用（iframeタグは含めない）
4. **解決策**: Trap Defence BTCの紹介
5. **ベネフィット**: 3-5つの主要ベネフィット
6. **CTA**: Whopページへのリンク（${WHOP_URL}）

**重要**:
- メッセージは200-400文字程度の簡潔で効果的なものにしてください
- **Email用**: VSL iframeは必ず含めてください
- **Telegram用**: VSL共有リンク（${VSL_SHARE_URL}）をテキストリンクとして**必ず明示的に含めてください**。iframeタグの後に、または「Watch this brief VSL」の後に、直接リンクを追加してください
- ユーザーの表示名を自然に使用してください
- 英語で記述してください
- **Telegram用メッセージの例**: "Watch this brief VSL to see how we change the game: ${VSL_SHARE_URL}"

## 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "messages": [
    {
      "username": "username1",
      "dm_message": "パーソナライズされたDMメッセージ（VSL iframeを含む）"
    },
    {
      "username": "username2",
      "dm_message": "パーソナライズされたDMメッセージ（VSL iframeを含む）"
    }
  ]
}
\`\`\`

各ユーザーに対して、usernameとdm_messageを含むJSONオブジェクトを生成してください。`;

      const result = await callGemini3Pro(prompt, {
        thinkingLevel: 'low', // コスト削減
        temperature: 0.8,
        maxOutputTokens: 4096,
      });

      // JSONを抽出
      const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/) || result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        const data = JSON.parse(jsonText);
        
        const messages = data.messages || [];
        console.log(`✅ バッチ ${batchIndex + 1}: ${messages.length}件のDMメッセージを生成\n`);

        // DMMessage形式に変換
        for (const msg of messages) {
          const user = batch.find(u => u.username === msg.username);
          if (user && msg.dm_message) {
            const preferredChannel = user.telegram_user_id ? 'TG' : user.email ? 'Email' : 'TG';
            
            results.push({
              username: msg.username,
              message_id: `msg_${Date.now()}_${msg.username}`,
              created_at: new Date().toISOString(),
              created_by: 'Gemini CMO',
              preferred_channel: preferredChannel,
              dm_message: msg.dm_message,
            });
          }
        }
      } else {
        console.warn(`⚠️ バッチ ${batchIndex + 1}: GeminiのレスポンスからJSONを抽出できませんでした`);
        console.log('📝 Geminiのレスポンス:');
        console.log(result.text.substring(0, 500));
        
        // JSON抽出に失敗した場合、個別に生成を試みる
        console.log(`\n🔄 バッチ ${batchIndex + 1}: 個別生成にフォールバック...`);
        for (const user of batch) {
          try {
            const singlePrompt = `【個別DMメッセージ生成 - CMO（Gemini）】

市場: ${MARKET}
プロダクト: Trap Defence BTC
WhopページURL: ${WHOP_URL}

## VSL情報
- VSL共有リンク: ${VSL_SHARE_URL}
- Email用埋め込み: <iframe width="560" height="315" src="${VSL_EMBED_URL}" title="${VSL_TYPE} ビデオプレーヤー" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## ユーザー情報
- ユーザー名: ${user.username}
- 表示名: ${user.display_name || 'N/A'}
- 優先チャネル: ${user.telegram_user_id ? 'TG' : user.email ? 'Email' : 'TG'}

## 要件
以下の要素を含むパーソナライズされたDMメッセージを生成してください：

1. パーソナライズされた挨拶（表示名を使用）
2. 問題提起（暗号通貨トレーダーのトラップ問題）
3. VSL埋め込み:
   - Email用: iframeを埋め込む
   - Telegram用: VSL共有リンク（${VSL_SHARE_URL}）をテキストリンクとして明示的に含める（例: "Watch this brief VSL: ${VSL_SHARE_URL}"）
4. 解決策（Trap Defence BTCの紹介）
5. ベネフィット（3-5つ）
6. CTA（Whopページ: ${WHOP_URL}）

**重要**: 
- 200-400文字程度
- Telegram用には必ずVSLリンク（${VSL_SHARE_URL}）をテキストリンクとして含める
- 英語で記述

以下のJSON形式で出力:
\`\`\`json
{
  "username": "${user.username}",
  "dm_message": "メッセージ内容"
}
\`\`\``;

            const singleResult = await callGemini3Pro(singlePrompt, {
              thinkingLevel: 'low',
              temperature: 0.8,
              maxOutputTokens: 2048,
            });

            const singleJsonMatch = singleResult.text.match(/```json\s*([\s\S]*?)\s*```/) || singleResult.text.match(/\{[\s\S]*\}/);
            if (singleJsonMatch) {
              const singleJsonText = singleJsonMatch[1] || singleJsonMatch[0];
              const singleData = JSON.parse(singleJsonText);
              
              if (singleData.username === user.username && singleData.dm_message) {
                const preferredChannel = user.telegram_user_id ? 'TG' : user.email ? 'Email' : 'TG';
                results.push({
                  username: singleData.username,
                  message_id: `msg_${Date.now()}_${singleData.username}`,
                  created_at: new Date().toISOString(),
                  created_by: 'Gemini CMO',
                  preferred_channel: preferredChannel,
                  dm_message: singleData.dm_message,
                });
                console.log(`  ✅ ${user.username}: 個別生成成功`);
              }
            }
          } catch (singleError: any) {
            console.error(`  ❌ ${user.username}: 個別生成失敗 - ${singleError.message}`);
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ バッチ ${batchIndex + 1}の処理エラー:`, error.message);
      if (error.stack) {
        console.error('スタックトレース:', error.stack.substring(0, 500));
      }
      
      // エラー時も個別生成を試みる
      console.log(`\n🔄 バッチ ${batchIndex + 1}: エラー後の個別生成を試みます...`);
      for (const user of batch) {
        try {
          const singlePrompt = `【個別DMメッセージ生成 - CMO（Gemini）】

市場: ${MARKET}
プロダクト: Trap Defence BTC
WhopページURL: ${WHOP_URL}
VSL共有リンク: ${VSL_SHARE_URL}

ユーザー: ${user.username} (${user.display_name || 'N/A'})

200-400文字のパーソナライズされたDMメッセージを生成してください。
Telegram用には必ずVSLリンク（${VSL_SHARE_URL}）をテキストリンクとして含めてください。

\`\`\`json
{
  "username": "${user.username}",
  "dm_message": "メッセージ"
}
\`\`\``;

          const singleResult = await callGemini3Pro(singlePrompt, {
            thinkingLevel: 'low',
            temperature: 0.8,
            maxOutputTokens: 2048,
          });

          const singleJsonMatch = singleResult.text.match(/```json\s*([\s\S]*?)\s*```/) || singleResult.text.match(/\{[\s\S]*\}/);
          if (singleJsonMatch) {
            const singleJsonText = singleJsonMatch[1] || singleJsonMatch[0];
            const singleData = JSON.parse(singleJsonText);
            
            if (singleData.username === user.username && singleData.dm_message) {
              const preferredChannel = user.telegram_user_id ? 'TG' : user.email ? 'Email' : 'TG';
              results.push({
                username: singleData.username,
                message_id: `msg_${Date.now()}_${singleData.username}`,
                created_at: new Date().toISOString(),
                created_by: 'Gemini CMO',
                preferred_channel: preferredChannel,
                dm_message: singleData.dm_message,
              });
            }
          }
        } catch (singleError: any) {
          // 個別生成も失敗した場合はスキップ
        }
      }
    }
  }

  return results;
}

async function main() {
  console.log('🚀 Gemini CMO DMメッセージ生成スクリプト開始（EN版）\n');
  console.log('='.repeat(80));
  console.log('📋 処理内容:');
  console.log('  1. CSVファイルからユーザーリストを読み込み');
  console.log('  2. Gemini CMOが各ユーザー向けにDMメッセージを生成（バッチ処理）');
  console.log('  3. data/dm-messages-en.jsonに保存');
  console.log('  4. 結果をレポート');
  console.log('='.repeat(80) + '\n');

  // 環境変数チェック
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY環境変数が設定されていません');
  }

  // CSVファイルを読み込む
  const users = readCSV();
  console.log(`📊 対象ユーザー数: ${users.length}件\n`);

  if (users.length === 0) {
    console.log('⚠️ 対象ユーザーが見つかりません。');
    console.log('   CSVファイルにデータを追加してください。\n');
    return;
  }

  // 既存のDMメッセージを確認
  const existing = readDMMessages();
  const existingUsernames = new Set(existing.messages.map(msg => msg.username));
  const newUsers = users.filter(user => !existingUsernames.has(user.username));
  
  console.log(`📊 既存のDMメッセージ: ${existing.messages.length}件`);
  console.log(`📊 新規ユーザー: ${newUsers.length}件\n`);

  if (newUsers.length === 0) {
    console.log('✅ すべてのユーザーに対してDMメッセージが既に作成されています。\n');
    return;
  }

  // Gemini CMOがDMメッセージを生成（バッチサイズを10に削減してJSONエラーを回避）
  const dmMessages = await generateDMMessagesBatch(newUsers, 10);

  if (dmMessages.length === 0) {
    console.log('⚠️ DMメッセージが生成できませんでした。');
    console.log('   プロンプトやAPIキーを確認してください。\n');
    return;
  }

  // JSONファイルに保存
  saveDMMessages(dmMessages);
  console.log(`✅ ${dmMessages.length}件のDMメッセージをdata/dm-messages-en.jsonに保存しました\n`);

  // 結果レポート
  console.log('='.repeat(80));
  console.log('📊 結果サマリー');
  console.log('='.repeat(80));
  console.log(`- 対象ユーザー数: ${users.length}件`);
  console.log(`- 既存DMメッセージ: ${existing.messages.length}件`);
  console.log(`- 新規生成: ${dmMessages.length}件`);
  console.log(`- 総DMメッセージ数: ${existing.messages.length + dmMessages.length}件`);
  console.log('='.repeat(80) + '\n');

  // 生成されたDMメッセージのサンプル表示
  if (dmMessages.length > 0) {
    console.log('📋 生成されたDMメッセージ（サンプル）:\n');
    dmMessages.slice(0, 2).forEach((msg, index) => {
      console.log(`${index + 1}. ${msg.username} (${msg.preferred_channel})`);
      console.log(`   メッセージ長: ${msg.dm_message.length}文字`);
      console.log(`   プレビュー: ${msg.dm_message.substring(0, 150)}...\n`);
    });
  }
}

main()
  .then(() => {
    console.log('='.repeat(80));
    console.log('✅ Gemini CMO DMメッセージ生成スクリプト完了（EN版）');
    console.log('='.repeat(80) + '\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });
