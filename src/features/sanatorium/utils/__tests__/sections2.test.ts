import fs from 'fs';
import path from 'path';
import i18n from '@/i18n';
import {
  barPercents, canDeleteOrder, canEditOrder, dietBody, docFileName, downsample, emptyDietDraft, emptyOrgDraft, emptyPackageDraft,
  emptyProcRoomDraft, emptySeasonDraft, emptyServiceDraft, isHhmm, nextOrderStatuses, orgBody, packageBody, parseAges, parseIntIn,
  parseMoney, pickText, procRoomBody, quoteBody, reorderIds, seasonBody, serviceBody, toggleValue, weekdaysLabel,
} from '../sections2';
import { SECTIONS2_LINKS, visibleSections2Links } from '../../components/sections2/Sections2Links';

describe('numbers and text', () => {
  it('parses money to a 2-decimal string', () => {
    expect(parseMoney('1 500 000,5')).toBe('1500000.50');
    expect(parseMoney('0')).toBe('0.00');
    expect(parseMoney('-1')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('')).toBeNull();
  });
  it('parses bounded integers', () => {
    expect(parseIntIn('7', 1, 365)).toBe(7);
    expect(parseIntIn('0', 1, 365)).toBeNull();
    expect(parseIntIn('1.5', 1, 9)).toBeNull();
  });
  it('validates HH:MM', () => {
    expect(isHhmm('09:30')).toBe(true);
    expect(isHhmm('9:30')).toBe(false);
    expect(isHhmm('24:00')).toBe(false);
  });
  it('picks the language text with an Uzbek fallback', () => {
    const o = { name_uz: 'Uz', name_ru: 'Ru', name_en: '' };
    expect(pickText(o, 'name', 'ru')).toBe('Ru');
    expect(pickText(o, 'name', 'en')).toBe('Uz');
    expect(pickText(o, 'name', 'uz-Cyrl')).toBe('Uz');
    expect(pickText(null, 'name', 'ru')).toBe('');
  });
  it('parses children ages', () => {
    expect(parseAges('3, 7 10;x,200')).toEqual([3, 7, 10]);
    expect(parseAges('')).toEqual([]);
  });
});

describe('lists', () => {
  it('toggles a sorted value', () => {
    expect(toggleValue([1, 3], 2)).toEqual([1, 2, 3]);
    expect(toggleValue([1, 2, 3], 2)).toEqual([1, 3]);
  });
  it('moves an id and clamps at the ends', () => {
    expect(reorderIds([1, 2, 3], 3, -1)).toEqual([1, 3, 2]);
    expect(reorderIds([1, 2, 3], 1, -1)).toEqual([1, 2, 3]);
    expect(reorderIds([1, 2, 3], 9, 1)).toEqual([1, 2, 3]);
  });
  it('labels weekdays', () => {
    const names = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    expect(weekdaysLabel([], names, 'all')).toBe('all');
    expect(weekdaysLabel([0, 1, 2, 3, 4, 5, 6], names, 'all')).toBe('all');
    expect(weekdaysLabel([4, 0], names, 'all')).toBe('Mo, Fr');
  });
});

