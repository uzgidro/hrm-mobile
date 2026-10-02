// Bo'lim / lavozim formasi — web v2 `StructureModal.submit` aynan: bo'sh raqam →
// null, kod trim yoki null, `change_reason` (TZ S2 «основание для изменения»)
// faqat TAHRIRDA (`DepartmentCreate` da bunday maydon yo'q), toifa bo'sh → null.
import type { Department, JobPosition } from '../api/queries';

export interface DeptForm {
  name: string;
  index: string;
  code: string;
  branchId: number | null;
  changeReason: string;
  headIds: number[];
  secretariat: boolean;
  ijro: boolean;
}

export interface PosForm {
  name: string;
  razryad: string;
  branchId: number | null;
  category: string;
}

export type StructureError = 'nameRequired' | 'branchRequired' | 'numberInvalid';

export function deptFormFrom(d: Department | null, defaultBranch: number | null): DeptForm {
  return {
    name: d?.name ?? '',
    index: d?.index != null ? String(d.index) : '',
    code: d?.code ?? '',
    branchId: d?.organization_branch_id ?? defaultBranch,
    changeReason: '',
    headIds: d?.heads?.map((h) => h.id) ?? [],
    secretariat: d?.is_secretariat ?? false,
    ijro: d?.is_ijro_manager ?? false,
  };
}

export function posFormFrom(p: JobPosition | null, defaultBranch: number | null): PosForm {
  return {
    name: p?.name ?? '',
    razryad: p?.razryad != null ? String(p.razryad) : '',
    branchId: p?.organization_branch_id ?? defaultBranch,
    category: p?.category ?? '',
  };
}

export function validateStructure(f: { name: string; branchId: number | null; num: string }): StructureError | null {
  if (!f.name.trim()) return 'nameRequired';
  if (!f.branchId) return 'branchRequired';
  if (f.num.trim() !== '' && !/^\d+$/.test(f.num.trim())) return 'numberInvalid';
  return null;
}

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v.trim()));

export function buildDepartmentBody(f: DeptForm, isEdit: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: f.name.trim(),
    organization_branch_id: f.branchId,
    index: numOrNull(f.index),
    head_ids: f.headIds,
    is_secretariat: f.secretariat,
    // «Yangiliklar mas'uli» yuborilmaydi (v2 2026-09-24) — mavjud belgi o'zgarmaydi.
    is_ijro_manager: f.ijro,
    code: f.code.trim() || null,
  };
  if (isEdit) body.change_reason = f.changeReason.trim() || null;
  return body;
}

export function buildPositionBody(f: PosForm): Record<string, unknown> {
  return {
    name: f.name.trim(),
    organization_branch_id: f.branchId,
    razryad: numOrNull(f.razryad),
    category: f.category || null,
  };
}
