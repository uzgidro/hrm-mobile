import { hhmm, timeRange, nationalityLabel } from '../format';

describe('hhmm / timeRange — ish soati soniyasiz (HH:mm)', () => {
  it("serverning 'HH:mm:ss' qiymatini qisqartiradi", () => {
    expect(hhmm('08:00:00')).toBe('08:00');
    expect(hhmm('20:00')).toBe('20:00');
    expect(hhmm('8:05:00')).toBe('08:05');
    expect(hhmm(null)).toBeNull();
    expect(hhmm('')).toBeNull();
    expect(hhmm('nonsense')).toBe('nonsense');
  });

  it("oraliq — ikkalasi bo'lsa", () => {
    expect(timeRange('08:00:00', '20:00:00')).toBe('08:00 – 20:00');
    expect(timeRange('08:00:00', null)).toBeNull();
  });
});

// v2 `features/employees/nationalityLabel.ts` 1:1: xodimda eski qisqartma ("uzb"), ma'lumotnoma
// to'liq kod ("uzbek") bilan — avval aniq kod, keyin YAGONA mos prefiks, noaniq bo'lsa o'zi.
describe('nationalityLabel', () => {
  const options = [
    { code: 'uzbek', name: "O'zbek" },
    { code: 'rus', name: 'Rus' },
    { code: 'turk', name: 'Turk' },
    { code: 'turkman', name: 'Turkman' },
  ];

  it('aniq kod va yagona prefiks', () => {
    expect(nationalityLabel('uzbek', options)).toBe("O'zbek");
    expect(nationalityLabel('uzb', options)).toBe("O'zbek");
    expect(nationalityLabel('RUS', options)).toBe('Rus');
  });

  it("noaniq prefiks yoki ro'yxat kelmagan — yozilganicha; bo'sh — null", () => {
    expect(nationalityLabel('tur', options)).toBe('tur');
    expect(nationalityLabel('uzb', undefined)).toBe('uzb');
    expect(nationalityLabel('', options)).toBeNull();
    expect(nationalityLabel(null, options)).toBeNull();
  });
});
