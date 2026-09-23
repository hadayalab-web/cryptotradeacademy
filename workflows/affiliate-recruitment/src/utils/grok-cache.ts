/**
 * Grok検索結果キャッシュ機能
 * 
 * Grokレビューに基づく改善:
 * - Redis代替のメモリキャッシュ
 * - 1週間のキャッシュ期間
 * - キャッシュヒット率の追跡
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * シンプルなメモリキャッシュ（本番環境ではRedis推奨）
 */
class GrokCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL = 7 * 24 * 60 * 60 * 1000; // 7日
  private hitCount = 0;
  private missCount = 0;

  /**
   * キャッシュキーを生成
   */
  private generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * キャッシュから取得
   */
  get<T>(prefix: string, params: Record<string, any>): T | null {
    const key = this.generateKey(prefix, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // 有効期限チェック
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return entry.data as T;
  }

  /**
   * キャッシュに保存
   */
  set<T>(
    prefix: string,
    params: Record<string, any>,
    data: T,
    ttl?: number
  ): void {
    const key = this.generateKey(prefix, params);
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  /**
   * キャッシュをクリア
   */
  clear(prefix?: string): void {
    if (prefix) {
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): {
    size: number;
    hitRate: number;
    hitCount: number;
    missCount: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.hitCount / total : 0,
      hitCount: this.hitCount,
      missCount: this.missCount,
    };
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  cleanup(): number {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
    return keysToDelete.length;
  }
}

// シングルトンインスタンス
const grokCache = new GrokCache();

// 定期的なクリーンアップ（1時間ごと）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleaned = grokCache.cleanup();
    if (cleaned > 0) {
      console.log(`[GrokCache] Cleaned up ${cleaned} expired entries`);
    }
  }, 60 * 60 * 1000); // 1時間
}

export { grokCache };
