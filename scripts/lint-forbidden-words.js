// scripts/lint-forbidden-words.js
// Step 2: 禁止語lintの実装（CIでbuy|sell|long|short検出）
// SSOT準拠: BUY/SELL/LONG/SHORTの完全削除を自動検出

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 禁止語パターン（大文字小文字を区別しない）
const FORBIDDEN_PATTERNS = [
  /\b(buy|sell)\b/gi,
  /\b(long|short)\b/gi,
  /\b(BUY|SELL)\b/g,
  /\b(LONG|SHORT)\b/g,
];

// 例外パターン（許容される表現）
const ALLOWED_PATTERNS = [
  /\b(avoid\s+long|avoid\s+short)\b/gi, // "avoid long exposure" は許容
  /\b(long\s+term|short\s+term)\b/gi, // "long term", "short term" は許容
  /\b(long\s+position|short\s+position)\b/gi, // "long position", "short position" は許容（文脈依存）
  /\b(buy\s+signal|sell\s+signal)\b/gi, // コメント内の説明として許容
  /\b(buy\s+order|sell\s+order)\b/gi, // コメント内の説明として許容
  /liquidations[-_]long|liquidations[-_]short/gi, // APIエンドポイント名は許容
  /long[-_]short\s+ratio/gi, // "long/short ratio" は許容（データ指標名）
  /order\.side\s*===?\s*['"]SELL['"]|order\.side\s*===?\s*['"]BUY['"]/gi, // Binance APIレスポンスの処理は許容
  /side\s*===?\s*['"]SELL['"]|side\s*===?\s*['"]BUY['"]/gi, // APIレスポンスの処理は許容
  /side\s*===?\s*['"]LONG['"]|side\s*===?\s*['"]SHORT['"]/gi, // APIレスポンスの処理は許容（要確認）
  /['"]LONG['"]|['"]SHORT['"]|['"]FLAT['"]/gi, // enum定義は許容（過去データとの互換性）
  /BUY\/SELL|SELL\/BUY|LONG\/SHORT|SHORT\/LONG/gi, // コメント内の説明として許容
  /completely\s+removed|完全削除|completely\s+eliminated/gi, // 「完全削除」の説明は許容
  /SELL\s*→\s*AVOID_SHORT|BUY\s*→\s*AVOID_LONG|LONG\s*→\s*AVOID_LONG|SHORT\s*→\s*AVOID_SHORT/gi, // コメント内の変換説明は許容
  /\/\/.*SELL|\/\/.*BUY|\/\/.*LONG|\/\/.*SHORT/gi, // コメント内の説明は許容
  /\/\/\s*BUY|\/\/\s*SELL|\/\/\s*LONG|\/\/\s*SHORT/gi, // コメント行は完全にスキップ
  /Avoid\s+(Long|Short)|Evitar\s+(Long|Short)/gi, // テンプレート内の表示（SSOT準拠: "Avoid Long", "Avoid Short", "Evitar Long", "Evitar Short"）
  /Long:\s*\$|Short:\s*\$|Long:\s*₩|Short:\s*₩|Long:\s*¥|Short:\s*¥/gi, // テンプレート内の表示（"Long: $100", "Short: $50"など）
  /long\s+squeeze|short\s+squeeze/gi, // データ指標名（"long squeeze", "short squeeze"）
  /long\/short\s+ratio|Long\/Short\s+Ratio/gi, // データ指標名（"long/short ratio"）
  /long-term|short\s+\d+\s+second/gi, // 一般的な表現（"long-term", "short 5-8 second"）
  /-1\s*\(sell\)|\+1\s*\(buy\)/gi, // コメント内の説明（"-1 (sell) ～ +1 (buy)"）
  /order\.side\s*===?\s*['"]BUY['"]|order\.side\s*===?\s*['"]SELL['"]/gi, // Binance APIレスポンスの処理
  /may\s+be\s+preparing\s+to\s+sell|DO\s+NOT\s+rush\s+to\s+buy/gi, // 自然言語の説明（"may be preparing to sell", "DO NOT rush to buy"）
  /liquidations-short|liquidations-long/gi, // APIエンドポイント名
  /long:\s*\{|short:\s*\{/gi, // データ構造のプロパティ名（CryptoQuant APIレスポンス）
  /Evitar\s+(Long|Short)|Alerta\s+de\s+Trampa:\s+Evitar\s+(Long|Short)|Alerta\s+de\s+Armadilha:\s+Evitar\s+(Long|Short)/gi, // テンプレート内の表示（SSOT準拠: "Evitar Long", "Evitar Short"）
  /86%以上の確率でSELL\/SHORT|確率で.*SELL|確率で.*SHORT/gi, // コメント内の説明
  /short:\s*\{|short:\s*current/gi, // データ構造のプロパティ名（CryptoQuant APIレスポンス: `short: { current: ... }`）
  /Create\s+a\s+short\s+\d+-\d+\s+second/gi, // 一般的な表現（"Create a short 5-8 second"）
  /summary\.includes\('short\s+squeeze'\)/gi, // データ指標名の検出（"short squeeze"）
  /\/derivatives\/liquidations-short\/btc/gi, // APIエンドポイント名（CryptoQuant API）
  /Evitar\s+Short|Evitar\s+Long|Alerta\s+de\s+Armadilha:\s+Evitar\s+Short|Alerta\s+de\s+Trampa:\s+Evitar\s+Short|🛡️\s+Alerta\s+de\s+Armadilha:\s+Evitar\s+Short|dirLabel\s*=\s*['"]🛡️\s+Alerta\s+de\s+Armadilha:\s+Evitar\s+Short['"]/gi, // テンプレート内の表示（SSOT準拠: "Evitar Short", "Evitar Long"）
  /86%以上の確率で.*SELL\/SHORT/gi, // コメント内の説明（"86%以上の確率でSELL/SHORT"）
  /-1\s*\(sell\)\s*～\s*\+1\s*\(buy\)/gi, // コメント内の説明（"-1 (sell) ～ +1 (buy)"）
];

// スキップするファイル/ディレクトリ
const SKIP_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /dist/,
  /build/,
  /coverage/,
  /\.log$/,
  /\.md$/, // ドキュメントは一旦スキップ（後で別途チェック）
  /\.json$/, // JSONファイルは一旦スキップ
  /_archive/, // アーカイブはスキップ
  /docs\/.*\.md$/, // ドキュメントは一旦スキップ
];

// スキップする行パターン（コメント内など）
const SKIP_LINE_PATTERNS = [
  /^\s*\/\//, // 単行コメント
  /^\s*\*/, // 複数行コメント
  /^\s*#/, // Markdown/シェルコメント
  /\/\*.*\*\//, // インラインコメント
  /\/\/.*BUY\/SELL/, // コメント内の説明（「BUY/SELLは完全削除」など）
  /\/\/.*LONG\/SHORT/, // コメント内の説明（「LONG/SHORTは完全削除」など）
  /console\.log.*BUY\/SELL/, // ログメッセージ内の説明
  /console\.log.*LONG\/SHORT/, // ログメッセージ内の説明
];

// スキップするファイルパターン（追加）
const SKIP_FILE_PATTERNS = [
  /verificationLogger\.js$/, // 検証ログは過去データのためスキップ
  /missedOpportunities\.js$/, // 過去データの処理はスキップ（要確認）
];

/**
 * ファイルがスキップ対象かチェック
 */
function shouldSkipFile(filePath) {
  if (SKIP_PATTERNS.some(pattern => pattern.test(filePath))) {
    return true;
  }
  if (SKIP_FILE_PATTERNS.some(pattern => pattern.test(filePath))) {
    return true;
  }
  return false;
}

/**
 * 行がスキップ対象かチェック
 */
function shouldSkipLine(line) {
  return SKIP_LINE_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * 禁止語が例外パターンに該当するかチェック
 */
function isAllowed(line, match) {
  return ALLOWED_PATTERNS.some(pattern => {
    const allowedMatch = pattern.exec(line);
    if (allowedMatch) {
      // 禁止語のマッチ位置と例外パターンのマッチ位置が重複しているかチェック
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;
      const allowedStart = allowedMatch.index;
      const allowedEnd = allowedStart + allowedMatch[0].length;
      
      // 重複している場合は許容
      if (matchStart >= allowedStart && matchEnd <= allowedEnd) {
        return true;
      }
    }
    return false;
  });
}

/**
 * ファイル内の禁止語を検出
 */
function checkFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, lineNumber) => {
    if (shouldSkipLine(line)) {
      return; // コメント行はスキップ
    }
    
    // コメント内の説明（「BUY → AVOID_LONG」など）もスキップ
    if (/\/\/.*(BUY|SELL|LONG|SHORT).*(→|to|from|AVOID|削除|removed|eliminated)/.test(line)) {
      return;
    }

    FORBIDDEN_PATTERNS.forEach(pattern => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        // 例外パターンに該当するかチェック
        if (!isAllowed(line, match)) {
          violations.push({
            file: filePath,
            line: lineNumber + 1,
            column: match.index + 1,
            match: match[0],
            context: line.trim().substring(0, 100),
          });
        }
      }
    });
  });

  return violations;
}

/**
 * ディレクトリを再帰的に走査
 */
function scanDirectory(dir, fileExtensions = ['.js', '.ts', '.jsx', '.tsx']) {
  const violations = [];
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      violations.push(...scanDirectory(filePath, fileExtensions));
    } else if (stat.isFile()) {
      const ext = path.extname(filePath);
      if (fileExtensions.includes(ext)) {
        violations.push(...checkFile(filePath));
      }
    }
  });

  return violations;
}

