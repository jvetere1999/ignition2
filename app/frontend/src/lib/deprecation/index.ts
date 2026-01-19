/**
 * Deprecation Warning System
 *
 * Provides runtime warnings for deprecated APIs, components, and features
 * with migration guidance and sunset dates.
 */

/**
 * Deprecation warning configuration
 */
export interface DeprecationWarning {
  id: string;
  message: string;
  alternative?: string;
  sunsetDate?: Date;
  severity: "warning" | "error" | "info";
  link?: string;
}

/**
 * Deprecation tracker
 */
export class DeprecationTracker {
  private warnings: Map<string, DeprecationWarning> = new Map();
  private warnedIds: Set<string> = new Set();

  /**
   * Register a deprecation warning
   */
  register(warning: DeprecationWarning): void {
    this.warnings.set(warning.id, warning);
  }

    /**
   * Warn about deprecated feature
   */
  warn(id: string): void {
    const warning = this.warnings.get(id);
    if (!warning) {
      console.warn(`Unknown deprecation: ${id}`);
      return;
    }

    // Only warn once per session
    if (this.warnedIds.has(id)) {
      return;
    }

    this.warnedIds.add(id);

    const message = this.formatWarning(warning);
    
    if (warning.severity === "error") {
      console.error(message);
    } else if (warning.severity === "warning") {
      console.warn(message);
    } else {
      console.info(message);
    }
  }

  /**
   * Format warning message
   */
  private formatWarning(warning: DeprecationWarning): string {
    let msg = `[DEPRECATED] ${warning.message}`;

    if (warning.alternative) {
      msg += `\nUse instead: ${warning.alternative}`;
    }

    if (warning.sunsetDate) {
      const days = Math.ceil(
        (warning.sunsetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      msg += `\nSunset date: ${warning.sunsetDate.toISOString().split("T")[0]} (${days} days)`;
    }

    if (warning.link) {
      msg += `\nLearn more: ${warning.link}`;
    }

    return msg;
  }

  /**
   * Get upcoming sunsets
   */
  getUpcomingSunsets(daysUntil: number = 30): DeprecationWarning[] {
    const now = Date.now();
    const threshold = now + daysUntil * 24 * 60 * 60 * 1000;

    return Array.from(this.warnings.values()).filter((w) => {
      if (!w.sunsetDate) return false;
      const sunset = w.sunsetDate.getTime();
      return sunset > now && sunset < threshold;
    });
  }

  /**
   * Get all warnings
   */
  getAll(): DeprecationWarning[] {
    return Array.from(this.warnings.values());
  }
}

/**
 * Global deprecation tracker instance
 */
export const globalDeprecationTracker = new DeprecationTracker();

/**
 * Decorator for deprecated functions
 */
export function deprecated(id: string, message: string, alternative?: string) {
  return function (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      globalDeprecationTracker.warn(id);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Warn about deprecated component
 */
export function useDeprecationWarning(
  componentName: string,
  alternative?: string,
  sunsetDate?: Date
): void {
  const id = `component:${componentName}`;
  
  globalDeprecationTracker.register({
    id,
    message: `Component "${componentName}" is deprecated`,
    alternative,
    sunsetDate,
    severity: sunsetDate && sunsetDate.getTime() < Date.now() ? "error" : "warning",
  });

  globalDeprecationTracker.warn(id);
}

// Common deprecations
export const CommonDeprecations = {
  LEGACY_API: "legacy-api-client",
  OLD_CACHE: "old-cache-layer",
  DEPRECATED_UTILS: "deprecated-utils",
};
