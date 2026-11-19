import i18n from '@/i18n';
import { canAccessPage } from '@/utils/roles';
import type { User } from '@/types';
import { fmtMoney, hasSanRole, maskPassport, parseDmy, minFreeBeds, sanErrorInfo, sanErrorMessage, sanRoles } from '../sanatorium';

const err = (detail: unknown) => ({ response: { status: 409, data: { detail } } });

describe('sanatorium roles', () => {
  const keeper = { sanatorium_roles: ['room_keeper', 'bogus'] } as unknown as User;
  it('keeps only known roles', () => {
    expect(sanRoles(keeper)).toEqual(['room_keeper']);
    expect(hasSanRole(keeper, 'room_keeper')).toBe(true);
    expect(hasSanRole(keeper, 'doctor')).toBe(false);
  });
  it('gates the module on a non-empty role list', () => {
    expect(canAccessPage(keeper, 'sanatorium')).toBe(true);
    expect(canAccessPage({ sanatorium_roles: [] } as unknown as User, 'sanatorium')).toBe(false);
    expect(canAccessPage({} as User, 'sanatorium')).toBe(false);
  });
});

describe('sanatorium errors', () => {
  it('reads code and params from an object detail', () => {
    const e = err({ code: 'room_full', i18n_key: 'sanatorium.errors.room_full', params: { date: '2026-11-20' } });
    expect(sanErrorInfo(e)).toEqual({ code: 'room_full', params: { date: '2026-11-20' } });
  });
  it('translates the code with params, in the active language', async () => {
    await i18n.changeLanguage('ru');
    expect(sanErrorMessage(err({ code: 'room_full', params: { date: '2026-11-20' } }))).toContain('2026-11-20');
    expect(sanErrorMessage(err({ code: 'use_early_leave' }))).toMatch(/досрочн/i);
    await i18n.changeLanguage('uz-Latn');
  });
  it('detects the early-leave code that opens the sheet', () => {
    expect(sanErrorInfo(err({ code: 'use_early_leave' })).code).toBe('use_early_leave');
  });
});

describe('helpers', () => {
  it('masks the passport', () => {
    expect(maskPassport('AA1234567')).toBe('AA ••••567');
    expect(maskPassport(null)).toBe('');
  });
  it('counts free beds over the busiest night', () => {
    expect(minFreeBeds(4, [1, 3, 2])).toBe(1);
    expect(minFreeBeds(2, [2, 3])).toBe(0);
  });
});

describe('form helpers', () => {
  it('parses a typed birth date', () => {
    expect(parseDmy('14.03.1985')).toBe('1985-03-14');
    expect(parseDmy('1/2/1990')).toBe('1990-02-01');
    expect(parseDmy('31.02.1990')).toBeNull();
    expect(parseDmy('14.03.2999')).toBeNull();
    expect(parseDmy('garbage')).toBeNull();
  });
  it('formats money', () => {
    expect(fmtMoney('1500000.00').replace(/\s/g, '')).toBe('1500000');
    expect(fmtMoney(null)).toBe('—');
  });
});