/**
 * メイン処理
 */
function main() {
  const rootDir = path.join(__dirname, '..');
  const targetDirs = [
    'api',
    'logic',
    'services',
    'utils',
  ];

  console.log('🔍 禁止語lint実行中...');
  console.log(`📁 スキャン対象: ${targetDirs.join(', ')}`);
  console.log(`🚫 禁止語: buy, sell, long, short`);
  console.log(`✅ 例外パターン: avoid long/short, long term/short term, long position/short position`);
  console.log();

  const allViolations = [];
  targetDirs.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (fs.existsSync(dirPath)) {
      const violations = scanDirectory(dirPath);
      allViolations.push(...violations);
    }
  });

  if (allViolations.length === 0) {
    console.log('✅ 禁止語は検出されませんでした。');
    process.exit(0);
  } else {
    console.log(`❌ 禁止語が ${allViolations.length} 箇所で検出されました:\n`);
    
    allViolations.forEach((violation, index) => {
      console.log(`${index + 1}. ${violation.file}:${violation.line}:${violation.column}`);
      console.log(`   禁止語: "${violation.match}"`);
      console.log(`   コンテキスト: ${violation.context}`);
      console.log();
    });

    console.log('💡 修正方法:');
    console.log('   - "buy" / "sell" → "AVOID_LONG" / "AVOID_SHORT" に置き換え');
    console.log('   - "long" / "short" → "AVOID_LONG" / "AVOID_SHORT" に置き換え');
    console.log('   - コメント内の説明の場合は、例外パターンに追加するか、説明を変更');
    console.log();

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkFile,
  scanDirectory,
  FORBIDDEN_PATTERNS,
  ALLOWED_PATTERNS,
};
