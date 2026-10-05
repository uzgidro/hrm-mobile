import { AxiosError, type AxiosResponse } from 'axios';
import {
  KIOSK_ROLES,
  USERS_PAGE_SIZE,
  accountState,
  buildAdminBody,
  buildKioskBody,
  isForbidden,
  isLongToken,
  kioskRoleKey,
  maskPinfl,
  multiOrgBranchNames,
  primaryMultiOrgRole,
  seedAdminForm,
  seedKioskForm,
  toPaged,
} from '../users';

describe('users utils (v2 UsersPage)', () => {
  it("sahifa: server total/pages; yo'q bo'lsa — qatorlardan", () => {
    expect(USERS_PAGE_SIZE).toBe(25);
    expect(toPaged({ items: [{ id: 1 }], total: 60, pages: 3 }, 25)).toEqual({
      items: [{ id: 1 }],
      total: 60,
      pages: 3,
    });
    expect(toPaged({ items: [{ id: 1 }, { id: 2 }], total: 51 }, 25)).toMatchObject({ total: 51, pages: 3 });
    expect(toPaged([{ id: 1 }], 25)).toEqual({ items: [{ id: 1 }], total: 1, pages: 1 });
    expect(toPaged(null, 25)).toEqual({ items: [], total: 0, pages: 1 });
  });

  it("hisob holati: null — hisob yo'q, true/false — faol/faolsiz", () => {
    expect(accountState({ id: 1, account_is_active: null })).toBe('none');
    expect(accountState({ id: 1 })).toBe('none');
    expect(accountState({ id: 1, account_is_active: true })).toBe('active');
    expect(accountState({ id: 1, account_is_active: false })).toBe('inactive');
  });

  it('rol vakili: massiv bo‘lsa birinchisi; filiallar — ichki nomlar, bo‘lmasa id lar', () => {
    expect(primaryMultiOrgRole({ id: 1, multi_org_employee_role: ['deputy', 'hr'] })).toBe('deputy');
    expect(primaryMultiOrgRole({ id: 1, multi_org_employee_role: 'hr' })).toBe('hr');
    expect(primaryMultiOrgRole({ id: 1, multi_org_employee_role: [] })).toBeNull();
    expect(primaryMultiOrgRole({ id: 1 })).toBeNull();
    const nameOf = (id: number) => (id === 3 ? 'Chorvoq' : `#${id}`);
    expect(
      multiOrgBranchNames({ id: 1, organization_branches: [{ id: 3, name: 'Farhod' }, { id: 4 }] }, nameOf),
    ).toEqual(['Farhod', '#4']);
    expect(multiOrgBranchNames({ id: 1, organization_branch_ids: [3, 9] }, nameOf)).toEqual(['Chorvoq', '#9']);
    expect(multiOrgBranchNames({ id: 1 }, nameOf)).toEqual([]);
  });

  it("administrator: pochta majburiy; parol ixtiyoriy, kiritilsa ≥ 8; yangisida bo'sh parol — null (pochtaga)", () => {
    const f = seedAdminForm(null);
    expect(f).toEqual({ email: '', password: '', branchId: null });
    expect(buildAdminBody({ ...f, email: '  ' }, false)).toEqual({ ok: false, error: 'users.errEmail' });
    expect(buildAdminBody({ ...f, email: 'a@b.uz', password: 'short' }, false)).toEqual({
      ok: false,
      error: 'users.errPasswordShort',
    });
    expect(buildAdminBody({ email: ' a@b.uz ', password: '', branchId: 4 }, false)).toEqual({
      ok: true,
      body: { email: 'a@b.uz', password: null, organization_branch_id: 4 },
    });
    // Tahrirda bo'sh parol YUBORILMAYDI (joriy parol qoladi); filial bo'sh — null (barcha filiallar).
    expect(buildAdminBody({ email: 'a@b.uz', password: '', branchId: null }, true)).toEqual({
      ok: true,
      body: { email: 'a@b.uz', organization_branch_id: null },
    });
    expect(buildAdminBody({ email: 'a@b.uz', password: 'Secret123', branchId: 2 }, true)).toEqual({
      ok: true,
      body: { email: 'a@b.uz', organization_branch_id: 2, password: 'Secret123' },
    });
    expect(seedAdminForm({ id: 5, email: 'x@y.uz', organization_branch_id: 7 })).toEqual({
      email: 'x@y.uz',
      password: '',
      branchId: 7,
    });
  });

  it("kiosk: rollar — serverning ruxsat ro'yxati; login, filial, parol tekshiruvlari v2 tartibida", () => {
    expect(KIOSK_ROLES).toEqual(['monitoring-operator', 'kpp']);
    expect(kioskRoleKey('kpp')).toBe('kpp');
    expect(kioskRoleKey('monitoring-operator')).toBe('monitoring');
    const f = seedKioskForm(null);
    expect(f).toEqual({
      username: '',
      legalName: '',
      password: '',
      role: 'monitoring-operator',
      pinfl: '',
      branchIds: [],
    });
    expect(buildKioskBody(f, false)).toEqual({ ok: false, error: 'users.kioskUsernameRequired' });
    expect(buildKioskBody({ ...f, username: 'post1' }, false)).toEqual({
      ok: false,
      error: 'users.kioskBranchRequired',
    });
    expect(buildKioskBody({ ...f, username: 'post1', branchIds: [2], password: ' 1234567 ' }, false)).toEqual({
      ok: false,
      error: 'users.kioskPasswordShort',
    });
    expect(
      buildKioskBody(
        { username: ' post1 ', legalName: ' ', password: ' Secret123 ', role: 'kpp', pinfl: '', branchIds: [2, 3] },
        false,
      ),
    ).toEqual({
      ok: true,
      body: {
        username: 'post1',
        password: 'Secret123',
        role: 'kpp',
        legal_name: null,
        organization_branch_ids: [2, 3],
        personal_identification_number: null,
      },
    });
  });

  it("kiosk tahriri: login o'zgarmaydi, bo'sh parol yuborilmaydi, filialni bo'shatib bo'lmaydi", () => {
    const row = {
      id: 9,
      username: 'post1',
      legal_name: 'KPP 1',
      role: 'kpp',
      personal_identification_number: '12345678901234',
      organization_branch_ids: [2],
    };
    const f = seedKioskForm(row);
    expect(f).toEqual({
      username: 'post1',
      legalName: 'KPP 1',
      password: '',
      role: 'kpp',
      pinfl: '12345678901234',
      branchIds: [2],
    });
    expect(buildKioskBody({ ...f, branchIds: [] }, true)).toEqual({ ok: false, error: 'users.kioskBranchRequired' });
    expect(buildKioskBody({ ...f, password: 'abc' }, true)).toEqual({ ok: false, error: 'users.kioskPasswordShort' });
    expect(buildKioskBody(f, true)).toEqual({
      ok: true,
      body: {
        legal_name: 'KPP 1',
        role: 'kpp',
        organization_branch_ids: [2],
        personal_identification_number: '12345678901234',
      },
    });
    expect(buildKioskBody({ ...f, password: ' NewPass99 ' }, true)).toMatchObject({ body: { password: 'NewPass99' } });
  });

  it('JShShIR niqobi: faqat raqam, 14 tagacha', () => {
    expect(maskPinfl('12a34 5678901234567')).toBe('12345678901234');
  });
  it("isForbidden: faqat HTTP 403 — 500, tarmoq xatosi va oddiy Error emas", () => {
    const http = (status: number) =>
      new AxiosError('x', 'ERR', undefined, undefined, { status, data: {} } as AxiosResponse);
    expect(isForbidden(http(403))).toBe(true);
    expect(isForbidden(http(401))).toBe(false);
    expect(isForbidden(http(500))).toBe(false);
    expect(isForbidden(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(false);
    expect(isForbidden(new Error('boom'))).toBe(false);
    expect(isForbidden(null)).toBe(false);
  });
});

describe("isLongToken — bo'linmas uzun qiymat (pochta) to'liq kenglikda", () => {
  it("bo'shliqsiz 21+ belgi — ha (QA: «AbdugafurovKudratillo@mail / .ru» bo'lib ketardi)", () => {
    expect(isLongToken('AbdugafurovKudratillo@mail.ru')).toBe(true);
    expect(isLongToken('  AbdugafurovKudratillo@mail.ru ')).toBe(true);
  });
  it("qisqa yoki so'zlardan iborat — yo'q (oddiy ikki ustunli qator)", () => {
    expect(isLongToken('ali@mail.ru')).toBe(false);
    expect(isLongToken("Tezkor dispetcherlik xizmati bo'limi")).toBe(false);
    expect(isLongToken(null)).toBe(false);
  });
});
