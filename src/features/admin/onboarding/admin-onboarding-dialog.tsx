import { SpotlightOverlay } from "@shared/components/patterns/spotlight-overlay";
import { Alert, AlertDescription } from "@shared/components/ui/alert";
import { Button } from "@shared/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@shared/components/ui/dialog";
import { ADMIN_ONBOARDING_STEPS, type AdminOnboardingStep } from "./admin-onboarding-steps";

type AdminOnboardingDialogProps = {
  onboardingStepIndex: number | null;
  onboardingStep: AdminOnboardingStep | null;
  onboardingTargetFound: boolean;
  onPrevious: () => void;
  onSkip: () => void;
  onNext: () => void;
};

export function AdminOnboardingDialog({
  onboardingStepIndex,
  onboardingStep,
  onboardingTargetFound,
  onPrevious,
  onSkip,
  onNext,
}: AdminOnboardingDialogProps): JSX.Element {
  return (
    <Dialog open={Boolean(onboardingStep)}>
      {onboardingStep && (
        <>
          <SpotlightOverlay selector={onboardingStep.selector} />
          <DialogContent
            showCloseButton={false}
            hideOverlay
            className="max-w-xl"
            onInteractOutside={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => event.preventDefault()}
          >
            <div className="space-y-3">
              <DialogTitle className="font-display text-xl">Admin Einführung</DialogTitle>
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
                      "Der markierte Bereich ist aktuell nicht sichtbar."}
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
