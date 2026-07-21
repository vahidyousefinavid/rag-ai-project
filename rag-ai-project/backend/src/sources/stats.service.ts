import { Injectable } from '@nestjs/common';
import { SourcesService } from './sources.service';
import { sampleKeys, detectIdKey, detectDateKey, detectDateKeys } from './record-heuristics';

export type FilterOp = 'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';
export type AggregateOp = 'count' | 'sum' | 'avg' | 'min' | 'max';
export type DateBucket = 'day' | 'month' | 'year';
export type QueryScope = 'entities' | 'events';

export interface QueryFilter {
  field: string;
  op: FilterOp;
  value: string | number;
}

export interface QuerySpec {
  groupBy?: string;
  dateBucket?: DateBucket;
  aggregate?: AggregateOp;
  aggregateField?: string;
  filter?: QueryFilter[];
  sortDir?: 'asc' | 'desc';
  limit?: number;
  scope?: QueryScope;
}

export interface QueryGroupResult {
  key: string;
  value: number;
}

export interface FieldSample {
  field: string;
  uniqueValues: number;
  sample: { value: string; count: number }[];
}

export interface QueryResult {
  totalRecords: number;
  matchedRecords: number;
  scope: QueryScope;
  /** The field records were collapsed to "latest state" by, if any (e.g. an incident/ticket id). */
  entityKey: string | null;
  groupedBy: string | null;
  groups?: QueryGroupResult[];
  /** Present only when groupBy was omitted — lets the model discover real field names before querying one. */
  availableFields?: FieldSample[];
  /** Present only when groupBy was omitted — date/time fields, kept separate from availableFields since they're
   *  high-cardinality (not "categorical") but are exactly what a trend/dateBucket query needs to group by. */
  dateFields?: string[];
}

const MAX_CATEGORICAL_UNIQUE = 25;
const MAX_CATEGORICAL_RATIO = 0.5;
const MAX_DISCOVERY_FIELDS = 8;
const DEFAULT_LIMIT = 20;
const PRIORITY_FIELD_RE = /status|وضعیت|state|category|دسته|type|نوع|priority|اولویت|stage|مرحله|subject|موضوع/i;

/**
 * Generic filter/group/aggregate query engine over a source's full raw record set —
 * one flexible primitive instead of a hand-built tool per analytical need (counts,
 * breakdowns, trends over time, top-N, filtered subsets, sums/averages of numeric
 * fields). Works identically for any source's data since it never assumes a schema:
 * the agent discovers real field names first (groupBy omitted), then queries them.
 */
@Injectable()
export class StatsService {
  constructor(private sources: SourcesService) {}

  async runQuery(sourceId: string, spec: QuerySpec = {}): Promise<QueryResult | null> {
    const records = await this.sources.getRecordsForStats(sourceId);
    if (!records) return null;
    return this.execute(records, spec);
  }

  private execute(records: any[], spec: QuerySpec): QueryResult {
    if (records.length === 0) {
      return { totalRecords: 0, matchedRecords: 0, scope: 'events', entityKey: null, groupedBy: null, groups: [] };
    }

    const idKey = detectIdKey(records);
    const scope: QueryScope = spec.scope ?? (idKey ? 'entities' : 'events');
    const working = scope === 'entities' && idKey ? this.collapseToLatest(records, idKey) : records;
    const filtered = this.applyFilters(working, spec.filter ?? []);

    if (!spec.groupBy) {
      const keys = sampleKeys(filtered.slice(0, 200));
      const fields = this.pickCategoricalFields(filtered, keys, idKey).map((field) => this.fieldSample(filtered, field));
      return {
        totalRecords: records.length,
        matchedRecords: filtered.length,
        scope,
        entityKey: idKey,
        groupedBy: null,
        availableFields: fields,
        dateFields: detectDateKeys(filtered),
      };
    }

    const groups = this.groupAndAggregate(filtered, spec.groupBy, spec.dateBucket, spec.aggregate ?? 'count', spec.aggregateField);
    const sorted = groups.sort((a, b) => (spec.sortDir === 'asc' ? a.value - b.value : b.value - a.value));

    return {
      totalRecords: records.length,
      matchedRecords: filtered.length,
      scope,
      entityKey: idKey,
      groupedBy: spec.groupBy,
      groups: sorted.slice(0, spec.limit ?? DEFAULT_LIMIT),
    };
  }

