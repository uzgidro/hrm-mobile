import { fitLabelFontSize, longestWord } from '../utils/fitLabel';

describe('fitLabel — uzun ruscha yorliqlar so‘z o‘rtasidan bo‘linmasin', () => {
  it('eng uzun so‘z', () => {
    expect(longestWord('Интерактивные услуги')).toBe(13);
    expect(longestWord('Zoom-совещания')).toBe(9);
    expect(longestWord('KPI')).toBe(3);
    expect(longestWord('')).toBe(0);
  });

  it('qisqa yorliq — asosiy o‘lcham saqlanadi', () => {
    expect(fitLabelFontSize('Главная', 78, { base: 11, min: 8.5 })).toBe(11);
    expect(fitLabelFontSize('Davomat', 78, { base: 11, min: 8.5 })).toBe(11);
  });

  it('«Посещаемость» 390 px dagi 5 tabli bar slotiga (78 px) sig‘adi', () => {
    const size = fitLabelFontSize('Посещаемость', 78, { base: 11, min: 8.5 });
    expect(size).toBeLessThan(11);
    expect(12 * 0.7 * size).toBeLessThanOrEqual(78);
  });

  it('modul plitkasi: «Интерактивные» va «Техподдержка» so‘zi butun qatorga sig‘adi', () => {
    for (const label of ['Интерактивные услуги', 'Техподдержка']) {
      const size = fitLabelFontSize(label, 92, { base: 13, min: 9 });
      expect(longestWord(label) * 0.7 * size).toBeLessThanOrEqual(92);
    }
  });

  it('pastki chegara va o‘lchanmagan kenglik', () => {
    expect(fitLabelFontSize('Очень-оченьдлинноеслово', 40, { base: 11, min: 8.5 })).toBe(8.5);
    expect(fitLabelFontSize('Посещаемость', 0, { base: 11, min: 8.5 })).toBe(11);
  });
});
