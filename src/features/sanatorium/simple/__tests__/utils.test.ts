import dayjs from 'dayjs';
import {
  actionRoute, dedupeDebt, familyLines, filterQueue, groupQueue, isMissingEndpoint, moneyLine, moneyString, newClientRef, nextStepFor, normalizeSlots, partyOfItem, partyOfStays,
  queueActions, refundOf, rejectsClientRef, routeSheetText, sameTime, setupRoute, shownMissing, splitAction, stepLine, stepTitle, textLang, validateVisitSettings,
} from '../utils';
import { flowErrorText, isOfflineError } from '../errors';
import { SECTION_GROUPS, visibleGroups } from '../sectionGroups';
import { sanErrorMessage } from '../../utils/sanatorium';
import type { QueueItem, RouteSheet } from '../types';

const item = (over: Partial<QueueItem>): QueueItem => ({ key: 'k', kind: 'arrival_today', urgency: 'today', guest: { id: 1, full_name: 'Aliyev Vali', phone: '+998901234567' }, stay_id: 5, request_id: null, room: null, action: 'arrive', ...over });

describe('queue helpers', () => {
  it('splits «arrive|no_show» and adds the natural second action', () => {
    expect(splitAction('arrive|no_show')).toEqual({ primary: 'arrive', secondary: 'no_show' });
    expect(queueActions(item({ kind: 'overstay', action: 'extend' }))).toEqual({ primary: 'extend', secondary: 'check_out' });
    expect(queueActions(item({ kind: 'arrival_overdue', action: 'no_show', alt_action: null }))).toEqual({ primary: 'no_show', secondary: null });
    expect(queueActions(item({ action: 'extend', alt_action: 'check_out' })).secondary).toBe('check_out');
  });
  it('groups by urgency in fixed order, drops empty groups and never loses an unknown urgency or kind', () => {
    const g = groupQueue([item({ key: 'a', urgency: 'soon' }), item({ key: 'b', urgency: 'overdue' }), item({ key: 'c', urgency: 'later' as never, kind: 'something_new' })]);
    expect(g.map((x) => x.urgency)).toEqual(['overdue', 'soon']);
    expect(g[1]!.items.map((x) => x.key)).toEqual(['a', 'c']);
  });
  it('searches by name, group member, room and phone digits', () => {
    const rows = [item({ key: 'a', room: { id: 1, number: '204' }, members: [{ stay_id: 5, guest_id: 1, full_name: 'Aliyeva Zarina' }] }), item({ key: 'b', guest: { id: 2, full_name: 'Karimov', phone: null } })];
    expect(filterQueue(rows, 'zarina').map((x) => x.key)).toEqual(['a']);
    expect(filterQueue(rows, '204').map((x) => x.key)).toEqual(['a']);
    expect(filterQueue(rows, '901234').map((x) => x.key)).toEqual(['a']);
    expect(filterQueue(rows, '')).toHaveLength(2);
  });
  it('routes accept / arrive to the wizard, everything else is handled in place', () => {
    expect(actionRoute(item({ request_id: 12 }), 'accept')).toEqual({ pathname: '/sanatorium-arrive', params: { request: '12' } });
    expect(actionRoute(item({ members: [{ stay_id: 5, guest_id: 1, full_name: 'A' }, { stay_id: 6, guest_id: 2, full_name: 'B' }] }), 'arrive')).toEqual({ pathname: '/sanatorium-arrive', params: { stay: '5,6' } });
    for (const a of ['convert', 'confirm_service', 'confirm_transfer', 'check_out', 'whatever']) expect(actionRoute(item({}), a)).toBeNull();
  });
  it('party of a card: every member, or the one stay', () => {
    expect(partyOfItem(item({ members: [{ stay_id: 5, guest_id: 1, full_name: 'A' }, { stay_id: 6, guest_id: 2, full_name: 'B' }] }))).toEqual({ stayId: 5, name: 'A, B', size: 2, stayIds: [5, 6] });
    expect(partyOfItem(item({})).stayIds).toEqual([5]);
    expect(partyOfStays({ id: 1, guest: { id: 1, full_name: 'A' } }, [{ id: 2, guest: { id: 2, full_name: 'B' } }])).toEqual({ stayId: 1, name: 'A, B', size: 2, stayIds: [1, 2] });
  });
  it('a badge never repeats the title of the card', () => {
    expect(shownMissing({ kind: 'no_room', missing: ['room', 'doctor'] })).toEqual(['doctor']);
    expect(shownMissing({ kind: 'no_exam', missing: ['exam', 'doctor', 'diet'] })).toEqual(['doctor']);
    expect(shownMissing({ kind: 'arrival_today', missing: ['room', 'exam'] })).toEqual(['room', 'exam']);
    expect(shownMissing({ kind: 'departure_today', missing: ['diet'] })).toEqual([]);
  });
  it('dedupeDebt drops the debt card of people whose departure card already shows it', () => {
    const rows = [item({ key: 'a', kind: 'departure_today', debt: '10.00' }), item({ key: 'b', kind: 'debt', debt: '10.00' }), item({ key: 'c', kind: 'debt', debt: '5.00', stay_id: 9 })];
    expect(dedupeDebt(rows).map((x) => x.key)).toEqual(['a', 'c']);
  });
  it('recognises an endpoint that is simply missing', () => {
    expect(isMissingEndpoint({ response: { status: 404, data: { detail: 'Not Found' } } })).toBe(true);
    expect(isMissingEndpoint({ response: { status: 404, data: { detail: { code: 'feature_disabled' } } } })).toBe(false);
  });
  it('money: whole and decimal text', () => {
    expect(moneyString('150 000')).toBe('150000.00');
    expect(moneyString('0')).toBeNull();
  });
});

