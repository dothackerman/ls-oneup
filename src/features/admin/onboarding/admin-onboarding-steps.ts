export const ADMIN_ONBOARDING_STORAGE_KEY = "ls-oneup-admin-onboarding-v1";

export type AdminOnboardingStep = {
  id: string;
  title: string;
  description: string;
  selector?: string;
  missingTargetHint?: string;
};

export const ADMIN_ONBOARDING_STEPS: AdminOnboardingStep[] = [
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
    missingTargetHint:
      'Dieser Bereich erscheint erst nach "Links erstellen". Gehe zuerst zum vorherigen Schritt und erstelle Proben.',
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
  },
];
