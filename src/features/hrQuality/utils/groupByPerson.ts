// Kadr nazorati protokoli — bitta qator = bitta odam + bitta buzilgan qoida.
// HR KARTANI tuzatadi, shuning uchun ro'yxat shaxs bo'yicha guruhlanadi (v2
// HrQualityPage: bir ism 8 marta takrorlanardi); eng yomon kartalar birinchi.

export interface QualityRow {
  employee_id: number;
  employee_name?: string | null;
  employee_photo_thumb_path?: string | null;
  employee_photo_path?: string | null;
  rule?: string | null;
  rule_title?: string | null;
  severity?: string | null;
  detail?: string | null;
}

export interface QualityPerson {
  id: number;
  name: string;
  photo?: string | null;
  issues: QualityRow[];
  errors: number;
  warnings: number;
}

export function groupByPerson(rows: QualityRow[]): QualityPerson[] {
  const m = new Map<number, QualityPerson>();
  for (const r of rows) {
    const p = m.get(r.employee_id) ?? {
      id: r.employee_id,
      name: r.employee_name ?? '—',
      photo: r.employee_photo_thumb_path ?? r.employee_photo_path,
      issues: [],
      errors: 0,
      warnings: 0,
    };
    p.issues.push(r);
    if (r.severity === 'error') p.errors++;
    else p.warnings++;
    m.set(r.employee_id, p);
  }
  return [...m.values()].sort((a, b) => b.errors - a.errors || b.warnings - a.warnings || a.name.localeCompare(b.name));
}
