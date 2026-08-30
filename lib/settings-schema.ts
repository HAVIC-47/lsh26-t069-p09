/**
 * Shape and metadata for the tunable predictive variables.
 *
 * Deliberately NOT server-only: the admin settings form is a client component
 * and needs the field list, so putting these behind `server-only` breaks the
 * build. Only the database read lives in settings.ts.
 */
import { SOON_DAYS, DEFAULT_KM_PER_DAY } from "./engine";
import { CHURN_DAYS, MAX_PLAUSIBLE_KM_PER_DAY } from "./scoring";

export type Settings = {
  soon_days: number;
  default_km_per_day: number;
  max_km_per_day: number;
  churn_days: number;
  document_days: number;
};

/** The compiled-in defaults, used when the migration has not been applied. */
export const DEFAULT_SETTINGS: Settings = {
  soon_days: SOON_DAYS,
  default_km_per_day: DEFAULT_KM_PER_DAY,
  max_km_per_day: MAX_PLAUSIBLE_KM_PER_DAY,
  churn_days: CHURN_DAYS,
  document_days: 30,
};

export const SETTING_META: {
  key: keyof Settings;
  label: string;
  unit: string;
  min: number;
  max: number;
  help: string;
}[] = [
  {
    key: "soon_days",
    label: "Due-soon window",
    unit: "days",
    min: 1,
    max: 180,
    help: "How far ahead an item counts as due soon rather than fine.",
  },
  {
    key: "default_km_per_day",
    label: "Assumed daily running",
    unit: "km/day",
    min: 1,
    max: 300,
    help: "Used for a vehicle with fewer than two odometer readings, until a second one exists.",
  },
  {
    key: "max_km_per_day",
    label: "Plausibility limit",
    unit: "km/day",
    min: 50,
    max: 2000,
    help: "A reading implying more than this is queried before it is accepted, because a bad reading corrupts every distance estimate on the vehicle.",
  },
  {
    key: "churn_days",
    label: "Churn threshold",
    unit: "days",
    min: 7,
    max: 365,
    help: "How long a predicted service may sit unactioned before the customer counts as at risk.",
  },
  {
    key: "document_days",
    label: "Document warning",
    unit: "days",
    min: 1,
    max: 180,
    help: "Advance notice on regulatory paperwork, which carries a fine rather than a repair bill.",
  },
];
