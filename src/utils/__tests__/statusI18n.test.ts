// Proves the i18n wiring of the status/role/category util label maps: the util
// functions resolve their labels through i18n.t() at call time, so switching the
// language switches the returned label — while the enum CODES / status codes /
// role tokens they map FROM stay untouched (backend/web contract identifiers).
import i18n from '../../i18n';
import { ORDER_STATUS_META, statusMeta } from '../orderStatus';
import { LETTER_TYPE_LABELS, letterTypeLabel, letterStatusMeta } from '../letterStatus';
import { ORDER_CATEGORY_TRANSLATIONS, translateCategory } from '../roles';
import type { Letter } from '../../types';

// Always restore the default language so this suite never pollutes the shared
// i18n singleton for other test files running in the same worker.
afterEach(async () => {
  await i18n.changeLanguage('uz-Latn');
});

describe('status labels resolve via i18n and follow the language', () => {
  it('order status label is Uzbek in uz-Latn and Russian after changeLanguage("ru")', async () => {
    expect(statusMeta('draft').label).toBe('Qoralama');

    await i18n.changeLanguage('ru');
    expect(statusMeta('draft').label).toBe('Черновик');
    // the kind (non-label contract) is unchanged across languages
    expect(statusMeta('draft').kind).toBe('neutral');
  });

  it('letter type label follows the language', async () => {
    expect(letterTypeLabel('application')).toBe('Ariza');
    await i18n.changeLanguage('ru');
    expect(letterTypeLabel('application')).toBe('Заявление');
  });

  it('letter status meta label follows the language', async () => {
    const rejected = { letter_type: 'application', status: 'rejected' } as Letter;
    expect(letterStatusMeta(rejected).label).toBe('Rad etildi');
    await i18n.changeLanguage('ru');
    expect(letterStatusMeta(rejected).label).toBe('Отклонено');
  });

  it('category translation follows the language', async () => {
    expect(translateCategory('vacation')).toBe("Mehnat ta'tili");
    await i18n.changeLanguage('en');
    expect(translateCategory('vacation')).toBe('Annual leave');
  });

  it('resolves a sample label in every supported language', async () => {
    await i18n.changeLanguage('uz-Latn');
    expect(statusMeta('confirmed').label).toBe("Ro'yxatga olingan");
    await i18n.changeLanguage('uz-Cyrl');
    expect(statusMeta('confirmed').label).toBe('Рўйхатга олинган');
    await i18n.changeLanguage('ru');
    expect(statusMeta('confirmed').label).toBe('Зарегистрировано');
    await i18n.changeLanguage('en');
    expect(statusMeta('confirmed').label).toBe('Registered');
  });
});

describe('enum keys / codes are NOT translated (web-parity contract)', () => {
  it('ORDER_STATUS_META keys are the unchanged status codes', () => {
    expect(Object.keys(ORDER_STATUS_META).sort()).toEqual(
      [
        'applied',
        'approved',
        'changes_requested',
        'confirmed',
        'draft',
        'pending',
        'pending_approval',
        'pending_chancellery',
        'pending_leadership',
        'rejected',
        'signed',
      ].sort(),
    );
  });

  it('LETTER_TYPE_LABELS keys are the unchanged letter-type codes', () => {
    expect(Object.keys(LETTER_TYPE_LABELS).sort()).toEqual(
      ['application', 'bildirgi', 'business_trip', 'explanatory', 'explanotary', 'notification'].sort(),
    );
  });

  it('ORDER_CATEGORY_TRANSLATIONS keys are the unchanged category codes', () => {
    expect(Object.keys(ORDER_CATEGORY_TRANSLATIONS).sort()).toEqual(
      ['business_trip', 'sick_leave', 'vacation'].sort(),
    );
  });

  it('codes stay the same after a language switch', async () => {
    const before = Object.keys(ORDER_STATUS_META);
    await i18n.changeLanguage('ru');
    expect(Object.keys(ORDER_STATUS_META)).toEqual(before);
  });
});
