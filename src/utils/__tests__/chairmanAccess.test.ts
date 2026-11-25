// The chairman of the board (multi-org role `ministr`) sees every business module — view-only where
// the server gives him no write — while the technical consoles and the `deputy` role stay as they were.
import type { User } from '@/types';
import { canAccessPage, isChairmanViewOnly, setNavOverrides, type PageKey } from '../roles';
import { canSanWrite, hasSanRole, isSanReadOnly } from '@/features/sanatorium/utils/sanatorium';

const u = (x: Record<string, unknown>) => x as unknown as User;
const multi = (role: string, extra: Record<string, unknown> = {}) =>
  u({ id: 1, type: 'employee', employee: { id: 10, is_multi_org_user: true, multi_org_employee_role: [role] }, ...extra });
const chair = (extra: Record<string, unknown> = {}) => multi('ministr', extra);
const master = u({ id: 2, type: 'master-admin', employee: { id: 11 } });

afterEach(() => setNavOverrides(undefined));

describe('chairman: business modules open', () => {
  const OPEN: PageKey[] = ['mobileCheckins', 'hrQuality'];
  it.each(OPEN)('%s is open to the chairman', (k) => {
    expect(canAccessPage(chair(), k)).toBe(true);
  });

  it('fleet and health roster open for him, closed for a plain employee', () => {
    expect(canAccessPage(chair(), 'vehicles')).toBe(true);
    expect(canAccessPage(chair(), 'health')).toBe(true);
    expect(canAccessPage(u({ id: 5, type: 'employee', employee: { id: 5 } }), 'vehicles')).toBe(false);
    expect(canAccessPage(u({ id: 5, type: 'employee', employee: { id: 5 } }), 'health')).toBe(false);
  });

  it('sanatorium opens through sanatorium_roles', () => {
    expect(canAccessPage(chair({ sanatorium_roles: ['registrar'], sanatorium_read_only: true }), 'sanatorium')).toBe(true);
    expect(canAccessPage(chair(), 'sanatorium')).toBe(false);
  });
});

describe('chairman: technical consoles stay closed', () => {
  const CLOSED: PageKey[] = ['users', 'auditLog', 'branches', 'turnstiles', 'terminals', 'customFields', 'sysHealth', 'lms'];
  it.each(CLOSED)('%s is closed to the chairman', (k) => {
    expect(canAccessPage(chair(), k)).toBe(false);
  });
});

describe("chairman: other people's working desks", () => {
  const DESKS: PageKey[] = ['orderTypes', 'tempOrders', 'responsibles', 'holidays', 'tabelSettings', 'monitoring', 'kpp'];
  it.each(DESKS)('%s is not in his menu by default', (k) => {
    expect(canAccessPage(chair(), k)).toBe(false);
  });
  it('the master admin can give one back', () => {
    setNavOverrides({ holidays: { roles: ['masterAdmin', 'hr', 'ministr'] } });
    expect(canAccessPage(chair(), 'holidays')).toBe(true);
    expect(canAccessPage(chair(), 'tempOrders')).toBe(false);
  });
});

describe('deputy is unchanged', () => {
  it.each(['orderTypes', 'tempOrders', 'mobileCheckins', 'responsibles', 'hrQuality', 'holidays', 'tabelSettings', 'monitoring', 'kpp', 'vehicles', 'health'] as PageKey[])(
    '%s stays closed to the deputy',
    (k) => {
      expect(canAccessPage(multi('deputy'), k)).toBe(false);
    },
  );
  it('deputy keeps its leadership pages', () => {
    expect(canAccessPage(multi('deputy'), 'employees')).toBe(true);
  });
});

describe('isChairmanViewOnly', () => {
  it('true for the chairman, false for the site master-admin and others', () => {
    expect(isChairmanViewOnly(chair())).toBe(true);
    expect(isChairmanViewOnly(master)).toBe(false);
    expect(isChairmanViewOnly(multi('hr'))).toBe(false);
    expect(isChairmanViewOnly(null)).toBe(false);
  });
});

describe('sanatorium read-only helper', () => {
  const viewer = chair({ sanatorium_roles: ['registrar'], sanatorium_read_only: true });
  const registrar = u({ id: 7, type: 'employee', employee: { id: 7 }, sanatorium_roles: ['registrar'] });
  it('view-only account reads as registrar but never writes', () => {
    expect(isSanReadOnly(viewer)).toBe(true);
    expect(hasSanRole(viewer, 'registrar')).toBe(true);
    expect(canSanWrite(viewer, 'registrar')).toBe(false);
    expect(canSanWrite(viewer, 'registrar', 'room_keeper')).toBe(false);
  });
  it('a real registrar keeps write access', () => {
    expect(isSanReadOnly(registrar)).toBe(false);
    expect(canSanWrite(registrar, 'registrar')).toBe(true);
    expect(canSanWrite(registrar, 'doctor')).toBe(false);
  });
  it('missing flag or user means writable role check only', () => {
    expect(isSanReadOnly(null)).toBe(false);
    expect(canSanWrite(null, 'registrar')).toBe(false);
  });
});
