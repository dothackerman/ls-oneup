export const ADMIN_ONBOARDING_STORAGE_KEY = "ls-oneup-admin-onboarding-v1";

export type AdminOnboardingStep = {
  id: string;
  title: string;
  description: string;
  selector?: string;
  missingTargetHint?: string;
  preview?: {
    id: string;
    selector: string;
    eyebrow: string;
    title: string;
    description: string;
    items?: string[];
  };
};

export const ADMIN_ONBOARDING_STEPS: AdminOnboardingStep[] = [
  {
    id: "welcome",
    title: "Willkommen im Adminbereich",
    description:
      "Du siehst jetzt die wichtigsten Bereiche. Nach dieser Tour kannst du sofort mit echten Aufträgen starten.",
    preview: {
      id: "welcome",
      selector: '[data-onboarding-preview="welcome"]',
      eyebrow: "Vorschau",
      title: "Orientierung im Adminbereich",
      description:
        "Die Einführung markiert nacheinander Farbmodus, Erstellung, neue Links und Tabelle, damit jeder Schritt einen klaren Fokuspunkt erhält.",
      items: ["Farbmodus", "Proben erstellen", "Links und QR-Codes", "Proben-Tabelle"],
    },
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
    missingTargetHint:
      'Dieser Bereich erscheint erst nach "Links erstellen". Bis dahin zeigen wir eine nicht-interaktive Vorschau.',
    preview: {
      id: "new-links",
      selector: '[data-onboarding-preview="new-links"]',
      eyebrow: "Vorschau",
      title: "Neue Links und QR-Codes",
      description:
        'So sieht der Bereich nach "Links erstellen" aus: Link öffnen, Link kopieren und QR herunterladen bleiben danach direkt griffbereit.',
      items: ["Formular öffnen", "Link kopieren", "QR herunterladen"],
    },
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
