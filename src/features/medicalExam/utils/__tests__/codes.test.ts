import { apiErrorCode, classifyMedicalCode, groupCode, normalizeMedicalCode } from '../codes';

const EMP = '901234567890123456789012';
const DOOR = '911234567890123456789012';

describe('normalizeMedicalCode', () => {
  it('keeps exactly 24 digits', () => {
    expect(normalizeMedicalCode(EMP)).toBe(EMP);
  });
  it('strips spaces and dashes of the grouped display', () => {
    expect(normalizeMedicalCode('9012 3456 7890 1234 5678 9012')).toBe(EMP);
    expect(normalizeMedicalCode(' 9012-3456-7890-1234-5678-9012\n')).toBe(EMP);
  });
  it.each([
    ['empty', ''],
    ['null', null],
    ['short', '90123'],
    ['25 digits', `${EMP}1`],
    ['letters inside', '9012345678901234567890ab'],
    ['URL that merely contains digits', 'https://x.uz/901234567890123456789012'],
  ])('%s -> null', (_n, raw) => {
    expect(normalizeMedicalCode(raw as string | null)).toBeNull();
  });
});

describe('classifyMedicalCode', () => {
  it('90… is an employee code', () => expect(classifyMedicalCode(EMP)).toBe('employee'));
  it('91… is a door code', () => expect(classifyMedicalCode(DOOR)).toBe('door'));
  it('works through grouped input', () => {
    expect(classifyMedicalCode('9112 3456 7890 1234 5678 9012')).toBe('door');
  });
  it.each([
    ['other prefix', '921234567890123456789012'],
    ['the QR-login payload', 'hrmqr:v1:chan:secret'],
    ['garbage', 'hello'],
    ['short digits', '9012'],
    ['undefined', undefined],
  ])('%s -> invalid', (_n, raw) => {
    expect(classifyMedicalCode(raw as string | undefined)).toBe('invalid');
  });
});

describe('groupCode', () => {
  it('splits into groups of four', () => {
    expect(groupCode(EMP)).toBe('9012 3456 7890 1234 5678 9012');
  });
});

describe('apiErrorCode', () => {
  it('reads a top-level code', () => {
    expect(apiErrorCode({ response: { data: { code: 'medical_qr_invalid' } } })).toBe('medical_qr_invalid');
  });
  it('reads a code nested in an object detail', () => {
    expect(apiErrorCode({ response: { data: { detail: { code: 'x' } } } })).toBe('x');
  });
  it('is null without a body', () => {
    expect(apiErrorCode(new Error('boom'))).toBeNull();
  });
});
