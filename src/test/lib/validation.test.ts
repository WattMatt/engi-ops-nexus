import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  phoneSchema,
  uuidSchema,
  requiredStringSchema,
  positiveNumberSchema,
  percentageSchema,
  isValidEmail,
  isValidUuid,
  isValidUrl,
  isNonEmptyString,
  isPositiveNumber,
  sanitizeString,
  sanitizeFileName,
  validateForm,
  getFirstError,
  parseNumber,
  parseCurrency,
  clamp,
} from '@/lib/validation';
import { z } from 'zod';

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('validates correct emails', () => {
      expect(emailSchema.safeParse('test@example.com').success).toBe(true);
      expect(emailSchema.safeParse('user.name@domain.co.uk').success).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(emailSchema.safeParse('invalid').success).toBe(false);
      expect(emailSchema.safeParse('no@').success).toBe(false);
      expect(emailSchema.safeParse('@nodomain.com').success).toBe(false);
    });

    it('trims whitespace', () => {
      const result = emailSchema.parse('  test@example.com  ');
      expect(result).toBe('test@example.com');
    });
  });

  describe('phoneSchema', () => {
    it('validates correct phone numbers', () => {
      expect(phoneSchema.safeParse('0123456789').success).toBe(true);
      expect(phoneSchema.safeParse('+27 12 345 6789').success).toBe(true);
      expect(phoneSchema.safeParse('(012) 345-6789').success).toBe(true);
    });

    it('allows empty string', () => {
      expect(phoneSchema.safeParse('').success).toBe(true);
    });

    it('rejects invalid phones', () => {
      expect(phoneSchema.safeParse('abc').success).toBe(false);
    });
  });

  describe('uuidSchema', () => {
    it('validates correct UUIDs', () => {
      expect(uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
    });

    it('rejects invalid UUIDs', () => {
      expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
      expect(uuidSchema.safeParse('123').success).toBe(false);
    });
  });

  describe('requiredStringSchema', () => {
    it('validates non-empty strings', () => {
      expect(requiredStringSchema.safeParse('hello').success).toBe(true);
    });

    it('rejects empty strings', () => {
      expect(requiredStringSchema.safeParse('').success).toBe(false);
      expect(requiredStringSchema.safeParse('   ').success).toBe(false);
    });
  });

  describe('positiveNumberSchema', () => {
    it('validates positive numbers', () => {
      expect(positiveNumberSchema.safeParse(1).success).toBe(true);
      expect(positiveNumberSchema.safeParse(0.5).success).toBe(true);
    });

    it('rejects zero and negative numbers', () => {
      expect(positiveNumberSchema.safeParse(0).success).toBe(false);
      expect(positiveNumberSchema.safeParse(-1).success).toBe(false);
    });
  });

  describe('percentageSchema', () => {
    it('validates percentages 0-100', () => {
      expect(percentageSchema.safeParse(0).success).toBe(true);
      expect(percentageSchema.safeParse(50).success).toBe(true);
      expect(percentageSchema.safeParse(100).success).toBe(true);
    });

    it('rejects out of range', () => {
      expect(percentageSchema.safeParse(-1).success).toBe(false);
      expect(percentageSchema.safeParse(101).success).toBe(false);
    });
  });
});

describe('Validation Helper Functions', () => {
  describe('isValidEmail', () => {
    it('returns true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('returns false for invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
    });
  });

  describe('isValidUuid', () => {
    it('returns true for valid UUIDs', () => {
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('returns false for invalid UUIDs', () => {
      expect(isValidUuid('not-valid')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('returns true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('returns false for invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('returns true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
    });

    it('returns false for empty or whitespace strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
    });

    it('returns false for non-strings', () => {
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('returns true for positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(0.001)).toBe(true);
    });

    it('returns false for zero and negative numbers', () => {
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-1)).toBe(false);
    });

    it('returns false for NaN and non-numbers', () => {
      expect(isPositiveNumber(NaN)).toBe(false);
      expect(isPositiveNumber('5' as unknown)).toBe(false);
    });
  });
});

describe('Sanitization Functions', () => {
  describe('sanitizeString', () => {
    it('escapes HTML characters', () => {
      expect(sanitizeString('<script>')).toBe('&lt;script&gt;');
      expect(sanitizeString('"quoted"')).toBe('&quot;quoted&quot;');
      expect(sanitizeString("'single'")).toBe('&#039;single&#039;');
    });
  });

  describe('sanitizeFileName', () => {
    it('removes invalid characters', () => {
      expect(sanitizeFileName('file<name>.txt')).toBe('file_name_.txt');
      expect(sanitizeFileName('path/to\\file')).toBe('path_to_file');
    });

    it('replaces spaces with underscores', () => {
      expect(sanitizeFileName('my file name.txt')).toBe('my_file_name.txt');
    });

    it('collapses multiple underscores', () => {
      expect(sanitizeFileName('file___name')).toBe('file_name');
    });

    it('truncates long names', () => {
      const longName = 'a'.repeat(300);
      expect(sanitizeFileName(longName).length).toBe(200);
    });
  });
});

describe('Form Validation', () => {
  const testSchema = z.object({
    name: z.string().min(1, 'Name required'),
    age: z.number().min(0, 'Age must be positive'),
  });

  describe('validateForm', () => {
    it('returns isValid true for valid data', () => {
      const result = validateForm(testSchema, { name: 'John', age: 25 });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('returns errors for invalid data', () => {
      const result = validateForm(testSchema, { name: '', age: -1 });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Name required');
      expect(result.errors.age).toBe('Age must be positive');
    });
  });

  describe('getFirstError', () => {
    it('returns first error message', () => {
      const errors = { name: 'Name error', age: 'Age error' };
      expect(getFirstError(errors)).toBe('Name error');
    });

    it('returns null for empty errors', () => {
      expect(getFirstError({})).toBeNull();
    });
  });
});

describe('Number Parsing', () => {
  describe('parseNumber', () => {
    it('parses valid number strings', () => {
      expect(parseNumber('123')).toBe(123);
      expect(parseNumber('45.67')).toBe(45.67);
      expect(parseNumber('-89')).toBe(-89);
    });

    it('returns number as-is', () => {
      expect(parseNumber(123)).toBe(123);
    });

    it('returns null for invalid input', () => {
      expect(parseNumber('')).toBeNull();
      expect(parseNumber(null)).toBeNull();
      expect(parseNumber(undefined)).toBeNull();
      expect(parseNumber('abc')).toBeNull();
      expect(parseNumber(NaN)).toBeNull();
    });

    it('strips non-numeric characters', () => {
      expect(parseNumber('$100')).toBe(100);
      expect(parseNumber('1,000')).toBe(1000);
    });
  });

  describe('parseCurrency', () => {
    it('parses currency strings', () => {
      expect(parseCurrency('R 1,234.56')).toBe(1234.56);
      expect(parseCurrency('$100')).toBe(100);
      expect(parseCurrency('€ 50.00')).toBe(50);
    });

    it('returns null for empty input', () => {
      expect(parseCurrency('')).toBeNull();
    });
  });

  describe('clamp', () => {
    it('clamps value between min and max', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });
});
