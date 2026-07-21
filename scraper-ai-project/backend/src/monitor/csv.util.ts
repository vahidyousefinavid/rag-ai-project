/** Minimal RFC4180-ish CSV serializer for an array of flat-ish records (nested values are JSON-stringified). */
export function toCsv(records: Record<string, any>[]): string {
  if (records.length === 0) return '';

  const columns: string[] = [];
  const seen = new Set<string>();
  for (const r of records) {
    for (const key of Object.keys(r)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }

  const escape = (value: any): string => {
    if (value === null || value === undefined) return '';
    const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [columns.map(escape).join(',')];
  for (const r of records) {
    lines.push(columns.map((c) => escape(r[c])).join(','));
  }
  return lines.join('\r\n');
}
