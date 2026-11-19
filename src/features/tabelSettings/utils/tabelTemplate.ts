// Tabel form constructor (web v2 `TabelTemplateBuilder`) and the «what the system recognised» report
// (`TabelTemplateReport`): the pure parts — types, meta reader, option state and request body.
import type { TabelBranch } from './tabelConfig';

export type NameFormat = 'name' | 'short_name' | 'initials';
export type PresentCell = '{norm}' | '{hours}';

/** Body of `POST organization-branches/tabel-template-sample` and `…/{id}/tabel-template/build`. */
export type TabelTemplateOptions = {
  identity?: string[];
  summary?: string[];
  group_by_department?: boolean;
  weekend_sheet?: boolean;
  name_format?: NameFormat;
  present?: PresentCell;
  legend?: boolean;
  codes?: Record<string, string>;
  labels?: Record<string, string>;
};

/** `GET organization-branches/tabel-template-columns`. */
export type TabelTemplateColumns = {
  summary: { key: string; label: string }[];
  identity: { key: string; label: string }[];
  codes: { key: string; code: string; label: string }[];
  defaults: TabelTemplateOptions;
};

export type AutodetectSheet = {
  sheet: string;
  kind: 'main' | 'weekend';
  grouped: boolean;
  days_found: number;
  rows_removed: number;
  columns: { column: string; header: string; key: string | null }[];
};

export type Autodetect = { sheets: AutodetectSheet[]; codes: Record<string, string> };

/** What the branch record says about its saved tabel form (`document_templates.tabel.file`). */
export type TabelTemplateMeta = {
  original: string;
  sheets: string[];
  autodetect: Autodetect | null;
  options: TabelTemplateOptions | null;
  ownLegend: boolean;
};

export function readTabelTemplateMeta(b: TabelBranch): TabelTemplateMeta | null {
  const entry = (b.document_templates?.tabel ?? null) as { file?: Record<string, unknown> } | null;
  const f = entry?.file;
  if (!f || !f.name) return null;
  const auto = f.autodetect as Autodetect | null | undefined;
  return {
    original: (f.original as string) || (f.name as string),
    sheets: Array.isArray(f.sheets) ? (f.sheets as string[]) : [],
    autodetect: auto && Array.isArray(auto.sheets) ? auto : null,
    options: (f.options as TabelTemplateOptions | null | undefined) ?? null,
    ownLegend: f.own_legend === true,
  };
}

/** The catalogue is trusted only in its full shape — an old server answers something else (422). */
export function isColumnsCatalog(data: unknown): data is TabelTemplateColumns {
  const d = data as Partial<TabelTemplateColumns> | null;
  return !!d && Array.isArray(d.summary) && Array.isArray(d.identity) && Array.isArray(d.codes) && !!d.defaults;
}

/** Identity columns that are always rendered (№ + F.I.SH.), so not selectable. */
export const ALWAYS_IDENTITY = new Set(['tr', 'gtr', 'name']);

export type BuilderState = {
  identity: string[];
  summary: string[];
  labels: Record<string, string>;
  group: boolean;
  weekend: boolean;
  legend: boolean;
  nameFormat: NameFormat;
  present: PresentCell;
  codes: Record<string, string>;
};

/**
 * Starting state. Codes: catalogue default < server defaults < codes found in an uploaded file <
 * the saved constructor options (same order as web).
 */
export function seedBuilder(
  catalog: TabelTemplateColumns,
  initial: TabelTemplateOptions | null,
  detectedCodes?: Record<string, string>,
): BuilderState {
  const def = catalog.defaults;
  const base = initial ?? def;
  const codes: Record<string, string> = {};
  for (const c of catalog.codes) codes[c.key] = initial?.codes?.[c.key] ?? detectedCodes?.[c.key] ?? def.codes?.[c.key] ?? c.code;
  return {
    identity: base.identity ?? def.identity ?? [],
    summary: base.summary ?? def.summary ?? [],
    labels: { ...(def.labels ?? {}), ...(initial?.labels ?? {}) },
    group: base.group_by_department ?? def.group_by_department ?? false,
    weekend: base.weekend_sheet ?? def.weekend_sheet ?? false,
    legend: base.legend ?? def.legend ?? true,
    nameFormat: base.name_format ?? def.name_format ?? 'name',
    present: base.present ?? def.present ?? '{norm}',
    codes,
  };
}

/** Request body: only codes / headers that differ from the catalogue are sent. */
export function builderBody(s: BuilderState, catalog: TabelTemplateColumns): TabelTemplateOptions {
  const codes: Record<string, string> = {};
  for (const c of catalog.codes) {
    const v = (s.codes[c.key] ?? '').trim();
    if (v && v !== c.code) codes[c.key] = v;
  }
  const labels: Record<string, string> = {};
  for (const k of s.summary) {
    const v = (s.labels[k] ?? '').trim();
    if (v && v !== summaryLabel(catalog, k)) labels[k] = v;
  }
  return {
    identity: s.identity,
    summary: s.summary,
    group_by_department: s.group,
    weekend_sheet: s.weekend,
    name_format: s.nameFormat,
    present: s.present,
    legend: s.legend,
    codes,
    labels,
  };
}

export const summaryLabel = (catalog: TabelTemplateColumns, key: string): string =>
  catalog.summary.find((c) => c.key === key)?.label ?? key;

/** Toggle an identity column; catalogue order is kept so the preview matches the built file. */
export function toggleIdentity(catalog: TabelTemplateColumns, cur: string[], key: string): string[] {
  if (cur.includes(key)) return cur.filter((k) => k !== key);
  return catalog.identity.map((c) => c.key).filter((k) => k === key || cur.includes(k));
}

/** Swap a summary column with its neighbour (`dir` -1 up / +1 down). */
export function moveItem(list: string[], key: string, dir: -1 | 1): string[] {
  const i = list.indexOf(key);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

/** Schematic header line of the form being built: «№ | F.I.SH. | … | 1 2 3 … | summary…». */
export function previewHeaders(s: BuilderState, catalog: TabelTemplateColumns): string[] {
  const idLabels = catalog.identity.filter((c) => s.identity.includes(c.key) && !ALWAYS_IDENTITY.has(c.key)).map((c) => c.label);
  const own = s.summary.map((k) => s.labels[k]?.trim() || summaryLabel(catalog, k));
  return ['№', 'F.I.SH.', ...idLabels, '1 2 3 …', ...own];
}
