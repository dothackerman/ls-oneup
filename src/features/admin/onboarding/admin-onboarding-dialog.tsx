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
  const showPreview =
    Boolean(onboardingStep?.preview) && (!onboardingStep?.selector || !onboardingTargetFound);
  const spotlightSelector = showPreview
    ? onboardingStep?.preview?.selector
    : onboardingStep?.selector;

  return (
    <Dialog open={Boolean(onboardingStep)}>
      {onboardingStep && (
        <>
          <SpotlightOverlay selector={spotlightSelector} />
          {showPreview && onboardingStep.preview ? (
            <div
              data-onboarding-preview={onboardingStep.preview.id}
              aria-hidden="true"
              className="pointer-events-none fixed inset-x-4 bottom-4 z-[45] rounded-2xl border border-primary/70 bg-card/96 p-4 shadow-spotlight-frame backdrop-blur-sm md:left-auto md:right-6 md:w-[26rem]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                {onboardingStep.preview.eyebrow}
              </p>
              <div className="mt-3 rounded-xl border border-border/70 bg-muted/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg text-foreground">
                      {onboardingStep.preview.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {onboardingStep.preview.description}
                    </p>
                  </div>
                  <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    Vorschau · nicht interaktiv
                  </span>
                </div>

                {onboardingStep.preview.items?.length ? (
                  <div className="mt-4 grid gap-2">
                    {onboardingStep.preview.items.map((item) => (
                      <div
                        key={item}
                        className="rounded-lg border border-border/70 bg-background/90 px-3 py-2 text-sm font-medium text-foreground"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                ) : null}

                <p className="mt-4 text-xs text-muted-foreground">
                  Diese Vorschau erscheint nur während der Einführung, damit jeder Schritt einen
                  klaren Fokuspunkt behält.
                </p>
              </div>
            </div>
          ) : null}
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
                      "Der markierte Bereich ist aktuell nicht sichtbar. Eine Vorschau markiert den erwarteten Bereich."}
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
