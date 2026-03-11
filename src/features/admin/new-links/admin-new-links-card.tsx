import { Alert, AlertDescription } from "@shared/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { AdminLinkDeliveryItemCard } from "./admin-link-delivery-item-card";
import {
  buildPreviewLinkDeliveryCardModel,
  buildRealLinkDeliveryCardModel,
  type CreatedProbeLinkItem,
  type LinkDeliveryCardModel,
} from "./admin-link-delivery-card-model";

type AdminNewLinksCardProps = {
  createdItems: CreatedProbeLinkItem[];
  qrData: Record<string, string>;
  copiedProbeId: string | null;
  onCopyToClipboard: (probeId: string, value: string) => void | Promise<void>;
  showOnboardingPreview?: boolean;
};

function buildCardModels({
  createdItems,
  qrData,
  copiedProbeId,
  onCopyToClipboard,
  showOnboardingPreview,
}: AdminNewLinksCardProps): LinkDeliveryCardModel[] {
  if (createdItems.length > 0) {
    return createdItems.map((item) =>
      buildRealLinkDeliveryCardModel({
        item,
        copiedProbeId,
        qrImageSrc: qrData[item.probe_id],
        onCopy: onCopyToClipboard,
      }),
    );
  }

  if (showOnboardingPreview) {
    return [buildPreviewLinkDeliveryCardModel()];
  }

  return [];
}

export function AdminNewLinksCard({
  createdItems,
  qrData,
  copiedProbeId,
  onCopyToClipboard,
  showOnboardingPreview = false,
}: AdminNewLinksCardProps): JSX.Element | null {
  const hasCreatedItems = createdItems.length > 0;
  const cardModels = buildCardModels({
    createdItems,
    qrData,
    copiedProbeId,
    onCopyToClipboard,
    showOnboardingPreview,
  });

  if (cardModels.length === 0) {
    return null;
  }

  return (
    <Card data-onboarding="new-links">
      <CardHeader>
        <CardTitle className="font-display text-xl">Neue Links und QR-Codes</CardTitle>
      </CardHeader>
      <CardContent>
        {hasCreatedItems ? (
          <Alert className="border-amber-300 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <AlertDescription>
              QR-Codes werden nicht persistiert. Bitte Link oder QR sofort kopieren bzw.
              herunterladen. Nach Seitenaktualisierung verschwindet die Darstellung.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-primary/30 bg-primary/10 text-foreground">
            <AlertDescription>
              Onboarding-Vorschau: So sieht dieser Bereich aus, sobald Sie im vorherigen Schritt auf
              &quot;Links erstellen&quot; klicken.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cardModels.map((model) => (
            <AdminLinkDeliveryItemCard key={model.id} model={model} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
