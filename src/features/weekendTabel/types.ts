// Response shapes of `/weekend-tabel` (backend services/weekend_tabel.py).
export type CellSource = 'turnstile' | 'manual' | 'import' | 'order';

export type WeekendDay = {
  date: string;
  day: number;
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
  rest: null | 'weekend' | 'holiday';
};

export type WeekendCell = {
  hours: number;
  source: CellSource;
  /** Order reference («№45, 18.09.2026») when the cell comes from an order. */
  ref?: string | null;
};

export type WeekendRow = {
  employee_id: number;
  name: string;
  position?: string | null;
  razryad?: string | number | null;
  department?: string | null;
  tabel_number?: string | number | null;
  is_archived?: boolean;
  cells: Record<string, WeekendCell>;
  /** Dates where HR entered 0 over a turnstile figure. */
  manual_zero: string[];
  days: number;
  hours: number;
};

export type WeekendGrid = {
  year: number;
  month: number;
  days: WeekendDay[];
  rows: WeekendRow[];
  totals: { employees: number; days: number; hours: number };
};

export type WeekendOrder = {
  order_act_id: number;
  ref: string;
  employee_id: number;
  employee_name: string;
  date_from: string;
  date_to: string;
  rest_days: string[];
};

export type ImportPreview = {
  sheet?: string | null;
  dry_run: boolean;
  employees: number;
  entries: number;
  weekday_entries: number;
  unmatched: { row: number; name: string; days?: number }[];
  ambiguous: { row: number; name: string }[];
};

export type AssignResult = { changed: number; employees: number; days: number; not_rest_days: string[] };

export type EntryBody = { employee_id: number; date: string; hours: number | null; note?: string };

export type AssignBody = {
  employee_ids: number[];
  dates: string[];
  /** null removes the designation. */
  hours: number | null;
  order_ref?: string;
  order_act_id?: number;
  note?: string;
};

export type GridParams = {
  year: number;
  month: number;
  organizationBranchId?: number;
  departmentId?: number;
  search?: string;
  includeAll?: boolean;
};
