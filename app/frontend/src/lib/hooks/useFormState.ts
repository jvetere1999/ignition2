/**
 * Custom Form State Management Hook
 *
 * Provides complete form management with validation, error handling,
 * submission logic, and state tracking. Works seamlessly with Zod or Yup schemas.
 */

import { useState, useCallback, useRef } from 'react';

interface FormFieldState {
  value: unknown;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

interface FormState {
  [fieldName: string]: FormFieldState;
}

interface UseFormOptions<T extends Record<string, unknown>> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void>;
  validate?: (values: T) => Promise<Record<string, string>>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface FormHelpers<T extends Record<string, unknown>> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  dirty: boolean;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * useForm hook for complete form management
 */
export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>
): [
  FormHelpers<T>,
  {
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
    setFieldValue: (field: keyof T, value: unknown) => void;
    setFieldError: (field: keyof T, error: string) => void;
    setFieldTouched: (field: keyof T, touched: boolean) => void;
    reset: () => void;
    resetField: (field: keyof T) => void;
  },
] {
  const [formState, setFormState] = useState<FormState>(() => {
    const initial: FormState = {};
    for (const [key, value] of Object.entries(options.initialValues)) {
      initial[key] = {
        value,
        error: null,
        touched: false,
        dirty: false,
      };
    }
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasErrors = useRef(false);

  // Extract current values
  const values = useCallback(() => {
    const result: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(formState)) {
      result[key] = field.value;
    }
    return result as T;
  }, [formState])();

  // Extract errors
  const errors = useCallback(() => {
    const result: Record<string, string> = {};
    for (const [key, field] of Object.entries(formState)) {
      if (field.error) {
        result[key] = field.error;
      }
    }
    return result;
  }, [formState])();

  // Extract touched
  const touched = useCallback(() => {
    const result: Record<string, boolean> = {};
    for (const [key, field] of Object.entries(formState)) {
      result[key] = field.touched;
    }
    return result;
  }, [formState])();

  // Check if form has any errors
  const isValid = Object.values(errors).length === 0;

  // Check if form has any dirty fields
  const isDirty = Object.values(formState).some((field) => field.dirty);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const fieldValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

      setFormState((prev) => ({
        ...prev,
        [name]: {
          ...prev[name],
          value: fieldValue,
          dirty: true,
        },
      }));
    },
    []
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name } = e.target;

      setFormState((prev) => ({
        ...prev,
        [name]: {
          ...prev[name],
          touched: true,
        },
      }));
    },
    []
  );

  const setFieldValue = useCallback((field: keyof T, value: unknown) => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field as string],
        value,
        dirty: true,
      },
    }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field as string],
        error,
      },
    }));
  }, []);

  const setFieldTouched = useCallback((field: keyof T, touched: boolean) => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field as string],
        touched,
      },
    }));
  }, []);

  const reset = useCallback(() => {
    setFormState((prev) => {
      const reset: FormState = {};
      for (const [key, field] of Object.entries(prev)) {
        reset[key] = {
          ...field,
          value: options.initialValues[key as keyof T],
          error: null,
          touched: false,
          dirty: false,
        };
      }
      return reset;
    });
  }, [options.initialValues]);

  const resetField = useCallback((field: keyof T) => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        value: options.initialValues[field],
        error: null,
        touched: false,
        dirty: false,
      },
    }));
  }, [options.initialValues]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      try {
        setIsSubmitting(true);

        // Validate if validator provided
        if (options.validate) {
          const validationErrors = await options.validate(values);

          if (Object.keys(validationErrors).length > 0) {
            setFormState((prev) => {
              const updated = { ...prev };
              for (const [field, error] of Object.entries(validationErrors)) {
                if (updated[field]) {
                  updated[field] = {
                    ...updated[field],
                    error,
                    touched: true,
                  };
                }
              }
              return updated;
            });
            hasErrors.current = true;
            return;
          }
        }

        // Submit form
        await options.onSubmit(values);

        // Reset form on successful submission
        reset();

        if (options.onSuccess) {
          options.onSuccess();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        if (options.onError) {
          options.onError(err);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, options, reset]
  );

  return [
    {
      values,
      errors,
      touched,
      dirty: isDirty,
      isSubmitting,
      isValid,
    },
    {
      handleChange,
      handleBlur,
      handleSubmit,
      setFieldValue,
      setFieldError,
      setFieldTouched,
      reset,
      resetField,
    },
  ];
}

/**
 * useFieldArray hook for managing dynamic form fields
 */
export function useFieldArray<T extends Record<string, unknown>>(
  initialValue: T[] = []
): [
  T[],
  {
    append: (value: T) => void;
    remove: (index: number) => void;
    insert: (index: number, value: T) => void;
    move: (from: number, to: number) => void;
    swap: (indexA: number, indexB: number) => void;
    replace: (index: number, value: T) => void;
    reset: () => void;
  },
] {
  const [fields, setFields] = useState<T[]>(initialValue);

  const append = useCallback((value: T) => {
    setFields((prev) => [...prev, value]);
  }, []);

  const remove = useCallback((index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const insert = useCallback((index: number, value: T) => {
    setFields((prev) => {
      const updated = [...prev];
      updated.splice(index, 0, value);
      return updated;
    });
  }, []);

  const move = useCallback((from: number, to: number) => {
    setFields((prev) => {
      const updated = [...prev];
      const item = updated[from];
      updated.splice(from, 1);
      updated.splice(to, 0, item);
      return updated;
    });
  }, []);

  const swap = useCallback((indexA: number, indexB: number) => {
    setFields((prev) => {
      const updated = [...prev];
      [updated[indexA], updated[indexB]] = [updated[indexB], updated[indexA]];
      return updated;
    });
  }, []);

  const replace = useCallback((index: number, value: T) => {
    setFields((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    setFields(initialValue);
  }, [initialValue]);

  return [
    fields,
    {
      append,
      remove,
      insert,
      move,
      swap,
      replace,
      reset,
    },
  ];
}

/**
 * Form validation utilities
 */
export const formValidators = {
  /**
   * Required field validator
   */
  required: (value: unknown): string | null => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return 'This field is required';
    }
    return null;
  },

  /**
   * Email validator
   */
  email: (value: unknown): string | null => {
    if (!value) return null;
    const email = String(value);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email';
    }
    return null;
  },

  /**
   * Min length validator
   */
  minLength: (min: number) => (value: unknown): string | null => {
    if (!value) return null;
    if (String(value).length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  /**
   * Max length validator
   */
  maxLength: (max: number) => (value: unknown): string | null => {
    if (!value) return null;
    if (String(value).length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },

  /**
   * Number range validator
   */
  range: (min: number, max: number) => (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      return `Must be between ${min} and ${max}`;
    }
    return null;
  },

  /**
   * Pattern validator (regex)
   */
  pattern: (pattern: RegExp, message?: string) => (value: unknown): string | null => {
    if (!value) return null;
    if (!pattern.test(String(value))) {
      return message || 'Invalid format';
    }
    return null;
  },
};
