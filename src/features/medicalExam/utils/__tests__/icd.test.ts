import { toDiagnosisPayload, validateDiagnosis } from '../icd';

describe('diagnosis code', () => {
  // Free text since 2026-11-11: any letters and digits, kept as typed.
  it.each(['I10', 'k29.7', '10', 'XX', 'ЛОР-3', 'Z 99/1'])('%j is accepted', (c) => {
    expect(validateDiagnosis({ code: c, name: 'a' })).toBeNull();
  });
});

describe('validateDiagnosis', () => {
  it('a name alone is fine (the code is optional)', () => {
    expect(validateDiagnosis({ code: '', name: 'Gipertoniya' })).toBeNull();
  });
  it('a code without a name is refused', () => {
    expect(validateDiagnosis({ code: 'I10', name: '  ' })).toBe('nameRequired');
  });
  it('a name over 500 chars is refused', () => {
    expect(validateDiagnosis({ code: '', name: 'a'.repeat(501) })).toBe('nameTooLong');
  });
  it('an entirely empty row is not an error (it is dropped)', () => {
    expect(validateDiagnosis({ code: ' ', name: '' })).toBeNull();
  });
});

describe('toDiagnosisPayload', () => {
  it('keeps the code as typed (trimmed), nulls blank codes and drops empty rows', () => {
    expect(
      toDiagnosisPayload([
        { code: ' k29.7 ', name: ' Gastrit ' },
        { code: '', name: 'Charchoq' },
        { code: '', name: '' },
      ]),
    ).toEqual([
      { code: 'k29.7', name: 'Gastrit' },
      { code: null, name: 'Charchoq' },
    ]);
  });
});
