// Employees feature strings — the list (EmployeesListScreen), the profile
// detail (EmployeeDetailScreen) and the per-employee attendance calendar
// (EmployeeCalendarScreen). uz-Latn is the source of truth; the other three
// locales must expose the exact same key set (parity test).
//
// Web-parity note: gender/marital-status VALUES arrive from the API as domain
// codes (1/2, single/married/…). The codes stay as keys — only the display
// labels are localized. Reuses common.* where a label already exists there.
export default {
  // ── List screen ─────────────────────────────────────────────────────────────
  listTitle: 'Xodimlar',
  subordinatesTitle: "Bo'ysunuvchilar",
  searchPlaceholder: "Ism, lavozim, bo'lim...",
  notFound: 'Topilmadi',
  empty: "Xodimlar yo'q",
  accessTitle: 'Xodimlar',

  // ── Detail screen ───────────────────────────────────────────────────────────
  detailTitle: "Ma'lumotnoma",
  detailNotFound: "Ma'lumot topilmadi",
  attendance: 'Davomat',
  presentToDate: 'hozirgi kungacha',

  // Gender (keyed by API numeric code — codes are NOT translated)
  gender: {
    1: 'Erkak',
    2: 'Ayol',
  },
  // Marital status (keyed by API code — codes are NOT translated)
  marital: {
    single: 'Turmush qurmagan',
    married: 'Turmush qurgan',
    divorced: 'Ajrashgan',
    widowed: 'Beva',
  },
  // Short weekday labels for the "working days" row (keyed by dayjs day() index)
  dayShort: {
    0: 'Du',
    1: 'Se',
    2: 'Chor',
    3: 'Pay',
    4: 'Ju',
    5: 'Sha',
    6: 'Ya',
  },

  // Detail section titles
  section: {
    personal: "Shaxsiy ma'lumotlar",
    contact: "Kontakt ma'lumotlari",
    work: "Ish ma'lumotlari",
    documents: 'Hujjatlar',
    experience: 'Mehnat tajribasi',
    education: "Ta'lim",
  },
  // Detail info-row labels
  field: {
    birthDate: "Tug'ilgan sana",
    gender: 'Jinsi',
    nationality: 'Millati',
    marital: 'Oilaviy holati',
    address: 'Manzil',
    phone: 'Telefon',
    internalPhone: 'Ichki telefon',
    email: 'Email',
    department: "Bo'lim",
    position: 'Lavozim',
    hireDate: 'Ishga kirgan sana',
    workHours: 'Ish soati',
    lunch: 'Tushlik',
    workDays: 'Ish kunlari',
    supervisor: 'Rahbar',
    pinfl: 'PINFL',
    inn: 'INN',
    passport: 'Pasport',
    passportIssuedBy: 'Pasport berilgan joy',
    jshshir: 'JSHSHIR',
    pensionAccount: 'Pensiya hisob raqami',
  },

  // ── Calendar screen ─────────────────────────────────────────────────────────
  entry: 'kirish',
  exit: 'chiqish',
  entryTitle: 'Kirish',
  exitTitle: 'Chiqish',
  scheduleTitle: 'Ish jadvali',
  workDay: 'ish kuni',
  break: 'tanaffus',
  logTitle: 'Qaydnoma',
  logEmpty: "Ro'yxat bo'sh",
  monthlyStats: 'Oylik statistika',
  missed: 'kelinmadi',
  remaining: 'qoldi',
  hours_one: '{{count}} soat',
  hours_other: '{{count}} soat',
  perPlan: 'rejaga muvofiq',
} as const;
