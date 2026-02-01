/**
 * Centralized Error Handling Utilities
 * Provides consistent error handling patterns across the application
 */

import { toast } from "sonner";

// ============================================
// Error Types
// ============================================

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Network request failed', details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 0, details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Permission denied') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

// ============================================
// Error Message Extraction
// ============================================

/**
 * Extract a user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    // Handle Supabase error format
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    
    // Handle error with details
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
    
    // Handle nested error
    if ('error' in error && error.error && typeof error.error === 'object' && 'message' in error.error) {
      return String(error.error.message);
    }
  }
  
  return 'An unexpected error occurred';
}

/**
 * Extract error code from error
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof AppError) {
    return error.code;
  }
  
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  
  return undefined;
}

// ============================================
// Error Handling Wrappers
// ============================================

interface TryCatchOptions {
  /** Show toast notification on error */
  showToast?: boolean;
  /** Custom error message for toast */
  toastMessage?: string;
  /** Log error to console */
  logError?: boolean;
  /** Rethrow the error after handling */
  rethrow?: boolean;
  /** Fallback value to return on error */
  fallback?: unknown;
}

/**
 * Wrap an async function with standardized error handling
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  options: TryCatchOptions = {}
): Promise<T | null> {
  const {
    showToast = true,
    toastMessage,
    logError = true,
    rethrow = false,
    fallback = null,
  } = options;

  try {
    return await fn();
  } catch (error) {
    const message = toastMessage || getErrorMessage(error);
    
    if (logError) {
      console.error('[Error]', error);
    }
    
    if (showToast) {
      toast.error(message);
    }
    
    if (rethrow) {
      throw error;
    }
    
    return fallback as T | null;
  }
}

/**
 * Wrap a sync function with standardized error handling
 */
export function tryCatchSync<T>(
  fn: () => T,
  options: TryCatchOptions = {}
): T | null {
  const {
    showToast = true,
    toastMessage,
    logError = true,
    rethrow = false,
    fallback = null,
  } = options;

  try {
    return fn();
  } catch (error) {
    const message = toastMessage || getErrorMessage(error);
    
    if (logError) {
      console.error('[Error]', error);
    }
    
    if (showToast) {
      toast.error(message);
    }
    
    if (rethrow) {
      throw error;
    }
    
    return fallback as T | null;
  }
}

// ============================================
// Result Type Pattern
// ============================================

export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Execute an async operation and return a Result type
 */
export async function toResult<T>(
  fn: () => Promise<T>
): Promise<Result<T, Error>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(getErrorMessage(error)));
  }
}

/**
 * Execute a sync operation and return a Result type
 */
export function toResultSync<T>(fn: () => T): Result<T, Error> {
  try {
    const value = fn();
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(getErrorMessage(error)));
  }
}

// ============================================
// Retry Logic
// ============================================

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: 'linear' | 'exponential';
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

/**
 * Retry an async operation with configurable backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = 'exponential',
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      onRetry?.(error, attempt);

      const delay = backoff === 'exponential' 
        ? delayMs * Math.pow(2, attempt - 1)
        : delayMs * attempt;

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ============================================
// Error Boundary Helpers
// ============================================

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String(error.code);
    return code === 'NETWORK_ERROR' || code === 'ECONNREFUSED';
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AuthenticationError) return true;
  if (error && typeof error === 'object') {
    if ('status' in error && error.status === 401) return true;
    if ('code' in error && error.code === 'PGRST301') return true;
  }
  return false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof ValidationError) return true;
  if (error && typeof error === 'object') {
    if ('status' in error && error.status === 400) return true;
    if ('code' in error && String(error.code).startsWith('22')) return true; // Postgres data exceptions
  }
  return false;
}

// ============================================
// Logging Utilities
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

const isDev = import.meta.env.DEV;

/**
 * Structured logging utility
 */
export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  if (isDev) {
    const method = level === 'debug' ? 'log' : level;
    console[method](`[${level.toUpperCase()}]`, message, context || '');
  }

  // In production, you would send this to a logging service
}

/**
 * Log error with stack trace
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const message = getErrorMessage(error);
  const errorObj = error instanceof Error ? error : new Error(message);

  if (isDev) {
    console.error('[ERROR]', message, context || '', errorObj);
  }
}
