export type CreatedProbeLinkItem = {
  probe_id: string;
  probe_number: number;
  token_url: string;
};

export type LinkDeliveryCardModel = {
  id: string;
  probeLabel: string;
  helperText: string;
  copyLabel: string;
  copyDisabled: boolean;
  onCopy?: () => void;
  qrDownloadHref?: string;
  qrDownloadFileName?: string;
  qrImageSrc?: string;
  qrImageAlt?: string;
  qrLoadingText?: string;
  isPreview: boolean;
};

type BuildRealCardModelArgs = {
  item: CreatedProbeLinkItem;
  copiedProbeId: string | null;
  qrImageSrc?: string;
  onCopy: (probeId: string, value: string) => void | Promise<void>;
};

const HELPER_TEXT = "Versenden Sie den QR Code oder direkt den Link.";

export function buildRealLinkDeliveryCardModel({
  item,
  copiedProbeId,
  qrImageSrc,
  onCopy,
}: BuildRealCardModelArgs): LinkDeliveryCardModel {
  return {
    id: item.probe_id,
    probeLabel: `Probe ${item.probe_number}`,
    helperText: HELPER_TEXT,
    copyLabel: copiedProbeId === item.probe_id ? "Kopiert" : "Link kopieren",
    copyDisabled: false,
    onCopy: () => void onCopy(item.probe_id, item.token_url),
    qrDownloadHref: qrImageSrc,
    qrDownloadFileName: `probe-${item.probe_number}-qr.png`,
    qrImageSrc,
    qrImageAlt: `QR Probe ${item.probe_number}`,
    qrLoadingText: "QR wird erstellt...",
    isPreview: false,
  };
}

export function buildPreviewLinkDeliveryCardModel(): LinkDeliveryCardModel {
  return {
    id: "preview-probe-1",
    probeLabel: "Probe 1",
    helperText: HELPER_TEXT,
    copyLabel: "Link kopieren",
    copyDisabled: true,
    isPreview: true,
  };
}
