/** All date maths runs in UTC so it cannot drift with the server's timezone. */

export const parseDate = (s: string) => new Date(s + "T00:00:00Z");

export const toISO = (d: Date) => d.toISOString().slice(0, 10);

export const daysBetween = (from: string, to: string) =>
  Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);

export const addDays = (from: string, n: number) =>
  toISO(new Date(parseDate(from).getTime() + n * 86_400_000));

/**
 * Adds calendar months, clamping to the last valid day of the target month.
 * "31 Jan + 1 month" is 28 Feb, not 3 Mar — a service due in February cannot
 * land in March just because the source month was longer.
 */
export function addMonths(from: string, n: number) {
  const d = parseDate(from);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return toISO(target);
}

export const formatDate = (s: string) =>
  parseDate(s).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
