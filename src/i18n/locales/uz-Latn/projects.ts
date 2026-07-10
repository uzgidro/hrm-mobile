// Projects (loyihalar) feature strings — the Kanban-style workspaces list,
// detail (columns + cards), and create/edit form. uz-Latn is the source of
// truth; the other three locales expose the exact same key set (parity test).
//
// Web-parity note: column colors, card completion flags and other API enum/id
// fields are never translated — only display-only labels live here. Reuses
// common.* (cancel/save/edit) and errors.* (saveFailed) instead of re-declaring.
export default {
  // ── List screen ─────────────────────────────────────────────────────────────
  title: 'Loyihalar',
  nameFallback: 'Loyiha',
  empty: "Loyihalar yo'q",

  // ── Detail screen ───────────────────────────────────────────────────────────
  membersTitle: "A'zolar ({{count}})",
  memberFallback: 'Xodim',
  columnsTitle: 'Ustunlar',
  columnAdd: 'Ustun',
  columnFallback: 'Ustun',
  columnsEmpty: "Ustunlar yo'q",
  taskFallback: 'Vazifa',
  taskAdd: "Vazifa qo'shish",

  // Add column / card modal
  newColumn: 'Yangi ustun',
  newTask: 'Yangi vazifa',
  columnNamePlaceholder: 'Ustun nomi',
  taskTitlePlaceholder: 'Vazifa sarlavhasi',
  taskDescPlaceholder: 'Tavsif (ixtiyoriy)',

  // Delete workspace
  deleteTitle: "O'chirish",
  deleteConfirm: "Loyihani o'chirishni xohlaysizmi?",
  deleteYes: "Ha, o'chirish",
  deleteError: "O'chirishda xatolik (faqat yaratuvchi o'chira oladi)",
  toggleError: "Amalni bajarib bo'lmadi",

  // ── Form screen ─────────────────────────────────────────────────────────────
  editTitle: 'Loyihani tahrirlash',
  createTitle: 'Yangi loyiha',
  nameLabel: 'Loyiha nomi',
  namePlaceholder: 'Masalan: 2026 rejasi',
  descLabel: 'Tavsif',
  descPlaceholder: 'Loyiha haqida qisqacha...',
  membersLabel: "Loyiha a'zolari",
  membersSelected_one: '{{count}} ta xodim tanlandi',
  membersSelected_other: '{{count}} ta xodim tanlandi',
  membersPlaceholder: 'Xodimlarni tanlang...',
  membersHint: "A'zolar loyiha vazifalarini ko'rishlari va ularda ishtirok etishlari mumkin.",
  nameRequired: 'Loyiha nomi kiritilishi shart',

  // ── Alerts ──────────────────────────────────────────────────────────────────
  errorTitle: 'Xatolik',
} as const;