describe('route sheet', () => {
  const sheet: RouteSheet = {
    stay_id: 1, lang: 'ru', guest: { full_name: 'Aliyev Vali', login_code: 'AB12' }, members: [{ full_name: 'Aliyeva Zarina' }],
    period: { from: '2026-11-25', to: '2026-11-28', nights: 3, checkout_time: '10:00' },
    steps: [
      { key: 'room', done: true, title_uz: 'Xona', title_ru: 'Номер', text_ru: 'Корпус А, 101', place: 'plan', place_ru: 'План' },
      { key: 'doctor', done: false, title_uz: 'Shifokor', title_ru: 'Врач', person: 'Dr Ahmedov', at: '2026-11-26T10:20:00', text_ru: 'повтор' },
    ],
    contacts: 'Tel 1', phone: '+998711112233',
  };
  it('picks texts by the app language', () => {
    expect(textLang('uz-Cyrl')).toBe('uz');
    expect(stepTitle(sheet.steps[0]!, 'ru')).toBe('Номер');
    expect(stepLine(sheet.steps[1]!, 'ru', (x) => dayjs(x).format('HH:mm'))).toBe('10:20 · Dr Ahmedov');
  });
  it('the text for the guest is in the sheet language, with the family, the fresh login and the cabinet', () => {
    const other: RouteSheet = { stay_id: 2, guest: { full_name: 'Aliyeva Zarina' }, steps: [{ key: 'room', done: false, text_ru: 'Корпус А, 102' }] };
    const text = routeSheetText(sheet, 'ru', { others: [other], creds: [{ guest_id: 1, full_name: 'Aliyev Vali', login_code: 'AB12', password: 'pw' }], cabinetUrl: 'https://x/k' });
    expect(text).toContain('Маршрутный лист');
    expect(text).toContain('Вместе: Aliyeva Zarina');
    expect(text).toContain('освободить номер до 10:00');
    expect(text).toContain('Aliyeva Zarina: Корпус А, 102');
    expect(text).toContain('Aliyev Vali: ID AB12, Пароль pw');
    expect(text).toContain('Личный кабинет: https://x/k');
    expect(text).not.toContain('повтор'); // the doctor's sentence repeats the time line
    expect(text).toContain('+998711112233\nTel 1');
    expect(routeSheetText(sheet, 'uz')).toContain('ID raqami: AB12');
  });
  it('family lines only for the room and the visit', () => {
    expect(familyLines(sheet, [], 'room', 'ru', String)).toEqual([]);
    expect(familyLines(sheet, [{ ...sheet, stay_id: 3 }], 'room', 'ru', String)).toEqual([]);
    expect(familyLines(sheet, [{ ...sheet, stay_id: 3, guest: { full_name: 'Z' } }], 'kitchen', 'ru', String)).toEqual([]);
  });
});

describe('next step of a stay', () => {
  const s = (over: object) => ({ status: 'booked' as const, room: { id: 1, number: '1' }, planned_from: '2026-11-25', planned_to: '2026-11-30', debt: '0.00', ...over });
  const step = (over: object, exam = false) => {
    const n = nextStepFor(s(over) as never, '2026-11-25', exam);
    return [n.text, n.action];
  };
  it('one sentence and one button in the same order as the web', () => {
    expect(step({ planned_from: '2026-11-10', planned_to: '2026-11-20' })).toEqual(['expired', 'no_show']);
    expect(step({ planned_from: '2026-11-24' })).toEqual(['late', 'arrive']);
    expect(step({})).toEqual(['today', 'arrive']);
    expect(step({ planned_from: '2026-11-27', room: null })).toEqual(['noRoom', 'choose_room']);
    expect(step({ planned_from: '2026-11-27' })).toEqual(['waiting', null]);
    expect(step({ status: 'checked_in', planned_to: '2026-11-24' })).toEqual(['over', 'extend']);
    expect(step({ status: 'checked_in', planned_to: '2026-11-25' })).toEqual(['leaves', 'check_out']);
    expect(step({ status: 'checked_in' }, true)).toEqual(['exam', 'assign_doctor']);
    expect(step({ status: 'checked_in', planned_to: '2026-11-26', debt: '5.00' })).toEqual(['debt', 'take_payment']);
    expect(step({ status: 'checked_in', debt: '5.00' })).toEqual(['fine', null]);
    expect(step({ status: 'cancelled', debt: '5.00' })).toEqual(['cancelled', null]);
    expect(step({ status: 'early_left', debt: '5.00' })).toEqual(['goneDebt', 'take_payment']);
    expect(step({ status: 'checked_out' })).toEqual(['gone', null]);
  });
});