  /** History-style data (many rows per entity) collapsed to one "current" row per entity, same as ingestion does. */
  private collapseToLatest(records: any[], idKey: string): any[] {
    const dateKey = detectDateKey(records);
    const groups = new Map<string, any[]>();
    for (const r of records) {
      if (!r || typeof r !== 'object') continue;
      const id = String(r[idKey] ?? '');
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id)!.push(r);
    }
    return [...groups.values()].map((rows) =>
      dateKey ? rows.reduce((latest, r) => (Date.parse(r[dateKey] ?? 0) >= Date.parse(latest[dateKey] ?? 0) ? r : latest)) : rows[rows.length - 1],
    );
  }

  private applyFilters(records: any[], filters: QueryFilter[]): any[] {
    if (filters.length === 0) return records;
    return records.filter((r) => filters.every((f) => this.matchFilter(r?.[f.field], f.op, f.value)));
  }

  private matchFilter(actual: any, op: FilterOp, expected: string | number): boolean {
    if (actual === undefined || actual === null) return false;
    const actualNum = Number(actual);
    const expectedNum = Number(expected);
    const bothNumeric = actual !== '' && !isNaN(actualNum) && !isNaN(expectedNum);

    switch (op) {
      case 'eq': return String(actual).trim() === String(expected).trim();
      case 'neq': return String(actual).trim() !== String(expected).trim();
      case 'contains': return String(actual).toLowerCase().includes(String(expected).toLowerCase());
      case 'gt': return bothNumeric ? actualNum > expectedNum : String(actual) > String(expected);
      case 'gte': return bothNumeric ? actualNum >= expectedNum : String(actual) >= String(expected);
      case 'lt': return bothNumeric ? actualNum < expectedNum : String(actual) < String(expected);
      case 'lte': return bothNumeric ? actualNum <= expectedNum : String(actual) <= String(expected);
      default: return false;
    }
  }

  private bucketDate(value: any, bucket: DateBucket): string | null {
    const t = Date.parse(value);
    if (isNaN(t)) return null;
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    if (bucket === 'year') return String(y);
    if (bucket === 'month') return `${y}-${m}`;
    return `${y}-${m}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  private groupAndAggregate(
    records: any[],
    groupBy: string,
    dateBucket: DateBucket | undefined,
    aggregate: AggregateOp,
    aggregateField?: string,
  ): QueryGroupResult[] {
    const buckets = new Map<string, any[]>();
    for (const r of records) {
      const raw = r?.[groupBy];
      if (raw === undefined || raw === null || raw === '') continue;
      const key = dateBucket ? this.bucketDate(raw, dateBucket) : (typeof raw === 'object' ? JSON.stringify(raw) : String(raw));
      if (key === null) continue;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(r);
    }

    return [...buckets.entries()].map(([key, rows]) => ({ key, value: this.aggregateValue(rows, aggregate, aggregateField) }));
  }

  private aggregateValue(rows: any[], aggregate: AggregateOp, field?: string): number {
    if (aggregate === 'count' || !field) return rows.length;
    const nums = rows.map((r) => Number(r?.[field])).filter((n) => !isNaN(n));
    if (nums.length === 0) return 0;
    const sum = nums.reduce((a, b) => a + b, 0);
    switch (aggregate) {
      case 'sum': return round2(sum);
      case 'avg': return round2(sum / nums.length);
      case 'min': return round2(Math.min(...nums));
      case 'max': return round2(Math.max(...nums));
      default: return rows.length;
    }
  }

  /** Auto-detects which fields are worth reporting counts for: low-cardinality, mostly-populated, not the id itself. */
  private pickCategoricalFields(records: any[], keys: string[], idKey: string | null): string[] {
    const scored: { field: string; ratio: number; priority: boolean }[] = [];

    for (const key of keys) {
      if (key === idKey) continue;
      const values = records
        .map((r) => r?.[key])
        .filter((v) => v !== undefined && v !== null && v !== '' && typeof v !== 'object');
      if (values.length < records.length * 0.5) continue; // too sparse to be meaningful

      const unique = new Set(values.map(String)).size;
      if (unique < 2 || unique > MAX_CATEGORICAL_UNIQUE) continue;

      const ratio = unique / values.length;
      if (ratio > MAX_CATEGORICAL_RATIO) continue;

      scored.push({ field: key, ratio, priority: PRIORITY_FIELD_RE.test(key) });
    }

    scored.sort((a, b) => Number(b.priority) - Number(a.priority) || a.ratio - b.ratio);
    return scored.slice(0, MAX_DISCOVERY_FIELDS).map((s) => s.field);
  }

  private fieldSample(records: any[], field: string): FieldSample {
    const counts = new Map<string, number>();
    for (const r of records) {
      const v = r?.[field];
      if (v === undefined || v === null || v === '') continue;
      const key = typeof v === 'object' ? JSON.stringify(v) : String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return {
      field,
      uniqueValues: counts.size,
      sample: sorted.slice(0, 5).map(([value, count]) => ({ value, count })),
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
