// Birthdays feature — the BirthdaysScreen (upcoming-birthdays roster). uz-Latn
// is the source of truth; the other three locales expose the exact same key set
// (parity test). Shared words (search placeholder, "not found") reuse common.*.
//
// The MONTHS_UZ array that used to live in the screen is gone: birth dates are
// formatted via `monthName` from src/i18n/dates.ts, which follows the app
// language. `daysLeft` and `age` are plurals ({{count}}) — ru adds _few/_many.
export default {
  // Header — a "(N)" count is appended by the screen via the count suffix
  title: "Tug'ilgan kunlar",
  empty: "Tug'ilgan kun yo'q",

  // Today / upcoming badges
  today: 'Bugun!',
  daysLeft_one: '{{count}} kun',
  daysLeft_other: '{{count}} kun',

  // Age suffix shown after the birth date ("· 30 yosh")
  age_one: '{{count}} yosh',
  age_other: '{{count}} yosh',
} as const;
