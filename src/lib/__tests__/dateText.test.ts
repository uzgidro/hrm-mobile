import { parseDdMmYyyy, formatDdMmYyyy } from '../dateText';

describe('parseDdMmYyyy', () => {
  it('parses a strict DD.MM.YYYY', () => {
    expect(parseDdMmYyyy('05.09.2026')).toBe('2026-09-05');
    expect(parseDdMmYyyy(' 31.12.2026 ')).toBe('2026-12-31');
  });
  it('rejects wrong shapes and impossible dates', () => {
    expect(parseDdMmYyyy('2026-09-05')).toBeNull();
    expect(parseDdMmYyyy('5.9.2026')).toBeNull();
    expect(parseDdMmYyyy('31.02.2026')).toBeNull();
    expect(parseDdMmYyyy('')).toBeNull();
  });
  it('formats back', () => {
    expect(formatDdMmYyyy('2026-09-05')).toBe('05.09.2026');
    expect(formatDdMmYyyy(null)).toBe('');
  });
});
