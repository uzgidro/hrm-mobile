import fs from 'fs';
import path from 'path';
import i18n from '@/i18n';
import {
  barPercents, canDeleteOrder, canEditOrder, dietBody, docFileName, downsample, emptyDietDraft, emptyOrgDraft, emptyPackageDraft,
  emptyProcRoomDraft, emptySeasonDraft, emptyServiceDraft, isHhmm, nextOrderStatuses, orgBody, packageBody, parseAges, parseIntIn,
  parseMoney, pickText, procRoomBody, quoteBody, reorderIds, seasonBody, serviceBody, toggleValue, weekdaysLabel,
  FEEDBACK_SOURCES, NO_DIET, bucketSeries, canEditStayDiet, dietCodes, dietRoomNumber, emptyFeedbackDraft, emptyFeedbackItem, feedbackBody, feedbackFilterCount,
  feedbackParams, filterDietGuests, filterOrgs, filterSeasons, filterServices, isPastDay, limitRows, moveBody, niceMax, orderQuantity,
  presetRange, procRoomUsage, rangeTooLong, ratingTone, remainingSessions, scheduleBody, scheduleStart, seasonScopeText, serviceCategories,
  serviceFilterOn, slotCaption, slotUsage, stackPercents, topRows,
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
  it('gives a doctor the schedule and own ratings, a nurse the schedule only', () => {
    expect(visibleSections2Links(has('doctor') as never, () => true).map((l) => l.labelKey)).toEqual(['sanatorium.s2.schedule', 'sanatorium.s2.myRatings']);
    expect(visibleSections2Links(has('nurse') as never, () => true).map((l) => l.labelKey)).toEqual(['sanatorium.s2.schedule']);
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
  // sanCatalog texts: every key the new code uses (literal t() keys are checked by usedKeys.test too).
  const catalogKeys = [...new Set(walk(path.join(ROOT, 'src/features/sanatorium')).flatMap((f) => [...fs.readFileSync(f, 'utf8').matchAll(/['"`](sanCatalog\.[a-zA-Z0-9_.]+)['"`]/g)].map((m) => m[1]!)))];
  const catalogDynamic = FEEDBACK_SOURCES.map((x) => `sanCatalog.fb.source_${x}`);
  it('has every sanCatalog text in all four languages', () => {
    const missing: string[] = [];
    for (const lang of LANGS) for (const key of [...catalogKeys.filter((k) => k !== 'sanCatalog.fb.source_'), ...catalogDynamic]) if (!has(lang, key)) missing.push(`${lang}: ${key}`);
    expect(missing).toEqual([]);
  });
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

describe('round 2: feedback, analytics, diet, schedule, services', () => {
  it('builds a paper feedback body and rejects incomplete input', () => {
    const d = { ...emptyFeedbackDraft(), stayId: 5, overall: 4, room: 5 };
    expect(feedbackBody({ ...d, stayId: null })).toEqual({ ok: false, error: 'sanCatalog.fb.pickStay' });
    expect(feedbackBody({ ...d, overall: 0 })).toEqual({ ok: false, error: 'sanCatalog.fb.overallRequired' });
    expect(feedbackBody({ ...d, items: [{ ...emptyFeedbackItem(), rating: 3 }] }).ok).toBe(false);
    const r = feedbackBody({ ...d, comment: ' ok ', items: [{ kind: 'doctor', refId: 7, name: '', rating: 5, comment: '' }, { kind: 'service', refId: null, name: ' Massage ', rating: 4, comment: 'fine' }] });
    expect(r).toEqual({
      ok: true,
      body: {
        stay_id: 5, overall: 4, room_rating: 5, food_rating: null, staff_rating: null, comment: 'ok',
        items: [{ kind: 'doctor', ref_id: 7, rating: 5, comment: null }, { kind: 'service', name: 'Massage', rating: 4, comment: 'fine' }],
      },
    });
  });
  it('builds the feedback list params without empty filters', () => {
    const base = { from: '2026-11-01', to: '2026-11-30', min: null, max: null, doctor: null, source: null, q: ' ' };
    expect(feedbackParams(base)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(feedbackParams({ ...base, min: 2, max: 4, doctor: 9, source: 'registrar', q: 'ali' })).toEqual({
      from: '2026-11-01', to: '2026-11-30', min_overall: 2, max_overall: 4, doctor_staff_id: 9, source: 'registrar', q: 'ali',
    });
    expect(feedbackFilterCount({ ...base, min: 2, q: 'x' })).toBe(2);
    expect(ratingTone(5)).toBe('success');
    expect(ratingTone(3)).toBe('warning');
    expect(ratingTone(1)).toBe('danger');
  });
  it('computes analytics ranges like the web', () => {
    expect(presetRange(30, '2026-11-30')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(presetRange(7, '2026-11-30').from).toBe('2026-11-24');
    expect(rangeTooLong('2025-11-30', '2026-11-30')).toBe(false);
    expect(rangeTooLong('2025-11-29', '2026-11-30')).toBe(true);
  });
  it('buckets series and scales axes', () => {
    const r = bucketSeries([1, 2, 3, 4], ['a', 'b', 'c', 'd'], 2, 'sum');
    expect(r).toEqual({ values: [3, 7], labels: ['a', 'c'] });
    expect(bucketSeries([2, 4], ['a', 'b'], 5, 'avg')).toEqual({ values: [2, 4], labels: ['a', 'b'] });
    expect(bucketSeries([2, 4, 6, 8], ['a', 'b', 'c', 'd'], 2, 'avg').values).toEqual([3, 7]);
    expect([0, 1, 3, 7, 12, 130].map(niceMax)).toEqual([1, 1, 5, 10, 20, 200]);
    expect(stackPercents([2, 0, 2], 4)).toEqual([50, 0, 50]);
    expect(topRows([1, 2, 3], 2)).toEqual([1, 2]);
    expect(procRoomUsage([{ name: 'R', done: 3, planned: 2, missed: 1, utilization_percent: 60 }, null])).toEqual([
      { name: 'R', done: 3, planned: 2, missed: 1, percent: 60 }, { name: '', done: 0, planned: 0, missed: 0, percent: 0 },
    ]);
  });
  it('filters kitchen diet guests, including «no diet»', () => {
    const g = [
      { guest: { full_name: 'Ali Valiyev' }, diet: { id: 1 } },
      { guest: { full_name: 'Vali Aliyev' }, diet: null },
      { guest: { full_name: 'Sardor' }, diet: { id: 2 } },
    ];
    expect(filterDietGuests(g, '', null)).toHaveLength(3);
    expect(filterDietGuests(g, 'ali', null).map((x) => x.guest.full_name)).toEqual(['Ali Valiyev', 'Vali Aliyev']);
    expect(filterDietGuests(g, '', NO_DIET)).toHaveLength(1);
    expect(filterDietGuests(g, '', '2').map((x) => x.guest.full_name)).toEqual(['Sardor']);
    expect(dietRoomNumber('12')).toBe('12');
    expect(dietRoomNumber({ number: '7' })).toBe('7');
    expect(dietRoomNumber(null)).toBeNull();
    expect(dietCodes([{ by_diet: { '-': 2, '№9': 1 } }, { by_diet: { '№5': 3 } }])).toEqual(['№5', '№9', '-']);
  });
  it('lets the registrar and the attending doctor edit the stay diet', () => {
    const user = (roles: string[], ro = false) => ({ sanatorium_roles: roles, sanatorium_read_only: ro }) as never;
    const stay = { doctor: { id: 4 } };
    expect(canEditStayDiet(user(['registrar']), null, stay)).toBe(true);
    expect(canEditStayDiet(user(['registrar'], true), null, stay)).toBe(false);
    expect(canEditStayDiet(user(['doctor']), { staff_id: 4 }, stay)).toBe(true);
    expect(canEditStayDiet(user(['doctor']), { staff_id: 5 }, stay)).toBe(false);
    expect(canEditStayDiet(user(['doctor']), undefined, stay)).toBe(false);
    expect(canEditStayDiet(user(['nurse']), { staff_id: 4 }, stay)).toBe(false);
    expect(canEditStayDiet(null, { staff_id: 4 }, stay)).toBe(false);
  });
  it('defaults and validates the schedule form', () => {
    expect(remainingSessions({ sessions_total: 10, sessions_done: 4 })).toBe(6);
    expect(remainingSessions({ sessions_total: 3, sessions_done: 3 })).toBe(1);
    expect(scheduleStart({ start_date: '2026-12-10' }, '2026-12-01')).toBe('2026-12-10');
    expect(scheduleStart({ start_date: '2026-11-10' }, '2026-12-01')).toBe('2026-12-01');
    const ok = { roomId: 3, start: '2026-12-01', time: '', count: '6' };
    expect(scheduleBody({ ...ok, roomId: null }, 6, '2026-12-01')).toEqual({ ok: false, error: 'sanatorium.s2.pickProcRoom' });
    expect(scheduleBody({ ...ok, start: '2026-11-30' }, 6, '2026-12-01')).toEqual({ ok: false, error: 'sanCatalog.sched.startPast' });
    expect(scheduleBody({ ...ok, count: '7' }, 6, '2026-12-01')).toEqual({ ok: false, error: 'sanCatalog.sched.countRange' });
    expect(scheduleBody({ ...ok, time: '25:00' }, 6, '2026-12-01').ok).toBe(false);
    expect(scheduleBody({ ...ok, time: '10:30' }, 6, '2026-12-01')).toEqual({ ok: true, body: { room_id: 3, start_date: '2026-12-01', preferred_time: '10:30', sessions: 6 } });
    expect(moveBody('2026-12-01T10:00:00', null)).toEqual({ starts_at: '2026-12-01T10:00:00' });
    expect(moveBody('2026-12-01T10:00:00', 4)).toEqual({ starts_at: '2026-12-01T10:00:00', room_id: 4 });
    expect(slotUsage(10, 4)).toBeCloseTo(0.6);
    expect(slotUsage(0, 0)).toBe(0);
  });
  it('filters services and suggests categories', () => {
    const list = [
      { name_uz: 'Massaj', name_ru: 'Массаж', category: 'Spa', is_active: true },
      { name_uz: 'Sauna', name_ru: null, category: 'Spa', is_active: false },
      { name_uz: 'Taksi', name_ru: 'Такси', category: null, is_active: true },
    ];
    const f = { q: '', category: null, active: null };
    expect(filterServices(list, f)).toHaveLength(3);
    expect(filterServices(list, { ...f, q: 'масс' })).toHaveLength(1);
    expect(filterServices(list, { ...f, category: 'Spa', active: true })).toHaveLength(1);
    expect(filterServices(list, { ...f, active: false })[0]!.name_uz).toBe('Sauna');
    expect(serviceCategories(list)).toEqual(['Spa']);
    expect(serviceFilterOn(f)).toBe(false);
    expect(serviceFilterOn({ ...f, active: false })).toBe(true);
  });
  it('validates order quantity and day', () => {
    expect([orderQuantity('1'), orderQuantity('1000'), orderQuantity('1001'), orderQuantity('0'), orderQuantity('x')]).toEqual([1, 1000, null, null, null]);
    expect(isPastDay('2026-11-24', '2026-11-25')).toBe(true);
    expect(isPastDay('2026-11-25', '2026-11-25')).toBe(false);
    expect(slotCaption({ free: 2, capacity: 5 })).toBe('2/5');
  });
  it('filters seasons / organizations and limits rows', () => {
    expect(filterSeasons([{ scope: 'all' }, { scope: 'rooms' }], 'rooms')).toEqual([{ scope: 'rooms' }]);
    expect(filterSeasons([{ scope: 'all' }], null)).toHaveLength(1);
    expect(seasonScopeText({ scope: 'rooms', scope_values: ['1', '2'] }, (id) => `R${id}`)).toBe('R1, R2');
    expect(seasonScopeText({ scope: 'room_type', scope_values: ['lux', 'std'] }, () => 'x')).toBe('lux, std');
    expect(seasonScopeText({ scope: 'all', scope_values: [] }, () => 'x')).toBe('');
    expect(filterOrgs([{ is_active: true }, { is_active: false }], false)).toEqual([{ is_active: false }]);
    expect(limitRows([1, 2, 3, 4, 5, 6], 4)).toEqual({ shown: [1, 2, 3, 4], more: 2 });
    expect(limitRows([1], 4)).toEqual({ shown: [1], more: 0 });
  });
});
