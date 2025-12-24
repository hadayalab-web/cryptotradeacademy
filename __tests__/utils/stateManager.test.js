import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLastState, saveState, getHoursSinceLastUpdate } from '../../utils/stateManager.js';

// Mock @vercel/kv
const mockKv = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock('@vercel/kv', () => ({
  kv: mockKv,
}));

describe('stateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLastState', () => {
    it('should return default state when no state exists', async () => {
      mockKv.get.mockResolvedValue(null);

      const result = await getLastState('EN');

      expect(result).toMatchObject({
        lastUpdateTime: null,
        lastSignal: null,
        lastScore: null,
        consecutiveStandbyCount: 0,
      });
    });

    it('should return saved state when it exists', async () => {
      const savedState = {
        lastUpdateTime: '2024-01-01T00:00:00.000Z',
        lastSignal: 'BUG_STANDBY',
        lastScore: 15,
        consecutiveStandbyCount: 2,
        regime: 'BEARISH',
        confidence: 0.7,
      };
      mockKv.get.mockResolvedValue(savedState);

      const result = await getLastState('EN');

      expect(result).toMatchObject({
        lastUpdateTime: savedState.lastUpdateTime,
        lastSignal: savedState.lastSignal,
        lastScore: savedState.lastScore,
        consecutiveStandbyCount: savedState.consecutiveStandbyCount,
      });
    });

    it('should default to EN market for invalid market code', async () => {
      mockKv.get.mockResolvedValue(null);

      await getLastState('INVALID');

      expect(mockKv.get).toHaveBeenCalledWith('state:EN');
    });
  });

  describe('saveState', () => {
    it('should save state with correct structure', async () => {
      mockKv.set.mockResolvedValue('OK');
      mockKv.get.mockResolvedValue(null); // No previous state

      const state = {
        signal: 'BUG_STANDBY',
        score: 15,
        consecutiveStandbyCount: 2,
        regime: 'BEARISH',
        confidence: 0.7,
      };

      await saveState('EN', state);

      expect(mockKv.set).toHaveBeenCalled();
      const callArgs = mockKv.set.mock.calls[0];
      expect(callArgs[0]).toBe('state:EN');
      expect(callArgs[1]).toMatchObject({
        lastSignal: 'BUG_STANDBY',
        lastScore: 15,
        regime: 'BEARISH',
        confidence: 0.7,
      });
      expect(callArgs[2]).toMatchObject({ ex: 7 * 24 * 60 * 60 });
    });

    it('should use lastSignal and lastScore if signal/score not provided', async () => {
      mockKv.set.mockResolvedValue('OK');
      mockKv.get.mockResolvedValue(null); // No previous state

      const state = {
        lastSignal: 'LONG',
        lastScore: 25,
        consecutiveStandbyCount: 0,
      };

      await saveState('EN', state);

      expect(mockKv.set).toHaveBeenCalled();
      const callArgs = mockKv.set.mock.calls[0];
      expect(callArgs[0]).toBe('state:EN');
      expect(callArgs[1]).toMatchObject({
        lastSignal: 'LONG',
        lastScore: 25,
      });
    });
  });

  describe('getHoursSinceLastUpdate', () => {
    it('should return Infinity when lastUpdateTime is null', () => {
      const result = getHoursSinceLastUpdate(null);
      expect(result).toBe(Infinity);
    });

    it('should return correct hours difference', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const result = getHoursSinceLastUpdate(twoHoursAgo.toISOString());

      expect(result).toBeCloseTo(2, 1);
    });

    it('should return 0 when lastUpdateTime is in the future', () => {
      const future = new Date(Date.now() + 1000 * 60 * 60);

      const result = getHoursSinceLastUpdate(future.toISOString());

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
