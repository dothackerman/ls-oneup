import { useEffect, useState } from "react";
import {
  ADMIN_ONBOARDING_STEPS,
  ADMIN_ONBOARDING_STORAGE_KEY,
  type AdminOnboardingStep,
} from "./admin-onboarding-steps";

type UseAdminOnboardingArgs = {
  createdItemsLength: number;
  probesLength: number;
};

type UseAdminOnboardingResult = {
  onboardingStepIndex: number | null;
  onboardingStep: AdminOnboardingStep | null;
  onboardingTargetFound: boolean;
  markOnboardingCompleted: () => void;
  startOnboarding: () => void;
  showPreviousOnboardingStep: () => void;
  showNextOnboardingStep: () => void;
};

export function useAdminOnboarding({
  createdItemsLength,
  probesLength,
}: UseAdminOnboardingArgs): UseAdminOnboardingResult {
  const [onboardingStepIndex, setOnboardingStepIndex] = useState<number | null>(null);
  const [onboardingTargetFound, setOnboardingTargetFound] = useState(true);

  const onboardingStep =
    onboardingStepIndex === null ? null : ADMIN_ONBOARDING_STEPS[onboardingStepIndex];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("onboarding");

    if (mode === "off") {
      return;
    }

    if (mode === "force") {
      setOnboardingStepIndex(0);
      return;
    }

    const stored = window.localStorage.getItem(ADMIN_ONBOARDING_STORAGE_KEY);
    if (stored !== "completed") {
      setOnboardingStepIndex(0);
    }
  }, []);

  useEffect(() => {
    if (!onboardingStep) {
      return;
    }

    if (!onboardingStep.selector) {
      setOnboardingTargetFound(true);
      return;
    }

    const target = document.querySelector(onboardingStep.selector);
    setOnboardingTargetFound(Boolean(target));

    if (target && target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      target.style.position = "relative";
      target.style.zIndex = "45";
    }

    return () => {
      if (target && target instanceof HTMLElement) {
        target.style.position = "";
        target.style.zIndex = "";
      }
    };
  }, [onboardingStep, createdItemsLength, probesLength]);

  function markOnboardingCompleted(): void {
    window.localStorage.setItem(ADMIN_ONBOARDING_STORAGE_KEY, "completed");
    setOnboardingStepIndex(null);
  }

  function startOnboarding(): void {
    setOnboardingStepIndex(0);
  }

  function showPreviousOnboardingStep(): void {
    setOnboardingStepIndex((prev) => {
      if (prev === null) {
        return prev;
      }
      return Math.max(0, prev - 1);
    });
  }

  function showNextOnboardingStep(): void {
    setOnboardingStepIndex((prev) => {
      if (prev === null) {
        return prev;
      }
      if (prev >= ADMIN_ONBOARDING_STEPS.length - 1) {
        return null;
      }
      return prev + 1;
    });
  }

  return {
    onboardingStepIndex,
    onboardingStep,
    onboardingTargetFound,
    markOnboardingCompleted,
    startOnboarding,
    showPreviousOnboardingStep,
    showNextOnboardingStep,
  };
}
