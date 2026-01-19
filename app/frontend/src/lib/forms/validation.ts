'use client';

import { FieldValues, UseFormSetError } from 'react-hook-form';

/**
 * Form Validation Utilities
 *
 * Provides reusable form validation rules, error handling, and async validation
 */

/**
 * Validation rule result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Email validation regex (RFC 5322 simplified)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Common validation rules
 */
export const ValidationRules = {
  /**
   * Required field validation
   */
  required: (fieldName: string = 'This field'): ValidationResult => {
    return {
      valid: true, // Validation happens in form state
    };
  },

  /**
   * Email format validation
   */
  email: (value: string): ValidationResult => {
    if (!value) {
      return { valid: false, error: 'Email is required' };
    }
    if (!EMAIL_REGEX.test(value)) {
      return { valid: false, error: 'Invalid email format' };
    }
    return { valid: true };
  },

  /**
   * Minimum length validation
   */
  minLength: (value: string, min: number): ValidationResult => {
    if (value.length < min) {
      return {
        valid: false,
        error: `Must be at least ${min} characters`,
      };
    }
    return { valid: true };
  },

  /**
   * Maximum length validation
   */
  maxLength: (value: string, max: number): ValidationResult => {
    if (value.length > max) {
      return {
        valid: false,
        error: `Must be no more than ${max} characters`,
      };
    }
    return { valid: true };
  },

  /**
   * Password strength validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
   */
  strongPassword: (value: string): ValidationResult => {
    if (value.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(value)) {
      return {
        valid: false,
        error: 'Password must contain at least one uppercase letter',
      };
    }
    if (!/[a-z]/.test(value)) {
      return {
        valid: false,
        error: 'Password must contain at least one lowercase letter',
      };
    }
    if (!/[0-9]/.test(value)) {
      return { valid: false, error: 'Password must contain at least one number' };
    }
    return { valid: true };
  },

  /**
   * URL validation
   */
  url: (value: string): ValidationResult => {
    try {
      new URL(value);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  },

  /**
   * Number range validation
   */
  range: (value: number, min: number, max: number): ValidationResult => {
    if (value < min || value > max) {
      return {
        valid: false,
        error: `Value must be between ${min} and ${max}`,
      };
    }
    return { valid: true };
  },

  /**
   * Pattern matching validation
   */
  pattern: (value: string, pattern: RegExp, message: string): ValidationResult => {
    if (!pattern.test(value)) {
      return { valid: false, error: message };
    }
    return { valid: true };
  },
};

/**
 * Combine multiple validation rules
 */
export function validateWithRules(
  value: string | number,
  rules: ((v: string | number) => ValidationResult)[]
): ValidationResult {
  for (const rule of rules) {
    const result = rule(value);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}

/**
 * Field error formatter for displaying errors
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Format server errors for react-hook-form
 */
export function formatServerErrors<T extends FieldValues>(
  errors: FieldError[]
): Partial<Record<keyof T, { message: string }>> {
  const formatted: Partial<Record<keyof T, { message: string }>> = {};

  for (const error of errors) {
    formatted[error.field as keyof T] = { message: error.message };
  }

  return formatted;
}

/**
 * Apply server validation errors to form
 */
export async function applyServerValidation<T extends FieldValues>(
  response: Response,
  setError: UseFormSetError<T>
): Promise<void> {
  if (!response.ok) {
    try {
      const data = (await response.json()) as {
        error?: { details?: Array<{ field: string; message: string }>; message: string };
      };

      // Handle field-specific errors
      if (data.error?.details && Array.isArray(data.error.details)) {
        for (const detail of data.error.details) {
          setError(detail.field as never, {
            type: 'server',
            message: detail.message,
          });
        }
      }

      // Handle general error
      if (data.error?.message) {
        setError('root' as never, {
          type: 'server',
          message: data.error.message,
        });
      }
    } catch (e) {
      setError('root' as never, {
        type: 'server',
        message: 'An unexpected error occurred',
      });
    }
  }
}

/**
 * Async validation helper (e.g., check if email already exists)
 */
export async function validateAsync(
  value: string,
  validator: (value: string) => Promise<ValidationResult>
): Promise<ValidationResult> {
  return validator(value);
}

/**
 * Debounce async validation to avoid excessive API calls
 */
export function createDebouncedValidator(
  validator: (value: string) => Promise<ValidationResult>,
  delayMs: number = 500
) {
  let timeoutId: NodeJS.Timeout;

  return async (value: string): Promise<ValidationResult> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const result = await validator(value);
        resolve(result);
      }, delayMs);
    });
  };
}

/**
 * Common password field validation
 */
export const createPasswordValidator = () => {
  return (value: string): ValidationResult => {
    if (!value) {
      return { valid: false, error: 'Password is required' };
    }
    return ValidationRules.strongPassword(value);
  };
};

/**
 * Common email field validation
 */
export const createEmailValidator = () => {
  return (value: string): ValidationResult => {
    return ValidationRules.email(value);
  };
};
