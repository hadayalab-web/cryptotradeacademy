#!/usr/bin/env node

/**
 * Gemini API MCP Server
 * 
 * Google Gemini APIを使用したMCPサーバー実装
 * 
 * 対応モデル:
 * - gemini-3-flash-preview: DeepResearch相当、マルチモーダル対応
 * 
 * 特徴:
 * - api/unified-api.tsのcallGemini3Proを使用
 * - thinkingLevel（low/high）サポート
 * - エラーハンドリングとリトライロジック
 * - セキュリティベストプラクティス
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数の読み込み
const envPaths = [
  join(__dirname, '..', 'api', '.env'),
  join(__dirname, '..', '.env'),
  'C:/Users/chiba/hadayalab-automation-platform/api/.env',
  'C:/Users/chiba/hadayalab-automation-platform/.env'
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    const result = config({ path: envPath });
    if (result.parsed && Object.keys(result.parsed).length > 0) {
      envLoaded = true;
      break;
    }
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env file found. Environment variables should be set in mcp.json or .env file.');
}

// api/unified-api.tsから関数をインポート
let callGemini3Pro, callNanoBananaPro, callVeo31;
try {
  const unifiedApi = await import('../api/unified-api.js');
  callGemini3Pro = unifiedApi.callGemini3Pro;
  callNanoBananaPro = unifiedApi.callNanoBananaPro;
  callVeo31 = unifiedApi.callVeo31;
} catch (error) {
  console.error('❌ Failed to import functions from api/unified-api.ts:', error.message);
  process.exit(1);
}

const server = new Server(
  {
    name: 'gemini-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツールの登録
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'gemini_research',
        description: 'Gemini 3 Flash Previewを使用してDeepResearch相当の高精度分析を実行します。マルチモーダル対応、複雑な問題の深い理解、視覚的な情報の分析に最適です。CMOやCKOとしてのマーケティング戦略、コンテンツ生成、データ分析に使用できます。',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: '分析したい内容や質問。マーケティング戦略、コンテンツ生成、データ分析など。'
            },
            thinkingLevel: {
              type: 'string',
              enum: ['low', 'high'],
              description: '思考レベル（low: 高速、high: DeepResearch相当の深い分析、デフォルト: high）',
              default: 'high'
            },
            temperature: {
              type: 'number',
              description: '温度パラメータ（0.0-2.0、デフォルト: 0.7）。低い値はより決定論的、高い値はより創造的。',
              minimum: 0,
              maximum: 2,
              default: 0.7
            },
            maxOutputTokens: {
              type: 'number',
              description: '最大出力トークン数（デフォルト: 8192）',
              default: 8192
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'gemini_chat',
        description: 'Gemini 3 Flash Previewを使用した一般的なチャット。質問応答、会話、情報取得など。マルチモーダル対応。',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'ユーザーの質問やメッセージ'
            },
            temperature: {
              type: 'number',
              description: '温度パラメータ（0.0-2.0、デフォルト: 0.7）',
              minimum: 0,
              maximum: 2,
              default: 0.7
            },
            maxOutputTokens: {
              type: 'number',
              description: '最大出力トークン数（デフォルト: 4096）',
              default: 4096
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'nanobanana_generate',
        description: 'NanoBanana Pro（Gemini 3 Pro Image Preview）を使用してハイエンド画像を生成します。LP用の高品質な画像生成に最適です。',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: '画像生成用のプロンプト。詳細な説明を推奨。'
            },
            aspectRatio: {
              type: 'string',
              enum: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
              description: 'アスペクト比（デフォルト: 16:9）。LP用に16:9を推奨。',
              default: '16:9'
            },
            imageSize: {
              type: 'string',
              enum: ['1K', '2K', '4K'],
              description: '画像サイズ（デフォルト: 2K）。ハイエンド推論向けに2Kを推奨。',
              default: '2K'
            },
            savePath: {
              type: 'string',
              description: '画像保存パス（オプション）。指定しない場合はBase64データURLのみ返却。'
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'veo_generate',
        description: 'Veo 3.1を使用して高品質な動画を生成します。ループ動画、VSL用動画の生成に最適です。非同期処理のため、完了まで時間がかかる場合があります。',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: '動画生成用のプロンプト。詳細な説明を推奨。'
            },
            referenceImages: {
              type: 'array',
              items: { type: 'string' },
              description: '参照画像のURL配列（最大3つ、オプション）'
            },
            startFrame: {
              type: 'string',
              description: '開始フレームのBase64データURL（オプション）'
            },
            endFrame: {
              type: 'string',
              description: '終了フレームのBase64データURL（オプション）'
            },
            pollInterval: {
              type: 'number',
              description: 'ポーリング間隔（秒、デフォルト: 10）',
              default: 10
            },
            maxPollAttempts: {
              type: 'number',
              description: '最大ポーリング試行回数（デフォルト: 60）',
              default: 60
            },
            savePath: {
              type: 'string',
              description: '動画保存パス（オプション）。指定しない場合はURIのみ返却。'
            }
          },
          required: ['prompt']
        }
      }
    ]
  };
});

// ツール実行のハンドラー
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'gemini_research': {
        const { 
          prompt,
          thinkingLevel = 'high',
          temperature = 0.7,
          maxOutputTokens = 8192
        } = args;

        if (!prompt) {
          throw new Error('prompt is required');
        }

        // api/unified-api.tsのcallGemini3Proを使用
        const result = await callGemini3Pro(prompt, {
          thinkingLevel,
          temperature,
          maxOutputTokens
        });
        
        return {
          content: [
            {
              type: 'text',
              text: result.text || ''
            }
          ],
          usage: result.usage ? {
            promptTokens: result.usage.promptTokenCount || 0,
            completionTokens: result.usage.candidatesTokenCount || 0,
            totalTokens: result.usage.totalTokenCount || 0
          } : undefined
        };
      }

      case 'gemini_chat': {
        const { 
          prompt,
          temperature = 0.7,
          maxOutputTokens = 4096
        } = args;

        if (!prompt) {
          throw new Error('prompt is required');
        }

        // api/unified-api.tsのcallGemini3Proを使用（thinkingLevelはlow）
        const result = await callGemini3Pro(prompt, {
          thinkingLevel: 'low',
          temperature,
          maxOutputTokens
        });
        
        return {
          content: [
            {
              type: 'text',
              text: result.text || ''
            }
          ],
          usage: result.usage ? {
            promptTokens: result.usage.promptTokenCount || 0,
            completionTokens: result.usage.candidatesTokenCount || 0,
            totalTokens: result.usage.totalTokenCount || 0
          } : undefined
        };
      }

      case 'nanobanana_generate': {
        const {
          prompt,
          aspectRatio = '16:9',
          imageSize = '2K',
          savePath
        } = args;

        if (!prompt) {
          throw new Error('prompt is required');
        }

        // api/unified-api.tsのcallNanoBananaProを使用
        const result = await callNanoBananaPro(prompt, {
          aspectRatio,
          imageSize,
          savePath
        });

        // 画像情報をテキスト形式で返す
        const imageInfo = result.images.map((img, idx) => {
          return `画像 ${idx + 1}:
- MIME Type: ${img.mimeType}
- アスペクト比: ${result.aspectRatio}
- 画像サイズ: ${result.imageSize}
- ファイルパス: ${img.filePath || '未保存'}
- データURL: ${img.dataUrl.substring(0, 100)}... (Base64データ)`;
        }).join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `✅ NanoBanana Pro画像生成完了\n\n${imageInfo}\n\nモデル: ${result.model}`
            }
          ]
        };
      }

      case 'veo_generate': {
        const {
          prompt,
          referenceImages,
          startFrame,
          endFrame,
          pollInterval = 10,
          maxPollAttempts = 60,
          savePath
        } = args;

        if (!prompt) {
          throw new Error('prompt is required');
        }

        // api/unified-api.tsのcallVeo31を使用
        const result = await callVeo31(prompt, {
          referenceImages,
          startFrame,
          endFrame,
          pollInterval,
          maxPollAttempts,
          savePath
        });

        // 動画情報をテキスト形式で返す
        const videoInfo = result.videos.map((video, idx) => {
          return `動画 ${idx + 1}:
- URI: ${video.uri || 'N/A'}
- Name: ${video.name || 'N/A'}
- ファイルパス: ${video.filePath || '未保存'}`;
        }).join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `✅ Veo 3.1動画生成完了\n\n${videoInfo}\n\nモデル: ${result.model}`
            }
          ]
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`❌ Tool execution error [${name}]:`, error.message);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: error.message,
            tool: name
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('✅ Gemini MCP Server started');
}

main().catch((error) => {
  console.error('❌ Server startup error:', error.message);
  process.exit(1);
});
