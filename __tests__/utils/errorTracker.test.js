import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorTracker } from '../../utils/errorTracker.js';
import { Logger } from '../../utils/logger.js';

describe('ErrorTracker', () => {
  let loggerErrorSpy;
  let loggerWarnSpy;

  beforeEach(() => {
    loggerErrorSpy = vi.spyOn(Logger, 'error').mockImplementation(() => {});
    loggerWarnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  describe('trackError', () => {
    it('should track error with full context', () => {
      const error = new Error('test error');
      error.code = 'TEST_ERROR';
      const context = { endpoint: '/test', params: { id: 1 } };

      const result = ErrorTracker.trackError('test-service', 'test-operation', error, context);

      expect(result).toMatchObject({
        service: 'test-service',
        operation: 'test-operation',
        error: {
          message: 'test error',
          name: 'Error',
          code: 'TEST_ERROR',
        },
        context,
      });
      expect(result.timestamp).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should track error without context', () => {
      const error = new Error('test error');
      const result = ErrorTracker.trackError('test-service', 'test-operation', error);

      expect(result).toMatchObject({
        service: 'test-service',
        operation: 'test-operation',
        context: {},
      });
    });
  });

  describe('trackWarning', () => {
    it('should track warning with context', () => {
      const context = { reason: 'test reason' };
      const result = ErrorTracker.trackWarning('test-service', 'test-operation', 'warning message', context);

      expect(result).toMatchObject({
        service: 'test-service',
        operation: 'test-operation',
        message: 'warning message',
        context,
        level: 'warning',
      });
      expect(result.timestamp).toBeDefined();
      expect(loggerWarnSpy).toHaveBeenCalled();
    });
  });

  describe('createErrorResult', () => {
    it('should create error result with defaults', () => {
      const error = new Error('test error');
      const defaults = { data: null, success: false };

      const result = ErrorTracker.createErrorResult(error, defaults);

      expect(result).toMatchObject({
        ...defaults,
        error: true,
        errorMessage: 'test error',
        errorName: 'Error',
      });
      expect(result.timestamp).toBeDefined();
    });

    it('should create error result without defaults', () => {
      const error = new Error('test error');
      const result = ErrorTracker.createErrorResult(error);

      expect(result).toMatchObject({
        error: true,
        errorMessage: 'test error',
        errorName: 'Error',
      });
    });
  });
});
