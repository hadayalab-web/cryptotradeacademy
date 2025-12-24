import { describe, it, expect } from 'vitest';
import { getMarketProfile } from '../../config/marketProfiles.js';

describe('marketProfiles', () => {
  describe('getMarketProfile', () => {
    it('should return EN profile for EN market', () => {
      const profile = getMarketProfile('EN');

      expect(profile).toMatchObject({
        persona: 'PRECISION_SNIPER',
        brandName: 'CryptoTrade Academy',
        tagline: expect.any(String),
        algorithm: expect.any(Object),
        eventTriggers: expect.any(Object),
        pricing: expect.any(Object),
      });
    });

    it('should return AR profile for AR market', () => {
      const profile = getMarketProfile('AR');

      expect(profile).toMatchObject({
        persona: 'SHIELD_WALL',
        brandName: 'MaaliGuard',
        islamicCompliant: true,
      });
    });

    it('should return KO profile for KO market', () => {
      const profile = getMarketProfile('KO');

      expect(profile).toMatchObject({
        persona: 'KIMCHI_SNIPER',
        brandName: 'KimchiSniper',
      });
    });

    it('should return JA profile for JA market', () => {
      const profile = getMarketProfile('JA');

      expect(profile).toMatchObject({
        persona: 'KAIZEN_OPTIMIZER',
        brandName: 'Kaizen Trader',
      });
    });

    it('should default to EN profile for invalid market code', () => {
      const profile = getMarketProfile('INVALID');

      expect(profile.persona).toBe('PRECISION_SNIPER');
      expect(profile.brandName).toBe('CryptoTrade Academy');
    });

    it('should have required algorithm parameters for all markets', () => {
      const markets = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];

      markets.forEach(market => {
        const profile = getMarketProfile(market);
        expect(profile.algorithm).toMatchObject({
          HARD_SIGNAL_THRESH: expect.any(Number),
          SOFT_REGIME_THRESH: expect.any(Number),
          MIN_CONF_FOR_TRADE: expect.any(Number),
          BUG_STANDBY_BIAS: expect.any(Number),
        });
      });
    });

    it('should have required event triggers for all markets', () => {
      const markets = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];

      markets.forEach(market => {
        const profile = getMarketProfile(market);
        expect(profile.eventTriggers).toMatchObject({
          EMERGENCY: expect.any(Object),
          WATCH: expect.any(Object),
          STANDBY_BREAK: expect.any(Object),
          REGULAR: expect.any(Object),
        });
      });
    });
  });
});