describe('request bodies', () => {
  it('builds a package body and rejects bad input', () => {
    const d = { ...emptyPackageDraft(), nameUz: 'Sog\'lom', price: '5 000 000', nights: '10', items: [{ serviceId: 3, quantity: '2', text: '' }, { serviceId: null, quantity: '1', text: '' }] };
    const r = packageBody(d);
    expect(r.ok && r.body).toMatchObject({ name_uz: 'Sog\'lom', nights: 10, price: '5000000.00', name_ru: null, items: [{ service_id: 3, quantity: 2 }] });
    expect(packageBody({ ...d, price: '' })).toEqual({ ok: false, error: 'sanatorium.priceInvalid' });
    expect(packageBody({ ...d, nights: '0' })).toEqual({ ok: false, error: 'sanatorium.s2.nightsRange' });
    expect(packageBody({ ...d, nameUz: ' ' })).toEqual({ ok: false, error: 'sanatorium.nameShort' });
  });
  it('builds a season body', () => {
    const d = { ...emptySeasonDraft('2026-12-01'), name: 'New Year', to: '2026-12-31', value: '-10' };
    const r = seasonBody(d);
    expect(r.ok && r.body).toMatchObject({ date_from: '2026-12-01', date_to: '2026-12-31', scope: 'all', scope_values: [], mode: 'percent', value: '-10.00' });
    expect(seasonBody({ ...d, to: '2026-11-01' })).toEqual({ ok: false, error: 'sanatorium.errors.invalid_period' });
    expect(seasonBody({ ...d, scope: 'rooms' })).toEqual({ ok: false, error: 'sanatorium.s2.pickScopeValues' });
    expect(seasonBody({ ...d, scope: 'packages', values: ['1'], mode: 'fixed', value: '100' })).toEqual({ ok: false, error: 'sanatorium.s2.fixedNotForPackages' });
    expect(seasonBody({ ...d, value: '-150' }).ok).toBe(false);
  });
  it('builds a service body with booking rules', () => {
    const d = { ...emptyServiceDraft(), nameUz: 'Massaj', price: '100000', needsBooking: true, duration: '30', workFrom: '09:00', workTo: '18:00', weekdays: [0, 1] };
    const r = serviceBody(d);
    expect(r.ok && r.body).toMatchObject({ duration_min: 30, work_from: '09:00', work_to: '18:00', weekdays: [0, 1], needs_booking: true });
    expect(serviceBody({ ...d, duration: '' })).toEqual({ ok: false, error: 'sanatorium.s2.durationRequired' });
    expect(serviceBody({ ...d, workTo: '' })).toEqual({ ok: false, error: 'sanatorium.s2.hoursBoth' });
    expect(serviceBody({ ...d, workFrom: '19:00' })).toEqual({ ok: false, error: 'sanatorium.s2.hoursInvalid' });
  });
  it('builds organization, procedure room and diet bodies', () => {
    expect(orgBody({ ...emptyOrgDraft(), name: 'Uzgidro', tin: '123456789' }).ok).toBe(true);
    expect(orgBody({ ...emptyOrgDraft(), name: 'Uzgidro', tin: '123' })).toEqual({ ok: false, error: 'sanatorium.s2.tinInvalid' });
    const room = procRoomBody({ ...emptyProcRoomDraft(), name: 'Cabinet 1' });
    expect(room.ok && room.body).toMatchObject({ capacity: 1, slot_minutes: 20, weekdays: [0, 1, 2, 3, 4, 5] });
    expect(procRoomBody({ ...emptyProcRoomDraft(), name: 'C', weekdays: [] }).ok).toBe(false);
    expect(dietBody({ ...emptyDietDraft(), nameUz: 'Stol 5' })).toEqual({ ok: false, error: 'sanatorium.s2.codeRequired' });
    const diet = dietBody({ ...emptyDietDraft(), code: '5', nameUz: 'Stol 5' });
    expect(diet.ok && diet.body).toMatchObject({ code: '5', sort_order: 0, is_active: true });
  });
  it('builds a quote body without empty optional keys', () => {
    const d = { start: '2026-12-01', end: '2026-12-08', adults: '2', children: [5], roomId: null, packageId: 4, guestType: null, services: [{ serviceId: 9, quantity: 2 }] };
    const r = quoteBody(d);
    expect(r.ok && r.body).toEqual({ start: '2026-12-01', end: '2026-12-08', adults: 2, children: [5], package_id: 4, services: [{ service_id: 9, quantity: 2 }] });
    expect(quoteBody({ ...d, end: '2026-12-01' })).toEqual({ ok: false, error: 'sanatorium.errors.invalid_period' });
    expect(quoteBody({ ...d, adults: '0', children: [] })).toEqual({ ok: false, error: 'sanatorium.s2.needGuests' });
  });
});

describe('orders, charts, files', () => {
  it('follows the allowed status transitions', () => {
    expect(nextOrderStatuses('requested')).toEqual(['confirmed', 'done', 'cancelled']);
    expect(nextOrderStatuses('cancelled')).toEqual([]);
    expect(canDeleteOrder('requested')).toBe(true);
    expect(canDeleteOrder('done')).toBe(false);
    expect(canEditOrder('done')).toBe(false);
  });
  it('scales bars', () => {
    expect(barPercents([0, 50, 100])).toEqual([0, 50, 100]);
    expect(barPercents([1, 1000])).toEqual([2, 100]);
    expect(barPercents([0, 0])).toEqual([0, 0]);
    expect(barPercents([50], 200)).toEqual([25]);
  });
  it('thins a long series', () => {
    expect(downsample([1, 2, 3], 10)).toEqual([1, 2, 3]);
    expect(downsample([1, 1, 3, 3], 2)).toEqual([1, 3]);
  });
  it('names downloaded documents', () => {
    expect(docFileName('contract', 12, 'pdf')).toBe('contract-12.pdf');
  });
});

