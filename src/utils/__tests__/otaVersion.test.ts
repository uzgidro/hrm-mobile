import { formatOtaBuild } from '../otaVersion';

describe('formatOtaBuild', () => {
  it('reports an embedded launch (no OTA applied) with no date or id', () => {
    const out = formatOtaBuild({ isEmbeddedLaunch: true, updateId: null, createdAt: null });
    expect(out).toEqual({ kind: 'embedded', date: null, shortId: null });
  });

  it('formats an OTA launch: DD.MM.YYYY date + first 8 chars of updateId', () => {
    const out = formatOtaBuild(
      {
        isEmbeddedLaunch: false,
        updateId: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
        createdAt: new Date('2026-08-13T09:30:00.000Z'),
      },
      'ru-RU',
    );
    expect(out.kind).toBe('ota');
    expect(out.shortId).toBe('a1b2c3d4');
    expect(out.date).toBe('13.08.2026');
  });

  it('treats a non-embedded launch that is missing an updateId as embedded (defensive)', () => {
    const out = formatOtaBuild({ isEmbeddedLaunch: false, updateId: null, createdAt: null });
    expect(out.kind).toBe('embedded');
  });

  it('uppercases-safe: shortId keeps the raw updateId casing, no crash on short ids', () => {
    const out = formatOtaBuild({ isEmbeddedLaunch: false, updateId: 'abc', createdAt: new Date('2026-01-02T00:00:00Z') });
    expect(out.shortId).toBe('abc');
    expect(out.date).toBe('02.01.2026');
  });
});
