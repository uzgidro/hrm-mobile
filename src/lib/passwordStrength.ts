/**
 * Client-side mirror of the server's `core/password_policy.py` — the SAME
 * rules `/auth/me/password` enforces, so the checklist under the field never
 * promises something the save then refuses. The server stays the authority.
 *
 * Levels: weak = a mandatory rule is broken; medium = all mandatory rules met;
 * strong = medium + (12+ characters OR a special character).
 */
export type PasswordLevel = 'weak' | 'medium' | 'strong';
export type PasswordRuleKey = 'length' | 'uppercase' | 'lowercase' | 'digit' | 'contains_username' | 'common';

export const PASSWORD_MIN_LENGTH = 8;

const UPPER = /[A-ZА-ЯЁЎҚҒҲ]/;
const LOWER = /[a-zа-яёўқғҳ]/;
const DIGIT = /\d/;
const SPECIAL = /[^A-Za-z0-9А-Яа-яЁёЎўҚқҒғҲҳ]/;
const TRAILING_JUNK = /[\d\W_]+$/;

const COMMON = new Set([
  'password', 'passw0rd', 'parol', 'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl',
  'zxcvbn', 'zxcvbnm', '12345678', '123456789', '1234567890', '87654321',
  '11111111', '00000000', 'abcd1234', 'abc12345', 'admin', 'administrator',
  'welcome', 'letmein', 'iloveyou', 'monkey', 'dragon', 'football', 'baseball',
  'master', 'sunshine', 'princess', 'shadow', 'superman', 'michael', 'jennifer',
  'trustno1', 'changeme', 'default', 'secret', 'login', 'user', 'test', 'guest',
  'uzgidro', 'hrm', 'hruzgidro', 'uzbekistan', 'toshkent', 'tashkent', 'samarkand',
  'salom', 'salomdunyo', 'ozbekiston', "o'zbekiston",
]);

export interface PasswordCheck {
  level: PasswordLevel;
  /** 0–4 filled segments for the meter. */
  score: number;
  rules: Record<'length' | 'uppercase' | 'lowercase' | 'digit', boolean>;
  /** Broken mandatory rules — empty means the server will accept it. */
  failed: PasswordRuleKey[];
}

export function checkPassword(password: string, username?: string | null): PasswordCheck {
  const pw = password || '';
  const rules = {
    length: pw.length >= PASSWORD_MIN_LENGTH,
    uppercase: UPPER.test(pw),
    lowercase: LOWER.test(pw),
    digit: DIGIT.test(pw),
  };
  const failed: PasswordRuleKey[] = (Object.keys(rules) as (keyof typeof rules)[]).filter((k) => !rules[k]);

  const low = pw.toLowerCase();
  if (username) {
    const u = username.trim().toLowerCase();
    const local = u.split('@')[0];
    for (const piece of new Set([u, local])) {
      if (piece.length >= 4 && low.includes(piece)) {
        failed.push('contains_username');
        break;
      }
    }
  }
  const stripped = low.replace(TRAILING_JUNK, '');
  if (pw && (COMMON.has(low) || (stripped && COMMON.has(stripped)))) failed.push('common');

  let level: PasswordLevel = 'weak';
  if (failed.length === 0) level = pw.length >= 12 || SPECIAL.test(pw) ? 'strong' : 'medium';

  const satisfied = Object.values(rules).filter(Boolean).length;
  const score =
    pw.length === 0 ? 0 : level === 'weak' ? Math.min(2, Math.max(1, Math.ceil(satisfied / 2))) : level === 'medium' ? 3 : 4;

  return { level, score, rules, failed };
}
