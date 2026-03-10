import { Alert, AlertDescription } from "@shared/components/ui/alert";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";

type CreatedProbe = {
  probe_id: string;
  probe_number: number;
  token_url: string;
  created_at: string;
  expire_by: string;
};

type AdminNewLinksCardProps = {
  createdItems: CreatedProbe[];
  qrData: Record<string, string>;
  copiedProbeId: string | null;
  onCopyToClipboard: (probeId: string, value: string) => void | Promise<void>;
  formatDate: (value: string | null) => string;
};

function CopyIcon(): JSX.Element {
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

function CheckIcon(): JSX.Element {
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

export function AdminNewLinksCard({
  createdItems,
  qrData,
  copiedProbeId,
  onCopyToClipboard,
  formatDate,
}: AdminNewLinksCardProps): JSX.Element | null {
  if (createdItems.length === 0) {
    return null;
  }

  return (
    <Card data-onboarding="new-links">
      <CardHeader>
        <CardTitle className="font-display text-xl">Neue Links und QR-Codes</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="border-amber-300 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <AlertDescription>
            QR-Codes werden nicht persistiert. Bitte Link oder QR sofort kopieren bzw.
            herunterladen. Nach Seitenaktualisierung verschwindet die Darstellung.
          </AlertDescription>
        </Alert>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {createdItems.map((item) => (
            <Card key={item.probe_id} size="sm" className="h-full border-border/80 bg-card/95">
              <CardHeader className="space-y-3">
                <CardTitle className="font-display text-lg">Probe {item.probe_number}</CardTitle>
                <div className="rounded-lg border border-primary/15 bg-primary/8 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                    Nächster Schritt
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    Öffnen Sie das Formular oder geben Sie Link und QR direkt weiter.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex min-h-20 items-center justify-center">
                  {qrData[item.probe_id] ? (
                    <img
                      className="h-auto w-full max-w-[180px]"
                      src={qrData[item.probe_id]}
                      alt={`QR Probe ${item.probe_number}`}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">QR wird erstellt...</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Button asChild className="w-full justify-center">
                    <a href={item.token_url} target="_blank" rel="noreferrer">
                      Formular öffnen
                    </a>
                  </Button>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void onCopyToClipboard(item.probe_id, item.token_url)}
                    >
                      <span className="inline-flex items-center gap-2">
                        {copiedProbeId === item.probe_id ? <CheckIcon /> : <CopyIcon />}
                        {copiedProbeId === item.probe_id ? "Kopiert" : "Link kopieren"}
                      </span>
                    </Button>

                    {qrData[item.probe_id] && (
                      <Button asChild variant="outline">
                        <a
                          download={`probe-${item.probe_number}-qr.png`}
                          href={qrData[item.probe_id]}
                        >
                          QR herunterladen
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Einmallink
                  </p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{item.token_url}</p>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Erstellt: {formatDate(item.created_at)} | Ablauf: {formatDate(item.expire_by)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
