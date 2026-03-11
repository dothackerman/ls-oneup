import { useEffect, useState } from "react";
import { SpotlightOverlay } from "@shared/components/patterns/spotlight-overlay";
import { Alert, AlertDescription } from "@shared/components/ui/alert";
import { Button } from "@shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { cn } from "@shared/lib/utils";
import { ADMIN_ONBOARDING_STEPS, type AdminOnboardingStep } from "./admin-onboarding-steps";

type AdminOnboardingDialogProps = {
  onboardingStepIndex: number | null;
  onboardingStep: AdminOnboardingStep | null;
  onboardingTargetFound: boolean;
  onPrevious: () => void;
  onSkip: () => void;
  onNext: () => void;
};

type DialogPlacement = {
  top: number;
  left: number;
};

const DIALOG_MARGIN = 16;
const DIALOG_GAP = 16;
const ESTIMATED_DIALOG_WIDTH = 560;
const ESTIMATED_DIALOG_HEIGHT = 320;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function overlapArea(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): number {
  const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return overlapWidth * overlapHeight;
}

export function AdminOnboardingDialog({
  onboardingStepIndex,
  onboardingStep,
  onboardingTargetFound,
  onPrevious,
  onSkip,
  onNext,
}: AdminOnboardingDialogProps): JSX.Element {
  const [dialogPlacement, setDialogPlacement] = useState<DialogPlacement | null>(null);

  useEffect(() => {
    const selector = onboardingStep?.selector;

    if (!selector || !onboardingTargetFound) {
      setDialogPlacement(null);
      return;
    }
    const targetSelector = selector;

    function measurePlacement(): void {
      const target = document.querySelector(targetSelector);
      if (!(target instanceof HTMLElement)) {
        setDialogPlacement(null);
        return;
      }

      const bounds = target.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dialogWidth = Math.min(ESTIMATED_DIALOG_WIDTH, viewportWidth - DIALOG_MARGIN * 2);
      const dialogHeight = Math.min(ESTIMATED_DIALOG_HEIGHT, viewportHeight - DIALOG_MARGIN * 2);
      const maxLeft = Math.max(DIALOG_MARGIN, viewportWidth - dialogWidth - DIALOG_MARGIN);
      const maxTop = Math.max(DIALOG_MARGIN, viewportHeight - dialogHeight - DIALOG_MARGIN);

      const candidates: DialogPlacement[] = [];

      const canFitTop = bounds.top - DIALOG_GAP - DIALOG_MARGIN >= dialogHeight;
      if (canFitTop) {
        candidates.push({
          left: clamp(bounds.right - dialogWidth, DIALOG_MARGIN, maxLeft),
          top: clamp(bounds.top - dialogHeight - DIALOG_GAP, DIALOG_MARGIN, maxTop),
        });
      }

      const canFitBottom =
        viewportHeight - bounds.bottom - DIALOG_GAP - DIALOG_MARGIN >= dialogHeight;
      if (canFitBottom) {
        candidates.push({
          left: clamp(bounds.right - dialogWidth, DIALOG_MARGIN, maxLeft),
          top: clamp(bounds.bottom + DIALOG_GAP, DIALOG_MARGIN, maxTop),
        });
      }

      const canFitLeft = bounds.left - DIALOG_GAP - DIALOG_MARGIN >= dialogWidth;
      if (canFitLeft) {
        candidates.push({
          left: clamp(bounds.left - dialogWidth - DIALOG_GAP, DIALOG_MARGIN, maxLeft),
          top: clamp(bounds.top, DIALOG_MARGIN, maxTop),
        });
      }

      const canFitRight = viewportWidth - bounds.right - DIALOG_GAP - DIALOG_MARGIN >= dialogWidth;
      if (canFitRight) {
        candidates.push({
          left: clamp(bounds.right + DIALOG_GAP, DIALOG_MARGIN, maxLeft),
          top: clamp(bounds.top, DIALOG_MARGIN, maxTop),
        });
      }

      if (candidates.length > 0) {
        setDialogPlacement(candidates[0]);
        return;
      }

      const fallbackCandidates: DialogPlacement[] = [
        { left: DIALOG_MARGIN, top: DIALOG_MARGIN },
        { left: maxLeft, top: DIALOG_MARGIN },
        { left: DIALOG_MARGIN, top: maxTop },
        { left: maxLeft, top: maxTop },
      ];

      const targetRect = {
        left: bounds.left,
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
      };

      const bestFallback = fallbackCandidates.reduce(
        (best, candidate) => {
          const dialogRect = {
            left: candidate.left,
            top: candidate.top,
            right: candidate.left + dialogWidth,
            bottom: candidate.top + dialogHeight,
          };
          const overlap = overlapArea(dialogRect, targetRect);
          if (overlap < best.overlap) {
            return { overlap, candidate };
          }
          return best;
        },
        { overlap: Number.POSITIVE_INFINITY, candidate: fallbackCandidates[0] },
      );

      setDialogPlacement(bestFallback.candidate);
    }

    measurePlacement();
    window.addEventListener("resize", measurePlacement);
    window.addEventListener("scroll", measurePlacement, true);
    return () => {
      window.removeEventListener("resize", measurePlacement);
      window.removeEventListener("scroll", measurePlacement, true);
    };
  }, [onboardingStep?.selector, onboardingTargetFound]);

  return (
    <Dialog open={Boolean(onboardingStep)}>
      {onboardingStep && (
        <>
          <SpotlightOverlay selector={onboardingStep.selector} />
          <DialogContent
            showCloseButton={false}
            hideOverlay
            disableAnimation
            className={cn(
              "max-w-xl",
              dialogPlacement ? "top-0 left-0 -translate-x-0 -translate-y-0" : "",
            )}
            style={
              dialogPlacement
                ? {
                    top: `${dialogPlacement.top}px`,
                    left: `${dialogPlacement.left}px`,
                    transform: "none",
                  }
                : undefined
            }
            onInteractOutside={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => event.preventDefault()}
          >
            <div className="space-y-3">
              <DialogTitle className="font-display text-xl">Admin Einführung</DialogTitle>
              <DialogDescription className="sr-only">
                Schrittweise Einführung durch die wichtigsten Bereiche im Adminbereich.
              </DialogDescription>
              <p className="text-xs text-muted-foreground">
                Schritt {onboardingStepIndex! + 1} von {ADMIN_ONBOARDING_STEPS.length}
              </p>

              <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
                <p className="font-medium text-foreground">{onboardingStep.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{onboardingStep.description}</p>
              </div>

              {onboardingStep.selector && !onboardingTargetFound && (
                <Alert className="border-amber-300 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  <AlertDescription>
                    {onboardingStep.missingTargetHint ||
                      "Der markierte Bereich ist aktuell nicht sichtbar. Gehe zum vorherigen Schritt oder erstelle zuerst Proben, damit der Bereich erscheint."}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onPrevious}
                    disabled={onboardingStepIndex === 0}
                  >
                    Zurück
                  </Button>
                  <Button type="button" variant="outline" onClick={onSkip}>
                    Überspringen
                  </Button>
                </div>

                {onboardingStepIndex === ADMIN_ONBOARDING_STEPS.length - 1 ? (
                  <Button type="button" onClick={onSkip}>
                    Abschliessen
                  </Button>
                ) : (
                  <Button type="button" onClick={onNext}>
                    Weiter
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
