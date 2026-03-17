import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as QRCode from "qrcode";
import { AdminNewLinksCard } from "./features/admin/new-links/admin-new-links-card";
import { AdminOnboardingDialog } from "./features/admin/onboarding/admin-onboarding-dialog";
import { useAdminOnboarding } from "./features/admin/onboarding/use-admin-onboarding";
import {
  FarmerSubmissionForm,
  moistureLabels,
  type SoilMoistureValue,
  type VitalityValue,
  vitalityLabels,
} from "./features/farmer/form/farmer-submission-form";
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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import "./styles.css";

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

type ApiPayload<T> = Partial<T> & Partial<ApiError>;

const ADMIN_PAGE_SIZE = 20;
const ADMIN_THEME_STORAGE_KEY = "ls-oneup-admin-theme";
const ONBOARDING_PREVIEW_PROBE_ID = "__onboarding-preview-probe__";
const ONBOARDING_PREVIEW_IMAGE_URL = "/__onboarding-preview__/image";

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

function normalizeCropName(value: string | null | undefined): string {
  return value?.trim() ?? "";
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

function EditIcon(): React.JSX.Element {
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

function buildImagePreviewUrl(baseUrl: string, retryNonce: number): string {
  if (retryNonce === 0) {
    return baseUrl;
  }
  const delimiter = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${delimiter}retry=${retryNonce}`;
}

async function readApiPayload<T>(
  response: Response,
  fallbackMessage: string,
): Promise<ApiPayload<T>> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as ApiPayload<T>;
  } catch {
    return {
      message: response.ok ? fallbackMessage : `Serverfehler: ${fallbackMessage}`,
    } as ApiPayload<T>;
  }
}

function apiErrorMessage(
  response: Response,
  payload: ApiPayload<unknown>,
  fallbackMessage: string,
): string {
  if (payload.error_code === "METHOD_NOT_ALLOWED" || response.status === 405) {
    const allowHeader = response.headers.get("allow");
    if (allowHeader) {
      return `HTTP-Methode nicht erlaubt. Erlaubt: ${allowHeader}.`;
    }
    return "HTTP-Methode nicht erlaubt.";
  }

  return payload.message || fallbackMessage;
}

function isOnboardingPreviewProbe(probeId: string): boolean {
  return probeId === ONBOARDING_PREVIEW_PROBE_ID;
}

function buildOnboardingPreviewProbe(): AdminProbe {
  return {
    probe_id: ONBOARDING_PREVIEW_PROBE_ID,
    customer_name: "Muster Kunde",
    order_number: "MUSTER-001",
    probe_number: 1,
    status: "eingereicht",
    created_at: "",
    expire_by: "",
    submitted_at: "",
    crop_name: "Beispielkultur",
    plant_vitality: "normal",
    soil_moisture: "normal",
    gps_lat: null,
    gps_lon: null,
    gps_captured_at: null,
    crop_overridden_at: null,
    image_url: ONBOARDING_PREVIEW_IMAGE_URL,
  };
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
}: TablePagerProps): React.JSX.Element {
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

type WelcomePageProps = {
  themePreference: AdminThemePreference;
  onThemePreferenceChange: (value: AdminThemePreference) => void;
};

function WelcomePage({
  themePreference,
  onThemePreferenceChange,
}: WelcomePageProps): React.JSX.Element {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Leaf Sap One Up</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">Willkommen</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Button asChild type="button" variant="outline">
            <a href="/admin">Zum Adminbereich</a>
          </Button>

          <Select
            value={themePreference}
            onValueChange={(value) => onThemePreferenceChange(value as AdminThemePreference)}
          >
            <SelectTrigger aria-label="Farbmodus" className="min-w-44 gap-2">
              <span className="text-muted-foreground">Farbmodus:</span>
              <SelectValue>{themePreferenceLabel(themePreference)}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" position="popper">
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Hell</SelectItem>
              <SelectItem value="dark">Dunkel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Willkommen bei Leaf Sap One Up</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-foreground/90">
          <p>
            Diese Anwendung wird von{" "}
            <a className="underline underline-offset-4" href="https://edapro.ch/">
              EDAPRO GmbH
            </a>{" "}
            genutzt und von{" "}
            <a className="underline underline-offset-4" href="https://oriolgut.ch/">
              Oriol Gut
            </a>{" "}
            entwickelt.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function AdminPage({
  themePreference,
  onThemePreferenceChange,
}: AdminPageProps): React.JSX.Element {
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [probeCount, setProbeCount] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [createdItems, setCreatedItems] = useState<CreatedProbe[]>([]);
  const [probes, setProbes] = useState<AdminProbe[]>([]);
  const [page, setPage] = useState(1);

  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>({});
  const [overrideEditingProbeId, setOverrideEditingProbeId] = useState<string | null>(null);
  const [overrideSavingProbeId, setOverrideSavingProbeId] = useState<string | null>(null);
  const [overrideBlurReminderProbeId, setOverrideBlurReminderProbeId] = useState<string | null>(
    null,
  );

  const [previewProbeId, setPreviewProbeId] = useState<string | null>(null);
  const [previewRetryNonce, setPreviewRetryNonce] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedProbeId, setCopiedProbeId] = useState<string | null>(null);
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const qrData = useQrData(createdItems);
  const previewProbe = probes.find((probe) => probe.probe_id === previewProbeId) ?? null;
  const {
    onboardingStepIndex,
    onboardingStep,
    onboardingTargetFound,
    markOnboardingCompleted,
    startOnboarding,
    showPreviousOnboardingStep,
    showNextOnboardingStep,
  } = useAdminOnboarding({
    createdItemsLength: createdItems.length,
    probesLength: probes.length,
  });

  const totalPages = Math.max(1, Math.ceil(probes.length / ADMIN_PAGE_SIZE));
  const hasSubmittedProbe = probes.some((probe) => probe.status === "eingereicht");
  const showOverrideEntryOnboardingPreview =
    onboardingStep?.id === "override-entry" && !hasSubmittedProbe;
  const showOverrideEditingOnboardingPreview =
    onboardingStep?.id === "override-editing" && !hasSubmittedProbe;
  const showOverrideOnboardingPreview =
    showOverrideEntryOnboardingPreview || showOverrideEditingOnboardingPreview;
  const onboardingPreviewProbe = useMemo(
    () => (showOverrideOnboardingPreview ? buildOnboardingPreviewProbe() : null),
    [showOverrideOnboardingPreview],
  );
  const paginatedProbes = useMemo(() => {
    const start = (page - 1) * ADMIN_PAGE_SIZE;
    return probes.slice(start, start + ADMIN_PAGE_SIZE);
  }, [page, probes]);
  const rangeStart = probes.length === 0 ? 0 : (page - 1) * ADMIN_PAGE_SIZE + 1;
  const rangeEnd = probes.length === 0 ? 0 : Math.min(page * ADMIN_PAGE_SIZE, probes.length);
  const visibleProbes = onboardingPreviewProbe ? [onboardingPreviewProbe] : paginatedProbes;
  const displayProbeCount = onboardingPreviewProbe ? visibleProbes.length : probes.length;
  const displayPage = onboardingPreviewProbe ? (visibleProbes.length === 0 ? 0 : 1) : page;
  const displayTotalPages = onboardingPreviewProbe ? 1 : totalPages;
  const displayRangeStart =
    visibleProbes.length === 0 ? 0 : onboardingPreviewProbe ? 1 : rangeStart;
  const displayRangeEnd =
    visibleProbes.length === 0 ? 0 : onboardingPreviewProbe ? visibleProbes.length : rangeEnd;
  const effectiveOverrideEditingProbeId =
    showOverrideEditingOnboardingPreview && onboardingPreviewProbe
      ? onboardingPreviewProbe.probe_id
      : overrideEditingProbeId;

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
    if (!onboardingPreviewProbe) {
      cancelOverrideEdit(ONBOARDING_PREVIEW_PROBE_ID);
      return;
    }

    setOverrideDrafts((prev) => ({
      ...prev,
      [onboardingPreviewProbe.probe_id]: onboardingPreviewProbe.crop_name ?? "",
    }));
    setOverrideBlurReminderProbeId(null);
  }, [onboardingPreviewProbe]);

  async function loadProbes({ resetPage = false }: { resetPage?: boolean } = {}): Promise<void> {
    const res = await fetch("/api/admin/probes");
    const fallbackMessage = "Proben konnten nicht geladen werden.";
    const payload = await readApiPayload<{ items?: AdminProbe[] }>(res, fallbackMessage);

    if (!res.ok) {
      throw new Error(apiErrorMessage(res, payload, fallbackMessage));
    }

    setProbes(Array.isArray(payload.items) ? payload.items : []);
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

      const fallbackMessage = "Proben konnten nicht erstellt werden.";
      const payload = await readApiPayload<{ items?: CreatedProbe[] }>(response, fallbackMessage);

      if (!response.ok) {
        setError(apiErrorMessage(response, payload, fallbackMessage));
        return;
      }

      setCreatedItems(Array.isArray(payload.items) ? payload.items : []);
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
    setOverrideBlurReminderProbeId(null);
    setOverrideDrafts((prev) => ({
      ...prev,
      [probe.probe_id]: probe.crop_name ?? "",
    }));
  }

  function cancelOverrideEdit(probeId: string): void {
    setOverrideEditingProbeId((prev) => (prev === probeId ? null : prev));
    setOverrideSavingProbeId((prev) => (prev === probeId ? null : prev));
    setOverrideBlurReminderProbeId((prev) => (prev === probeId ? null : prev));
    setOverrideDrafts((prev) => ({
      ...prev,
      [probeId]: "",
    }));
  }

  function hasChangedOverrideDraft(probe: AdminProbe): boolean {
    return normalizeCropName(overrideDrafts[probe.probe_id]) !== normalizeCropName(probe.crop_name);
  }

  async function submitOverride(probe: AdminProbe): Promise<void> {
    const probeId = probe.probe_id;
    if (isOnboardingPreviewProbe(probeId)) {
      cancelOverrideEdit(probeId);
      return;
    }

    const cropName = normalizeCropName(overrideDrafts[probeId]);

    if (cropName === normalizeCropName(probe.crop_name)) {
      cancelOverrideEdit(probeId);
      return;
    }

    if (!cropName) {
      setError("Kulturname ist obligatorisch.");
      return;
    }

    setError(null);
    setOverrideSavingProbeId(probeId);
    setOverrideBlurReminderProbeId(null);

    try {
      const res = await fetch(`/api/admin/probes/${probeId}/crop-override`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ crop_name: cropName }),
      });

      const fallbackMessage = "Kulturname konnte nicht überschrieben werden.";
      const payload = await readApiPayload(res, fallbackMessage);

      if (!res.ok) {
        setError(apiErrorMessage(res, payload, fallbackMessage));
        return;
      }

      setOverrideDrafts((prev) => ({ ...prev, [probeId]: "" }));
      setOverrideEditingProbeId(null);
      await loadProbes({ resetPage: true });
    } finally {
      setOverrideSavingProbeId((prev) => (prev === probeId ? null : prev));
    }
  }

  function handleOverrideBlur(probe: AdminProbe): void {
    if (overrideSavingProbeId === probe.probe_id) {
      return;
    }

    if (!hasChangedOverrideDraft(probe)) {
      cancelOverrideEdit(probe.probe_id);
      return;
    }

    setOverrideBlurReminderProbeId(probe.probe_id);
  }

  function handleOverrideKeyDown(event: KeyboardEvent<HTMLInputElement>, probe: AdminProbe): void {
    if (event.key === "Enter") {
      event.preventDefault();
      void submitOverride(probe);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelOverrideEdit(probe.probe_id);
    }
  }

  function openPreview(probe: AdminProbe): void {
    if (!probe.image_url || isOnboardingPreviewProbe(probe.probe_id)) {
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

        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" variant="outline" onClick={startOnboarding}>
            Tour erneut starten
          </Button>

          <Select
            value={themePreference}
            onValueChange={(value) => onThemePreferenceChange(value as AdminThemePreference)}
          >
            <SelectTrigger
              aria-label="Farbmodus"
              data-onboarding="theme-toggle"
              className="min-w-44 gap-2"
            >
              <span className="text-muted-foreground">Farbmodus:</span>
              <SelectValue>{themePreferenceLabel(themePreference)}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" position="popper">
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Hell</SelectItem>
              <SelectItem value="dark">Dunkel</SelectItem>
            </SelectContent>
          </Select>
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

      <AdminNewLinksCard
        createdItems={createdItems}
        qrData={qrData}
        copiedProbeId={copiedProbeId}
        onCopyToClipboard={copyToClipboard}
        showOnboardingPreview={onboardingStep?.id === "links" && createdItems.length === 0}
      />

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
            page={displayPage}
            totalPages={displayTotalPages}
            totalItems={displayProbeCount}
            rangeStart={displayRangeStart}
            rangeEnd={displayRangeEnd}
            onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          />

          <div className="admin-table-surface overflow-hidden rounded-xl border border-border/80">
            <ScrollArea
              className="max-h-[65vh]"
              topScrollbarProps={{ id: "admin-table-scroll-top", forceMount: true }}
              bottomScrollbarProps={{ id: "admin-table-scroll-bottom", forceMount: true }}
              viewportProps={{ id: "admin-table-scroll-viewport" }}
              viewportClassName="max-h-[65vh]"
              horizontalScrollbar="both"
              reserveVerticalScrollbarSpace
            >
              <Table
                wrapInScrollContainer={false}
                className="min-w-[1440px] border-collapse text-sm"
              >
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="admin-table-head sticky top-0 z-20 text-foreground">
                      Kunde
                    </TableHead>
                    <TableHead className="admin-table-head sticky top-0 z-20 text-foreground">
                      Auftrag
                    </TableHead>
                    <TableHead className="admin-table-head sticky top-0 z-20 text-foreground">
                      Probe
                    </TableHead>
                    <TableHead className="admin-table-head sticky top-0 z-20 text-foreground">
                      Status
                    </TableHead>
                    <TableHead className="admin-table-head sticky top-0 z-20 w-44 text-foreground">
                      Kultur
                    </TableHead>
                    <TableHead className="admin-table-head sticky top-0 z-20 text-foreground">
                      Pflanzenvitalität
                    </TableHead>
                    <TableHead className="admin-table-head sticky top-0 z-20 text-foreground">
                      Bodennässe
                    </TableHead>
                    <TableHead className="admin-table-head sticky top-0 z-20 text-foreground">
                      GPS
                    </TableHead>
                    <TableHead className="admin-table-head sticky top-0 z-20 text-foreground">
                      Erstellt
                    </TableHead>
                    <TableHead className="admin-table-head sticky top-0 z-20 text-foreground">
                      Eingereicht
                    </TableHead>
                    <TableHead className="admin-table-head sticky top-0 z-20 text-foreground">
                      Ablauf
                    </TableHead>
                    <TableHead className="admin-table-head shadow-sticky-edge sticky top-0 right-0 z-30 w-28 min-w-28 border-l border-border/60 text-center text-foreground">
                      Bild
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedProbes.length === 0 && !showOverrideOnboardingPreview ? (
                    <TableRow>
                      <TableCell
                        colSpan={12}
                        className="px-3 py-5 text-center text-muted-foreground"
                      >
                        Keine Proben vorhanden.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleProbes.map((probe, rowIndex) => {
                      const rowBg =
                        rowIndex % 2 === 0 ? "admin-table-row-even" : "admin-table-row-odd";
                      const isPreviewProbe = isOnboardingPreviewProbe(probe.probe_id);
                      const stickyRowBg = isPreviewProbe ? "admin-table-row-preview" : rowBg;

                      return (
                        <TableRow
                          key={probe.probe_id}
                          className={cn(
                            isPreviewProbe ? "admin-table-row-preview border-primary/30" : rowBg,
                            "border-b border-border/70",
                            isPreviewProbe ? "hover:bg-primary/10" : "hover:bg-accent/35",
                          )}
                        >
                          <TableCell className="align-top font-medium">
                            {probe.customer_name}
                          </TableCell>
                          <TableCell className="align-top text-foreground/90">
                            {probe.order_number}
                          </TableCell>
                          <TableCell className="align-top text-foreground/90">
                            {probe.probe_number}
                          </TableCell>
                          <TableCell className="min-w-44 align-top">
                            <Badge className={cn("status", statusBadgeClasses(probe.status))}>
                              {probe.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            {effectiveOverrideEditingProbeId === probe.probe_id &&
                            probe.status === "eingereicht" ? (
                              <div className="grid gap-2 rounded-md bg-background/60 p-1">
                                <Input
                                  placeholder="Kultur anpassen"
                                  value={overrideDrafts[probe.probe_id] ?? ""}
                                  autoFocus={effectiveOverrideEditingProbeId === probe.probe_id}
                                  disabled={overrideSavingProbeId === probe.probe_id}
                                  aria-describedby={`crop-override-help-${probe.probe_id}`}
                                  onChange={(event) => {
                                    setOverrideBlurReminderProbeId((prev) =>
                                      prev === probe.probe_id ? null : prev,
                                    );
                                    setOverrideDrafts((prev) => ({
                                      ...prev,
                                      [probe.probe_id]: event.target.value,
                                    }));
                                  }}
                                  onBlur={() => handleOverrideBlur(probe)}
                                  onKeyDown={(event) => handleOverrideKeyDown(event, probe)}
                                />
                                <p
                                  id={`crop-override-help-${probe.probe_id}`}
                                  className={cn(
                                    "text-xs",
                                    normalizeCropName(overrideDrafts[probe.probe_id]) === ""
                                      ? "text-destructive"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {overrideSavingProbeId === probe.probe_id
                                    ? "Speichert..."
                                    : normalizeCropName(overrideDrafts[probe.probe_id]) === ""
                                      ? "Kulturname ist obligatorisch."
                                      : overrideBlurReminderProbeId === probe.probe_id
                                        ? "Noch nicht gespeichert. Enter speichert, Esc verwirft."
                                        : "Enter speichert, Esc verwirft."}
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
                          <TableCell className="align-top text-foreground/90">
                            {formatDate(probe.expire_by)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "shadow-sticky-edge sticky right-0 w-28 min-w-28 align-top border-l border-border/70 dark:border-white/8",
                              stickyRowBg,
                            )}
                          >
                            <div className="flex min-h-7 items-center justify-center">
                              {probe.image_url ? (
                                <Button type="button" onClick={() => openPreview(probe)}>
                                  Anzeigen
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <TablePager
            page={displayPage}
            totalPages={displayTotalPages}
            totalItems={displayProbeCount}
            rangeStart={displayRangeStart}
            rangeEnd={displayRangeEnd}
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
              <DialogDescription className="sr-only">
                Vergrösserte Bildvorschau zur ausgewählten Probe.
              </DialogDescription>
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

      <AdminOnboardingDialog
        onboardingStepIndex={onboardingStepIndex}
        onboardingStep={onboardingStep}
        onboardingTargetFound={onboardingTargetFound}
        onPrevious={showPreviousOnboardingStep}
        onSkip={markOnboardingCompleted}
        onNext={showNextOnboardingStep}
      />
    </main>
  );
}

async function prepareImageForUpload(file: File): Promise<File> {
  // Browser-side re-encoding strips common embedded metadata before upload.
  // Server validation remains authoritative and can still reject the file.
  if (!["image/jpeg", "image/png"].includes(file.type)) {
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

  if (outputType === "image/png") {
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType));
    if (!pngBlob) {
      return file;
    }
    return new File([pngBlob], file.name, { type: outputType, lastModified: Date.now() });
  }

  const qualitySteps = file.size > 2 * 1024 * 1024 ? [0.9, 0.82, 0.74, 0.66] : [0.92, 0.86];

  for (const quality of qualitySteps) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, quality),
    );
    if (!blob) {
      continue;
    }

    if (blob.size <= 2 * 1024 * 1024 || quality === qualitySteps[qualitySteps.length - 1]) {
      return new File([blob], file.name, { type: outputType, lastModified: Date.now() });
    }
  }

  return file;
}

function FarmerPage({ token }: { token: string }): React.JSX.Element {
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
      const fallbackMessage = "Link konnte nicht geladen werden.";
      const payload = await readApiPayload<ProbeLookup>(response, fallbackMessage);

      setLoading(false);

      if (!response.ok) {
        setError(apiErrorMessage(response, payload, fallbackMessage));
        return;
      }

      if (
        typeof payload.customer_name !== "string" ||
        typeof payload.order_number !== "string" ||
        typeof payload.probe_number !== "number"
      ) {
        setError("Link konnte nicht geladen werden.");
        return;
      }

      setLookup({
        token_state: "open",
        customer_name: payload.customer_name,
        order_number: payload.order_number,
        probe_number: payload.probe_number,
      });
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

    const preparedImage = await prepareImageForUpload(imageFile);

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

    const fallbackMessage = "Senden fehlgeschlagen.";
    const payload = await readApiPayload<{ submitted_at?: string }>(response, fallbackMessage);

    if (!response.ok) {
      setError(apiErrorMessage(response, payload, fallbackMessage));
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
        <FarmerSubmissionForm
          identityLine={identityLine}
          cropName={cropName}
          vitality={vitality}
          soilMoisture={soilMoisture}
          gpsLoading={gpsLoading}
          gps={gps}
          canSubmit={canSubmit}
          onSubmit={handleSubmit}
          onCropNameChange={setCropName}
          onVitalityChange={setVitality}
          onSoilMoistureChange={setSoilMoisture}
          onImageFileChange={setImageFile}
          onCaptureGps={captureGps}
        />
      )}
    </main>
  );
}

export default function App(): React.JSX.Element {
  const path = window.location.pathname;
  const isAdminRoute = path.startsWith("/admin");
  const isWelcomeRoute = path === "/";
  const isThemeSelectableRoute = isAdminRoute || isWelcomeRoute;

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
      if (!isThemeSelectableRoute) {
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
  }, [isThemeSelectableRoute, themePreference]);

  if (isWelcomeRoute) {
    return (
      <WelcomePage themePreference={themePreference} onThemePreferenceChange={setThemePreference} />
    );
  }

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
