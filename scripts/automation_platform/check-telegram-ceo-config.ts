#!/usr/bin/env tsx
/**
 * CEOへのTelegram報告に使用されているアカウントを確認
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込む
dotenv.config({ path: join(__dirname, "../api/.env") });

const TELEGRAM_BOT_TOKEN_CEO = process.env.TELEGRAM_BOT_TOKEN_CEO || "";
const TELEGRAM_BOT_TOKEN_EN = process.env.TELEGRAM_BOT_TOKEN_EN || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID_CEO = process.env.TELEGRAM_CHAT_ID_CEO || process.env.TELEGRAM_ADMIN_ID || "";

// 実際に使用されるトークン（優先順位に従って）
const actualToken = TELEGRAM_BOT_TOKEN_CEO || TELEGRAM_BOT_TOKEN_EN || TELEGRAM_BOT_TOKEN;

console.log("=".repeat(80));
console.log("📱 CEOへのTelegram報告設定確認");
console.log("=".repeat(80));
console.log();

console.log("🔑 環境変数の設定状況:");
console.log(`  - TELEGRAM_BOT_TOKEN_CEO: ${TELEGRAM_BOT_TOKEN_CEO ? `設定済み (${TELEGRAM_BOT_TOKEN_CEO.substring(0, 20)}...)` : "❌ 未設定"}`);
console.log(`  - TELEGRAM_BOT_TOKEN_EN: ${TELEGRAM_BOT_TOKEN_EN ? `設定済み (${TELEGRAM_BOT_TOKEN_EN.substring(0, 20)}...)` : "❌ 未設定"}`);
console.log(`  - TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN ? `設定済み (${TELEGRAM_BOT_TOKEN.substring(0, 20)}...)` : "❌ 未設定"}`);
console.log();

console.log("📬 送信先:");
console.log(`  - TELEGRAM_CHAT_ID_CEO: ${TELEGRAM_CHAT_ID_CEO || "❌ 未設定"}`);
console.log();

console.log("✅ 実際に使用されるトークン:");
if (actualToken) {
  if (TELEGRAM_BOT_TOKEN_CEO) {
    console.log(`  → TELEGRAM_BOT_TOKEN_CEO (優先度1)`);
    console.log(`     ${actualToken.substring(0, 30)}...`);
  } else if (TELEGRAM_BOT_TOKEN_EN) {
    console.log(`  → TELEGRAM_BOT_TOKEN_EN (優先度2)`);
    console.log(`     ${actualToken.substring(0, 30)}...`);
  } else if (TELEGRAM_BOT_TOKEN) {
    console.log(`  → TELEGRAM_BOT_TOKEN (優先度3)`);
    console.log(`     ${actualToken.substring(0, 30)}...`);
  }
} else {
  console.log("  ❌ 使用可能なトークンがありません");
}

console.log();
console.log("=".repeat(80));

// ボット情報を取得（オプション）
if (actualToken && TELEGRAM_CHAT_ID_CEO) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${actualToken}/getMe`);
    if (response.ok) {
      const data = await response.json();
      if (data.ok) {
        console.log("🤖 ボット情報:");
        console.log(`  - ボット名: ${data.result.first_name}${data.result.last_name ? ` ${data.result.last_name}` : ""}`);
        console.log(`  - ユーザー名: @${data.result.username || "なし"}`);
        console.log(`  - ボットID: ${data.result.id}`);
      }
    }
  } catch (error: any) {
    console.warn(`⚠️ ボット情報の取得に失敗: ${error.message}`);
  }
}

console.log("=".repeat(80));
