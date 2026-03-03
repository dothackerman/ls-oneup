import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as QRCode from "qrcode";
import "./styles.css";

type VitalityValue = "normal" | "schwach_langsam" | "krankheit_oder_anderes_problem";
type SoilMoistureValue = "sehr_trocken" | "trocken" | "normal" | "nass" | "sehr_nass";

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

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 font-semibold text-slate-800 shadow-sm transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-50";

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
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "abgelaufen") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-sky-100 text-sky-800";
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <p>
        {rangeStart}-{rangeEnd} von {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={onPrev}
          disabled={page <= 1 || totalItems === 0}
        >
          Zurück
        </button>
        <p className="text-sm font-semibold text-slate-800">
          Seite {totalItems === 0 ? 0 : page} / {totalPages}
        </p>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={onNext}
          disabled={page >= totalPages || totalItems === 0}
        >
          Weiter
        </button>
      </div>
    </div>
  );
}

function AdminPage(): JSX.Element {
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [probeCount, setProbeCount] = useState(1);

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

  useEffect(() => {
    if (!previewProbeId) {
      return;
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        closePreview();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewProbeId]);

  const previewImageUrl = previewProbe?.image_url
    ? buildImagePreviewUrl(previewProbe.image_url, previewRetryNonce)
    : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-slate-900">Leaf Sap One Up</h1>
        <p className="mt-1 text-slate-600">Adminbereich</p>
      </header>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur md:p-5">
        <h2 className="font-display text-xl font-semibold text-slate-900">Proben erstellen</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={handleCreate}>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
            Kunde
            <input
              className={fieldClass}
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
            Auftragsnummer
            <input
              className={fieldClass}
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
            Anzahl Proben
            <input
              className={fieldClass}
              type="number"
              min={1}
              value={probeCount}
              onChange={(event) => setProbeCount(Number(event.target.value || 1))}
              required
            />
          </label>
          <div className="md:col-span-3">
            <button type="submit" className={primaryButtonClass} disabled={busy}>
              {busy ? "Erstellen..." : "Links erstellen"}
            </button>
          </div>
        </form>
      </section>

      {createdItems.length > 0 && (
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur md:p-5">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            Neue Links und QR-Codes
          </h2>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            QR-Codes werden nicht persistiert. Bitte Link oder QR sofort kopieren bzw.
            herunterladen. Nach Seitenaktualisierung verschwindet die Darstellung.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {createdItems.map((item) => (
              <article
                key={item.probe_id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Probe {item.probe_number}
                </h3>
                <div className="mt-3 flex min-h-16 items-center justify-center">
                  {qrData[item.probe_id] ? (
                    <img
                      className="h-auto w-full max-w-[180px]"
                      src={qrData[item.probe_id]}
                      alt={`QR Probe ${item.probe_number}`}
                    />
                  ) : (
                    <p className="text-sm text-slate-600">QR wird erstellt...</p>
                  )}
                </div>
                <p className="mt-3 break-all text-sm text-slate-700">{item.token_url}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={primaryButtonClass}
                    onClick={() => void copyToClipboard(item.probe_id, item.token_url)}
                  >
                    <span className="inline-flex items-center gap-2">
                      {copiedProbeId === item.probe_id ? <CheckIcon /> : <CopyIcon />}
                      {copiedProbeId === item.probe_id ? "Kopiert" : "Link kopieren"}
                    </span>
                  </button>
                  {qrData[item.probe_id] && (
                    <a
                      className={secondaryButtonClass}
                      download={`probe-${item.probe_number}-qr.png`}
                      href={qrData[item.probe_id]}
                    >
                      QR herunterladen
                    </a>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  Erstellt: {formatDate(item.created_at)} | Ablauf: {formatDate(item.expire_by)}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur md:p-5">
        <h2 className="font-display text-xl font-semibold text-slate-900">Proben</h2>

        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        )}

        <p className="mt-3 text-sm text-slate-600">
          Hinweis: Die Tabelle ist horizontal und vertikal innerhalb des Tabellenbereichs scrollbar.
        </p>

        <div className="mt-3 space-y-3">
          <TablePager
            page={page}
            totalPages={totalPages}
            totalItems={probes.length}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          />

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div data-testid="admin-table-scroll" className="max-h-[65vh] overflow-auto">
              <table className="min-w-[1380px] border-collapse text-sm text-slate-800">
                <thead>
                  <tr>
                    <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold">
                      Kunde
                    </th>
                    <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold">
                      Auftrag
                    </th>
                    <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold">
                      Probe
                    </th>
                    <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold">
                      Status
                    </th>
                    <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold">
                      Kultur
                    </th>
                    <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold">
                      Pflanzenvitalität
                    </th>
                    <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold">
                      Bodennässe
                    </th>
                    <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold">
                      GPS
                    </th>
                    <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold">
                      Erstellt
                    </th>
                    <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold">
                      Eingereicht
                    </th>
                    <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold">
                      Ablauf
                    </th>
                    <th className="sticky right-0 top-0 z-30 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.6)]">
                      Bild
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProbes.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-3 py-5 text-center text-slate-500">
                        Keine Proben vorhanden.
                      </td>
                    </tr>
                  ) : (
                    paginatedProbes.map((probe, rowIndex) => {
                      const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/70";
                      const stickyCellBg = rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/70";

                      return (
                        <tr key={probe.probe_id} className={rowBg}>
                          <td className="border-b border-slate-200 px-3 py-2 align-top">
                            {probe.customer_name}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2 align-top">
                            {probe.order_number}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2 align-top">
                            {probe.probe_number}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2 align-top">
                            <span
                              className={`status inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClasses(probe.status)}`}
                            >
                              {probe.status}
                            </span>
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2 align-top">
                            {overrideEditingProbeId === probe.probe_id &&
                            probe.status === "eingereicht" ? (
                              <div className="grid gap-2">
                                <input
                                  className={fieldClass}
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
                                  <button
                                    type="button"
                                    className={primaryButtonClass}
                                    onClick={() => void submitOverride(probe.probe_id)}
                                  >
                                    Speichern
                                  </button>
                                  <button
                                    type="button"
                                    className={secondaryButtonClass}
                                    onClick={() => cancelOverrideEdit(probe.probe_id)}
                                  >
                                    Abbrechen
                                  </button>
                                </div>
                                <p className="text-xs text-slate-600">
                                  Mit Speichern übernimmt Admin die Verantwortung.
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p>{probe.crop_name || "-"}</p>
                                {probe.crop_overridden_at ? (
                                  <p className="mt-1 text-xs text-slate-600">
                                    Überschrieben am: {formatDate(probe.crop_overridden_at)}
                                  </p>
                                ) : null}
                                {probe.status === "eingereicht" ? (
                                  <button
                                    type="button"
                                    aria-label="Kultur bearbeiten"
                                    className="mt-2 inline-flex items-center justify-center rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
                                    onClick={() => startOverrideEdit(probe)}
                                  >
                                    <EditIcon />
                                  </button>
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2 align-top">
                            {probe.plant_vitality ? vitalityLabels[probe.plant_vitality] : "-"}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2 align-top">
                            {probe.soil_moisture ? moistureLabels[probe.soil_moisture] : "-"}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2 align-top">
                            {probe.gps_lat !== null && probe.gps_lon !== null
                              ? `${probe.gps_lat.toFixed(5)}, ${probe.gps_lon.toFixed(5)}`
                              : "-"}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2 align-top">
                            {formatDate(probe.created_at)}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2 align-top">
                            {formatDate(probe.submitted_at)}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2 align-top">
                            {formatDate(probe.expire_by)}
                          </td>
                          <td
                            className={`sticky right-0 border-b border-slate-200 px-3 py-2 align-top shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.6)] ${stickyCellBg}`}
                          >
                            {probe.image_url ? (
                              <button
                                type="button"
                                className={primaryButtonClass}
                                onClick={() => openPreview(probe)}
                              >
                                Anzeigen
                              </button>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
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
        </div>
      </section>

      {previewProbe && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 px-4 py-6"
          onClick={closePreview}
        >
          <section
            className="w-full max-w-5xl rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Bildvorschau Probe ${previewProbe.probe_number}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-display text-xl font-semibold text-slate-900">
                Bildvorschau Probe {previewProbe.probe_number}
              </h3>
              <button type="button" className={secondaryButtonClass} onClick={closePreview}>
                Schliessen
              </button>
            </div>

            {previewLoading && (
              <p className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                Lade Bildvorschau...
              </p>
            )}

            {previewError && (
              <div className="mb-3 space-y-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                <p>{previewError}</p>
                <button type="button" className={primaryButtonClass} onClick={retryPreview}>
                  Erneut versuchen
                </button>
              </div>
            )}

            {previewImageUrl && (
              <img
                key={previewImageUrl}
                className="image-preview max-h-[72vh] w-full rounded-lg border border-slate-200 bg-white object-contain"
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
          </section>
        </div>
      )}
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
  const [vitality, setVitality] = useState<VitalityValue | "">("");
  const [soilMoisture, setSoilMoisture] = useState<SoilMoistureValue | "">("");
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
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900">Probe erfassen</h1>

      {!online && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Keine Internetverbindung erkannt.
        </p>
      )}
      {loading && <p className="mt-4 text-slate-700">Laden...</p>}
      {error && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      {lookup && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur md:p-5">
          <p className="text-sm text-slate-700">{identityLine}</p>

          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
              Kulturname
              <input
                className={fieldClass}
                value={cropName}
                onChange={(event) => setCropName(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
              Pflanzenvitalität
              <select
                className={fieldClass}
                value={vitality}
                onChange={(event) => setVitality(event.target.value as VitalityValue | "")}
                required
              >
                <option value="">Bitte wählen</option>
                {Object.entries(vitalityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
              Bodenfeuchte
              <select
                className={fieldClass}
                value={soilMoisture}
                onChange={(event) => setSoilMoisture(event.target.value as SoilMoistureValue | "")}
                required
              >
                <option value="">Bitte wählen</option>
                {Object.entries(moistureLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
              Bild (JPEG oder PNG)
              <input
                className={fieldClass}
                type="file"
                accept="image/jpeg,image/png"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setImageFile(file);
                }}
                required
              />
            </label>

            <div>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => void captureGps()}
                disabled={gpsLoading}
              >
                {gpsLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent"
                      aria-hidden="true"
                    />
                    GPS wird erfasst...
                  </span>
                ) : (
                  "GPS erfassen"
                )}
              </button>
              <p className="mt-2 text-sm text-slate-600">
                {gpsLoading
                  ? "Standort wird ermittelt..."
                  : gps
                    ? `GPS erfasst: ${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)}`
                    : "Noch kein GPS erfasst."}
              </p>
            </div>

            <button type="submit" className={primaryButtonClass} disabled={!canSubmit}>
              Absenden
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

export default function App(): JSX.Element {
  const path = window.location.pathname;

  if (path.startsWith("/admin")) {
    return <AdminPage />;
  }

  const farmerMatch = path.match(/^\/p\/([^/]+)$/);
  if (farmerMatch) {
    return <FarmerPage token={farmerMatch[1]} />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900">Leaf Sap One Up</h1>
      <p className="mt-2 text-slate-700">Unbekannte Route.</p>
    </main>
  );
}
