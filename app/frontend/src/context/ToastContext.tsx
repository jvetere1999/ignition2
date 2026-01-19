'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Notification/Toast system
 *
 * Provides a centralized way to display notifications across the application
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // 0 = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Toast provider component
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000, // Default 5 second duration
      dismissible: toast.dismissible ?? true,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove toast after duration (if duration > 0)
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods for specific toast types
  const success = useCallback(
    (title: string, message?: string, duration?: number): string => {
      return addToast({ type: 'success', title, message, duration });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number): string => {
      return addToast({ type: 'error', title, message, duration });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number): string => {
      return addToast({ type: 'warning', title, message, duration });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number): string => {
      return addToast({ type: 'info', title, message, duration });
    },
    [addToast]
  );

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/**
 * Hook to access toast context
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

/**
 * Convenience hook for simpler usage
 */
export function useNotification() {
  const { success, error, warning, info } = useToast();

  return {
    success,
    error,
    warning,
    info,
  };
}

/**
 * Toast display component
 * Shows all current toasts
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto rounded-lg shadow-lg overflow-hidden transform transition-all"
        >
          <div
            className={`p-4 flex items-start gap-3 ${getBackgroundColor(toast.type)}`}
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(toast.type)}
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className={`font-semibold ${getTextColor(toast.type)}`}>
                {toast.title}
              </h3>
              {toast.message && (
                <p className={`text-sm mt-1 ${getTextColor(toast.type, true)}`}>
                  {toast.message}
                </p>
              )}

              {/* Action button */}
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    removeToast(toast.id);
                  }}
                  className={`mt-2 text-sm font-medium underline hover:no-underline ${getTextColor(
                    toast.type
                  )}`}
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            {/* Dismiss button */}
            {toast.dismissible && (
              <button
                onClick={() => removeToast(toast.id)}
                className={`flex-shrink-0 ${getTextColor(toast.type)}`}
                aria-label="Dismiss"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper functions

function getBackgroundColor(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'bg-green-50';
    case 'error':
      return 'bg-red-50';
    case 'warning':
      return 'bg-amber-50';
    case 'info':
      return 'bg-blue-50';
  }
}

function getTextColor(type: ToastType, subdued = false): string {
  if (subdued) {
    switch (type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-amber-700';
      case 'info':
        return 'text-blue-700';
    }
  }

  switch (type) {
    case 'success':
      return 'text-green-900';
    case 'error':
      return 'text-red-900';
    case 'warning':
      return 'text-amber-900';
    case 'info':
      return 'text-blue-900';
  }
}

function getIcon(type: ToastType): React.ReactNode {
  const iconClass = 'w-5 h-5';

  switch (type) {
    case 'success':
      return (
        <svg className={`${iconClass} text-green-600`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    case 'error':
      return (
        <svg className={`${iconClass} text-red-600`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    case 'warning':
      return (
        <svg className={`${iconClass} text-amber-600`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    case 'info':
      return (
        <svg className={`${iconClass} text-blue-600`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
  }
}
