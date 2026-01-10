#!/usr/bin/env tsx
/**
 * VercelエラーログをGPT（CTO兼CPO）に共有するスクリプト
 */

import { callGPT52 } from "../../scripts/direct-ai-api";

const ERROR_ANALYSIS_PROMPT = `
あなたはCTO兼CPOのGPTです。COO兼エンジニアからエラーログの分析依頼を受けました。

【エラーログ情報】
エラーメッセージ: SyntaxError: Unexpected token 'else'
エラー発生ファイル: /var/task/services/telegram/messages/user/en/regular.en.js
エラー発生行: 170行目
エラー詳細:
/var/task/services/telegram/messages/user/en/regular.en.js:170
  } else {
    ^^^^

SyntaxError: Unexpected token 'else'
    at wrapSafe (node:internal/modules/cjs/loader:1691:18)
    at Module._compile (node:internal/modules/cjs/loader:1734:20)
    at Object..js (node:internal/modules/cjs/loader:1893:10)
    at Module.load (node:internal/modules/cjs/loader:1480:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1299:12)

【現在のファイル内容（160-172行目付近）】
160|    // Display trap alert details if available
161|    if (trapAlert && trapAlert.alert) {
162|      lines.push(\`   🚨 Alert Type: \${trapAlert.type} (Severity: \${trapAlert.severity})\`);
163|      lines.push(\`   💡 Recommendation: \${trapAlert.recommendation}\`);
164|      if (trapAlert.confidence) {
165|        lines.push(\`   📊 Confidence: \${(trapAlert.confidence * 100).toFixed(0)}%\`);
166|      }
167|    }
168|  } else {
169|    lines.push('🛡️ USP1: Trap Defense - No trap detected currently');
170|  }
171|  
172|  // ===== 【ニュース番組構造】オープニング → データ → 解説 → コメンテーター → クロージング =====

【問題点】
エラーログでは170行目に \`} else {\` があると報告されていますが、現在のファイルでは170行目は \`}\` のみです。
168行目に \`} else {\` があり、これは124行目の \`if (trapData && (trapData.trapDetected || trapData.bugDetected)) {\` に対応するelseブロックです。

【調査依頼】
1. エラーログと現在のファイルの差分の原因を特定してください
2. デプロイ時のファイルに167行目の \`}\` が欠落している可能性があるか確認してください
3. 構文エラーの根本原因を特定し、修正案を提案してください
4. デプロイプロセスでファイルが正しくデプロイされているか確認してください

【追加情報】
- エラーは/api/cronエンドポイントで発生しています
- エラーは定期的に発生しており（15分ごと）、同じエラーが繰り返されています
- フォールバック処理でENテンプレートにフォールバックしようとしていますが、それも同じエラーで失敗しています

COO兼エンジニアと協力して、原因を特定し、修正案を提案してください。
`;

async function main() {
  try {
    console.log("🤖 GPT（CTO兼CPO）にエラー情報を共有中...");
    
    const result = await callGPT52(ERROR_ANALYSIS_PROMPT, {
      reasoningEffort: "high",
      verbosity: "high",
      maxCompletionTokens: 2000,
    });
    
    console.log("\n📝 GPT（CTO兼CPO）からの分析結果:");
    console.log("=" .repeat(80));
    console.log(result.text);
    console.log("=" .repeat(80));
    console.log("\n📊 使用量:", result.usage);
    
  } catch (error: any) {
    console.error("❌ エラー:", error.message);
    if (error.response) {
      console.error("APIレスポンス:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
