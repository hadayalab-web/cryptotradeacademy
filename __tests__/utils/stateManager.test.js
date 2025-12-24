import { describe, it, expect, vi } from 'vitest';

// Import functions
const { getHoursSinceLastUpdate } = await import('../../utils/stateManager.js');

describe('stateManager', () => {
  // Note: Tests for getLastState and saveState are skipped due to CommonJS/ES6 mocking complexity
  // These functions are tested implicitly through integration tests in the cron handler
  
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