describe('home links', () => {
  const has = (...mine: string[]) => (...r: string[]) => r.some((x) => mine.includes(x));
  it('shows registrar links only while their section is on', () => {
    const all = visibleSections2Links(has('registrar') as never, () => true).map((l) => l.route);
    expect(all).toContain('/sanatorium-packages');
    expect(all).toContain('/sanatorium-analytics');
    const off = visibleSections2Links(has('registrar') as never, (k) => k !== 'packages').map((l) => l.route);
    expect(off).not.toContain('/sanatorium-packages');
    expect(off).toContain('/sanatorium-quote');
  });
  it('gives a doctor the schedule and own ratings only', () => {
    expect(visibleSections2Links(has('doctor') as never, () => true).map((l) => l.labelKey)).toEqual(['sanatorium.s2.schedule', 'sanatorium.s2.myRatings']);
    expect(visibleSections2Links(has('nurse') as never, () => true)).toEqual([]);
  });
});

describe('texts', () => {
  const LANGS = ['uz-Latn', 'uz-Cyrl', 'ru', 'en'];
  const ROOT = path.resolve(__dirname, '../../../../..');
  const has = (lang: string, key: string) => i18n.getResource(lang, 'translation', key) !== undefined;
  // Keys built at run time (status / unit / kind maps) plus every literal key of the new files.
  const dynamic = [
    ...['requested', 'confirmed', 'done', 'cancelled'].map((s) => `sanatorium.s2.orderStatus.${s}`),
    ...['confirmed', 'done', 'cancelled'].map((s) => `sanatorium.s2.orderAction.${s}`),
    ...['planned', 'done', 'missed', 'cancelled'].map((s) => `sanatorium.s2.sessionStatus.${s}`),
    ...['all', 'room_type', 'rooms', 'packages'].map((s) => `sanatorium.s2.scope.${s}`),
    ...['percent', 'fixed'].map((s) => `sanatorium.s2.seasonMode.${s}`),
    ...['per_session', 'per_hour', 'per_day', 'per_item'].map((s) => `sanatorium.s2.unit.${s}`),
    ...['per_person', 'per_room'].map((s) => `sanatorium.s2.mode.${s}`),
    ...['contract', 'invoice', 'act', 'epikriz', 'org_invoice'].map((s) => `sanatorium.s2.docKind.${s}`),
    ...['uz', 'ru', 'en'].map((s) => `sanatorium.s2.lang.${s}`),
    ...[0, 1, 2, 3, 4, 5, 6].map((d) => `sanatorium.s2.wd.${d}`),
    ...SECTIONS2_LINKS.map((l) => l.labelKey),
  ];
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const n of fs.readdirSync(dir)) {
      const p = path.join(dir, n);
      if (fs.statSync(p).isDirectory()) { if (n !== '__tests__') walk(p, out); } else if (/\.tsx?$/.test(n)) out.push(p);
    }
    return out;
  };
  const literal = walk(path.join(ROOT, 'src/features/sanatorium'))
    .flatMap((f) => [...fs.readFileSync(f, 'utf8').matchAll(/['"`](sanatorium\.[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)['"`]/g)].map((m) => m[1]!));
  it('every key the new code uses exists in all four languages', () => {
    const missing: string[] = [];
    for (const lang of LANGS) for (const key of new Set([...dynamic, ...literal])) if (!has(lang, key)) missing.push(`${lang}: ${key}`);
    expect(missing).toEqual([]);
  });
  it('has a text for every API error code of the new sections', () => {
    for (const lang of LANGS) {
      for (const code of ['slot_full', 'package_not_allowed', 'template_invalid', 'no_free_slots', 'diet_in_use', 'feedback_exists', 'period_shorter_than_package']) {
        expect(has(lang, `sanatorium.errors.${code}`)).toBe(true);
      }
    }
  });
});
