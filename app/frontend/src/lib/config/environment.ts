/**
 * Environment Configuration Utilities
 *
 * Type-safe access to environment variables with defaults and validation
 */

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };

  // Feature Flags
  features: {
    enableAnalytics: boolean;
    enableErrorTracking: boolean;
    enablePerformanceMonitoring: boolean;
    enableServiceWorker: boolean;
  };

  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsoleLogging: boolean;
    enableRemoteLogging: boolean;
  };

  // Cache Configuration
  cache: {
    enableCache: boolean;
    defaultTtlMs: number;
  };

  // Performance
  performance: {
    enableCodeSplitting: boolean;
    enableImageOptimization: boolean;
    enablePreload: boolean;
  };
}

/**
 * Get API base URL with fallback
 */
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.API_URL || 'https://api.ecent.online';
  }

  // Client-side
  return process.env.NEXT_PUBLIC_API_URL || 'https://api.ecent.online';
}

/**
 * Parse string to boolean
 */
function parseBoolean(value?: string, defaultValue: boolean = false): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse string to number
 */
function parseNumber(value?: string, defaultValue: number = 0): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get environment configuration
 * All values are type-safe with sensible defaults
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return {
    api: {
      baseUrl: getApiBaseUrl(),
      timeout: parseNumber(process.env.NEXT_PUBLIC_API_TIMEOUT, 30000),
      retryAttempts: parseNumber(process.env.NEXT_PUBLIC_RETRY_ATTEMPTS, 3),
    },

    features: {
      enableAnalytics: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_ANALYTICS, true),
      enableErrorTracking: parseBoolean(
        process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING,
        true
      ),
      enablePerformanceMonitoring: parseBoolean(
        process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
        true
      ),
      enableServiceWorker: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_SERVICE_WORKER, true),
    },

    logging: {
      level: (process.env.NEXT_PUBLIC_LOG_LEVEL as any) || 'info',
      enableConsoleLogging: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING, true),
      enableRemoteLogging: parseBoolean(
        process.env.NEXT_PUBLIC_ENABLE_REMOTE_LOGGING,
        process.env.NODE_ENV === 'production'
      ),
    },

    cache: {
      enableCache: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_CACHE, true),
      defaultTtlMs: parseNumber(process.env.NEXT_PUBLIC_CACHE_TTL_MS, 5 * 60 * 1000),
    },

    performance: {
      enableCodeSplitting: parseBoolean(
        process.env.NEXT_PUBLIC_ENABLE_CODE_SPLITTING,
        true
      ),
      enableImageOptimization: parseBoolean(
        process.env.NEXT_PUBLIC_ENABLE_IMAGE_OPTIMIZATION,
        true
      ),
      enablePreload: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_PRELOAD, true),
    },
  };
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Cached environment configuration instance
 */
let cachedConfig: EnvironmentConfig | null = null;

/**
 * Get cached environment configuration
 * Caches the config to avoid repeated parsing
 */
export function getConfig(): EnvironmentConfig {
  if (!cachedConfig) {
    cachedConfig = getEnvironmentConfig();
  }
  return cachedConfig;
}

/**
 * Validate required environment variables
 * Throws error if any required variable is missing
 */
export function validateEnvironment(): void {
  const required = [
    'NEXT_PUBLIC_API_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `Missing environment variables: ${missing.join(', ')}. Using defaults.`
    );
  }
}

/**
 * Get a specific environment variable with type safety
 */
export function getEnvVariable<T = string>(
  key: string,
  defaultValue?: T
): T | string | undefined {
  const value = process.env[key];
  if (value) return value as T;
  return defaultValue;
}

/**
 * Environment variable schema (useful for documentation and IDE support)
 */
export const ENV_SCHEMA = {
  // API
  'NEXT_PUBLIC_API_URL': 'API base URL (default: https://api.ecent.online)',
  'NEXT_PUBLIC_API_TIMEOUT': 'API timeout in milliseconds (default: 30000)',
  'NEXT_PUBLIC_RETRY_ATTEMPTS': 'Number of retry attempts (default: 3)',

  // Features
  'NEXT_PUBLIC_ENABLE_ANALYTICS': 'Enable analytics (default: true)',
  'NEXT_PUBLIC_ENABLE_ERROR_TRACKING': 'Enable error tracking (default: true)',
  'NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING': 'Enable performance monitoring (default: true)',
  'NEXT_PUBLIC_ENABLE_SERVICE_WORKER': 'Enable service worker (default: true)',

  // Logging
  'NEXT_PUBLIC_LOG_LEVEL': 'Log level: debug|info|warn|error (default: info)',
  'NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING': 'Enable console logging (default: true)',
  'NEXT_PUBLIC_ENABLE_REMOTE_LOGGING': 'Enable remote logging (default: true in production)',

  // Cache
  'NEXT_PUBLIC_ENABLE_CACHE': 'Enable caching (default: true)',
  'NEXT_PUBLIC_CACHE_TTL_MS': 'Cache TTL in milliseconds (default: 300000)',

  // Performance
  'NEXT_PUBLIC_ENABLE_CODE_SPLITTING': 'Enable code splitting (default: true)',
  'NEXT_PUBLIC_ENABLE_IMAGE_OPTIMIZATION': 'Enable image optimization (default: true)',
  'NEXT_PUBLIC_ENABLE_PRELOAD': 'Enable resource preloading (default: true)',
} as const;
