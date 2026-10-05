// Localized month / weekday name helpers, replacing the MONTHS_UZ / DAYS_UZ
// arrays that were duplicated across ~6 screens. Names come from the active
// dayjs locale (see dayjs.ts), so they switch with the app language.
//
//   monthName(d.month())   // 0-11  -> "Yanvar" | "Январ" | "Январь" | "January"
//   monthName(9, { genitive: true })  // ru -> "октября" (after a day number)
//   dayMonth(d)            // "5 октября" | "5 Oktabr" | "5 October"
//   weekdayName(d.day())   // 0-6, Sunday=0, matching dayjs's day() index
import dayjs, { type ConfigType } from 'dayjs';
import localeData from 'dayjs/plugin/localeData';

dayjs.extend(localeData);

// dayjs().localeData() reflects the currently-set global locale. Reading it per
// call keeps names correct after a language switch without caching stale ones.
//
// `genitive`: the month as it reads AFTER a day number. Russian inflects it
// («5 октября», not the standalone «5 октябрь» — QA); dayjs's ru locale keeps
// that form in `months.f` (format) next to `months.s` (standalone). Locales
// without a separate form (uz, uz-latn, en) return the same name either way.
export function monthName(monthIndex: number, opts?: { genitive?: boolean }): string {
  if (opts?.genitive) {
    const raw = (dayjs.Ls[dayjs.locale()] as unknown as { months?: unknown } | undefined)?.months;
    const formatForm = typeof raw === 'function' ? (raw as { f?: string[] }).f : undefined;
    const name = formatForm?.[monthIndex];
    if (name) return name;
  }
  return dayjs().localeData().months()[monthIndex] ?? '';
}

/** «5 октября» / «5 Oktabr» / «5 October» (+ « 2026» with `year`) — day + genitive month. */
export function dayMonth(date: ConfigType, opts?: { year?: boolean }): string {
  const d = dayjs(date);
  if (!d.isValid()) return '';
  const base = `${d.date()} ${monthName(d.month(), { genitive: true })}`;
  return opts?.year ? `${base} ${d.year()}` : base;
}

export function weekdayName(dayIndex: number): string {
  return dayjs().localeData().weekdays()[dayIndex] ?? '';
}

export function weekdayNameShort(dayIndex: number): string {
  return dayjs().localeData().weekdaysShort()[dayIndex] ?? '';
}
