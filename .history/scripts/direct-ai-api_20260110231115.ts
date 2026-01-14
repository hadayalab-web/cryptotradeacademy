#!/usr/bin/env tsx
/**
 * Direct AI API - 各種AIモデルへの直接API呼び出し
 * Grok（CFO/CRO/CGO）、Gemini（CMO/CKO）、GPT（CTO/CPO）への統一インターフェース
 */

// 環境変数の読み込み（親ディレクトリの.envファイル）
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// プロジェクトルートの1階層上の.envファイルを読み込む
dotenv.config({ path: resolve(__dirname, "../../.env") });

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ===== 環境変数 =====
const XAI_API_KEY = process.env.XAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";

// ===== Grok Client (xAI) =====
const grokClient = XAI_API_KEY
  ? new OpenAI({
      apiKey: XAI_API_KEY,
      baseURL: XAI_BASE_URL
    })
  : null;

// ===== Gemini Client =====
const geminiClient = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// ===== GPT Client (OpenAI) =====
const gptClient = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY
    })
  : null;

// ===== Grok API呼び出し =====
export async function callGrok41FastReasoning(
  prompt: string,
  options: { temperature?: number; maxTokens?: number } = {}
) {
  if (!grokClient) {
    throw new Error("XAI_API_KEY is not set");
  }

  try {
    const completion = await grokClient.chat.completions.create({
      model: "grok-4-1-fast-reasoning",
      messages: [{ role: "user", content: prompt }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4000
    });

    const text = completion.choices[0]?.message?.content || "";
    const usage = completion.usage || {};

    return {
      text,
      usage
    };
  } catch (error: any) {
    throw new Error(`Grok API error: ${error.message}`);
  }
}

// ===== Gemini API呼び出し =====
export async function callGemini3Pro(
  prompt: string,
  options: {
    thinkingLevel?: "low" | "high";
    temperature?: number;
    maxOutputTokens?: number;
  } = {}
) {
  if (!geminiClient) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  try {
    const generationConfig: any = {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 4000
    };

    // モデル名を環境変数から取得、デフォルトはgemini-3-pro-preview
    // 参考: https://ai.google.dev/gemini-api/docs/models?hl=ja#gemini-3-pro-preview
    const modelName = process.env.GEMINI_MODEL || "gemini-3-pro-preview";
    
    const model = geminiClient.getGenerativeModel({
      model: modelName,
      generationConfig
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return {
      text,
      usage: {
        promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
        candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokenCount: response.usageMetadata?.totalTokenCount || 0
      },
      thinkingLevel: options.thinkingLevel || "low"
    };
  } catch (error: any) {
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

// ===== GPT API呼び出し =====
// GPT-5.2-2025-12-11 のAPI仕様に準拠
// 参考: https://platform.openai.com/docs/models/gpt-5.2
export async function callGPT52(
  prompt: string,
  options: {
    reasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh";
    verbosity?: "low" | "medium" | "high";
    temperature?: number;
    maxCompletionTokens?: number;
    model?: string;
  } = {}
) {
  if (!gptClient) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  try {
    // GPT-5.2-2025-12-11をデフォルトモデルとして使用
    const modelName = options.model || "gpt-5.2-2025-12-11";

    // GPT-5.2の標準パラメータ（reasoning/verbosityはo1系モデル専用）
    const requestOptions: any = {
      model: modelName,
      messages: [{ role: "user", content: prompt }]
    };

    // temperatureはGPT-5.2でサポートされている場合のみ設定
    // reasoning/verbosityパラメータはo1系モデル専用のため、GPT-5.2では使用しない
    if (options.temperature !== undefined) {
      requestOptions.temperature = options.temperature;
    }

    // max_completion_tokensパラメータ（GPT-5.2の標準パラメータ）
    if (options.maxCompletionTokens) {
      requestOptions.max_completion_tokens = options.maxCompletionTokens;
    }

    const completion = await gptClient.chat.completions.create(requestOptions);

    const text = completion.choices[0]?.message?.content || "";
    const usage = completion.usage || {};

    return {
      text,
      usage
    };
  } catch (error: any) {
    throw new Error(`GPT API error: ${error.message}`);
  }
}
