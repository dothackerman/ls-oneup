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
            <Card key={item.probe_id} size="sm" className="h-full">
              <CardHeader>
                <CardTitle className="font-display text-lg">Probe {item.probe_number}</CardTitle>
              </CardHeader>
              <CardContent>
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

                <p className="mt-3 break-all text-xs text-muted-foreground">{item.token_url}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
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

                <p className="mt-3 text-[11px] text-muted-foreground">
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
