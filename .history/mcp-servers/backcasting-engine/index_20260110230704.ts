#!/usr/bin/env node
/**
 * MCP Server: 逆算思考エンジン（Backcasting Engine）
 * 
 * Cursor IDEから直接利用できるMCPサーバー
 * 
 * 改善内容（GPT/Grokレビューに基づく）:
 * - Tool Registry導入（二重管理排除）
 * - 型安全性向上（Zod検証）
 * - 安全なエラーフォーマット（stack非公開）
 * - 遅延ロード（起動時間短縮）
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tools, AppError, ValidationError } from './tools.js';

const server = new Server(
  {
    name: 'backcasting-engine',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツールリストの定義（Tool Registryから自動生成）
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(({ handler, ...meta }) => meta),
}));

// エラーフォーマット（安全なメッセージのみ返却）
function formatToolError(err: unknown): { text: string; isError: boolean } {
  const isDebug = process.env.MCP_DEBUG === '1';
  
  if (err instanceof ValidationError) {
    return {
      text: JSON.stringify({
        error: {
          code: err.code,
          message: err.message,
          retryable: false,
        },
      }),
      isError: true,
    };
  }
  
  if (err instanceof AppError) {
    return {
      text: JSON.stringify({
        error: {
          code: err.code,
          message: err.message,
          retryable: err.retryable,
        },
      }),
      isError: true,
    };
  }
  
  // 内部エラー（詳細はログのみ、クライアントには安全なメッセージ）
  const errorMessage = err instanceof Error ? err.message : 'Internal error';
  const errorStack = isDebug && err instanceof Error ? err.stack : undefined;
  
  // ログ出力（stderr）
  console.error('MCP Server Error:', {
    message: errorMessage,
    stack: errorStack,
  });
  
  return {
    text: JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        retryable: false,
      },
    }),
    isError: true,
  };
}

// ツール呼び出しハンドラー（Tool Registryから自動ルーティング）
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const tool = tools.find((t) => t.name === name);
    if (!tool) {
      throw new AppError('UNKNOWN_TOOL', `Unknown tool: ${name}`, false);
    }

    const result = await tool.handler(args ?? {});
    
    // JSON返却（minify、pretty printは環境変数で制御）
    const pretty = process.env.MCP_PRETTY_JSON === '1';
    const text = JSON.stringify(result, null, pretty ? 2 : 0);

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (error) {
    const { text, isError } = formatToolError(error);
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
      isError,
    };
  }
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('逆算思考エンジン MCPサーバー起動完了');
}

main().catch((error) => {
  console.error('MCPサーバー起動エラー:', error);
  process.exit(1);
});
