import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger, LOG_LEVELS } from '../../utils/logger.js';

describe('Logger', () => {
  let originalEnv;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    originalEnv = process.env.LOG_LEVEL;
    delete process.env.LOG_LEVEL;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.LOG_LEVEL = originalEnv;
    } else {
      delete process.env.LOG_LEVEL;
    }
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('LOG_LEVELS', () => {
    it('should have correct log level values', () => {
      expect(LOG_LEVELS.DEBUG).toBe(0);
      expect(LOG_LEVELS.INFO).toBe(1);
      expect(LOG_LEVELS.WARN).toBe(2);
      expect(LOG_LEVELS.ERROR).toBe(3);
    });
  });

  describe('Logger.info', () => {
    it('should log info message', () => {
      Logger.info('test-service', 'test message', { key: 'value' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log info message without context', () => {
      Logger.info('test-service', 'test message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Logger.warn', () => {
    it('should log warning message', () => {
      Logger.warn('test-service', 'warning message', { key: 'value' });
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Logger.error', () => {
    it('should log error with Error object', () => {
      const error = new Error('test error');
      Logger.error('test-service', 'error message', error, { key: 'value' });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log error without Error object', () => {
      Logger.error('test-service', 'error message', null, { key: 'value' });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
