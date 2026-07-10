// Localized month / weekday name helpers, replacing the MONTHS_UZ / DAYS_UZ
// arrays that were duplicated across ~6 screens. Names come from the active
// dayjs locale (see dayjs.ts), so they switch with the app language.
//
//   monthName(d.month())   // 0-11  -> "Yanvar" | "Январ" | "Январь" | "January"
//   weekdayName(d.day())   // 0-6, Sunday=0, matching dayjs's day() index
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';

dayjs.extend(localeData);

// dayjs().localeData() reflects the currently-set global locale. Reading it per
// call keeps names correct after a language switch without caching stale ones.
export function monthName(monthIndex: number): string {
  return dayjs().localeData().months()[monthIndex] ?? '';
}

export function weekdayName(dayIndex: number): string {
  return dayjs().localeData().weekdays()[dayIndex] ?? '';
}

export function monthNameShort(monthIndex: number): string {
  return dayjs().localeData().monthsShort()[monthIndex] ?? '';
}

export function weekdayNameShort(dayIndex: number): string {
  return dayjs().localeData().weekdaysShort()[dayIndex] ?? '';
}
