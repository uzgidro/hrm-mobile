import {
  formatUzPhone, telUrl, uzPhoneFromInput, uzPhoneInputValue, isUzPhoneEmpty,
} from '../phone';

describe('formatUzPhone', () => {
  it('normalizes the three stored shapes', () => {
    expect(formatUzPhone('+998944113196')).toBe('+998944113196');
    expect(formatUzPhone('998944113196')).toBe('+998944113196');
    expect(formatUzPhone('944113196')).toBe('+998944113196');
    expect(formatUzPhone(' +998 (94) 411-31-96 ')).toBe('+998944113196');
  });
  it('leaves junk, foreign and extensions unchanged (trimmed)', () => {
    expect(formatUzPhone('1234')).toBe('1234');
    expect(formatUzPhone(' +7 495 123 45 67 ')).toBe('+7 495 123 45 67');
    expect(formatUzPhone('12345')).toBe('12345');
  });
  it('handles empty', () => {
    expect(formatUzPhone(null)).toBe('');
    expect(formatUzPhone(undefined)).toBe('');
    expect(formatUzPhone('  ')).toBe('');
  });
});

describe('telUrl', () => {
  it('builds tel:+998...', () => {
    expect(telUrl('998944113196')).toBe('tel:+998944113196');
    expect(telUrl('944113196')).toBe('tel:+998944113196');
    expect(telUrl('+998944113196')).toBe('tel:+998944113196');
  });
  it('falls back to raw digits for non-UZ', () => {
    expect(telUrl('+7 495 123 45 67')).toBe('tel:+74951234567');
    expect(telUrl('1234')).toBe('tel:1234');
    expect(telUrl('abc')).toBe('');
    expect(telUrl(null)).toBe('');
  });
});

describe('phone input helpers', () => {
  it('keeps the prefix and caps at 9 digits', () => {
    expect(uzPhoneFromInput('')).toBe('+998');
    expect(uzPhoneFromInput('+99')).toBe('+998');
    expect(uzPhoneFromInput('+99894')).toBe('+99894');
    expect(uzPhoneFromInput('+9989441131969999')).toBe('+998944113196');
    expect(uzPhoneFromInput('+998abc94-4')).toBe('+998944');
  });
  it('accepts a pasted full number', () => {
    expect(uzPhoneFromInput('998944113196')).toBe('+998944113196');
  });
  it('maps stored values into the input', () => {
    expect(uzPhoneInputValue('944113196')).toBe('+998944113196');
    expect(uzPhoneInputValue(null)).toBe('+998');
  });
  it('detects an empty phone', () => {
    expect(isUzPhoneEmpty('+998')).toBe(true);
    expect(isUzPhoneEmpty('+9989')).toBe(false);
  });
});
