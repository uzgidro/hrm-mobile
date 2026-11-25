import {
  TIMELINE_KINDS, arriveTarget, buildCardShareText, cellTone, clip, firstError, guestCabinetUrl, isChildMember, maskPassportInput,
  normalizePhoneInput, packageFitsType, roomHasFree, runBulk, timelineKind, validateGuestFields,
} from '../guests';

describe('passport / phone input', () => {
  it('masks the passport to 2 letters + 7 digits', () => {
    expect(maskPassportInput('aa 1234567x')).toBe('AA1234567');
    expect(maskPassportInput('ab')).toBe('AB');
    expect(maskPassportInput('ab12345678901')).toBe('AB1234567');
  });
  it('normalises a phone to +998 and keeps junk as typed', () => {
    expect(normalizePhoneInput('12345')).toBe('12345');
    expect(normalizePhoneInput('901234567')).toBe('+998901234567');
    expect(normalizePhoneInput('998 90 123 45 67')).toBe('+998901234567');
    expect(normalizePhoneInput('   ')).toBe('');
  });
  it('clips to the limit', () => {
    expect(clip('abcdef', 3)).toBe('abc');
    expect(clip('ab', 3)).toBe('ab');
  });
});

describe('validateGuestFields', () => {
  it('guest: only name is required, passport and phone checked when filled', () => {
    expect(validateGuestFields({ name: 'Ali', passport: '', phone: '' }, 'guest')).toEqual({});
    expect(validateGuestFields({ name: 'Al', passport: '', phone: '' }, 'guest').name).toBe('sanGuests.nameMin');
    expect(validateGuestFields({ name: 'Ali', passport: 'A1', phone: '' }, 'guest').passport).toBe('sanGuests.passportBad');
    expect(validateGuestFields({ name: 'Ali', passport: 'AA1234567', phone: '12345' }, 'guest').phone).toBe('sanGuests.phoneBad');
    expect(validateGuestFields({ name: 'Ali', passport: 'aa1234567', phone: '901234567' }, 'guest')).toEqual({});
  });
  it('walk-in: name >= 5, passport and phone required', () => {
    const e = validateGuestFields({ name: 'Ali', passport: '', phone: '' }, 'walkin');
    expect(e).toEqual({ name: 'sanatorium.nameShort5', passport: 'sanGuests.passportBad', phone: 'sanGuests.phoneBad' });
    expect(firstError(e)).toBe('sanatorium.nameShort5');
    expect(validateGuestFields({ name: 'Ali Valiyev', passport: 'AB1234567', phone: '+998901234567' }, 'walkin')).toEqual({});
  });
});

describe('booking rules', () => {
  it('child by age against the limit, relation only without an age', () => {
    expect(isChildMember(10, 'other', 14)).toBe(true);
    expect(isChildMember(14, null, 14)).toBe(true);
    expect(isChildMember(15, 'child', 14)).toBe(false);
    expect(isChildMember(null, 'child', 14)).toBe(true);
    expect(isChildMember(null, 'spouse', 14)).toBe(false);
    expect(isChildMember(14, null, undefined)).toBe(true);
    expect(isChildMember(15, null, undefined)).toBe(false);
  });
  it('a room needs free beds for every member on the busiest night', () => {
    expect(roomHasFree(4, [1, 2, 1], 2)).toBe(true);
    expect(roomHasFree(4, [1, 3, 1], 2)).toBe(false);
    expect(roomHasFree(4, [4], 1, true)).toBe(true);
    expect(roomHasFree(2, [0], 0)).toBe(true);
  });
  it('package list follows the guest type; the picked one stays', () => {
    expect(packageFitsType({ id: 1, guest_types: [] }, 'rest', null)).toBe(true);
    expect(packageFitsType({ id: 1, guest_types: ['treatment'] }, 'rest', null)).toBe(false);
    expect(packageFitsType({ id: 1, guest_types: ['treatment'] }, 'rest', 1)).toBe(true);
    expect(packageFitsType({ id: 1 }, 'rest', null)).toBe(true);
  });
});

describe('guest card text', () => {
  const labels = { loginCode: 'ID', password: 'Password', cabinet: 'Cabinet' };
  it('lists the filled parts only', () => {
    expect(buildCardShareText({ name: 'Ali', loginCode: '123456', labels })).toBe('Ali\nID: 123456');
    expect(
      buildCardShareText({ name: 'Ali', loginCode: '1', password: 'pw', cabinetUrl: 'https://x/c', contacts: '+998', addresses: ' ', workHours: '9-18', labels }),
    ).toBe('Ali\nID: 1\nPassword: pw\nCabinet: https://x/c\n+998\n9-18');
  });
  it('cabinet url ends with the public page', () => {
    expect(guestCabinetUrl()).toMatch(/^https?:\/\/[^/]+\/sihatgoh-kabinet$/);
  });
});

describe('runBulk', () => {
  it('runs in order, collects failures with their text and reports progress', async () => {
    const order: number[] = [];
    const progress: [number, number][] = [];
    const res = await runBulk(
      [1, 2, 3],
      async (id) => {
        order.push(id);
        if (id === 2) throw new Error('room_full');
        return { warnings: [{ code: 'room_not_ready' }] };
      },
      (e) => (e as Error).message,
      (d, t) => progress.push([d, t]),
    );
    expect(order).toEqual([1, 2, 3]);
    expect(res.ok).toEqual([1, 3]);
    expect(res.failed).toEqual([{ id: 2, error: 'room_full' }]);
    expect(res.warnings).toHaveLength(2);
    expect(progress).toEqual([[1, 3], [2, 3], [3, 3]]);
  });
});

describe('grid + timeline + arrive', () => {
  it('cell tones', () => {
    expect(cellTone(0, 2, false)).toBe('free');
    expect(cellTone(1, 2, false)).toBe('partial');
    expect(cellTone(2, 2, false)).toBe('full');
    expect(cellTone(0, 2, true)).toBe('oos');
  });
  it('every web chronology kind has its own icon + tone, unknown ones fall back', () => {
    expect(Object.keys(TIMELINE_KINDS)).toHaveLength(19);
    expect(timelineKind('payment')).toEqual({ icon: 'wallet', tone: 'success' });
    expect(timelineKind('nope').tone).toBe('neutral');
  });
  it('arrive: open stay, booked stay or the guest', () => {
    expect(arriveTarget(5, [{ id: 9, status: 'checked_in' }])).toEqual({ kind: 'stay', id: 9 });
    expect(arriveTarget(5, [{ id: 8, status: 'checked_out' }, { id: 9, status: 'booked' }])).toEqual({ kind: 'wizard', params: { stay: '9' } });
    expect(arriveTarget(5, [{ id: 8, status: 'cancelled' }])).toEqual({ kind: 'wizard', params: { guest: '5' } });
  });
});
