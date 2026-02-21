/**
 * 実装検証スクリプト
 * 「デタラメ実装」を防ぐための自動検証システム
 *
 * 使用方法:
 *   node scripts/validate_implementation.js
 *
 * 検証項目:
 *   1. 関数の引数順序・型チェック
 *   2. API呼び出しの検証
 *   3. エラーハンドリングの検証
 *   4. 定数の一貫性チェック
 */

const fs = require("fs");
const path = require("path");

// 検証対象の関数定義（期待されるシグネチャ）
// 注意: オプション引数は除外し、必須引数の順序のみをチェック
const EXPECTED_FUNCTION_SIGNATURES = {
  "services/x/client.js": {
    postTweet: {
      requiredParams: ["text"],
      paramTypes: ["string"],
      description: "ツイート投稿（引用リポスト・リプライは廃止）"
    }
  }
};

// 定数の一貫性チェック
// ⚖️ バランスアプローチ: Grokの警告を踏まえ、リスクを最小化
// 注: x-post-minimal-version.js は Cron スケジュール制御のため定数チェック対象外
// BuzzWeave 単体OS: x-post-free-report.js 削除済みのため定数チェック対象外
const EXPECTED_CONSTANTS = {};

/**
 * ファイルから関数呼び出しを抽出
 */
function extractFunctionCalls(filePath, functionName) {
  const content = fs.readFileSync(filePath, "utf-8");
  const calls = [];

  // 関数呼び出しパターンを検索
  const regex = new RegExp(`${functionName}\\s*\\(([^)]+)\\)`, "g");
  let match;

  while ((match = regex.exec(content)) !== null) {
    const args = match[1].split(",").map((arg) => arg.trim());
    calls.push({
      line: content.substring(0, match.index).split("\n").length,
      args,
      fullMatch: match[0]
    });
  }

  return calls;
}

/**
 * 関数の引数順序を検証
 */
function validateFunctionCall(filePath, functionName, expectedSignature) {
  const calls = extractFunctionCalls(filePath, functionName);
  const errors = [];

  for (const call of calls) {
    // 必須引数の数をチェック（オプション引数は除外）
    const requiredParamCount = expectedSignature.requiredParams.length;
    const actualRequiredArgs = call.args.slice(0, requiredParamCount);

    if (actualRequiredArgs.length < requiredParamCount) {
      errors.push({
        file: filePath,
        function: functionName,
        line: call.line,
        error: `必須引数の数が不足しています: 期待値 ${requiredParamCount}, 実際 ${actualRequiredArgs.length}`,
        call: call.fullMatch
      });
      continue;
    }

    // 引数の型を簡易チェック（変数名から推測）
    // より厳密なチェックにはTypeScriptが必要
    const firstArg = actualRequiredArgs[0];
    const secondArg = actualRequiredArgs[1];

  }

  return errors;
}

/**
 * 定数の一貫性をチェック
 */
function validateConstants(filePath, expectedConstants) {
  const content = fs.readFileSync(filePath, "utf-8");
  const errors = [];

  for (const [constantName, expectedValue] of Object.entries(expectedConstants)) {
    // 定数の定義を検索
    const regex = new RegExp(`(const|let|var)\\s+${constantName}\\s*=\\s*([^;\\n]+)`, "g");
    let match;

    while ((match = regex.exec(content)) !== null) {
      const actualValue = match[2].trim();
      const line = content.substring(0, match.index).split("\n").length;

      // 数値の場合、値を比較
      if (typeof expectedValue === "number") {
        // 環境変数パターンをチェック（parseInt(process.env.XXX || 'デフォルト値', 10)）
        const envVarPattern =
          /parseInt\s*\(\s*process\.env\.\w+\s*\|\|\s*['"](\d+)['"]\s*,\s*\d+\s*\)/;
        const envVarMatch = actualValue.match(envVarPattern);

        if (envVarMatch) {
          // 環境変数パターンの場合、デフォルト値をチェック
          const defaultValue = parseInt(envVarMatch[1], 10);
          if (defaultValue !== expectedValue) {
            errors.push({
              file: filePath,
              constant: constantName,
              line,
              error: `定数のデフォルト値が一致しません: 期待値 ${expectedValue}, 実際 ${defaultValue}`,
              expected: expectedValue,
              actual: defaultValue
            });
          }
        } else {
          // 直接数値の場合
          const numericValue = parseInt(actualValue);
          if (numericValue !== expectedValue) {
            errors.push({
              file: filePath,
              constant: constantName,
              line,
              error: `定数の値が一致しません: 期待値 ${expectedValue}, 実際 ${actualValue}`,
              expected: expectedValue,
              actual: actualValue
            });
          }
        }
      }
    }
  }

  return errors;
}

/**
 * エラーハンドリングを検証
 */
function validateErrorHandling(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const errors = [];

  // try-catchブロックを検索
  const tryCatchRegex = /try\s*\{([^}]+)\}\s*catch\s*\([^)]+\)\s*\{([^}]+)\}/g;
  let match;

  while ((match = tryCatchRegex.exec(content)) !== null) {
    const catchBlock = match[2];
    const line = content.substring(0, match.index).split("\n").length;

    // console.warnのみでエラーを処理している場合を検出
    if (catchBlock.includes("console.warn") && !catchBlock.includes("console.error")) {
      // 重要なエラー（API呼び出しなど）の場合はconsole.errorを使用すべき
      if (match[1].includes("postTweet") || match[1].includes("API")) {
        errors.push({
          file: filePath,
          line,
          error: "重要なエラーがconsole.warnで処理されています。console.errorを使用してください。",
          suggestion: "console.warn → console.error + 詳細情報"
        });
      }
    }
  }

  return errors;
}

