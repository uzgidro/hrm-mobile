// Modules tab: the grid of module tiles grouped into sections, plus the
// standalone "Oylik" (salary) placeholder screen. uz-Latn is the source of
// truth; the other three locales must expose the exact same key set (parity
// test). Only DISPLAY labels are here — module `key`s / route names
// ('attendance', 'requests', 'projects', 'salary', …) are NOT translated
// (web parity: codes stay codes).
export default {
  screenTitle: 'Modullar',

  // Section headers
  sections: {
    activity: 'Faoliyat',
    team: 'Jamoa',
    other: 'Boshqa',
  },

  // Module tile labels (keyed by the module `key`, which is not translated)
  labels: {
    attendance: 'Davomat',
    requests: "So'rovlar",
    projects: 'Loyihalar',
    salary: 'Oylik',
    team: 'Jamoa',
    employees: 'Xodimlar',
    guests: 'Mehmonlar',
    birthdays: "Tug'ilgan kun",
    news: 'Yangiliklar',
    notifications: 'Bildirishnoma',
    profile: 'Profil',
  },

  // Salary placeholder screen (module under development)
  salary: {
    title: 'Tez orada',
    description: "Oylik ma'lumotlari moduli ishlab chiqilmoqda.\nYaqin orada qo'shiladi.",
  },
} as const;
