"use client";

import { useMemo, useState } from "react";
import { Search, Check, CarFront } from "lucide-react";

export type PickerVehicle = {
  id: string;
  plate: string;
  model: string;
  owner: string;
  km: number;
};

/**
 * Vehicle chooser for the workshop floor: a search box over plate, owner name
 * and model, with the current pick shown above the list.
 *
 * A plain <select> was unusable here — 42 entries, and a technician holding a
 * tablet knows the plate on the car in front of them, not its position in an
 * alphabetical list. Rows are 44px so they can be tapped.
 */
export function VehiclePicker({
  vehicles,
  name = "vehicle_id",
  defaultId,
  onChange,
}: {
  vehicles: PickerVehicle[];
  name?: string;
  defaultId?: string;
  onChange?: (v: PickerVehicle) => void;
}) {
  const [selectedId, setSelectedId] = useState(defaultId ?? vehicles[0]?.id ?? "");
  const [query, setQuery] = useState("");

  const selected = vehicles.find((v) => v.id === selectedId);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    // Digits alone should match a plate, so "123456" finds "Ga 12-3456".
    const digits = q.replace(/\D/g, "");
    return vehicles.filter((v) => {
      const plate = v.plate.toLowerCase();
      return (
        plate.includes(q) ||
        v.owner.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (digits.length >= 3 && plate.replace(/\D/g, "").includes(digits))
      );
    });
  }, [query, vehicles]);

  function pick(v: PickerVehicle) {
    setSelectedId(v.id);
    onChange?.(v);
  }

  return (
    <div className="space-y-2.5">
      <input type="hidden" name={name} value={selectedId} />

      {selected && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent bg-accent-soft px-4 py-3">
          <CarFront className="h-5 w-5 shrink-0 text-accent" strokeWidth={2} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="nums text-[15px] font-semibold text-heading">{selected.plate}</p>
            <p className="text-xs text-muted">
              {selected.model} · {selected.owner} ·{" "}
              <span className="nums">{selected.km.toLocaleString()} km</span>
            </p>
          </div>
          <span className="eyebrow">Selected</span>
        </div>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint"
          strokeWidth={2}
          aria-hidden="true"
        />
        <label className="sr-only" htmlFor="vehicle-search">
          Search by plate number, owner name or model
        </label>
        <input
          id="vehicle-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plate, owner or model…"
          className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm placeholder:text-faint"
        />
      </div>

      <div
        role="listbox"
        aria-label="Vehicles"
        className="max-h-64 overflow-y-auto rounded-xl border border-border"
      >
        {matches.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted">
            No vehicle matches &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {matches.map((v) => {
              const active = v.id === selectedId;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(v)}
                    className={`flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 ${
                      active ? "bg-accent-soft" : "hover:bg-surface-2"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="nums block text-[13px] font-medium">
                        {v.plate}
                      </span>
                      <span className="block text-xs text-muted">
                        {v.model} · {v.owner}
                      </span>
                    </span>
                    {active && (
                      <Check
                        className="h-4 w-4 shrink-0 text-accent"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-faint">
        {matches.length} of {vehicles.length} vehicles
      </p>
    </div>
  );
}
