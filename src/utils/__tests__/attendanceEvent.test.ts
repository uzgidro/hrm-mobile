import {
  eventPhotoUrl, eventPlace, hasCoords, isEntryEvent, isExitEvent, mapAppUrl, mapViewerUrl,
} from '../attendanceEvent';
import type { AttendanceEvent } from '@/types';

// Turniket hodisasi qatorining ma'lumot manbai. Qator avval FAQAT vaqt va
// yo'nalishni ko'rsatardi; bu funksiyalar "qaysi GES", surat va xarita
// ma'lumotini backend javobidan ajratib beradi.

const base: AttendanceEvent = { id: 1, happen_time: '2026-08-19T08:12:00' };

const withTurnstile = (over: Partial<AttendanceEvent['turnstile']>): AttendanceEvent => ({
  ...base,
  turnstile: { acs_dev_name: 'Ges 8 chiqish', ...over },
});

describe('yo\'nalish', () => {
  it('direction_type YOKI check_in_out_type bo\'yicha aniqlanadi', () => {
    expect(isEntryEvent({ direction_type: 'entrance' })).toBe(true);
    expect(isEntryEvent({ check_in_out_type: 1 })).toBe(true);
    expect(isEntryEvent({ direction_type: 'exit' })).toBe(false);
    expect(isExitEvent({ check_in_out_type: 2 })).toBe(true);
    // Noma'lum yo'nalish: ikkalasi ham false (qator "chiqish" deb yozib qo'ymaydi)
    expect(isEntryEvent({})).toBe(false);
    expect(isExitEvent({})).toBe(false);
  });
});

describe('eventPlace', () => {
  it('joylashuv nomini QURILMA nomidan ustun qo\'yadi', () => {
    // acs_dev_name = "Ges 8 chiqish" — unda yo'nalish so'zi bor, shu bois
    // joylashuv nomi ("Ges 8") afzal.
    const ev = withTurnstile({
      locations: [{ id: 3, name: 'Ges 8', address: 'Chirchiq', latitude: 41.48, longitude: 69.59 }],
    });
    expect(eventPlace(ev)).toEqual({
      name: 'Ges 8', address: 'Chirchiq', latitude: 41.48, longitude: 69.59,
    });
  });

  it('koordinatasi BOR joylashuvni tanlaydi', () => {
    const ev = withTurnstile({
      locations: [
        { id: 1, name: 'Nomsiz post' },
        { id: 2, name: 'Ges 8', latitude: 41.48, longitude: 69.59 },
      ],
    });
    expect(eventPlace(ev).name).toBe('Ges 8');
    expect(hasCoords(eventPlace(ev))).toBe(true);
  });

  it('joylashuv bo\'lmasa filial → qurilma nomiga tushadi', () => {
    const branchOnly = withTurnstile({
      locations: [{ id: 4, organization_branch: { id: 7, name: '"Chirchiq GESlari kaskadi" filiali' } }],
    });
    expect(eventPlace(branchOnly).name).toBe('"Chirchiq GESlari kaskadi" filiali');
    expect(eventPlace(withTurnstile({ locations: [] })).name).toBe('Ges 8 chiqish');
    expect(eventPlace(base).name).toBeNull();
  });
});

describe('surat', () => {
  it('bo\'sh/whitespace photo_path null bo\'ladi', () => {
    expect(eventPhotoUrl({ ...base, photo_path: 'https://minio/x.jpg' })).toBe('https://minio/x.jpg');
    expect(eventPhotoUrl({ ...base, photo_path: '   ' })).toBeNull();
    expect(eventPhotoUrl(base)).toBeNull();
  });
});

describe('xarita manzillari', () => {
  const place = { name: 'Ges 8', address: null, latitude: 41.48, longitude: 69.59 };

  it('koordinatasiz null qaytadi (xarita bloki chizilmaydi)', () => {
    const empty = { name: 'Ges 8', address: null, latitude: null, longitude: null };
    expect(mapViewerUrl(empty)).toBeNull();
    expect(mapAppUrl(empty, 'android')).toBeNull();
  });

  it('O\'Z tayler serverimiz ko\'ruvchisini #zoom/lat/lon bilan markazlashtiradi', () => {
    expect(mapViewerUrl(place, 15)).toBe(
      'https://hr.uzgidro.uz/tiles/styles/uzgidro-dark/#15/41.48/69.59',
    );
  });

  it('platformaga mos ilova manzilini beradi', () => {
    expect(mapAppUrl(place, 'android')).toBe('geo:41.48,69.59?q=41.48,69.59(Ges%208)');
    expect(mapAppUrl(place, 'ios')).toBe('maps:0,0?q=Ges%208@41.48,69.59');
    expect(mapAppUrl(place, 'web')).toContain('openstreetmap.org');
  });
});
