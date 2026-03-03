import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import * as QRCode from "qrcode";
import "./styles.css";

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

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusBadge(status: AdminProbe["status"]): string {
  if (status === "eingereicht") {
    return "status status-submitted";
  }
  if (status === "abgelaufen") {
    return "status status-expired";
  }
  return "status status-open";
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

function AdminPage(): JSX.Element {
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [probeCount, setProbeCount] = useState(1);
  const [createdItems, setCreatedItems] = useState<CreatedProbe[]>([]);
  const [probes, setProbes] = useState<AdminProbe[]>([]);
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const qrData = useQrData(createdItems);

  async function loadProbes(): Promise<void> {
    const res = await fetch("/api/admin/probes");
    const payload = (await res.json()) as { items?: AdminProbe[] } & ApiError;
    if (!res.ok) {
      throw new Error(payload.message || "Laden fehlgeschlagen.");
    }
    setProbes(payload.items ?? []);
  }

  useEffect(() => {
    void loadProbes().catch((err: Error) => setError(err.message));
  }, []);

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);

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

    setBusy(false);

    if (!response.ok) {
      setError(payload.message || "Erstellung fehlgeschlagen.");
      return;
    }

    setCreatedItems(payload.items ?? []);
    setCustomerName("");
    setOrderNumber("");
    setProbeCount(1);
    await loadProbes();
  }

  async function copyToClipboard(value: string): Promise<void> {
    await navigator.clipboard.writeText(value);
  }

  async function submitOverride(probeId: string): Promise<void> {
    const cropName = overrideDrafts[probeId]?.trim();
    if (!cropName) {
      return;
    }

    const res = await fetch(`/api/admin/probes/${probeId}/crop-override`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ crop_name: cropName }),
    });

    const payload = (await res.json()) as ApiError;

    if (!res.ok) {
      setError(payload.message || "Override fehlgeschlagen.");
      return;
    }

    setOverrideDrafts((prev) => ({ ...prev, [probeId]: "" }));
    await loadProbes();
  }

  return (
    <main className="container">
      <h1>Leaf Sap One Up</h1>
      <p className="subtitle">Adminbereich M1</p>

      <section className="card">
        <h2>Probes erstellen</h2>
        <form className="grid-form" onSubmit={handleCreate}>
          <label>
            Kunde
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              required
            />
          </label>
          <label>
            Auftragsnummer
            <input
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              required
            />
          </label>
          <label>
            Anzahl Probes
            <input
              type="number"
              min={1}
              value={probeCount}
              onChange={(event) => setProbeCount(Number(event.target.value || 1))}
              required
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Erstellen..." : "Links erstellen"}
          </button>
        </form>
      </section>

      {createdItems.length > 0 && (
        <section className="card">
          <h2>Neue Links und QR-Codes</h2>
          <p className="warning">
            QR-Codes werden nicht persistiert. Bitte Link oder QR sofort kopieren bzw.
            herunterladen. Nach Seitenaktualisierung verschwindet die Darstellung.
          </p>
          <div className="qr-grid">
            {createdItems.map((item) => (
              <article key={item.probe_id} className="qr-item">
                <h3>Probe {item.probe_number}</h3>
                {qrData[item.probe_id] ? (
                  <img src={qrData[item.probe_id]} alt={`QR Probe ${item.probe_number}`} />
                ) : (
                  <p>QR wird erstellt...</p>
                )}
                <p className="link-break">{item.token_url}</p>
                <div className="button-row">
                  <button type="button" onClick={() => copyToClipboard(item.token_url)}>
                    Link kopieren
                  </button>
                  {qrData[item.probe_id] && (
                    <a download={`probe-${item.probe_number}-qr.png`} href={qrData[item.probe_id]}>
                      QR herunterladen
                    </a>
                  )}
                </div>
                <small>
                  Erstellt: {formatDate(item.created_at)} | Ablauf: {formatDate(item.expire_by)}
                </small>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>Probes</h2>
        {error && <p className="error">{error}</p>}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Kunde</th>
                <th>Auftrag</th>
                <th>Probe</th>
                <th>Status</th>
                <th>Erstellt</th>
                <th>Ablauf</th>
                <th>Kultur</th>
                <th>Bild</th>
                <th>Override</th>
              </tr>
            </thead>
            <tbody>
              {probes.map((probe) => (
                <tr key={probe.probe_id}>
                  <td>{probe.customer_name}</td>
                  <td>{probe.order_number}</td>
                  <td>{probe.probe_number}</td>
                  <td>
                    <span className={statusBadge(probe.status)}>{probe.status}</span>
                  </td>
                  <td>{formatDate(probe.created_at)}</td>
                  <td>{formatDate(probe.expire_by)}</td>
                  <td>
                    {probe.crop_name || "-"}
                    {probe.crop_overridden_at ? (
                      <small className="block">
                        Override: {formatDate(probe.crop_overridden_at)}
                      </small>
                    ) : null}
                  </td>
                  <td>
                    {probe.image_url ? (
                      <a href={probe.image_url} target="_blank" rel="noreferrer">
                        Anzeigen
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <input
                      placeholder="Kultur anpassen"
                      value={overrideDrafts[probe.probe_id] ?? ""}
                      onChange={(event) =>
                        setOverrideDrafts((prev) => ({
                          ...prev,
                          [probe.probe_id]: event.target.value,
                        }))
                      }
                    />
                    <button type="button" onClick={() => submitOverride(probe.probe_id)}>
                      Speichern
                    </button>
                    <small className="block">
                      Mit Speichern uebernimmt Admin die Verantwortung.
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

const vitalityLabels: Record<string, string> = {
  normal: "normal",
  schwach_langsam: "schwach / langsam",
  krankheit_oder_anderes_problem: "Krankheit oder anderes Problem",
};

const moistureLabels: Record<string, string> = {
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
  const [vitality, setVitality] = useState("normal");
  const [soilMoisture, setSoilMoisture] = useState("normal");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [gps, setGps] = useState<{ lat: number; lon: number; capturedAt: string } | null>(null);

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
        setError("Ohne Internet ist Laden in M1 nicht moeglich.");
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
    if (!navigator.geolocation) {
      setError("GPS ist auf diesem Geraet nicht verfuegbar.");
      return;
    }

    setError(null);

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15_000,
      });
    }).catch(() => null);

    if (!position) {
      setError("GPS konnte nicht gelesen werden. Bitte Berechtigung erlauben.");
      return;
    }

    setGps({
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      capturedAt: new Date().toISOString(),
    });
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (!online) {
      setError("Ohne Internet ist Senden in M1 nicht moeglich.");
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
    formData.set("crop_name", cropName);
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
    <main className="container narrow">
      <h1>Probe erfassen</h1>
      {!online && <p className="warning">Keine Internetverbindung erkannt.</p>}
      {loading && <p>Laden...</p>}
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {lookup && (
        <section className="card">
          <p>{identityLine}</p>
          <form className="grid-form" onSubmit={handleSubmit}>
            <label>
              Kulturname
              <input
                value={cropName}
                onChange={(event) => setCropName(event.target.value)}
                required
              />
            </label>

            <label>
              Pflanzenvitalitaet
              <select value={vitality} onChange={(event) => setVitality(event.target.value)}>
                {Object.entries(vitalityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Bodenfeuchte
              <select
                value={soilMoisture}
                onChange={(event) => setSoilMoisture(event.target.value)}
              >
                {Object.entries(moistureLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Bild (JPEG oder PNG)
              <input
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
              <button type="button" onClick={() => void captureGps()}>
                GPS erfassen
              </button>
              <small className="block">
                {gps
                  ? `GPS erfasst: ${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)}`
                  : "Noch kein GPS erfasst."}
              </small>
            </div>

            <button type="submit">Absenden</button>
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
    <main className="container narrow">
      <h1>Leaf Sap One Up</h1>
      <p>Unbekannte Route.</p>
    </main>
  );
}
