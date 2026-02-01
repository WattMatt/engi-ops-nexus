import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AppError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  getErrorMessage,
  getErrorCode,
  tryCatch,
  tryCatchSync,
  ok,
  err,
  toResult,
  withRetry,
  isNetworkError,
  isAuthError,
  isValidationError,
} from '@/lib/errorHandling';

describe('Error Classes', () => {
  it('creates AppError with all properties', () => {
    const error = new AppError('Test error', 'TEST_CODE', 500, { key: 'value' });
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(500);
    expect(error.details).toEqual({ key: 'value' });
    expect(error.name).toBe('AppError');
  });

  it('creates NetworkError with defaults', () => {
    const error = new NetworkError();
    expect(error.message).toBe('Network request failed');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.name).toBe('NetworkError');
  });

  it('creates ValidationError with field', () => {
    const error = new ValidationError('Invalid input', 'email');
    expect(error.message).toBe('Invalid input');
    expect(error.field).toBe('email');
    expect(error.statusCode).toBe(400);
  });

  it('creates AuthenticationError', () => {
    const error = new AuthenticationError();
    expect(error.message).toBe('Authentication required');
    expect(error.statusCode).toBe(401);
  });
});

describe('getErrorMessage', () => {
  it('extracts message from AppError', () => {
    const error = new AppError('App error message');
    expect(getErrorMessage(error)).toBe('App error message');
  });

  it('extracts message from Error', () => {
    const error = new Error('Standard error');
    expect(getErrorMessage(error)).toBe('Standard error');
  });

  it('returns string as-is', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('extracts message from object with message property', () => {
    expect(getErrorMessage({ message: 'Object message' })).toBe('Object message');
  });

  it('extracts message from object with error property', () => {
    expect(getErrorMessage({ error: 'Error string' })).toBe('Error string');
  });

  it('extracts nested error message', () => {
    expect(getErrorMessage({ error: { message: 'Nested message' } })).toBe('Nested message');
  });

  it('returns default for unknown types', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
    expect(getErrorMessage(123)).toBe('An unexpected error occurred');
  });
});

describe('getErrorCode', () => {
  it('extracts code from AppError', () => {
    const error = new AppError('Error', 'MY_CODE');
    expect(getErrorCode(error)).toBe('MY_CODE');
  });

  it('extracts code from object', () => {
    expect(getErrorCode({ code: 'OBJ_CODE' })).toBe('OBJ_CODE');
  });

  it('returns undefined for objects without code', () => {
    expect(getErrorCode(new Error('No code'))).toBeUndefined();
    expect(getErrorCode({ message: 'No code' })).toBeUndefined();
  });
});

describe('tryCatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns value on success', async () => {
    const result = await tryCatch(() => Promise.resolve('success'), { showToast: false });
    expect(result).toBe('success');
  });

  it('returns null on error by default', async () => {
    const result = await tryCatch(() => Promise.reject(new Error('Failed')), { showToast: false });
    expect(result).toBeNull();
  });

  it('returns fallback on error when provided', async () => {
    const result = await tryCatch(
      () => Promise.reject(new Error('Failed')),
      { showToast: false, fallback: 'default' }
    );
    expect(result).toBe('default');
  });

  it('rethrows error when rethrow option is true', async () => {
    await expect(
      tryCatch(() => Promise.reject(new Error('Rethrow me')), { showToast: false, rethrow: true })
    ).rejects.toThrow('Rethrow me');
  });
});

describe('tryCatchSync', () => {
  it('returns value on success', () => {
    const result = tryCatchSync(() => 'sync success', { showToast: false });
    expect(result).toBe('sync success');
  });

  it('returns null on error', () => {
    const result = tryCatchSync(() => { throw new Error('Sync error'); }, { showToast: false });
    expect(result).toBeNull();
  });
});

describe('Result type helpers', () => {
  it('ok creates success result', () => {
    const result = ok('value');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('value');
    }
  });

  it('err creates error result', () => {
    const error = new Error('Failed');
    const result = err(error);
    expect(result.ok).toBe(false);
    expect('error' in result && result.error).toBe(error);
  });

  it('toResult wraps async success', async () => {
    const result = await toResult(() => Promise.resolve('async value'));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('async value');
    }
  });

  it('toResult wraps async error', async () => {
    const result = await toResult(() => Promise.reject(new Error('async error')));
    expect(result.ok).toBe(false);
    expect('error' in result && result.error.message).toBe('async error');
  });
});

describe('withRetry', () => {
  it('returns immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockResolvedValue('success');
    
    const result = await withRetry(fn, { delayMs: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'));
    
    await expect(withRetry(fn, { maxAttempts: 2, delayMs: 10 }))
      .rejects.toThrow('Always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('calls onRetry callback', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Retry'))
      .mockResolvedValue('done');
    
    await withRetry(fn, { delayMs: 10, onRetry });
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it('respects shouldRetry callback', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('No retry'));
    
    await expect(withRetry(fn, { 
      maxAttempts: 3,
      delayMs: 10,
      shouldRetry: () => false 
    })).rejects.toThrow();
    
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('Error type checks', () => {
  it('isNetworkError identifies network errors', () => {
    expect(isNetworkError(new NetworkError())).toBe(true);
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError({ code: 'NETWORK_ERROR' })).toBe(true);
    expect(isNetworkError({ code: 'ECONNREFUSED' })).toBe(true);
    expect(isNetworkError(new Error('Regular error'))).toBe(false);
  });

  it('isAuthError identifies auth errors', () => {
    expect(isAuthError(new AuthenticationError())).toBe(true);
    expect(isAuthError({ status: 401 })).toBe(true);
    expect(isAuthError({ code: 'PGRST301' })).toBe(true);
    expect(isAuthError(new Error('Regular error'))).toBe(false);
  });

  it('isValidationError identifies validation errors', () => {
    expect(isValidationError(new ValidationError('Invalid'))).toBe(true);
    expect(isValidationError({ status: 400 })).toBe(true);
    expect(isValidationError({ code: '22P02' })).toBe(true);
    expect(isValidationError(new Error('Regular error'))).toBe(false);
  });
});
