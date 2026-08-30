import type { Rule } from "./types";

/**
 * The workshop's standard service catalogue.
 *
 * Every value here is taken from the published dataset, where each of the
 * twelve item names carries exactly one interval and one price across all 42
 * vehicles — so nothing is invented. A newly registered vehicle gets these.
 */
export type CatalogueItem = {
  name: string;
  rule: Rule;
  every_months?: number;
  every_km?: number;
  cost_bdt: string;
};

export const CATALOGUE: CatalogueItem[] = [
  // time based
  { name: "Engine oil", rule: "period_months", every_months: 3, cost_bdt: "3500.00" },
  { name: "Air filter", rule: "period_months", every_months: 6, cost_bdt: "1200.00" },
  { name: "Coolant", rule: "period_months", every_months: 12, cost_bdt: "1800.00" },
  { name: "AC service", rule: "period_months", every_months: 12, cost_bdt: "4500.00" },
  // distance based
  { name: "Brake pads", rule: "distance_km", every_km: 10000, cost_bdt: "6000.00" },
  { name: "Spark plugs", rule: "distance_km", every_km: 20000, cost_bdt: "2400.00" },
  { name: "Tyres", rule: "distance_km", every_km: 40000, cost_bdt: "32000.00" },
  { name: "Timing belt", rule: "distance_km", every_km: 80000, cost_bdt: "15000.00" },
];

/**
 * Paperwork, kept separate because each needs a real expiry date that only the
 * owner can supply. An expiry cannot be guessed, so these are added only when
 * the date is entered — an absent document is better than an invented one.
 */
export const DOCUMENTS: { key: string; name: string; cost_bdt: string }[] = [
  { key: "insurance", name: "Insurance", cost_bdt: "12000.00" },
  { key: "fitness", name: "Fitness certificate", cost_bdt: "2500.00" },
  { key: "tax_token", name: "Tax token", cost_bdt: "6500.00" },
];

/** Models seen on the workshop's register, offered as suggestions. */
export const KNOWN_MODELS = [
  "Toyota Axio",
  "Toyota Premio",
  "Toyota Allion",
  "Toyota Noah",
  "Toyota Hiace",
  "Honda Vezel",
  "Honda Grace",
  "Nissan X-Trail",
  "Mitsubishi Pajero",
  "Suzuki Alto",
];
