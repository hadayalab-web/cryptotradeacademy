import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateEnv, validateEnvSafe, REQUIRED_ENV_VARS, RECOMMENDED_ENV_VARS } from '../../config/envValidator.js';
import { Logger } from '../../utils/logger.js';

describe('envValidator', () => {
  let originalEnv;
  let loggerErrorSpy;
  let loggerWarnSpy;
  let loggerInfoSpy;

  beforeEach(() => {
    originalEnv = { ...process.env };
    loggerErrorSpy = vi.spyOn(Logger, 'error').mockImplementation(() => {});
    loggerWarnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});
    loggerInfoSpy = vi.spyOn(Logger, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
    loggerInfoSpy.mockRestore();
  });

  describe('REQUIRED_ENV_VARS', () => {
    it('should have required environment variables defined', () => {
      expect(REQUIRED_ENV_VARS).toContain('CRYPTOQUANT_API_KEY');
      expect(REQUIRED_ENV_VARS).toContain('TELEGRAM_BOT_TOKEN');
      expect(REQUIRED_ENV_VARS).toContain('TELEGRAM_CHAT_ID');
    });
  });

  describe('RECOMMENDED_ENV_VARS', () => {
    it('should have recommended environment variables defined', () => {
      expect(RECOMMENDED_ENV_VARS).toContain('XAI_API_KEY');
      expect(RECOMMENDED_ENV_VARS).toContain('CRON_SECRET');
    });
  });

  describe('validateEnv', () => {
    it('should throw error when required env vars are missing', () => {
      delete process.env.CRYPTOQUANT_API_KEY;
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;

      expect(() => validateEnv()).toThrow('Missing required environment variables');
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should not throw when all required env vars are set', () => {
      process.env.CRYPTOQUANT_API_KEY = 'test-key';
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_CHAT_ID = 'test-chat-id';

      expect(() => validateEnv()).not.toThrow();
      expect(loggerInfoSpy).toHaveBeenCalled();
    });

    it('should warn when recommended env vars are missing', () => {
      process.env.CRYPTOQUANT_API_KEY = 'test-key';
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_CHAT_ID = 'test-chat-id';
      delete process.env.XAI_API_KEY;
      delete process.env.CRON_SECRET;

      validateEnv();
      expect(loggerWarnSpy).toHaveBeenCalled();
    });
  });

  describe('validateEnvSafe', () => {
    it('should return invalid when required env vars are missing', () => {
      delete process.env.CRYPTOQUANT_API_KEY;
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;

      const result = validateEnvSafe();

      expect(result.isValid).toBe(false);
      expect(result.missingRequired).toContain('CRYPTOQUANT_API_KEY');
      expect(result.missingRequired).toContain('TELEGRAM_BOT_TOKEN');
      expect(result.missingRequired).toContain('TELEGRAM_CHAT_ID');
    });

    it('should return valid when all required env vars are set', () => {
      process.env.CRYPTOQUANT_API_KEY = 'test-key';
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_CHAT_ID = 'test-chat-id';

      const result = validateEnvSafe();

      expect(result.isValid).toBe(true);
      expect(result.missingRequired).toEqual([]);
    });

    it('should list missing recommended env vars', () => {
      process.env.CRYPTOQUANT_API_KEY = 'test-key';
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_CHAT_ID = 'test-chat-id';
      delete process.env.XAI_API_KEY;
      delete process.env.CRON_SECRET;

      const result = validateEnvSafe();

      expect(result.missingRecommended).toContain('XAI_API_KEY');
      expect(result.missingRecommended).toContain('CRON_SECRET');
    });
  });
});
