import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import type { LinkDeliveryCardModel } from "./admin-link-delivery-card-model";

function CopyIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

type AdminLinkDeliveryItemCardProps = {
  model: LinkDeliveryCardModel;
};

export function AdminLinkDeliveryItemCard({
  model,
}: AdminLinkDeliveryItemCardProps): React.JSX.Element {
  return (
    <Card
      size="sm"
      className={
        model.isPreview
          ? "h-full border-dashed border-primary/35 bg-card/95"
          : "h-full border-border/80 bg-card/95"
      }
    >
      <CardHeader className="space-y-3">
        <CardTitle className="font-display text-lg">{model.probeLabel}</CardTitle>
        <div className="rounded-lg border border-primary/15 bg-primary/8 px-4 py-3">
          <p className="text-sm text-foreground">{model.helperText}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center sm:w-auto"
            disabled={model.copyDisabled}
            onClick={model.onCopy}
          >
            <span className="inline-flex items-center gap-2">
              {model.copyLabel === "Kopiert" ? <CheckIcon /> : <CopyIcon />}
              {model.copyLabel}
            </span>
          </Button>

          {model.qrDownloadHref ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a download={model.qrDownloadFileName} href={model.qrDownloadHref}>
                QR herunterladen
              </a>
            </Button>
          ) : (
            <Button type="button" variant="outline" className="w-full sm:w-auto" disabled>
              QR herunterladen
            </Button>
          )}
        </div>

        <div
          className={
            model.isPreview
              ? "grid place-items-center rounded-lg border border-dashed border-border/80 bg-muted/20 p-3"
              : "grid place-items-center rounded-lg border border-border/70 bg-muted/20 p-3"
          }
        >
          {model.qrImageSrc ? (
            <img
              className="h-auto w-full max-w-[124px] sm:max-w-[140px]"
              src={model.qrImageSrc}
              alt={model.qrImageAlt}
            />
          ) : model.isPreview ? (
            <div className="grid h-[104px] w-[104px] place-content-center rounded-md border border-dashed border-border/80 bg-muted/35 text-[11px] text-muted-foreground">
              QR Vorschau
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {model.qrLoadingText || "QR wird erstellt..."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
