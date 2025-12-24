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

// Mock logger before importing errorTracker
vi.mock('../../utils/logger.js', () => {
  return {
    Logger: mockLogger,
  };
});

// Import after mocking
const { ErrorTracker } = await import('../../utils/errorTracker.js');

describe('ErrorTracker', () => {
  beforeEach(() => {
    // Clear all mock calls before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
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
      // Note: Logger.error is called internally but we don't test implementation details
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
      // Note: Logger.warn is called internally but we don't test implementation details
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
