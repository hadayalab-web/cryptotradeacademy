// utils/missedOpportunities.js
// サービス未利用ユーザーが「見逃した機会」を計算するユーティリティ（最適化版）

const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const { formatInTimeZone } = require('date-fns-tz');
const { kv } = require('@vercel/kv');

const TZ_UTC = 'UTC';

// 入力スキーマ検証
const SignalSchema = z.object({
  ts: z.union([z.string(), z.number(), z.date()]),
  side: z.enum(['LONG', 'SHORT', 'FLAT']).optional(),
  entry: z.number().optional(),
  tp: z.number().optional(),
  sl: z.number().optional(),
  metrics: z.object({
    priceUsd: z.number().optional(),
  }).passthrough().optional(),
  timestamp: z.union([z.string(), z.number(), z.date()]).optional(),
  time: z.union([z.string(), z.number(), z.date()]).optional(),
  createdAt: z.union([z.string(), z.number(), z.date()]).optional(),
}).passthrough();

/**
 * UTC時刻に変換（安全）
 */
function toDateUTC(ts) {
  if (!ts) return null;
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * UTC時刻から時間キーを生成（signals:YYYY-MM-DD:HH形式）
 */
function hourKeyUTC(date) {
  if (!date) return null;
  try {
    return formatInTimeZone(date, TZ_UTC, 'yyyy-MM-dd:HH');
  } catch {
    return null;
  }
}

/**
 * KVから時間プレフィックスでキーをリスト（パフォーマンス改善）
 */
async function listKeysByPrefix(prefix) {
  if (!kv) return [];
  try {
    // Vercel KVのscanメソッドを使用（存在する場合）
    if (typeof kv.scan === 'function') {
      const keys = [];
      let cursor = 0;
      do {
        const res = await kv.scan(cursor, { match: `${prefix}*`, count: 200 });
        cursor = res?.[0] ?? 0;
        const batch = res?.[1] ?? [];
        keys.push(...batch);
        if (cursor === 0 || cursor === '0') break;
      } while (cursor && cursor !== '0');
      return keys;
    }
    // keysメソッドが存在する場合
    if (typeof kv.keys === 'function') {
      return await kv.keys(`${prefix}*`);
    }
  } catch (error) {
    console.warn('[MissedOpportunities] KV listKeysByPrefix failed:', error.message);
  }
  return [];
}

/**
 * 過去N時間のシグナルログから見逃した機会を計算（最適化版）
 * @param {string|null} signalsLogPath - シグナルログファイルのパス（後方互換性のため残す）
 * @param {number} hoursBack - 何時間前まで遡るか（デフォルト: 24）
 * @param {boolean} useKV - KVを使用するか（デフォルト: false、後方互換性）
 * @returns {Promise<Object>} 見逃した機会のデータ
 */
async function calculateMissedOpportunities(signalsLogPath = null, hoursBack = 24, useKV = false) {
  const now = new Date();
  const cutoffTime = now.getTime() - (hoursBack * 60 * 60 * 1000);
  const cutoffDate = new Date(cutoffTime);

  // KVを使用する場合（パフォーマンス改善）
  if (useKV && kv) {
    try {
      // 必要な時間帯のキーを計算
      const hours = [];
      const cursor = new Date(cutoffDate);
      cursor.setUTCMinutes(0, 0, 0);
      while (cursor <= now) {
        const hk = hourKeyUTC(cursor);
        if (hk) hours.push(hk);
        cursor.setUTCHours(cursor.getUTCHours() + 1);
      }

      // 各時間帯のキーからデータを取得
      const prefixes = hours.map((h) => `signals:${h}`);
      const keysNested = await Promise.all(prefixes.map((p) => listKeysByPrefix(p)));
      const keys = keysNested.flat();

      if (keys.length > 0) {
        const values = await Promise.all(
          keys.map(async (k) => {
            try {
              return await kv.get(k);
            } catch {
              return null;
            }
          })
        );

        const loadedSignals = values
          .flatMap((v) => (Array.isArray(v) ? v : v ? [v] : []))
          .filter(Boolean);

        const parsed = z.array(SignalSchema).safeParse(loadedSignals);
        if (parsed.success) {
          return computeFromSignals(parsed.data, cutoffDate, now);
        }
      }
    } catch (error) {
      console.warn('[MissedOpportunities] KV path failed, falling back to file:', error.message);
    }
  }

  // ファイルベース（後方互換性）
  const logPath = signalsLogPath || path.join(__dirname, '../data/signals_log.jsonl');
  
  if (!fs.existsSync(logPath)) {
    console.warn(`[MissedOpportunities] Log file not found: ${logPath}`);
    return {
      totalSignals: 0,
      profitableSignals: 0,
      totalPotentialProfit: 0,
      averageProfit: 0,
      bestOpportunity: null,
      worstMissed: null,
      timeRange: {
        hoursBack,
        from: cutoffDate.toISOString(),
        to: now.toISOString(),
      },
    };
  }

  const fileContent = fs.readFileSync(logPath, 'utf-8');
  const lines = fileContent.trim().split('\n').filter(line => line.trim());
  
  const recentSignals = [];
  const profitableSignals = [];
  let totalPotentialProfit = 0;
  let bestOpportunity = null;
  let worstMissed = null;

  for (const line of lines) {
    try {
      const signal = JSON.parse(line);
      const signalTime = toDateUTC(signal.ts || signal.timestamp || signal.time || signal.createdAt);
      
      if (!signalTime || signalTime.getTime() < cutoffTime) continue;
      
      // 入力検証
      const validated = SignalSchema.safeParse(signal);
      if (!validated.success) {
        console.warn('[MissedOpportunities] Invalid signal format:', validated.error.message);
        continue;
      }
      
      recentSignals.push(validated.data);
      
      // シグナルがLONGまたはSHORTの場合、潜在的な利益を計算
      if (validated.data.side === 'LONG' || validated.data.side === 'SHORT') {
        const entry = validated.data.entry || validated.data.metrics?.priceUsd || 0;
        const tp = validated.data.tp || 0;
        const sl = validated.data.sl || 0;
        
        if (entry > 0 && tp > 0) {
          let potentialProfit = 0;
          if (validated.data.side === 'LONG') {
            potentialProfit = ((tp - entry) / entry) * 100;
          } else if (validated.data.side === 'SHORT') {
            potentialProfit = ((entry - tp) / entry) * 100;
          }
          
          if (potentialProfit > 0) {
            profitableSignals.push({
              ...validated.data,
              potentialProfit,
            });
            totalPotentialProfit += potentialProfit;
            
            if (!bestOpportunity || potentialProfit > bestOpportunity.potentialProfit) {
              bestOpportunity = {
                ...validated.data,
                potentialProfit,
              };
            }
          }
        }
        
        // 最悪の見逃し（SLに到達した場合）
        if (sl > 0) {
          const entry = validated.data.entry || validated.data.metrics?.priceUsd || 0;
          let potentialLoss = 0;
          if (validated.data.side === 'LONG') {
            potentialLoss = ((entry - sl) / entry) * 100;
          } else if (validated.data.side === 'SHORT') {
            potentialLoss = ((sl - entry) / entry) * 100;
          }
          
          if (potentialLoss > 0 && (!worstMissed || potentialLoss > worstMissed.potentialLoss)) {
            worstMissed = {
              ...validated.data,
              potentialLoss,
            };
          }
        }
      }
    } catch (parseError) {
      console.warn(`[MissedOpportunities] Failed to parse signal line:`, parseError.message);
      continue;
    }
  }

  const averageProfit = profitableSignals.length > 0
    ? totalPotentialProfit / profitableSignals.length
    : 0;

  return {
    totalSignals: recentSignals.length,
    profitableSignals: profitableSignals.length,
    totalPotentialProfit,
    averageProfit,
    bestOpportunity,
    worstMissed,
    timeRange: {
      hoursBack,
      from: cutoffDate.toISOString(),
      to: now.toISOString(),
    },
  };
}

/**
 * 見逃した機会を人間が読める形式でフォーマット
 * @param {Object} opportunities - calculateMissedOpportunitiesの結果
 * @param {string} lang - 言語コード
 * @returns {string} フォーマットされたテキスト
 */
function formatMissedOpportunities(opportunities, lang = 'en') {
  const { totalSignals, profitableSignals, totalPotentialProfit, averageProfit, bestOpportunity, worstMissed } = opportunities;
  
  const formats = {
    en: {
      title: 'Missed Trading Opportunities Report',
      total: `Total signals in the last 24 hours: ${totalSignals}`,
      profitable: `Profitable opportunities: ${profitableSignals}`,
      totalProfit: `Total potential profit: ${totalPotentialProfit.toFixed(2)}%`,
      average: `Average profit per signal: ${averageProfit.toFixed(2)}%`,
      best: bestOpportunity ? `Best opportunity: ${bestOpportunity.side} at $${bestOpportunity.entry} → TP $${bestOpportunity.tp} (${bestOpportunity.potentialProfit.toFixed(2)}% profit)` : 'No profitable opportunities',
      worst: worstMissed ? `Worst missed: ${worstMissed.side} at $${worstMissed.entry} → SL $${worstMissed.sl} (${worstMissed.potentialLoss.toFixed(2)}% loss avoided)` : 'No losses avoided',
    },
    ja: {
      title: '見逃した取引機会レポート',
      total: `過去24時間のシグナル総数: ${totalSignals}件`,
      profitable: `利益機会: ${profitableSignals}件`,
      totalProfit: `総潜在利益: ${totalPotentialProfit.toFixed(2)}%`,
      average: `シグナルあたりの平均利益: ${averageProfit.toFixed(2)}%`,
      best: bestOpportunity ? `最高の機会: ${bestOpportunity.side} $${bestOpportunity.entry} → TP $${bestOpportunity.tp} (${bestOpportunity.potentialProfit.toFixed(2)}%の利益)` : '利益機会なし',
      worst: worstMissed ? `最悪の見逃し: ${worstMissed.side} $${worstMissed.entry} → SL $${worstMissed.sl} (${worstMissed.potentialLoss.toFixed(2)}%の損失回避)` : '損失回避なし',
    },
    ko: {
      title: '놓친 거래 기회 보고서',
      total: `지난 24시간 총 신호: ${totalSignals}개`,
      profitable: `수익 기회: ${profitableSignals}개`,
      totalProfit: `총 잠재 수익: ${totalPotentialProfit.toFixed(2)}%`,
      average: `신호당 평균 수익: ${averageProfit.toFixed(2)}%`,
      best: bestOpportunity ? `최고 기회: ${bestOpportunity.side} $${bestOpportunity.entry} → TP $${bestOpportunity.tp} (${bestOpportunity.potentialProfit.toFixed(2)}% 수익)` : '수익 기회 없음',
      worst: worstMissed ? `최악의 놓친 기회: ${worstMissed.side} $${worstMissed.entry} → SL $${worstMissed.sl} (${worstMissed.potentialLoss.toFixed(2)}% 손실 회피)` : '손실 회피 없음',
    },
  };

  const format = formats[lang] || formats.en;
  
  return `${format.title}\n\n${format.total}\n${format.profitable}\n${format.totalProfit}\n${format.average}\n\n${format.best}\n${format.worst}`;
}

module.exports = {
  calculateMissedOpportunities,
  formatMissedOpportunities,
};
