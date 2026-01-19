/**
 * A/B Testing Utilities
 *
 * Provides client-side A/B testing, experiment tracking, and
 * statistical significance calculation for feature testing.
 */

/**
 * Experiment variant
 */
export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number; // 0-100
}

/**
 * Experiment configuration
 */
export interface Experiment {
  id: string;
  name: string;
  description?: string;
  variants: ExperimentVariant[];
  startDate: Date;
  endDate?: Date;
  active: boolean;
}

/**
 * A/B test variant assignment
 */
export class VariantAssignment {
  /**
   * Assign user to variant based on user ID hash
   */
  static assign(
    userId: string,
    variants: ExperimentVariant[]
  ): ExperimentVariant {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }

    const normalizedHash = Math.abs(hash) % 100;
    let cumulativeWeight = 0;

    for (const variant of variants) {
      cumulativeWeight += variant.weight;
      if (normalizedHash < cumulativeWeight) {
        return variant;
      }
    }

    return variants[variants.length - 1];
  }

  /**
   * Calculate if result is statistically significant
   * Uses chi-square test for A/B test significance
   */
  static isSignificant(
    control: { conversions: number; trials: number },
    treatment: { conversions: number; trials: number },
    alpha: number = 0.05
  ): boolean {
    const controlRate = control.conversions / control.trials;
    const treatmentRate = treatment.conversions / treatment.trials;
    const pooledRate =
      (control.conversions + treatment.conversions) /
      (control.trials + treatment.trials);

    const standardError = Math.sqrt(
      pooledRate *
        (1 - pooledRate) *
        (1 / control.trials + 1 / treatment.trials)
    );

    const zScore = (treatmentRate - controlRate) / standardError;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    return pValue < alpha;
  }

  /**
   * Normal distribution CDF
   */
  private static normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    const t5 = t4 * t;

    const y =
      1.0 -
      (a5 * t5 + a4 * t4 + a3 * t3 + a2 * t2 + a1 * t) *
        Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }
}

/**
 * Experiment tracker for client-side tracking
 */
export class ExperimentTracker {
  private experiments: Map<string, ExperimentVariant> = new Map();

  /**
   * Enroll user in experiment
   */
  enroll(userId: string, experiment: Experiment): ExperimentVariant {
    const variant = VariantAssignment.assign(userId, experiment.variants);
    this.experiments.set(experiment.id, variant);
    return variant;
  }

  /**
   * Get user's variant for experiment
   */
  getVariant(experimentId: string): ExperimentVariant | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * Track experiment event
   */
  trackEvent(
    experimentId: string,
    eventType: string,
    eventData?: Record<string, unknown>
  ): void {
    const variant = this.experiments.get(experimentId);
    if (!variant) {
      console.warn(`User not enrolled in experiment: ${experimentId}`);
      return;
    }

    const event = {
      experimentId,
      variantId: variant.id,
      eventType,
      timestamp: new Date().toISOString(),
      ...eventData,
    };

    // Send to analytics backend
    console.debug("Experiment event tracked:", event);
  }

  /**
   * Get all enrollments
   */
  getEnrollments(): Record<string, string> {
    const enrollments: Record<string, string> = {};
    for (const [expId, variant] of this.experiments) {
      enrollments[expId] = variant.id;
    }
    return enrollments;
  }
}
