import type { FeatureRow } from '../../types1';
import {
  broadcastProgress, featureDiff, featureLabel, groupFeatures, hkAllowedStatuses, inUzbekistan, isStageKey,
  locationBody, moveId, nextTransferStatuses, canSendBroadcast, convertDefaults, normalizeUzPhone, parseFloor, photoThumb, transferNeedsCar, validTransferPeople, roomNotReady, parseCoord, parseMapHash, pickLang, planPoint, slugKey, waitlistParams,
} from '../sections1';

const row = (key: string, enabled = true): FeatureRow => ({ key, enabled, default: true, label_uz: `uz ${key}`, label_ru: `ru ${key}` });

describe('features', () => {
  it('groups known keys and keeps unknown ones in «other»', () => {
    const g = groupFeatures([row('journey'), row('telegram_bot'), row('mystery')]);
    expect(g.map((x) => x.id)).toEqual(['existing', 'content', 'other']);
    expect(g[2]!.rows[0]!.key).toBe('mystery');
  });
  it('diff holds only changed switches', () => {
    const rows = [row('journey', true), row('feedback', false)];
    expect(featureDiff(rows, { journey: false, feedback: false })).toEqual({ journey: false });
    expect(featureDiff(rows, {})).toEqual({});
  });
  it('label follows the language', () => {
    expect(featureLabel(row('a'), 'ru')).toBe('ru a');
    expect(featureLabel(row('a'), 'uz-Latn')).toBe('uz a');
  });
});

describe('pickLang', () => {
  it('falls back to Uzbek', () => {
    expect(pickLang('ru', { uz: 'a', ru: '' })).toBe('a');
    expect(pickLang('en', { uz: 'a', en: 'c' })).toBe('c');
    expect(pickLang('uz-Cyrl', { uz: 'a', ru: 'b' })).toBe('a');
  });
});

