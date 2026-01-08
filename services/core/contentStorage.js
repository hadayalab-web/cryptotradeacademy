// services/core/contentStorage.js
// 定時配信用コンテンツ（画像・動画）の保存・取得サービス（最適化版）
// Vercel KVを使用して生成されたコンテンツを保存

const { kv } = require('@vercel/kv');
const { z } = require('zod');
const { formatInTimeZone, zonedTimeToUtc } = require('date-fns-tz');

const TZ_UTC = 'UTC';

// Valid market codes
const VALID_MARKETS = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];

// 入力スキーマ検証
const AlertSchema = z.object({
  slotTime: z.string(),
  market: z.string(),
  imageUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  gptAnalysis: z.string().nullable().optional(),
  grokXAnalysis: z.any().nullable().optional(),
  marketData: z.any().nullable().optional(),
  createdAt: z.string(),
}).passthrough();

const SaveAlertInputSchema = z.object({
  imageUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  gptAnalysis: z.string().nullable().optional(),
  grokXAnalysis: z.any().nullable().optional(),
  marketData: z.any().nullable().optional(),
}).passthrough();

// 構造化ロガー
function createLogger(prefix) {
  return {
    info: (msg, extra = {}) => {
      console.log(JSON.stringify({
        level: 'info',
        service: 'contentStorage',
        prefix,
        msg,
        time: formatInTimeZone(new Date(), TZ_UTC, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
        ...extra,
      }));
    },
    warn: (msg, extra = {}) => {
      console.warn(JSON.stringify({
        level: 'warn',
        service: 'contentStorage',
        prefix,
        msg,
        time: formatInTimeZone(new Date(), TZ_UTC, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
        ...extra,
      }));
    },
    error: (msg, extra = {}) => {
      console.error(JSON.stringify({
        level: 'error',
        service: 'contentStorage',
        prefix,
        msg,
        time: formatInTimeZone(new Date(), TZ_UTC, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
        ...extra,
      }));
    },
  };
}

// UTC時刻からキーを生成（alerts:YYYY-MM-DD:HH:mm形式）
function buildAlertKey(market, slotTime) {
  if (!VALID_MARKETS.includes(market)) {
    const logger = createLogger('buildAlertKey');
    logger.warn('Invalid market code, using EN as default', { market });
    market = 'EN';
  }
  
  // slotTimeをUTC時刻として解析
  const slotDate = slotTime instanceof Date ? slotTime : new Date(slotTime);
  if (Number.isNaN(slotDate.getTime())) {
    const logger = createLogger('buildAlertKey');
    logger.warn('Invalid slotTime, using current time', { slotTime });
    const now = new Date();
    const nowUTC = zonedTimeToUtc(now, TZ_UTC);
    return `alerts:${market}:${formatInTimeZone(nowUTC, TZ_UTC, 'yyyy-MM-dd:HH:mm')}`;
  }
  
  const slotUTC = zonedTimeToUtc(slotDate, TZ_UTC);
  return `alerts:${market}:${formatInTimeZone(slotUTC, TZ_UTC, 'yyyy-MM-dd:HH:mm')}`;
}

// 軽量インデックスキー（alerts:index:YYYY-MM-DD形式）
function buildIndexKey(market, slotTime) {
  const slotDate = slotTime instanceof Date ? slotTime : new Date(slotTime);
  const slotUTC = zonedTimeToUtc(slotDate, TZ_UTC);
  return `alerts:index:${market}:${formatInTimeZone(slotUTC, TZ_UTC, 'yyyy-MM-dd')}`;
}

/**
 * 次の定時スロット時刻を計算（4時間ごとまたは6時間ごと）- UTC固定
 * @param {Date} now - 現在時刻（オプション、デフォルトは現在時刻）
 * @returns {string} ISO 8601形式の次の定時スロット時刻
 */
function getNextRegularSlotTime(now = new Date()) {
  // 環境変数で4時間ごとまたは6時間ごとを切り替え
  const USE_6H_SCHEDULE = process.env.REGULAR_SCHEDULE === '6h';
  const REGULAR_HOURS_4H = [0, 4, 8, 12, 16, 20];
  const REGULAR_HOURS_6H = [0, 6, 12, 18];
  const REGULAR_HOURS = USE_6H_SCHEDULE ? REGULAR_HOURS_6H : REGULAR_HOURS_4H;
  
  // UTC固定
  const nowUTC = zonedTimeToUtc(now, TZ_UTC);
  const utcHour = Number(formatInTimeZone(nowUTC, TZ_UTC, 'HH'));
  const utcMinute = Number(formatInTimeZone(nowUTC, TZ_UTC, 'mm'));
  
  // 現在時刻が定時の5分前より前の場合、次の定時を返す
  let targetHour = null;
  let targetDate = new Date(nowUTC);
  
  // 現在時刻が定時の5分前（例: 23:55-23:59）の場合は、次の定時を返す
  for (let i = 0; i < REGULAR_HOURS.length; i++) {
    const hour = REGULAR_HOURS[i];
    const interval = USE_6H_SCHEDULE ? 6 : 4;
    const prevHour = REGULAR_HOURS[(i - 1 + REGULAR_HOURS.length) % REGULAR_HOURS.length];
    
    // 前の定時の55分から現在の定時の4分まで
    if (utcHour === prevHour && utcMinute >= 55) {
      targetHour = hour;
      break;
    }
    // 現在の定時の0-4分
    if (utcHour === hour && utcMinute < 5) {
      targetHour = hour;
      break;
    }
  }
  
  // 見つからない場合は、次の定時を計算
  if (targetHour === null) {
    for (const hour of REGULAR_HOURS) {
      if (hour > utcHour || (hour === utcHour && utcMinute < 5)) {
        targetHour = hour;
        break;
      }
    }
    // まだ見つからない場合は、翌日の最初の定時（0時）
    if (targetHour === null) {
      targetHour = 0;
      targetDate = new Date(nowUTC);
      targetDate.setUTCDate(targetDate.getUTCDate() + 1);
    }
  }
  
  targetDate.setUTCHours(targetHour, 0, 0, 0);
  return targetDate.toISOString();
}

/**
 * コンテンツを保存（最適化版）
 * @param {string} market - 市場コード
 * @param {Object} content - 保存するコンテンツ
 * @param {string} slotTime - 定時スロット時刻（ISO 8601、オプション）
 * @returns {Promise<boolean>} 保存成功時true
 */
async function saveContent(market, content, slotTime = null) {
  const logger = createLogger('saveContent');
  
  // 入力検証
  const validatedContent = SaveAlertInputSchema.safeParse(content);
  if (!validatedContent.success) {
    logger.warn('Invalid content input', {
      errors: validatedContent.error.errors,
      market,
    });
    return false;
  }
  
  try {
    if (!kv) {
      logger.warn('KV client not available');
      return false;
    }
    
    if (!slotTime) {
      slotTime = getNextRegularSlotTime();
    }
    
    // UTC固定キー生成
    const key = buildAlertKey(market, slotTime);
    const indexKey = buildIndexKey(market, slotTime);
    
    const nowUTC = zonedTimeToUtc(new Date(), TZ_UTC);
    const createdAt = formatInTimeZone(nowUTC, TZ_UTC, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    
    const contentToSave = {
      slotTime,
      market,
      imageUrl: validatedContent.data.imageUrl || null,
      videoUrl: validatedContent.data.videoUrl || null,
      summary: validatedContent.data.summary || null, // 後方互換性のため残す
      gptAnalysis: validatedContent.data.gptAnalysis || null, // 新規: GPT解析結果
      grokXAnalysis: validatedContent.data.grokXAnalysis || null, // 新規: Grok X解析結果
      marketData: validatedContent.data.marketData || null,
      createdAt,
    };
    
    // スキーマ検証
    const validatedAlert = AlertSchema.safeParse(contentToSave);
    if (!validatedAlert.success) {
      logger.warn('Invalid alert structure', {
        errors: validatedAlert.error.errors,
        market,
      });
      return false;
    }
    
    // Vercel KVに保存（TTL: 24時間 - 定時配信が完了するまで保持）
    await kv.set(key, validatedAlert.data, { ex: 24 * 60 * 60 }); // 24 hours in seconds
    
    // 軽量インデックスに追加（オプション、高速検索用）
    try {
      const existingIndex = await kv.get(indexKey);
      const indexSet = new Set(existingIndex || []);
      indexSet.add(key);
      await kv.set(indexKey, Array.from(indexSet), { ex: 7 * 24 * 60 * 60 }); // 7日間保持
    } catch (indexError) {
      // インデックス更新失敗は無視（メインコンテンツは保存済み）
      logger.warn('Failed to update index', {
        error: indexError?.message,
        indexKey,
      });
    }
    
    logger.info('Content saved successfully', {
      market,
      slotTime,
      key: key.substring(0, 50),
      hasImage: !!validatedAlert.data.imageUrl,
      hasVideo: !!validatedAlert.data.videoUrl,
      hasSummary: !!validatedAlert.data.summary,
    });
    
    return true;
  } catch (error) {
    logger.error('Error saving content', {
      error: error?.message,
      stack: error?.stack?.substring(0, 200),
      market,
      slotTime,
    });
    return false;
  }
}

/**
 * コンテンツを取得（最適化版）
 * @param {string} market - 市場コード
 * @param {string} slotTime - 定時スロット時刻（ISO 8601、オプション）
 * @returns {Promise<Object|null>} 保存されたコンテンツまたはnull
 */
async function getContent(market, slotTime = null) {
  const logger = createLogger('getContent');
  
  try {
    if (!kv) {
      logger.warn('KV client not available');
      return null;
    }
    
    if (!slotTime) {
      slotTime = getNextRegularSlotTime();
    }
    
    // UTC固定キー生成
    const key = buildAlertKey(market, slotTime);
    const content = await kv.get(key);
    
    if (!content) {
      logger.info('No content found', {
        market,
        slotTime,
        key: key.substring(0, 50),
      });
      return null;
    }
    
    // スキーマ検証
    const validated = AlertSchema.safeParse(content);
    if (!validated.success) {
      logger.warn('Invalid content structure retrieved', {
        errors: validated.error.errors,
        market,
        slotTime,
      });
      return null;
    }
    
    logger.info('Content retrieved successfully', {
      market,
      slotTime,
      key: key.substring(0, 50),
      hasImage: !!validated.data.imageUrl,
      hasVideo: !!validated.data.videoUrl,
      hasSummary: !!validated.data.summary,
    });
    
    return validated.data;
  } catch (error) {
    logger.error('Error getting content', {
      error: error?.message,
      stack: error?.stack?.substring(0, 200),
      market,
      slotTime,
    });
    return null;
  }
}

/**
 * コンテンツを削除（使用後またはエラー時）
 * @param {string} market - 市場コード
 * @param {string} slotTime - 定時スロット時刻（ISO 8601、オプション）
 * @returns {Promise<boolean>} 削除成功時true
 */
async function deleteContent(market, slotTime = null) {
  const logger = createLogger('deleteContent');
  
  try {
    if (!kv) {
      logger.warn('KV client not available');
      return false;
    }
    
    if (!slotTime) {
      slotTime = getNextRegularSlotTime();
    }
    
    // UTC固定キー生成
    const key = buildAlertKey(market, slotTime);
    const indexKey = buildIndexKey(market, slotTime);
    
    await kv.del(key);
    
    // インデックスからも削除（オプション）
    try {
      const existingIndex = await kv.get(indexKey);
      if (existingIndex && Array.isArray(existingIndex)) {
        const indexSet = new Set(existingIndex);
        indexSet.delete(key);
        await kv.set(indexKey, Array.from(indexSet), { ex: 7 * 24 * 60 * 60 });
      }
    } catch (indexError) {
      // インデックス更新失敗は無視（メインコンテンツは削除済み）
      logger.warn('Failed to update index on delete', {
        error: indexError?.message,
        indexKey,
      });
    }
    
    logger.info('Content deleted successfully', {
      market,
      slotTime,
      key: key.substring(0, 50),
    });
    
    return true;
  } catch (error) {
    logger.error('Error deleting content', {
      error: error?.message,
      stack: error?.stack?.substring(0, 200),
      market,
      slotTime,
    });
    return false;
  }
}

module.exports = {
  saveContent,
  getContent,
  deleteContent,
  getNextRegularSlotTime,
};
