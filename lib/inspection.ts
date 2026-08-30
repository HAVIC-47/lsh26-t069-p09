/**
 * The workshop's standard 20-point visual check. Fixed list rather than a
 * configurable one: a checklist that varies between technicians is not a
 * checklist. Grouped so the form reads in the order the car is walked around.
 */
export const INSPECTION_POINTS: { group: string; points: string[] }[] = [
  {
    group: "Under the bonnet",
    points: [
      "Engine oil level",
      "Coolant level",
      "Brake fluid level",
      "Battery terminals",
      "Drive belts",
      "Visible leaks",
    ],
  },
  {
    group: "Brakes and tyres",
    points: [
      "Front tyre tread",
      "Rear tyre tread",
      "Tyre pressures",
      "Brake pad thickness",
      "Handbrake travel",
      "Spare and tools",
    ],
  },
  {
    group: "Lights and glass",
    points: [
      "Headlights and indicators",
      "Brake lights",
      "Wiper blades",
      "Windscreen chips",
      "Mirrors",
    ],
  },
  {
    group: "Cabin and drive",
    points: ["AC cooling", "Unusual noises", "Suspension bounce"],
  },
];

export const ALL_POINTS = INSPECTION_POINTS.flatMap((g) => g.points);

export type Verdict = "pass" | "attention" | "fail";

export const VERDICT_LABEL: Record<Verdict, string> = {
  pass: "Pass",
  attention: "Needs attention",
  fail: "Fail",
};
