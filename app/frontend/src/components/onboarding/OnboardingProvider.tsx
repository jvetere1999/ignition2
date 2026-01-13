/**
 * OnboardingProvider - ENABLED (2026-01-13)
 *
 * Onboarding modal feature is enabled and provides guided setup for new users.
 * Displays onboarding flow when conditions are met (new user, active onboarding state).
 *
 * Backend API: GET /api/onboarding/state, POST /api/onboarding/step
 * Context provides: isVisible, currentStep, completeStep, skipOnboarding
 * Modal renders within context when all validation passes.
 */

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getOnboardingState, type OnboardingResponse } from "@/lib/api/onboarding";
import { OnboardingModal } from "./OnboardingModal";

export function OnboardingProvider() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [onboarding, setOnboarding] = useState<OnboardingResponse | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || checked) return;

    const checkOnboarding = async () => {
      try {
        const data = await getOnboardingState();
        setOnboarding(data);
      } catch (error) {
        console.error("Failed to load onboarding:", error);
      }
      setChecked(true);
    };

    checkOnboarding();
  }, [isLoading, isAuthenticated, checked]);

  // Don't render if not authenticated or still loading
  if (!isAuthenticated || !user) {
    return null;
  }

  // Don't render if we haven't checked yet
  if (!checked || !onboarding) {
    return null;
  }

  // Don't render if onboarding not needed
  if (!onboarding.needs_onboarding) {
    return null;
  }

  // Don't render if already completed or skipped
  if (onboarding.state?.status === "completed" || onboarding.state?.status === "skipped") {
    return null;
  }

  // Don't render if no flow
  if (!onboarding.flow) {
    return null;
  }

  // Provide context to children - modal will render based on context state
  return (
    <OnboardingContext.Provider
      value={{
        isVisible: true, // Modal shows when conditions are met above
        currentStep: onboarding.flow?.steps[0] || null,
        currentStepIndex: 0,
        completeStep: handleCompleteStep,
        skipOnboarding: handleSkipOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

