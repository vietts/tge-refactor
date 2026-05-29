/**
 * True when an ISO date/time string is present and parses to a real date.
 * Used to hide CMS-driven countdown sections when the target date is left
 * empty (or malformed) in Pages CMS — an empty string yields `new Date('')`
 * = `Invalid Date`, which would otherwise render a broken "--" countdown.
 */
export function hasValidDate(iso?: string | null): boolean {
  if (!iso) return false;
  return !Number.isNaN(new Date(iso).getTime());
}
