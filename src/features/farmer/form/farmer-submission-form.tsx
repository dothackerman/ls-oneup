import type { FormEvent } from "react";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription } from "@shared/components/ui/card";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";

export type VitalityValue = "normal" | "schwach_langsam" | "krankheit_oder_anderes_problem";
export type SoilMoistureValue = "sehr_trocken" | "trocken" | "normal" | "nass" | "sehr_nass";

export const vitalityLabels: Record<VitalityValue, string> = {
  normal: "normal",
  schwach_langsam: "schwach / langsam",
  krankheit_oder_anderes_problem: "Krankheit oder anderes Problem",
};

export const moistureLabels: Record<SoilMoistureValue, string> = {
  sehr_trocken: "sehr trocken",
  trocken: "trocken",
  normal: "normal",
  nass: "nass",
  sehr_nass: "sehr nass",
};

type FarmerSubmissionFormProps = {
  identityLine: string;
  cropName: string;
  vitality: VitalityValue | undefined;
  soilMoisture: SoilMoistureValue | undefined;
  gpsLoading: boolean;
  gps: { lat: number; lon: number; capturedAt: string } | null;
  canSubmit: boolean;
  onSubmit: (event: FormEvent) => void | Promise<void>;
  onCropNameChange: (value: string) => void;
  onVitalityChange: (value: VitalityValue) => void;
  onSoilMoistureChange: (value: SoilMoistureValue) => void;
  onImageFileChange: (file: File | null) => void;
  onCaptureGps: () => void | Promise<void>;
};

export function FarmerSubmissionForm({
  identityLine,
  cropName,
  vitality,
  soilMoisture,
  gpsLoading,
  gps,
  canSubmit,
  onSubmit,
  onCropNameChange,
  onVitalityChange,
  onSoilMoistureChange,
  onImageFileChange,
  onCaptureGps,
}: FarmerSubmissionFormProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{identityLine}</CardDescription>
      </CardHeader>

      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="crop-name">Kulturname</Label>
            <Input
              id="crop-name"
              value={cropName}
              onChange={(event) => onCropNameChange(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="vitality-select">Pflanzenvitalität</Label>
            <Select
              value={vitality}
              onValueChange={(value) => onVitalityChange(value as VitalityValue)}
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
              onValueChange={(value) => onSoilMoistureChange(value as SoilMoistureValue)}
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
              onChange={(event) => onImageFileChange(event.target.files?.[0] ?? null)}
              required
            />
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void onCaptureGps()}
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
  );
}
