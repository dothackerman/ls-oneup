import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as QRCode from "qrcode";
import { cn } from "@shared/lib/utils";
import { Alert, AlertDescription } from "@shared/components/ui/alert";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { SpotlightOverlay } from "@shared/components/patterns/spotlight-overlay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import "./styles.css";

type VitalityValue = "normal" | "schwach_langsam" | "krankheit_oder_anderes_problem";
type SoilMoistureValue = "sehr_trocken" | "trocken" | "normal" | "nass" | "sehr_nass";
type AdminThemePreference = "system" | "light" | "dark";

type AdminProbe = {
  probe_id: string;
  customer_name: string;
  order_number: string;
  probe_number: number;
  status: "offen" | "eingereicht" | "abgelaufen";
  created_at: string;
  expire_by: string;
  submitted_at: string | null;
  crop_name: string | null;
  plant_vitality: VitalityValue | null;
  soil_moisture: SoilMoistureValue | null;
  gps_lat: number | null;
  gps_lon: number | null;
  gps_captured_at: string | null;
  crop_overridden_at: string | null;
  image_url: string | null;
};

type CreatedProbe = {
  probe_id: string;
  probe_number: number;
  token_url: string;
  created_at: string;
  expire_by: string;
};

type ProbeLookup = {
  token_state: "open";
  customer_name: string;
  order_number: string;
  probe_number: number;
};

type ApiError = {
  error_code: string;
  message: string;
};

const ADMIN_PAGE_SIZE = 20;
const ADMIN_THEME_STORAGE_KEY = "ls-oneup-admin-theme";
const ADMIN_ONBOARDING_STORAGE_KEY = "ls-oneup-admin-onboarding-v1";

type AdminOnboardingStep = {
  id: string;
  title: string;
  description: string;
  selector?: string;
  missingTargetHint?: string;
};

const ADMIN_ONBOARDING_STEPS: AdminOnboardingStep[] = [
  {
    id: "welcome",
    title: "Willkommen im Adminbereich",
    description:
      "Du siehst jetzt die wichtigsten Bereiche. Nach dieser Tour kannst du sofort mit echten Aufträgen starten.",
  },
  {
    id: "theme",
    title: "Farbmodus",
    description:
      "Hier stellst du den Admin-Farbmodus auf System, Hell oder Dunkel. Diese Einstellung gilt nur für den Adminbereich.",
    selector: '[data-onboarding="theme-toggle"]',
  },
  {
    id: "create",
    title: "Proben erstellen",
    description:
      'Erfasse Kunde, Auftragsnummer und Anzahl Proben. Mit "Links erstellen" wird pro Probe ein Einmallink erzeugt.',
    selector: '[data-onboarding="create-probes"]',
  },
  {
    id: "links",
    title: "Links und QR-Codes",
    description:
      "Nach der Erstellung findest du hier den Einmallink, Copy-Button und QR-Download je Probe.",
    selector: '[data-onboarding="new-links"]',
    missingTargetHint: 'Dieser Bereich erscheint erst nach "Links erstellen".',
  },
  {
    id: "table",
    title: "Proben-Tabelle",
    description:
      "Hier siehst du Status, GPS, Kultur, Zeitstempel und Bildzugriff. Die Tabelle ist horizontal und vertikal scrollbar.",
    selector: '[data-onboarding="probe-table"]',
  },
  {
    id: "override",
    title: "Kultur überschreiben",
    description:
      "Wenn eine Probe eingereicht ist, kannst du den Kulturnamen bearbeiten. Beim Speichern übernimmt der Admin die Verantwortung.",
    selector: '[data-onboarding="probe-table"]',
  },
  {
    id: "farmer-flow",
    title: "Gesamtablauf",
    description:
      'Der Farmer öffnet den Link, erfasst Pflichtfelder, GPS und Bild und sendet einmalig ab. Danach siehst du den Status "eingereicht" und kannst die Daten prüfen.',
    selector: '[data-onboarding="probe-table"]',
  },
];

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusBadgeClasses(status: AdminProbe["status"]): string {
  if (status === "eingereicht") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "abgelaufen") {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
  return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
}

function themePreferenceLabel(value: AdminThemePreference): string {
  if (value === "system") {
    return "System";
  }
  if (value === "light") {
    return "Hell";
  }
  return "Dunkel";
}

