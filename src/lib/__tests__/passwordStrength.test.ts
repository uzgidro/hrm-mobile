import { checkPassword } from '../passwordStrength';

describe('checkPassword (mirror of core/password_policy.py)', () => {
  it('names every broken mandatory rule', () => {
    expect(checkPassword('short1A').failed).toEqual(['length']);
    expect(checkPassword('alllowercase1').failed).toEqual(['uppercase']);
    expect(checkPassword('NoDigitsHere').failed).toEqual(['digit']);
    expect(checkPassword('').level).toBe('weak');
  });

  it('refuses the login and dictionary heads', () => {
    expect(checkPassword('Karimov.Aziz2026', 'karimov.aziz@uzgidro.uz').failed).toContain('contains_username');
    expect(checkPassword('Password123').failed).toContain('common');
    expect(checkPassword('Admin2024!').failed).toContain('common');
  });

  it('grades medium vs strong', () => {
    expect(checkPassword('Gidro2026').level).toBe('medium');
    expect(checkPassword('Gidro#2026').level).toBe('strong');
    expect(checkPassword('GidroEnergo2026').level).toBe('strong');
    expect(checkPassword('Gidro#2026').score).toBe(4);
  });
});
