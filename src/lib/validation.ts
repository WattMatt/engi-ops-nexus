/**
 * Common Validation Utilities
 * Provides reusable validation functions and schemas
 */

import { z } from 'zod';

// ============================================
// Common Validation Schemas
// ============================================

/** Email validation */
export const emailSchema = z
  .string()
  .trim()
  .email({ message: 'Invalid email address' })
  .max(255, { message: 'Email must be less than 255 characters' });

/** Phone number validation (flexible) */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[\d\s\-\+\(\)]+$/, { message: 'Invalid phone number format' })
  .min(10, { message: 'Phone number too short' })
  .max(20, { message: 'Phone number too long' })
  .optional()
  .or(z.literal(''));

/** URL validation */
export const urlSchema = z
  .string()
  .trim()
  .url({ message: 'Invalid URL' })
  .max(2048, { message: 'URL too long' });

/** UUID validation */
export const uuidSchema = z
  .string()
  .uuid({ message: 'Invalid ID format' });

/** Non-empty string */
export const requiredStringSchema = z
  .string()
  .trim()
  .min(1, { message: 'This field is required' });

/** Positive number */
export const positiveNumberSchema = z
  .number()
  .positive({ message: 'Must be a positive number' });

/** Non-negative number */
export const nonNegativeNumberSchema = z
  .number()
  .nonnegative({ message: 'Cannot be negative' });

/** Percentage (0-100) */
export const percentageSchema = z
  .number()
  .min(0, { message: 'Cannot be less than 0%' })
  .max(100, { message: 'Cannot exceed 100%' });

/** Currency amount */
export const currencySchema = z
  .number()
  .multipleOf(0.01, { message: 'Maximum 2 decimal places' });

/** Date string (ISO format) */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, { message: 'Invalid date format' });

/** File name validation */
export const fileNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'File name is required' })
  .max(255, { message: 'File name too long' })
  .regex(/^[^<>:"/\\|?*]+$/, { message: 'File name contains invalid characters' });

// ============================================
// Entity Schemas
// ============================================

export const projectFormSchema = z.object({
  name: requiredStringSchema.max(200, { message: 'Name too long' }),
  project_number: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['active', 'pending', 'completed', 'on_hold', 'cancelled']).optional(),
  client_id: uuidSchema.optional().nullable(),
  start_date: dateStringSchema.optional().nullable(),
  end_date: dateStringSchema.optional().nullable(),
});

export const userFormSchema = z.object({
  email: emailSchema,
  full_name: requiredStringSchema.max(100, { message: 'Name too long' }),
  phone: phoneSchema,
  role: z.string().optional(),
});

export const addressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

// ============================================
// Validation Helper Functions
// ============================================

/**
 * Check if a string is a valid email
 */
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUuid(id: string): boolean {
  return uuidSchema.safeParse(id).success;
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  return urlSchema.safeParse(url).success;
}

/**
 * Check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && value > 0;
}

/**
 * Sanitize a string for safe display
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize file name for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 200);
}

// ============================================
// Form Validation Helpers
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate form data against a Zod schema
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { isValid: true, errors: {} };
  }
  
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  
  return { isValid: false, errors };
}

/**
 * Get first error message from validation result
 */
export function getFirstError(errors: Record<string, string>): string | null {
  const keys = Object.keys(errors);
  return keys.length > 0 ? errors[keys[0]] : null;
}

// ============================================
// Number Formatting Validators
// ============================================

/**
 * Parse a string to a number, returning null for invalid input
 */
export function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  const cleaned = value.replace(/[^0-9.\-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse a currency string to a number
 */
export function parseCurrency(value: string): number | null {
  if (!value) return null;
  
  // Remove currency symbols and thousands separators
  const cleaned = value.replace(/[R$€£,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