function parseThemePreference(value: string | null): AdminThemePreference {
  if (value === "system" || value === "light" || value === "dark") {
    return value;
  }
  return "system";
}

function getStoredAdminThemePreference(): AdminThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  return parseThemePreference(window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY));
}

function EditIcon(): JSX.Element {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

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

function buildImagePreviewUrl(baseUrl: string, retryNonce: number): string {
  if (retryNonce === 0) {
    return baseUrl;
  }
  const delimiter = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${delimiter}retry=${retryNonce}`;
}

function useQrData(createdItems: CreatedProbe[]): Record<string, string> {
  const [data, setData] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function run(): Promise<void> {
      const next: Record<string, string> = {};
      for (const item of createdItems) {
        next[item.probe_id] = await QRCode.toDataURL(item.token_url, {
          width: 240,
          margin: 1,
        });
      }
      if (active) {
        setData(next);
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [createdItems]);

  return data;
}

type TablePagerProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  onPrev: () => void;
  onNext: () => void;
};

function TablePager({
  page,
  totalPages,
  totalItems,
  rangeStart,
  rangeEnd,
  onPrev,
  onNext,
}: TablePagerProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <p>
        {rangeStart}-{rangeEnd} von {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          disabled={page <= 1 || totalItems === 0}
        >
          Zurück
        </Button>
        <p className="text-xs font-medium text-foreground">
          Seite {totalItems === 0 ? 0 : page} / {totalPages}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onNext}
          disabled={page >= totalPages || totalItems === 0}
        >
          Weiter
        </Button>
      </div>
    </div>
  );
}

type AdminPageProps = {
  themePreference: AdminThemePreference;
  onThemePreferenceChange: (value: AdminThemePreference) => void;
};

function AdminPage({ themePreference, onThemePreferenceChange }: AdminPageProps): JSX.Element {
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [probeCount, setProbeCount] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [createdItems, setCreatedItems] = useState<CreatedProbe[]>([]);
  const [probes, setProbes] = useState<AdminProbe[]>([]);
  const [page, setPage] = useState(1);

  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>({});
  const [overrideEditingProbeId, setOverrideEditingProbeId] = useState<string | null>(null);

  const [previewProbeId, setPreviewProbeId] = useState<string | null>(null);
  const [previewRetryNonce, setPreviewRetryNonce] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedProbeId, setCopiedProbeId] = useState<string | null>(null);
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState<number | null>(null);
  const [onboardingTargetFound, setOnboardingTargetFound] = useState(true);

  const qrData = useQrData(createdItems);
  const previewProbe = probes.find((probe) => probe.probe_id === previewProbeId) ?? null;

  const totalPages = Math.max(1, Math.ceil(probes.length / ADMIN_PAGE_SIZE));
  const paginatedProbes = useMemo(() => {
    const start = (page - 1) * ADMIN_PAGE_SIZE;
    return probes.slice(start, start + ADMIN_PAGE_SIZE);
  }, [page, probes]);

  const rangeStart = probes.length === 0 ? 0 : (page - 1) * ADMIN_PAGE_SIZE + 1;
  const rangeEnd = probes.length === 0 ? 0 : Math.min(page * ADMIN_PAGE_SIZE, probes.length);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimer.current) {
        clearTimeout(copyFeedbackTimer.current);
      }
    };
  }, []);

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

  async function loadProbes({ resetPage = false }: { resetPage?: boolean } = {}): Promise<void> {
    const res = await fetch("/api/admin/probes");
    const payload = (await res.json()) as { items?: AdminProbe[] } & ApiError;

    if (!res.ok) {
      throw new Error(payload.message || "Laden fehlgeschlagen.");
    }

    setProbes(payload.items ?? []);
    if (resetPage) {
      setPage(1);
    }
  }

  useEffect(() => {
    void loadProbes({ resetPage: true }).catch((err: Error) => setError(err.message));
  }, []);

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/probes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          customer_name: customerName,
          order_number: orderNumber,
          probe_count: probeCount,
        }),
      });

      const payload = (await response.json()) as { items?: CreatedProbe[] } & ApiError;

      if (!response.ok) {
        setError(payload.message || "Erstellung fehlgeschlagen.");
        return;
      }

      setCreatedItems(payload.items ?? []);
      setCustomerName("");
      setOrderNumber("");
      setProbeCount(1);
      setFieldErrors({});
      await loadProbes({ resetPage: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erstellung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function copyToClipboard(probeId: string, value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedProbeId(probeId);
      if (copyFeedbackTimer.current) {
        clearTimeout(copyFeedbackTimer.current);
      }
      copyFeedbackTimer.current = setTimeout(() => {
        setCopiedProbeId((current) => (current === probeId ? null : current));
        copyFeedbackTimer.current = null;
      }, 2_000);
    } catch {
      setError("Link konnte nicht kopiert werden. Bitte manuell kopieren.");
    }
  }

  function startOverrideEdit(probe: AdminProbe): void {
    setOverrideEditingProbeId(probe.probe_id);
    setOverrideDrafts((prev) => ({
      ...prev,
      [probe.probe_id]: probe.crop_name ?? "",
    }));
  }

  function cancelOverrideEdit(probeId: string): void {
    setOverrideEditingProbeId((prev) => (prev === probeId ? null : prev));
    setOverrideDrafts((prev) => ({
      ...prev,
      [probeId]: "",
    }));
  }

  async function submitOverride(probeId: string): Promise<void> {
    const cropName = overrideDrafts[probeId]?.trim();
    if (!cropName) {
      setError("Kulturname ist obligatorisch.");
      return;
    }

    setError(null);

    const res = await fetch(`/api/admin/probes/${probeId}/crop-override`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ crop_name: cropName }),
    });

    const payload = (await res.json()) as ApiError;

    if (!res.ok) {
      setError(payload.message || "Überschreiben fehlgeschlagen.");
      return;
    }

    setOverrideDrafts((prev) => ({ ...prev, [probeId]: "" }));
    setOverrideEditingProbeId(null);
    await loadProbes({ resetPage: true });
  }

  function openPreview(probe: AdminProbe): void {
    if (!probe.image_url) {
      return;
    }

    setPreviewProbeId(probe.probe_id);
    setPreviewRetryNonce(0);
    setPreviewLoading(true);
    setPreviewError(null);
  }

  function closePreview(): void {
    setPreviewProbeId(null);
    setPreviewError(null);
    setPreviewLoading(false);
    setPreviewRetryNonce(0);
  }

  function retryPreview(): void {
    setPreviewRetryNonce((prev) => prev + 1);
    setPreviewLoading(true);
    setPreviewError(null);
  }

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

  const onboardingStep =
    onboardingStepIndex === null ? null : ADMIN_ONBOARDING_STEPS[onboardingStepIndex];

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
  }, [onboardingStep, createdItems.length, probes.length]);

  const previewImageUrl = previewProbe?.image_url
    ? buildImagePreviewUrl(previewProbe.image_url, previewRetryNonce)
    : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Leaf Sap One Up</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">Adminbereich</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={startOnboarding}>
            Tour erneut starten
          </Button>

          <div data-onboarding="theme-toggle" className="grid gap-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Farbmodus
            </p>
            <Select
              value={themePreference}
              onValueChange={(value) => onThemePreferenceChange(value as AdminThemePreference)}
            >
              <SelectTrigger aria-label="Farbmodus" className="min-w-36">
                <SelectValue>{themePreferenceLabel(themePreference)}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end" position="popper">
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Hell</SelectItem>
                <SelectItem value="dark">Dunkel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <Card data-onboarding="create-probes">
        <CardHeader>
          <CardTitle className="font-display text-xl">Proben erstellen</CardTitle>
          <CardDescription>Erfasse Kunde, Auftrag und Anzahl Proben.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-3"
            noValidate
            onSubmit={(event) => {
              const nextErrors: Record<string, string> = {};

              if (!customerName.trim()) {
                nextErrors["customer-name"] = "Bitte geben Sie den Kundennamen ein.";
              }
              if (!orderNumber.trim()) {
                nextErrors["order-number"] = "Bitte geben Sie die Auftragsnummer ein.";
              }
              if (!Number.isFinite(probeCount) || probeCount < 1) {
                nextErrors["probe-count"] = "Bitte geben Sie die Anzahl Proben ein.";
              }

              setFieldErrors(nextErrors);
              if (Object.keys(nextErrors).length > 0) {
                event.preventDefault();
                return;
              }

              void handleCreate(event);
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="customer-name">Kunde</Label>
              <Input
                id="customer-name"
                value={customerName}
                aria-invalid={fieldErrors["customer-name"] ? "true" : "false"}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  setFieldErrors((prev) => {
                    if (!prev["customer-name"]) {
                      return prev;
                    }

                    const next = { ...prev };
                    delete next["customer-name"];
                    return next;
                  });
                }}
              />
              {fieldErrors["customer-name"] ? (
                <p data-slot="field-error" className="text-xs text-destructive">
                  {fieldErrors["customer-name"]}
                </p>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="order-number">Auftragsnummer</Label>
              <Input
                id="order-number"
                value={orderNumber}
                aria-invalid={fieldErrors["order-number"] ? "true" : "false"}
                onChange={(event) => {
                  setOrderNumber(event.target.value);
                  setFieldErrors((prev) => {
                    if (!prev["order-number"]) {
                      return prev;
                    }

                    const next = { ...prev };
                    delete next["order-number"];
                    return next;
                  });
                }}
              />
              {fieldErrors["order-number"] ? (
                <p data-slot="field-error" className="text-xs text-destructive">
                  {fieldErrors["order-number"]}
                </p>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="probe-count">Anzahl Proben</Label>
              <Input
                id="probe-count"
                type="number"
                min={1}
                value={probeCount}
                aria-invalid={fieldErrors["probe-count"] ? "true" : "false"}
                onChange={(event) => {
                  setProbeCount(Number(event.target.value || 0));
                  setFieldErrors((prev) => {
                    if (!prev["probe-count"]) {
                      return prev;
                    }

                    const next = { ...prev };
                    delete next["probe-count"];
                    return next;
                  });
                }}
              />
              {fieldErrors["probe-count"] ? (
                <p data-slot="field-error" className="text-xs text-destructive">
                  {fieldErrors["probe-count"]}
                </p>
              ) : null}
            </div>

            <div className="md:col-span-3">
              <Button type="submit" disabled={busy}>
                {busy ? "Erstellen..." : "Links erstellen"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {createdItems.length > 0 && (
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
                    <CardTitle className="font-display text-lg">
                      Probe {item.probe_number}
                    </CardTitle>
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
                        onClick={() => void copyToClipboard(item.probe_id, item.token_url)}
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
      )}

      <Card data-onboarding="probe-table">
        <CardHeader>
          <CardTitle className="font-display text-xl">Proben</CardTitle>
          <CardDescription>
            Hinweis: Die Tabelle ist horizontal und vertikal innerhalb des Tabellenbereichs
            scrollbar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TablePager
            page={page}
            totalPages={totalPages}
            totalItems={probes.length}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          />

          <div className="overflow-hidden rounded-lg border border-border/70">
            <div data-testid="admin-table-scroll" className="max-h-[65vh] overflow-auto">
              <Table className="min-w-[1380px] border-collapse">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 z-20 bg-muted">Kunde</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-muted">Auftrag</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-muted">Probe</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-muted">Status</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-muted">Kultur</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-muted">Pflanzenvitalität</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-muted">Bodennässe</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-muted">GPS</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-muted">Erstellt</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-muted">Eingereicht</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-muted">Ablauf</TableHead>
                    <TableHead className="shadow-sticky-edge sticky top-0 right-0 z-30 bg-muted">
                      Bild
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedProbes.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={12}
                        className="px-3 py-5 text-center text-muted-foreground"
                      >
                        Keine Proben vorhanden.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProbes.map((probe, rowIndex) => {
                      const rowBg = rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20";

                      return (
                        <TableRow key={probe.probe_id} className={cn(rowBg, "hover:bg-muted/40")}>
                          <TableCell className="align-top">{probe.customer_name}</TableCell>
                          <TableCell className="align-top">{probe.order_number}</TableCell>
                          <TableCell className="align-top">{probe.probe_number}</TableCell>
                          <TableCell className="align-top">
                            <Badge className={cn("status", statusBadgeClasses(probe.status))}>
                              {probe.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            {overrideEditingProbeId === probe.probe_id &&
                            probe.status === "eingereicht" ? (
                              <div className="grid gap-2">
                                <Input
                                  placeholder="Kultur anpassen"
                                  value={overrideDrafts[probe.probe_id] ?? ""}
                                  onChange={(event) =>
                                    setOverrideDrafts((prev) => ({
                                      ...prev,
                                      [probe.probe_id]: event.target.value,
                                    }))
                                  }
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    onClick={() => void submitOverride(probe.probe_id)}
                                  >
                                    Speichern
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => cancelOverrideEdit(probe.probe_id)}
                                  >
                                    Abbrechen
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Mit Speichern übernimmt Admin die Verantwortung.
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p>{probe.crop_name || "-"}</p>
                                {probe.crop_overridden_at ? (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Überschrieben am: {formatDate(probe.crop_overridden_at)}
                                  </p>
                                ) : null}
                                {probe.status === "eingereicht" ? (
                                  <Button
                                    type="button"
                                    aria-label="Kultur bearbeiten"
                                    variant="outline"
                                    size="icon-sm"
                                    className="mt-2"
                                    onClick={() => startOverrideEdit(probe)}
                                  >
                                    <EditIcon />
                                  </Button>
                                ) : null}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            {probe.plant_vitality ? vitalityLabels[probe.plant_vitality] : "-"}
                          </TableCell>
                          <TableCell className="align-top">
                            {probe.soil_moisture ? moistureLabels[probe.soil_moisture] : "-"}
                          </TableCell>
                          <TableCell className="align-top">
                            {probe.gps_lat !== null && probe.gps_lon !== null
                              ? `${probe.gps_lat.toFixed(5)}, ${probe.gps_lon.toFixed(5)}`
                              : "-"}
                          </TableCell>
                          <TableCell className="align-top">
                            {formatDate(probe.created_at)}
                          </TableCell>
                          <TableCell className="align-top">
                            {formatDate(probe.submitted_at)}
                          </TableCell>
                          <TableCell className="align-top">{formatDate(probe.expire_by)}</TableCell>
                          <TableCell
                            className={cn("shadow-sticky-edge sticky right-0 align-top", rowBg)}
                          >
                            {probe.image_url ? (
                              <Button type="button" onClick={() => openPreview(probe)}>
                                Anzeigen
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <TablePager
            page={page}
            totalPages={totalPages}
            totalItems={probes.length}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          />
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(previewProbe)}
        onOpenChange={(open) => {
          if (!open) {
            closePreview();
          }
        }}
      >
        {previewProbe && (
          <DialogContent
            showCloseButton={false}
            className="max-w-5xl sm:max-w-5xl"
            aria-label={`Bildvorschau Probe ${previewProbe.probe_number}`}
          >
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <DialogTitle className="font-display text-xl">
                Bildvorschau Probe {previewProbe.probe_number}
              </DialogTitle>
              <Button type="button" variant="outline" onClick={closePreview}>
                Schliessen
              </Button>
            </div>

            {previewLoading && (
              <Alert>
                <AlertDescription>Lade Bildvorschau...</AlertDescription>
              </Alert>
            )}

            {previewError && (
              <Alert variant="destructive">
                <AlertDescription>{previewError}</AlertDescription>
                <div className="mt-2">
                  <Button type="button" onClick={retryPreview}>
                    Erneut versuchen
                  </Button>
                </div>
              </Alert>
            )}

            {previewImageUrl && (
              <img
                key={previewImageUrl}
                className="image-preview max-h-[72vh] w-full rounded-lg border border-border/70 bg-card object-contain"
                src={previewImageUrl}
                alt={`Probe ${previewProbe.probe_number}`}
                onLoad={() => {
                  setPreviewLoading(false);
                  setPreviewError(null);
                }}
                onError={() => {
                  setPreviewLoading(false);
                  setPreviewError("Bildvorschau konnte nicht geladen werden.");
                }}
              />
            )}
          </DialogContent>
        )}
      </Dialog>

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
                      onClick={showPreviousOnboardingStep}
                      disabled={onboardingStepIndex === 0}
                    >
                      Zurück
                    </Button>
                    <Button type="button" variant="outline" onClick={markOnboardingCompleted}>
                      Überspringen
                    </Button>
                  </div>

                  {onboardingStepIndex === ADMIN_ONBOARDING_STEPS.length - 1 ? (
                    <Button type="button" onClick={markOnboardingCompleted}>
                      Abschliessen
                    </Button>
                  ) : (
                    <Button type="button" onClick={showNextOnboardingStep}>
                      Weiter
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </>
        )}
      </Dialog>
    </main>
  );
}

const vitalityLabels: Record<VitalityValue, string> = {
  normal: "normal",
  schwach_langsam: "schwach / langsam",
  krankheit_oder_anderes_problem: "Krankheit oder anderes Problem",
};

const moistureLabels: Record<SoilMoistureValue, string> = {
  sehr_trocken: "sehr trocken",
  trocken: "trocken",
  normal: "normal",
  nass: "nass",
  sehr_nass: "sehr nass",
};

async function maybeCompress(file: File): Promise<File> {
  if (file.size <= 2 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(file.type)) {
    return file;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("Bild konnte nicht geladen werden."));
    };
    img.src = src;
  });

  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(image.width * scale));
  canvas.height = Math.max(1, Math.floor(image.height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return file;
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, outputType === "image/jpeg" ? 0.82 : 0.92),
  );

  if (!blob || blob.size >= file.size) {
    return file;
  }

  return new File([blob], file.name, { type: outputType, lastModified: Date.now() });
}

function FarmerPage({ token }: { token: string }): JSX.Element {
  const [online, setOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState<ProbeLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [cropName, setCropName] = useState("");
  const [vitality, setVitality] = useState<VitalityValue | undefined>(undefined);
  const [soilMoisture, setSoilMoisture] = useState<SoilMoistureValue | undefined>(undefined);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [gps, setGps] = useState<{ lat: number; lon: number; capturedAt: string } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    function updateOnline(): void {
      setOnline(navigator.onLine);
    }

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    async function loadToken(): Promise<void> {
      if (!navigator.onLine) {
        setError("Ohne Internet ist Laden nicht möglich.");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/probe/${token}`);
      const payload = (await response.json()) as ProbeLookup & ApiError;

      setLoading(false);

      if (!response.ok) {
        setError(payload.message || "Link konnte nicht geladen werden.");
        return;
      }

      setLookup(payload);
    }

    void loadToken().catch((err: Error) => {
      setLoading(false);
      setError(err.message);
    });
  }, [token]);

  async function captureGps(): Promise<void> {
    if (gpsLoading) {
      return;
    }

    if (!navigator.geolocation) {
      setError("GPS ist auf diesem Gerät nicht verfügbar.");
      return;
    }

    setError(null);
    setGpsLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 0,
        });
      });

      setGps({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        capturedAt: new Date().toISOString(),
      });
    } catch (err) {
      const geoError = err as GeolocationPositionError | undefined;
      if (geoError?.code === 1) {
        setError("GPS-Berechtigung fehlt. Bitte Zugriff erlauben.");
      } else if (geoError?.code === 2) {
        setError("Standort ist momentan nicht verfügbar. Bitte erneut versuchen.");
      } else if (geoError?.code === 3) {
        setError("GPS-Erfassung dauerte zu lange. Bitte erneut versuchen.");
      } else {
        setError("GPS konnte nicht gelesen werden. Bitte Berechtigung erlauben.");
      }
    } finally {
      setGpsLoading(false);
    }
  }

  const canSubmit =
    online &&
    Boolean(lookup) &&
    cropName.trim().length > 0 &&
    Boolean(vitality) &&
    Boolean(soilMoisture) &&
    Boolean(gps) &&
    Boolean(imageFile) &&
    !gpsLoading;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (!online) {
      setError("Ohne Internet ist Senden nicht möglich.");
      return;
    }

    if (!cropName.trim()) {
      setError("Kulturname ist obligatorisch.");
      return;
    }

    if (!vitality) {
      setError("Pflanzenvitalität ist obligatorisch.");
      return;
    }

    if (!soilMoisture) {
      setError("Bodennässe ist obligatorisch.");
      return;
    }

    if (!gps) {
      setError("GPS ist obligatorisch.");
      return;
    }

    if (!imageFile) {
      setError("Genau ein Bild ist obligatorisch.");
      return;
    }

    const preparedImage = await maybeCompress(imageFile);

    const formData = new FormData();
    formData.set("crop_name", cropName.trim());
    formData.set("vitality", vitality);
    formData.set("soil_moisture", soilMoisture);
    formData.set("gps_lat", String(gps.lat));
    formData.set("gps_lon", String(gps.lon));
    formData.set("gps_captured_at", gps.capturedAt);
    formData.append("image", preparedImage);

    const response = await fetch(`/api/probe/${token}/submit`, {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as { submitted_at?: string } & ApiError;

    if (!response.ok) {
      setError(payload.message || "Senden fehlgeschlagen.");
      setSuccess(null);
      return;
    }

    setSuccess(`Erfolgreich eingereicht am ${formatDate(payload.submitted_at ?? null)}.`);
    setError(null);
  }

  const identityLine = useMemo(() => {
    if (!lookup) {
      return "";
    }
    return `${lookup.customer_name} / Auftrag ${lookup.order_number} / Probe ${lookup.probe_number}`;
  }, [lookup]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-4 px-4 pb-10 pt-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-foreground">Probe erfassen</h1>

      {!online && (
        <Alert className="border-amber-300 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <AlertDescription>Keine Internetverbindung erkannt.</AlertDescription>
        </Alert>
      )}

      {loading && <p className="text-sm text-muted-foreground">Laden...</p>}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-emerald-300 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {lookup && (
        <Card>
          <CardHeader>
            <CardDescription>{identityLine}</CardDescription>
          </CardHeader>

          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-1.5">
                <Label htmlFor="crop-name">Kulturname</Label>
                <Input
                  id="crop-name"
                  value={cropName}
                  onChange={(event) => setCropName(event.target.value)}
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="vitality-select">Pflanzenvitalität</Label>
                <Select
                  value={vitality}
                  onValueChange={(value) => setVitality(value as VitalityValue)}
                >
                  <SelectTrigger
                    id="vitality-select"
                    aria-label="Pflanzenvitalität"
                    className="h-9 w-full"
                  >
                    <SelectValue placeholder="Bitte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(vitalityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="soil-select">Bodenfeuchte</Label>
                <Select
                  value={soilMoisture}
                  onValueChange={(value) => setSoilMoisture(value as SoilMoistureValue)}
                >
                  <SelectTrigger id="soil-select" aria-label="Bodenfeuchte" className="h-9 w-full">
                    <SelectValue placeholder="Bitte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(moistureLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="image-file">Bild (JPEG oder PNG)</Label>
                <Input
                  id="image-file"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setImageFile(file);
                  }}
                  required
                />
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void captureGps()}
                  disabled={gpsLoading}
                >
                  {gpsLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
                        aria-hidden="true"
                      />
                      GPS wird erfasst...
                    </span>
                  ) : (
                    "GPS erfassen"
                  )}
                </Button>

                <p className="mt-2 text-sm text-muted-foreground">
                  {gpsLoading
                    ? "Standort wird ermittelt..."
                    : gps
                      ? `GPS erfasst: ${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)}`
                      : "Noch kein GPS erfasst."}
                </p>
              </div>

              <Button type="submit" disabled={!canSubmit}>
                Absenden
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

export default function App(): JSX.Element {
  const path = window.location.pathname;
  const isAdminRoute = path.startsWith("/admin");

  const [themePreference, setThemePreference] = useState<AdminThemePreference>(() =>
    getStoredAdminThemePreference(),
  );

  useEffect(() => {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, themePreference);
  }, [themePreference]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (): void => {
      if (!isAdminRoute) {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
        return;
      }

      const resolvedTheme =
        themePreference === "system" ? (media.matches ? "dark" : "light") : themePreference;

      root.classList.toggle("dark", resolvedTheme === "dark");
      root.style.colorScheme = resolvedTheme;
    };

    applyTheme();

    const listener = (): void => {
      applyTheme();
    };

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [isAdminRoute, themePreference]);

  if (isAdminRoute) {
    return (
      <AdminPage themePreference={themePreference} onThemePreferenceChange={setThemePreference} />
    );
  }

  const farmerMatch = path.match(/^\/p\/([^/]+)$/);
  if (farmerMatch) {
    return <FarmerPage token={farmerMatch[1]} />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-foreground">Leaf Sap One Up</h1>
      <p className="mt-2 text-muted-foreground">Unbekannte Route.</p>
    </main>
  );
}
