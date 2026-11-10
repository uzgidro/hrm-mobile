import { isValidIcd10, toDiagnosisPayload, validateDiagnosis } from '../icd';

describe('ICD-10 code', () => {
  it.each(['I10', 'K29.7', 'S52.50', 'A00', 'Z99.AB12', 'i10', ' k29.7 '])('%s is valid (case/space tolerant)', (c) => {
    expect(isValidIcd10(c)).toBe(true);
  });
  it.each(['', '10', 'I1', 'I100', 'K29.', 'K29.12345', 'KK9.1', 'K29,7', 'I 10'])('%j is invalid', (c) => {
    expect(isValidIcd10(c)).toBe(false);
  });
});

describe('validateDiagnosis', () => {
  it('a name alone is fine (the code is optional)', () => {
    expect(validateDiagnosis({ code: '', name: 'Gipertoniya' })).toBeNull();
  });
  it('a code without a name is refused', () => {
    expect(validateDiagnosis({ code: 'I10', name: '  ' })).toBe('nameRequired');
  });
  it('a bad code is refused', () => {
    expect(validateDiagnosis({ code: 'XX', name: 'a' })).toBe('codeInvalid');
  });
  it('a name over 500 chars is refused', () => {
    expect(validateDiagnosis({ code: '', name: 'a'.repeat(501) })).toBe('nameTooLong');
  });
  it('an entirely empty row is not an error (it is dropped)', () => {
    expect(validateDiagnosis({ code: ' ', name: '' })).toBeNull();
  });
});

describe('toDiagnosisPayload', () => {
  it('uppercases the code, trims, nulls blank codes and drops empty rows', () => {
    expect(
      toDiagnosisPayload([
        { code: ' k29.7 ', name: ' Gastrit ' },
        { code: '', name: 'Charchoq' },
        { code: '', name: '' },
      ]),
    ).toEqual([
      { code: 'K29.7', name: 'Gastrit' },
      { code: null, name: 'Charchoq' },
    ]);
  });
});
