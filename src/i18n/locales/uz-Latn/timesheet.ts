// Time-tracking (Учёт времени) feature strings. Wave 1 = "Mening tabelim" (my
// monthly tabel grid). uz-Latn is the source of truth; the other three locales
// must expose the exact same key set (parity test). The calendar status CODES
// themselves are backend contract identifiers and are NOT translated — only
// the display labels below (code*) localize.
export default {
  // ── My tabel screen ────────────────────────────────────────────────────────
  myTitle: 'Mening tabelim',
  mySubtitle: 'Oylik davomat',
  loadError: 'Tabelni yuklashda xatolik',
  empty: 'Bu oy uchun maʼlumot yoʻq',

  // ── Summary card ─────────────────────────────────────────────────────────
  summaryTitle: 'Oylik hisob',
  present: 'Kelgan',
  late: 'Kechikkan',
  absent: 'Kelmagan',
  hoursValue: '{{value}} soat',
  hoursLabel: 'Jami ish vaqti',

  // ── Legend ───────────────────────────────────────────────────────────────
  dayTitle: 'Kun holati',
  lateByMinutes: '{{value}} daqiqa kechikkan',
  legendTitle: 'Belgilar',

  // ── Duty roster (navbatchilik, Wave 2) ────────────────────────────────────
  dutyTitle: 'Navbatchilik',
  dutySubtitle: 'Mening navbatchilik jadvalim',
  dutyLoadError: 'Navbatchilikni yuklashda xatolik',
  dutyEmpty: 'Navbatchilik jadvali mavjud emas',
  dutyMonthEmpty: 'Bu oyda navbatchilik belgilanmagan',
  myDaysTitle: 'Mening kunlarim',
  dutyDayOff: 'Dam olish',
  shiftsLabel: 'Smenalar',
  weekdaysLabel: 'Kunlar',
  membersTitle: 'Guruh aʼzolari',
  membersCount_one: '{{count}} kishi',
  membersCount_other: '{{count}} kishi',

  // ── Holidays / off-day duty (Wave 3) ──────────────────────────────────────
  holidaysTitle: 'Bayramlar',
  holidaysSubtitle: 'Bayram va dam olish kunlari',
  holidaysTab: 'Bayramlar',
  offDutyTab: 'Dam olishda ishlovchilar',
  holidaysLoadError: 'Bayramlarni yuklashda xatolik',
  holidaysEmpty: 'Bayramlar topilmadi',
  offDutyEmpty: 'Dam olish kunlarida ishlovchilar belgilanmagan',
  repeatableBadge: 'Har yili',
  ongoingBadge: 'Hozir',

  // ── Calendar status code labels (codes stay untranslated) ────────────────
  codePresent: 'Kelgan',
  codeLate: 'Kechikkan',
  codeEarlyLeave: 'Erta ketgan',
  codeAbsent: 'Kelmagan',
  codeProgul: 'Progul',
  codeDayOff: 'Dam olish kuni',
  codeBusinessTrip: 'Xizmat safari',
  codeAnnualLeave: 'Mehnat taʼtili',
  codeSickLeave: 'Kasallik',
  codeUnpaidLeave: 'Toʻlanmaydigan taʼtil',
  codeWorkLeave: 'Ruxsat',
  codeDekret: 'Homiladorlik taʼtili',
  codeStudyLeave: 'Oʻquv taʼtili',
  codeTraining: 'Malaka oshirish',
  codeMilitary: 'Harbiy xizmat',
  codeReference: 'Maʼlumotnoma',
  codePaidAbsence: 'Ish haqi saqlangan',
  codeUnknownReason: 'Nomaʼlum sabab',
  codeDismissed: 'Ishdan boʻshatilgan',
  codeUnknown: 'Nomaʼlum',
} as const;
