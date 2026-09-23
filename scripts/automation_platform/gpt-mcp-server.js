#!/usr/bin/env node

/**
 * GPT API MCP Server
 * 
 * OpenAI公式ドキュメントに基づいたMCPサーバー実装
 * https://platform.openai.com/docs/mcp
 * 
 * 対応モデル:
 * - gpt-5.2-2025-12-11: 高精度分析・深い理解・戦略的思考（優先）
 * - gpt-4o: フォールバック
 * - gpt-4-turbo: フォールバック
 * 
 * 特徴:
 * - OpenAI公式ドキュメント準拠
 * - api/unified-api.tsのcallGPT52を使用
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

// api/unified-api.tsからcallGPT52をインポート
let callGPT52;
try {
  const unifiedApi = await import('../api/unified-api.js');
  callGPT52 = unifiedApi.callGPT52;
} catch (error) {
  console.error('❌ Failed to import callGPT52 from api/unified-api.ts:', error.message);
  process.exit(1);
}

const server = new Server(
  {
    name: 'gpt-mcp',
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
        name: 'gpt_analyze',
        description: 'GPT-5.2-2025-12-11（または最新のGPT-4モデル）を使用して高精度分析を実行します。深い理解・戦略的思考・論理的推論に最適です。CTOとしての技術的意思決定やコードレビューに使用できます。',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: '分析したい内容や質問。ビルドエラーの解決策、コードレビュー、技術的意思決定など。'
            },
            temperature: {
              type: 'number',
              description: '温度パラメータ（0.0-2.0、デフォルト: 0.3）。低い値はより決定論的、高い値はより創造的。',
              minimum: 0,
              maximum: 2,
              default: 0.3
            },
            maxCompletionTokens: {
              type: 'number',
              description: '最大出力トークン数（デフォルト: 4000）。GPT-5.2ではmax_completion_tokensを使用。',
              default: 4000
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'gpt_chat',
        description: 'GPT-5.2-2025-12-11を使用した一般的なチャット。質問応答、会話、情報取得など。',
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
            maxCompletionTokens: {
              type: 'number',
              description: '最大出力トークン数（デフォルト: 2000）',
              default: 2000
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
      case 'gpt_analyze': {
        const { 
          prompt,
          temperature = 0.3,
          maxCompletionTokens = 4000
        } = args;

        if (!prompt) {
          throw new Error('prompt is required');
        }

        // api/unified-api.tsのcallGPT52を使用
        const result = await callGPT52(prompt, {
          temperature,
          maxCompletionTokens
        });
        
        return {
          content: [
            {
              type: 'text',
              text: result.text || ''
            }
          ],
          usage: result.usage ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens
          } : undefined
        };
      }

      case 'gpt_chat': {
        const { 
          prompt,
          temperature = 0.7,
          maxCompletionTokens = 2000
        } = args;

        if (!prompt) {
          throw new Error('prompt is required');
        }

        // api/unified-api.tsのcallGPT52を使用
        const result = await callGPT52(prompt, {
          temperature,
          maxCompletionTokens
        });
        
        return {
          content: [
            {
              type: 'text',
              text: result.text || ''
            }
          ],
          usage: result.usage ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens
          } : undefined
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
  console.log('✅ GPT MCP Server started');
}

main().catch((error) => {
  console.error('❌ Server startup error:', error.message);
  process.exit(1);
});
