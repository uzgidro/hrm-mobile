import type { User } from '@/types';
import {
  branchRegions,
  branchSubtitle,
  buildBranchBody,
  buildLocationBody,
  canManageBranches,
  filterBranches,
  isSyncQueued,
  knownRegions,
  locationSubtitle,
  parseCoord,
  seedBranchForm,
  seedLocationForm,
  toggleRegion,
  SYNC_COOLDOWN_MS,
} from '../branches';

const u = (x: Record<string, unknown>) => x as unknown as User;

describe('branches utils (v2 BranchesPage)', () => {
  it("canManageBranches: master-admin va admin hisobi; AKT xodimi va ministr — yo'q", () => {
    expect(canManageBranches(u({ id: 1, type: 'master-admin' }))).toBe(true);
    expect(canManageBranches(u({ id: 1, type: 'admin' }))).toBe(true);
    expect(canManageBranches(u({ id: 1, type: 'employee', akt_branch_ids: [3] }))).toBe(false);
    expect(
      canManageBranches(
        u({
          id: 1,
          type: 'employee',
          employee: { id: 2, is_multi_org_user: true, multi_org_employee_role: 'ministr' },
        }),
      ),
    ).toBe(false);
    expect(canManageBranches(null)).toBe(false);
  });

  it("qator osti: asosiy viloyat · manzil, bo'sh — «—»", () => {
    expect(branchSubtitle({ id: 1, region: 'Toshkent', address: 'Navoiy 1' })).toBe('Toshkent · Navoiy 1');
    expect(branchSubtitle({ id: 1, address: 'Navoiy 1' })).toBe('Navoiy 1');
    expect(branchSubtitle({ id: 1 })).toBe('—');
  });

  it('viloyatlar: ro‘yxat manba, eski yozuvda region; katalog — filiallarning o‘zidan, alifbo bo‘yicha', () => {
    expect(branchRegions({ region: 'A', regions: ['B', 'A'] })).toEqual(['B', 'A']);
    expect(branchRegions({ region: 'A', regions: [] })).toEqual(['A']);
    expect(branchRegions({})).toEqual([]);
    expect(
      knownRegions([
        { id: 1, regions: ['Sirdaryo', 'Toshkent'] },
        { id: 2, region: 'Andijon' },
        { id: 3, regions: ['Toshkent'] },
      ]),
    ).toEqual(['Andijon', 'Sirdaryo', 'Toshkent']);
  });

  it('qidiruv: faqat nom bo‘yicha, katta-kichik harf farqsiz', () => {
    const rows = [
      { id: 1, name: 'Chorvoq GES', address: 'Farhod' },
      { id: 2, name: 'Farhod GES' },
    ];
    expect(filterBranches(rows, ' farhod ').map((b) => b.id)).toEqual([2]);
    expect(filterBranches(rows, '')).toHaveLength(2);
  });

  it('toggleRegion: qo‘shilgani oxiriga, qayta bosilsa olib tashlanadi', () => {
    expect(toggleRegion(['A'], 'B')).toEqual(['A', 'B']);
    expect(toggleRegion(['A', 'B'], 'A')).toEqual(['B']);
  });

  it('parseCoord: bo‘sh — null, vergul — nuqta, son emas — undefined', () => {
    expect(parseCoord('')).toBeNull();
    expect(parseCoord(' 41,2995 ')).toBe(41.2995);
    expect(parseCoord('69.2401')).toBe(69.2401);
    expect(parseCoord('abc')).toBeUndefined();
  });

  it('filial formasi: nom majburiy, koordinata noto‘g‘ri — xato; tana v2 bilan aynan', () => {
    const f = seedBranchForm(null);
    expect(buildBranchBody(f)).toEqual({ ok: false, error: 'branches.nameRequired' });
    expect(buildBranchBody({ ...f, name: 'X', lat: 'abc' })).toEqual({ ok: false, error: 'branches.coordInvalid' });
    expect(
      buildBranchBody({
        ...f,
        name: ' Chorvoq ',
        regions: ['Toshkent', 'Sirdaryo'],
        address: '  ',
        lat: '41.5',
        isHeadOffice: true,
        terminalGroup: ' bosh-bino ',
      }),
    ).toEqual({
      ok: true,
      body: {
        name: 'Chorvoq',
        regions: ['Toshkent', 'Sirdaryo'],
        region: 'Toshkent',
        address: null,
        latitude: 41.5,
        longitude: null,
        is_head_office: true,
        is_medical_center: false,
        terminal_group: 'bosh-bino',
      },
    });
  });

  it('filial formasi tahrirda mavjud qiymatlardan to‘ldiriladi; bo‘sh guruh — "" (guruhdan chiqarish)', () => {
    const f = seedBranchForm({
      id: 4,
      name: 'Farhod',
      region: 'Sirdaryo',
      regions: [],
      latitude: 40.1,
      longitude: 0,
      is_medical_center: true,
      terminal_group: null,
    });
    expect(f).toEqual({
      name: 'Farhod',
      regions: ['Sirdaryo'],
      address: '',
      lat: '40.1',
      lon: '0',
      isHeadOffice: false,
      isMedicalCenter: true,
      terminalGroup: '',
    });
    const r = buildBranchBody(f);
    expect(r.ok && r.body.terminal_group).toBe('');
    expect(r.ok && r.body.longitude).toBe(0);
  });

  it('manzil formasi: nom majburiy, filial ixtiyoriy (null), eski javobdagi ichki filial', () => {
    expect(buildLocationBody(seedLocationForm(null))).toEqual({ ok: false, error: 'branches.nameRequired' });
    const seeded = seedLocationForm({ id: 9, name: 'Darvoza', organization_branch: { id: 3 }, latitude: 41 });
    expect(seeded.branchId).toBe(3);
    expect(buildLocationBody({ ...seeded, address: ' Ko‘cha ' })).toEqual({
      ok: true,
      body: { name: 'Darvoza', organization_branch_id: 3, address: 'Ko‘cha', latitude: 41, longitude: null },
    });
    expect(buildLocationBody({ ...seeded, branchId: null, lon: 'x' })).toEqual({
      ok: false,
      error: 'branches.coordInvalid',
    });
  });

  it('manzil qatori osti: filial nomi · manzil', () => {
    const nameOf = (id: number) => (id === 3 ? 'Farhod GES' : `#${id}`);
    expect(locationSubtitle({ id: 1, organization_branch_id: 3, address: 'Kirish' }, nameOf)).toBe(
      'Farhod GES · Kirish',
    );
    expect(locationSubtitle({ id: 1 }, nameOf)).toBe('—');
  });

  it('Hik navbati: 60 s davomida qayta bosilmaydi', () => {
    const q = { 5: 1_000 };
    expect(isSyncQueued(q, 5, 1_000 + SYNC_COOLDOWN_MS - 1)).toBe(true);
    expect(isSyncQueued(q, 5, 1_000 + SYNC_COOLDOWN_MS)).toBe(false);
    expect(isSyncQueued(q, 6, 1_000)).toBe(false);
  });
});
