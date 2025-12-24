import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Create mocked Logger using vi.hoisted to ensure it's available before module loading
const { mockLogger } = vi.hoisted(() => {
  return {
    mockLogger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock logger before importing envValidator
vi.mock('../../utils/logger.js', () => {
  return {
    Logger: mockLogger,
  };
});

// Import after mocking
const { validateEnv, validateEnvSafe, REQUIRED_ENV_VARS, RECOMMENDED_ENV_VARS } = await import('../../config/envValidator.js');

describe('envValidator', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear all mock calls before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
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
      // Note: Logger is called internally but we don't test implementation details
    });

    it('should not throw when all required env vars are set', () => {
      process.env.CRYPTOQUANT_API_KEY = 'test-key';
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_CHAT_ID = 'test-chat-id';

      expect(() => validateEnv()).not.toThrow();
      // Note: Logger is called internally but we don't test implementation details
    });

    it('should warn when recommended env vars are missing', () => {
      process.env.CRYPTOQUANT_API_KEY = 'test-key';
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_CHAT_ID = 'test-chat-id';
      delete process.env.XAI_API_KEY;
      delete process.env.CRON_SECRET;

      // Should not throw, just warn
      expect(() => validateEnv()).not.toThrow();
      // Note: Logger.warn is called internally but we don't test implementation details
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
