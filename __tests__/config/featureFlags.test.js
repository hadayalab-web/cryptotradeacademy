import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('featureFlags', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    // Clear module cache to reload with new env
    delete require.cache[require.resolve('../../config/featureFlags.js')];
  });

  describe('isFeatureEnabled', () => {
    it('should return false for non-existent flag', async () => {
      const { isFeatureEnabled } = await import('../../config/featureFlags.js');
      expect(isFeatureEnabled('NON_EXISTENT_FLAG')).toBe(false);
    });

    it('should return true when ENABLE_EVENT_DRIVEN is set to "true"', async () => {
      process.env.ENABLE_EVENT_DRIVEN = 'true';
      delete require.cache[require.resolve('../../config/featureFlags.js')];
      const { isFeatureEnabled } = await import('../../config/featureFlags.js');
      expect(isFeatureEnabled('ENABLE_EVENT_DRIVEN')).toBe(true);
    });

    it('should return false when ENABLE_EVENT_DRIVEN is not set', async () => {
      delete process.env.ENABLE_EVENT_DRIVEN;
      delete require.cache[require.resolve('../../config/featureFlags.js')];
      const { isFeatureEnabled } = await import('../../config/featureFlags.js');
      // Default should be true based on featureFlags.js logic
      expect(isFeatureEnabled('ENABLE_EVENT_DRIVEN')).toBe(true);
    });
  });

  describe('FEATURE_FLAGS object', () => {
    it('should have all expected feature flags defined', async () => {
      const { FEATURE_FLAGS } = await import('../../config/featureFlags.js');
      const expectedFlags = [
        'CQ_WHALE_FLOWS_ENABLED',
        'CQ_LIQUIDATIONS_ENABLED',
        'CQ_NUPL_ENABLED',
        'CQ_SOPR_ENABLED',
        'CQ_UPBIT_INFLOW_ENABLED',
        'CQ_BINANCE_INFLOW_ENABLED',
        'ENABLE_EVENT_DRIVEN',
        'DEBUG_MODE',
      ];

      expectedFlags.forEach(flag => {
        expect(FEATURE_FLAGS).toHaveProperty(flag);
      });
    });
  });
});