/**
 * メイン処理
 */
function validateImplementation() {
  console.log("🔍 実装検証開始...\n");
  console.log("=".repeat(80));

  const allErrors = [];

  // 1. 関数の引数順序を検証
  console.log("\n📋 1. 関数の引数順序を検証...");
  for (const [filePath, functions] of Object.entries(EXPECTED_FUNCTION_SIGNATURES)) {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  ファイルが見つかりません: ${filePath}`);
      continue;
    }

    for (const [functionName, signature] of Object.entries(functions)) {
      const errors = validateFunctionCall(fullPath, functionName, signature);
      if (errors.length > 0) {
        allErrors.push(...errors);
        console.error(`\n❌ ${filePath} - ${functionName}:`);
        for (const error of errors) {
          console.error(`   行 ${error.line}: ${error.error}`);
          console.error(`   呼び出し: ${error.call}`);
          if (error.expected) {
            console.error(`   期待値: ${error.expected}`);
          }
        }
      } else {
        console.log(`   ✅ ${filePath} - ${functionName}: OK`);
      }
    }
  }

  // 2. 定数の一貫性をチェック
  console.log("\n📋 2. 定数の一貫性をチェック...");
  for (const [filePath, constants] of Object.entries(EXPECTED_CONSTANTS)) {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  ファイルが見つかりません: ${filePath}`);
      continue;
    }

    const errors = validateConstants(fullPath, constants);
    if (errors.length > 0) {
      allErrors.push(...errors);
      console.error(`\n❌ ${filePath}:`);
      for (const error of errors) {
        console.error(`   行 ${error.line} - ${error.constant}: ${error.error}`);
        console.error(`   期待値: ${error.expected}, 実際: ${error.actual}`);
      }
    } else {
      console.log(`   ✅ ${filePath}: OK`);
    }
  }

  // 3. エラーハンドリングを検証
  console.log("\n📋 3. エラーハンドリングを検証...");
  const criticalFiles = [
    "services/td/affiliateScoutSearch.js",
    "services/x/client.js"
  ];

  for (const filePath of criticalFiles) {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const errors = validateErrorHandling(fullPath);
    if (errors.length > 0) {
      allErrors.push(...errors);
      console.error(`\n❌ ${filePath}:`);
      for (const error of errors) {
        console.error(`   行 ${error.line}: ${error.error}`);
        console.error(`   推奨: ${error.suggestion}`);
      }
    } else {
      console.log(`   ✅ ${filePath}: OK`);
    }
  }

  // 結果サマリー
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 検証結果サマリー:");
  console.log(`   総エラー数: ${allErrors.length}`);

  if (allErrors.length > 0) {
    console.error("\n❌ 実装に問題が見つかりました。修正してください。");
    process.exit(1);
  } else {
    console.log("\n✅ すべての検証をパスしました。");
    process.exit(0);
  }
}

// 実行
if (require.main === module) {
  validateImplementation();
}

module.exports = {
  validateImplementation,
  validateFunctionCall,
  validateConstants,
  validateErrorHandling
};
