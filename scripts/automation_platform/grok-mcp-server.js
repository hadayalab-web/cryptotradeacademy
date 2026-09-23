#!/usr/bin/env node

/**
 * Grok API MCP Server
 * 
 * xAI Grok APIを使用したMCPサーバー実装
 * 
 * 対応モデル:
 * - grok-2-1212: 高速推論、大規模コンテキスト（2Mトークン）
 * 
 * 特徴:
 * - api/unified-api.tsのcallGrok41FastReasoningを使用
 * - 大規模コンテキストウィンドウ（2Mトークン）対応
 * - 高速推論に最適
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

// api/unified-api.tsからcallGrok41FastReasoningをインポート
let callGrok41FastReasoning;
try {
  const unifiedApi = await import('../api/unified-api.js');
  callGrok41FastReasoning = unifiedApi.callGrok41FastReasoning;
} catch (error) {
  console.error('❌ Failed to import callGrok41FastReasoning from api/unified-api.ts:', error.message);
  process.exit(1);
}

const server = new Server(
  {
    name: 'grok-mcp',
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
        name: 'grok_reasoning',
        description: 'Grok 2-1212 Fast Reasoningを使用して高速推論を実行します。大規模コンテキスト（2Mトークン）に対応し、複数ファイルにまたがるエラーの分析、大規模コードベースの分析に最適です。CFO/CRO/CSOとしての財務分析、リスク評価、戦略的意思決定に使用できます。',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: '分析したい内容や質問。大規模コードベースの分析、複数ファイルにまたがるエラーの分析、財務分析など。'
            },
            temperature: {
              type: 'number',
              description: '温度パラメータ（0.0-2.0、デフォルト: 0.3）。低い値はより決定論的、高い値はより創造的。',
              minimum: 0,
              maximum: 2,
              default: 0.3
            },
            maxTokens: {
              type: 'number',
              description: '最大出力トークン数（デフォルト: 4096）。大規模コンテキストに対応。',
              default: 4096
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'grok_chat',
        description: 'Grok 2-1212を使用した一般的なチャット。質問応答、会話、情報取得など。高速推論に最適。',
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
            maxTokens: {
              type: 'number',
              description: '最大出力トークン数（デフォルト: 2048）',
              default: 2048
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
      case 'grok_reasoning': {
        const { 
          prompt,
          temperature = 0.3,
          maxTokens = 4096
        } = args;

        if (!prompt) {
          throw new Error('prompt is required');
        }

        // api/unified-api.tsのcallGrok41FastReasoningを使用
        const result = await callGrok41FastReasoning(prompt, {
          temperature,
          maxTokens
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

      case 'grok_chat': {
        const { 
          prompt,
          temperature = 0.7,
          maxTokens = 2048
        } = args;

        if (!prompt) {
          throw new Error('prompt is required');
        }

        // api/unified-api.tsのcallGrok41FastReasoningを使用
        const result = await callGrok41FastReasoning(prompt, {
          temperature,
          maxTokens
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
  console.log('✅ Grok MCP Server started');
}

main().catch((error) => {
  console.error('❌ Server startup error:', error.message);
  process.exit(1);
});
