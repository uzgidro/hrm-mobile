// 2026-10-06: «xodimlarni kiril alifbosida qidirsa ham lotindagi orqali qidiradigan qo'sh» —
// ilova ichida (serversiz) filtrlaydigan qidiruvlar ham kirill↔lotin va apostrofni moslaydi.
import { filterBranches } from '@/features/branches/utils/branches';
import { filterFiles } from '@/features/documents/utils';
import { filterTeamMembers } from '@/features/kpi/utils';

describe('mijoz tomonidagi qidiruv: kirill ↔ lotin', () => {
  it('filiallar, fayllar, KPI jamoasi', () => {
    const branches = [{ id: 1, name: "\"O'zbekgidroenergo\" AJ" }, { id: 2, name: 'Binolardan foydalanish direksiyasi' }] as never[];
    expect(filterBranches(branches, 'Ўзбекгидро').map((b: { id: number }) => b.id)).toEqual([1]);
    expect(filterBranches(branches, 'бинолардан').map((b: { id: number }) => b.id)).toEqual([2]);
    const files = [{ id: 5, original_filename: 'Buyruq_Amonov.docx' }] as never[];
    expect(filterFiles(files, 'амонов')).toHaveLength(1);
    const team = [{ employee_id: 1, legal_name: "G'ofurov Anvar", pending_tasks: 0 }] as never[];
    expect(filterTeamMembers(team, 'ғофуров', 'all' as never)).toHaveLength(1);
  });
});
