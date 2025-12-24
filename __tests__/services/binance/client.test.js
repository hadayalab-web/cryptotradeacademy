import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

// Use createRequire to load CommonJS module
const require = createRequire(import.meta.url);
const { fetchKlines, fetchFundingRate, fetchOpenInterest, fetchLongShortRatio, fetch24hTicker, getComplementaryData } = require('/home/runner/work/cryptosignal-ai/cryptosignal-ai/services/binance/client.js');

// Mock fetch globally
global.fetch = vi.fn();

describe('Binance Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchKlines', () => {
    it('should validate symbol parameter', async () => {
      await expect(fetchKlines('', '1h', 0, 1000)).rejects.toThrow('Invalid symbol parameter');
      await expect(fetchKlines(null, '1h', 0, 1000)).rejects.toThrow('Invalid symbol parameter');
    });

    it('should validate interval parameter', async () => {
      await expect(fetchKlines('BTCUSDT', 'invalid', 0, 1000)).rejects.toThrow('Invalid interval');
    });

    it('should validate startTime parameter', async () => {
      await expect(fetchKlines('BTCUSDT', '1h', -1, 1000)).rejects.toThrow('Invalid startTime');
    });

    it('should validate endTime parameter', async () => {
      await expect(fetchKlines('BTCUSDT', '1h', 1000, 500)).rejects.toThrow('Invalid endTime');
    });

    it('should clamp limit to valid range', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await fetchKlines('BTCUSDT', '1h', 0, 1000, 2000);
      const url = global.fetch.mock.calls[0][0];
      expect(url).toContain('limit=1000');
    });

    it('should fetch klines successfully', async () => {
      const mockData = [
        [1609459200000, '29000', '29500', '28800', '29200', '1000', 1609462800000],
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchKlines('BTCUSDT', '1h', 0, 1000);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        openTime: 1609459200000,
        open: 29000,
        high: 29500,
        low: 28800,
        close: 29200,
        volume: 1000,
        closeTime: 1609462800000,
      });
    });
  });

  describe('fetchFundingRate', () => {
    it('should validate symbol parameter', async () => {
      await expect(fetchFundingRate('')).rejects.toThrow('Invalid symbol parameter');
    });

    it('should fetch funding rate successfully', async () => {
      const mockData = [
        {
          symbol: 'BTCUSDT',
          fundingRate: '0.0001',
          fundingTime: 1609459200000,
        },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchFundingRate('BTCUSDT');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        symbol: 'BTCUSDT',
        fundingRate: 0.0001,
        fundingTime: 1609459200000,
      });
    });
  });

  describe('fetchOpenInterest', () => {
    it('should validate symbol parameter', async () => {
      await expect(fetchOpenInterest('')).rejects.toThrow('Invalid symbol parameter');
    });

    it('should fetch open interest successfully', async () => {
      const mockData = {
        openInterest: '1000000',
        symbol: 'BTCUSDT',
        time: 1609459200000,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchOpenInterest('BTCUSDT');

      expect(result).toMatchObject({
        openInterest: 1000000,
        symbol: 'BTCUSDT',
        timestamp: 1609459200000,
      });
    });
  });

  describe('fetchLongShortRatio', () => {
    it('should validate symbol parameter', async () => {
      await expect(fetchLongShortRatio('', '5m')).rejects.toThrow('Invalid symbol parameter');
    });

    it('should validate period parameter', async () => {
      await expect(fetchLongShortRatio('BTCUSDT', 'invalid')).rejects.toThrow('Invalid period');
    });

    it('should fetch long/short ratio successfully', async () => {
      const mockData = [
        {
          symbol: 'BTCUSDT',
          longShortRatio: '1.5',
          timestamp: 1609459200000,
        },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchLongShortRatio('BTCUSDT', '5m');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        symbol: 'BTCUSDT',
        longShortRatio: 1.5,
        timestamp: 1609459200000,
      });
    });
  });

  describe('fetch24hTicker', () => {
    it('should validate symbol parameter', async () => {
      await expect(fetch24hTicker('')).rejects.toThrow('Invalid symbol parameter');
    });

    it('should fetch 24h ticker successfully', async () => {
      const mockData = {
        symbol: 'BTCUSDT',
        lastPrice: '50000',
        priceChangePercent: '2.5',
        volume: '1000',
        quoteVolume: '50000000',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetch24hTicker('BTCUSDT');

      expect(result).toMatchObject({
        symbol: 'BTCUSDT',
        lastPrice: 50000,
        priceChangePercent: 2.5,
        volume: 1000,
        quoteVolume: 50000000,
      });
    });
  });

  describe('getComplementaryData', () => {
    it('should fetch all complementary data successfully', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ fundingRate: '0.0001', fundingTime: 1609459200000 }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ openInterest: '1000000', time: 1609459200000 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ longShortRatio: '1.5', timestamp: 1609459200000 }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lastPrice: '50000', priceChangePercent: '2.5' }),
        });

      const result = await getComplementaryData('BTCUSDT');

      expect(result).toMatchObject({
        timestamp: expect.any(Number), // timestamp is a number (Date.now())
        fundingRate: expect.any(Array),
        openInterest: expect.any(Object),
        longShortRatio: expect.any(Array),
        ticker24h: expect.any(Object),
      });
    });
  });
});