describe('money warnings', () => {
  it('prepaid and refund are money to give back', () => {
    expect(refundOf({ warnings: [{ code: 'prepaid', amount: '100.00' }, { code: 'refund', amount: '50.00' }, { code: 'debt', amount: '9' }] })).toBe(150);
    expect(refundOf(undefined)).toBe(0);
  });
  it('early-leave preview: debt, refund, nothing, or unknown', () => {
    expect(moneyLine({ totals: { debt: '10.00', refund: '0.00' } })).toEqual({ kind: 'debt', amount: 10 });
    expect(moneyLine({ totals: { debt: '0.00', refund: '7.00' } })).toEqual({ kind: 'refund', amount: 7 });
    expect(moneyLine({ totals: { debt: '0.00', refund: '0.00' } })).toEqual({ kind: 'none', amount: 0 });
    expect(moneyLine({ members: [] })).toBeNull(); // the room keeper gets no money
    expect(moneyLine(null)).toBeNull();
  });
});

describe('settings, slots, setup, sections', () => {
  it('validates the visit settings form', () => {
    const ok = { from: '09:00', to: '17:00', slot: '20', meals: ['08:00-09:00'], checkin: '12:00', checkout: '10:00' };
    expect(validateVisitSettings(ok)).toBeNull();
    expect(validateVisitSettings({ ...ok, to: '08:00' })).toBe('hours');
    expect(validateVisitSettings({ ...ok, slot: '3' })).toBe('slot');
    expect(validateVisitSettings({ ...ok, checkin: '25:00' })).toBe('checkin');
  });
  it('accepts slots as an array or an object and drops junk', () => {
    expect(normalizeSlots({ slots: ['2026-11-26T10:20:00', 'x', null] })).toEqual(['2026-11-26T10:20:00']);
    expect(normalizeSlots([{ at: '2026-11-26T10:20:00' }])).toEqual(['2026-11-26T10:20:00']);
    expect(sameTime('2026-11-26T10:20:00', '2026-11-26T10:20')).toBe(true);
    expect(sameTime('', '2026-11-26T10:20')).toBe(false);
  });
  it('maps a setup item to a screen and falls back to settings', () => {
    expect(setupRoute({ key: 'rooms' })).toMatch(/^\/sanatorium-rooms/);
    expect(setupRoute({ key: 'unknown' })).toMatch(/^\/sanatorium-settings/);
  });
  it('hides switched-off sections and other roles\' links', () => {
    const all = SECTION_GROUPS.flatMap((g) => g.links.map((l) => l.route));
    expect(all).toContain('/sanatorium-requests');
    expect(visibleGroups((...r) => r.includes('kitchen'), () => true).flatMap((g) => g.links.map((l) => l.route))).not.toContain('/sanatorium-requests');
  });
});

describe('error texts', () => {
  const err = (code: string, params: object = {}) => ({ response: { data: { detail: { code, params } } } });
  it('names the guest when the server sends params.name', () => {
    expect(sanErrorMessage(err('guest_has_stay', { name: 'Vali' }))).toContain('Vali');
  });
  it('a passport of somebody else and a lost connection have their own sentences', () => {
    expect(flowErrorText(err('duplicate_passport', { name: 'Vali' }), 'x')).toContain('Vali');
    expect(isOfflineError({ isAxiosError: true, code: 'ERR_NETWORK' })).toBe(true);
    expect(isOfflineError(err('same_room'))).toBe(false);
    expect(flowErrorText({ isAxiosError: true, code: 'ERR_NETWORK' }, 'x')).toContain('Internet');
  });
  it('room_full names the room and who holds the beds', () => {
    expect(sanErrorMessage(err('room_full', { room_number: '101', date: '2026-11-26', guests: ['A', 'B'] }))).toContain('A, B');
  });
});

describe('idempotency', () => {
  it('newClientRef is a uuid', () => expect(newClientRef()).toMatch(/^[0-9a-f-]{36}$/));
  it('rejectsClientRef recognises a strict-body 422 that names the field', () => {
    expect(rejectsClientRef({ response: { status: 422, data: { detail: [{ loc: ['body', 'client_ref'] }] } } })).toBe(true);
    expect(rejectsClientRef({ response: { status: 409, data: {} } })).toBe(false);
  });
});