describe('moveId', () => {
  it('moves by delta and clamps', () => {
    expect(moveId([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
    expect(moveId([1, 2, 3], 1, -1)).toEqual([1, 2, 3]);
    expect(moveId([1, 2, 3], 1, 9)).toEqual([2, 3, 1]);
    expect(moveId([1, 2, 3], 7, 1)).toEqual([1, 2, 3]);
  });
});

describe('plan and map coordinates', () => {
  it('turns a tap into percent and clamps', () => {
    expect(planPoint(50, 25, 200, 100)).toEqual({ x_pct: 25, y_pct: 25 });
    expect(planPoint(-5, 500, 200, 100)).toEqual({ x_pct: 0, y_pct: 100 });
    expect(planPoint(1, 1, 0, 0)).toBeNull();
    expect(planPoint(NaN, 1, 200, 100)).toBeNull();
    expect(planPoint(1, undefined as unknown as number, 200, 100)).toBeNull();
  });
  it('parses the viewer hash', () => {
    expect(parseMapHash('#16/41.3111/69.2797')).toEqual({ zoom: 16, lat: 41.3111, lng: 69.2797 });
    expect(parseMapHash('#16.5/41.3/69.2/10/0')).toEqual({ zoom: 16.5, lat: 41.3, lng: 69.2 });
    expect(parseMapHash('')).toBeNull();
    expect(parseMapHash('#a/b/c')).toBeNull();
    expect(parseMapHash('#10/95/20')).toBeNull();
  });
  it('knows the Uzbekistan box and parses decimal commas', () => {
    expect(inUzbekistan(41.3, 69.2)).toBe(true);
    expect(inUzbekistan(55, 69)).toBe(false);
    expect(parseCoord('41,3')).toBe(41.3);
    expect(parseCoord(' ')).toBeNull();
    expect(parseCoord('x')).toBeNull();
  });
  it('builds the location body', () => {
    const base = { lat: '41.3', lng: '69.2', zoom: '', address: ' Toshkent ', uz: '', ru: 'x', en: '' };
    const ok = locationBody(base);
    expect(ok).toMatchObject({ ok: true, body: { latitude: 41.3, longitude: 69.2, zoom: 15, address: 'Toshkent', directions_note_uz: null, directions_note_ru: 'x' } });
    expect(locationBody({ ...base, lng: '' })).toEqual({ ok: false, error: 'pair' });
    expect(locationBody({ ...base, lat: '10' })).toEqual({ ok: false, error: 'range' });
    expect(locationBody({ ...base, zoom: '40' })).toEqual({ ok: false, error: 'zoom' });
    expect(locationBody({ ...base, lat: '', lng: '' })).toMatchObject({ ok: true, body: { latitude: null, longitude: null } });
  });
});

describe('flows', () => {
  it('transfer statuses', () => {
    expect(nextTransferStatuses('requested')).toContain('confirmed');
    expect(nextTransferStatuses('done')).toEqual([]);
    expect(nextTransferStatuses('assigned')).not.toContain('confirmed');
  });
  it('housekeeper may not inspect', () => {
    const all = ['clean', 'dirty', 'inspected'] as const;
    expect(hkAllowedStatuses(all, false)).toEqual(['clean', 'dirty']);
    expect(hkAllowedStatuses(all, true)).toEqual(['clean', 'dirty', 'inspected']);
  });
  it('broadcast progress', () => {
    expect(broadcastProgress({ queued_count: 10, sent_count: 4, failed_count: 1, status: 'sending' })).toBe(0.5);
    expect(broadcastProgress({ queued_count: 0, sent_count: 0, failed_count: 0, status: 'queued' })).toBe(0);
    expect(broadcastProgress({ queued_count: 3, sent_count: 0, failed_count: 0, status: 'done' })).toBe(1);
  });
  it('waitlist params drop blanks', () => {
    expect(waitlistParams({ status: 'all', q: ' ' }, 1, 30)).toEqual({ page: 1, size: 30 });
    expect(waitlistParams({ status: 'waiting', q: ' ali ', from: '2026-11-01' }, 2, 30)).toEqual({ status: 'waiting', q: 'ali', from: '2026-11-01', page: 2, size: 30 });
  });
  it('stage keys', () => {
    expect(isStageKey('pre_arrival')).toBe(true);
    expect(isStageKey('1abc')).toBe(false);
    expect(slugKey('Check In!')).toBe('check_in');
    expect(slugKey('123')).toBe('s_123');
    expect(slugKey('Кириш')).toBe('');
  });
});

describe('roomNotReady', () => {
  it('finds the warning and ignores the rest', () => {
    expect(roomNotReady({ warnings: [{ code: 'x' }, { code: 'room_not_ready', room_number: '12', hk_status: 'dirty' }] })).toMatchObject({ room_number: '12' });
    expect(roomNotReady({})).toBeNull();
    expect(roomNotReady(null)).toBeNull();
  });
});

describe('phone', () => {
  it('normalises full UZ numbers only', () => {
    expect(normalizeUzPhone('+998901234567')).toBe('+998901234567');
    expect(normalizeUzPhone('998 90 123 45 67')).toBe('+998901234567');
    expect(normalizeUzPhone('901234567')).toBe('+998901234567');
    expect(normalizeUzPhone('+99890123')).toBeNull();
    expect(normalizeUzPhone('')).toBeNull();
    expect(normalizeUzPhone(null)).toBeNull();
  });
});

describe('parseFloor', () => {
  it('blank is null, integers in range pass, the rest fail', () => {
    expect(parseFloor('')).toEqual({ ok: true, value: null });
    expect(parseFloor(' 3 ')).toEqual({ ok: true, value: 3 });
    expect(parseFloor('-1')).toEqual({ ok: true, value: -1 });
    expect(parseFloor('101')).toEqual({ ok: false });
    expect(parseFloor('-6')).toEqual({ ok: false });
    expect(parseFloor('1.5')).toEqual({ ok: false });
    expect(parseFloor('A')).toEqual({ ok: false });
  });
});

describe('transfer checks', () => {
  it('assigned needs a vehicle or a driver', () => {
    expect(transferNeedsCar('assigned', null, ' ')).toBe(true);
    expect(transferNeedsCar('assigned', 3, '')).toBe(false);
    expect(transferNeedsCar('assigned', null, 'Ali')).toBe(false);
    expect(transferNeedsCar('confirmed', null, '')).toBe(false);
  });
  it('people is 1..20', () => {
    expect(validTransferPeople(1)).toBe(true);
    expect(validTransferPeople(20)).toBe(true);
    expect(validTransferPeople(0)).toBe(false);
    expect(validTransferPeople(21)).toBe(false);
    expect(validTransferPeople(Number.NaN)).toBe(false);
  });
});

describe('small helpers', () => {
  it('photo falls back to the original url', () => {
    expect(photoThumb({ url: 'a', thumb_url: 'b' })).toBe('b');
    expect(photoThumb({ url: 'a', thumb_url: '' })).toBe('a');
    expect(photoThumb(null)).toBeUndefined();
  });
  it('broadcast needs somebody reachable', () => {
    expect(canSendBroadcast(0)).toBe(false);
    expect(canSendBroadcast(undefined)).toBe(false);
    expect(canSendBroadcast(2)).toBe(true);
  });
  it('convert starts from the entry', () => {
    expect(convertDefaults({ birth_date: '1990-01-02', passport: 'AA1234567', organization_name: 'X' })).toEqual({ birth: '1990-01-02', passport: 'AA1234567', org: 'X' });
    expect(convertDefaults({})).toEqual({ birth: null, passport: '', org: '' });
  });
});
