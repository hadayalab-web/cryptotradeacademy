/**
 * Vercelデプロイ安全対策ユーティリティ
 * 
 * デバッグ炎上を防ぐための対策:
 * - 環境変数チェック
 * - JSON.parse安全化
 * - タイムアウト管理
 * - メモリ使用量監視
 * - エラーログの安全化
 */

/**
 * 必須環境変数のチェック
 */
export function checkRequiredEnvVars(requiredVars: string[]): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * 環境変数チェック（エラーを投げる版）
 */
export function requireEnvVars(requiredVars: string[]): void {
  const check = checkRequiredEnvVars(requiredVars);
  if (!check.valid) {
    throw new Error(
      `Missing required environment variables: ${check.missing.join(', ')}`
    );
  }
}

/**
 * 安全なJSON.parse（エラーハンドリング付き）
 */
export function safeJsonParse<T>(
  jsonString: string,
  defaultValue: T,
  errorContext?: string
): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error: any) {
    const context = errorContext ? `[${errorContext}] ` : '';
    console.error(`${context}JSON parse error:`, error.message);
    console.error(`JSON string (first 200 chars):`, jsonString.substring(0, 200));
    return defaultValue;
  }
}

/**
 * JSON文字列から安全に抽出（マークダウンコードブロック対応）
 */
export function extractJsonFromText(text: string): string | null {
  try {
    // ```json ブロックを探す
    if (text.includes('```json')) {
      const jsonStart = text.indexOf('```json') + 7;
      const jsonEnd = text.indexOf('```', jsonStart);
      if (jsonEnd !== -1) {
        return text.substring(jsonStart, jsonEnd).trim();
      }
    }

    // ``` ブロックを探す
    if (text.includes('```')) {
      const jsonStart = text.indexOf('```') + 3;
      const jsonEnd = text.indexOf('```', jsonStart);
      if (jsonEnd !== -1) {
        return text.substring(jsonStart, jsonEnd).trim();
      }
    }

    // JSONオブジェクトを直接探す
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    return null;
  } catch (error: any) {
    console.error('JSON extraction error:', error.message);
    return null;
  }
}

/**
 * 安全なJSON.parse（マークダウン対応）
 */
export function safeJsonParseFromText<T>(
  text: string,
  defaultValue: T,
  errorContext?: string
): T {
  const jsonString = extractJsonFromText(text);
  if (!jsonString) {
    const context = errorContext ? `[${errorContext}] ` : '';
    console.error(`${context}No JSON found in text`);
    return defaultValue;
  }
  return safeJsonParse(jsonString, defaultValue, errorContext);
}

/**
 * Vercelタイムアウト管理（Promise.race使用）
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Vercel関数実行時間制限チェック
 * 
 * Vercel Hobby: 10秒
 * Vercel Pro: 60秒
 */
export function getVercelTimeoutLimit(): number {
  // 環境変数から判断、デフォルトは10秒（Hobby）
  const isPro = process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PRO === '1';
  return isPro ? 55000 : 9000; // 安全マージンを持たせる
}

/**
 * メモリ使用量チェック（簡易版）
 */
export function checkMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
  isHigh: boolean;
} {
  if (typeof process === 'undefined' || !process.memoryUsage) {
    return {
      used: 0,
      total: 0,
      percentage: 0,
      isHigh: false,
    };
  }

  const usage = process.memoryUsage();
  const used = usage.heapUsed;
  const total = usage.heapTotal;
  const percentage = (used / total) * 100;
  const isHigh = percentage > 80; // 80%以上で警告

  return {
    used,
    total,
    percentage,
    isHigh,
  };
}

/**
 * 機密情報をマスク（ログ出力用）
 */
export function maskSensitiveInfo(text: string): string {
  // APIキーをマスク
  const apiKeyPatterns = [
    /sk-[a-zA-Z0-9]{32,}/g,
    /xai-[a-zA-Z0-9]{32,}/g,
    /AIza[a-zA-Z0-9_-]{35}/g,
    /whop_[a-zA-Z0-9]{32,}/g,
    /re_[a-zA-Z0-9]{32,}/g,
  ];

  let masked = text;
  for (const pattern of apiKeyPatterns) {
    masked = masked.replace(pattern, (match) => {
      return match.substring(0, 8) + '...' + match.substring(match.length - 4);
    });
  }

  // メールアドレスをマスク（ドメイン部分のみ表示）
  masked = masked.replace(
    /([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (match, username, domain) => {
      return `${username.substring(0, 2)}***@${domain}`;
    }
  );

  return masked;
}

/**
 * 安全なログ出力（機密情報をマスク）
 */
export function safeLog(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
  const maskedMessage = maskSensitiveInfo(message);
  const maskedData = data ? maskSensitiveInfo(JSON.stringify(data)) : undefined;

  if (level === 'error') {
    console.error(maskedMessage, maskedData ? JSON.parse(maskedData) : '');
  } else if (level === 'warn') {
    console.warn(maskedMessage, maskedData ? JSON.parse(maskedData) : '');
  } else {
    console.log(maskedMessage, maskedData ? JSON.parse(maskedData) : '');
  }
}

/**
 * 配列のチャンク分割（メモリ効率化）
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 並列処理の制限（p-limit相当の簡易実装）
 */
export class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private limit: number) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = async () => {
        this.running++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next();
          }
        }
      };

      if (this.running < this.limit) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }
}

/**
 * デバッグモードチェック
 */
export function isDebugMode(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.DEBUG === '1';
}

/**
 * 本番環境チェック
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}
