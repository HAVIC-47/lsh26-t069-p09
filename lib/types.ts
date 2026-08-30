export type Role = "admin" | "manager" | "technician" | "customer";

export type Rule = "fixed_date" | "period_months" | "distance_km";

export type Owner = { id: string; name: string; phone: string };

export type Reading = { date: string; km: number };

export type ServiceItem = {
  name: string;
  rule: Rule;
  /** fixed_date only */
  due_date?: string;
  /** period_months only */
  every_months?: number;
  /** distance_km only */
  every_km?: number;
  cost_bdt: string;
};

export type HistoryRow = {
  item: string;
  date: string;
  /** null for period_months services — never read it on that branch */
  km: number | null;
  cost_bdt: string;
};

export type Vehicle = {
  id: string;
  owner_id: string;
  model: string;
  plate: string;
  odometer_readings: Reading[];
  service_items: ServiceItem[];
  service_history: HistoryRow[];
};

export type WorkshopCase = {
  case_id: string;
  /** The workshop's "today". A data field, never the wall clock. */
  today: string;
  owners: Owner[];
  vehicles: Vehicle[];
};

export type Status = "overdue" | "due_soon" | "fine";

export type DueItem = {
  vehicleId: string;
  plate: string;
  model: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  itemName: string;
  rule: Rule;
  due: string;
  daysUntil: number;
  status: Status;
  /** Human-readable "why", built from this vehicle's real numbers. */
  basis: string;
  cost: number;
  urgency: number;
};
