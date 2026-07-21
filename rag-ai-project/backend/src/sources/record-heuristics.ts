/**
 * Pure heuristics for making sense of arbitrary record arrays (JSON records or DB rows)
 * without knowing the schema ahead of time. Shared by ingestion (grouping/chunking) and
 * the stats engine (aggregation), so both agree on what counts as an "id" or "date" field.
 */

/** Union of keys across a sample of records — a single record's keys aren't reliable when fields are sparse/optional. */
export function sampleKeys(sample: any[]): string[] {
  const keys = new Set<string>();
  for (const r of sample) {
    if (r && typeof r === 'object') for (const k of Object.keys(r)) keys.add(k);
  }
  return [...keys];
}

/** Finds an id-like field that repeats across records (i.e. worth grouping on), not a 1:1 primary key. */
export function detectIdKey(records: any[]): string | null {
  const sample = records.slice(0, Math.min(records.length, 500));

  let bestKey: string | null = null;
  let bestRatio = 1;
  for (const key of sampleKeys(sample)) {
    if (!/id$/i.test(key)) continue;
    const values = sample.map((r) => r?.[key]).filter((v) => v !== undefined && v !== null && v !== '');
    if (values.length < sample.length * 0.9) continue;
    const uniqueRatio = new Set(values).size / values.length;
    if (uniqueRatio < 0.9 && uniqueRatio < bestRatio) {
      bestKey = key;
      bestRatio = uniqueRatio;
    }
  }
  return bestKey;
}

/** All parseable date/time fields — plural, since a record can have several (created, modified, closed, ...) and callers may need to pick a specific one, not just the first found. */
export function detectDateKeys(records: any[]): string[] {
  const sample = records.slice(0, Math.min(records.length, 200));
  const found: string[] = [];
  for (const key of sampleKeys(sample)) {
    if (!/date|time|At$/i.test(key)) continue;
    const withValue = sample.filter((r) => r?.[key] != null);
    if (withValue.length === 0) continue;
    const parseable = withValue.every((r) => !isNaN(Date.parse(r[key])));
    if (parseable) found.push(key);
  }
  return found;
}

/** Finds a parseable date/time field, used to order grouped records chronologically. */
export function detectDateKey(records: any[]): string | null {
  return detectDateKeys(records)[0] ?? null;
}

export function formatValue(v: any): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
