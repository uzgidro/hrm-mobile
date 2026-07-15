// Documents (Hujjatlar) feature strings — a view-only files/folders browser.
// uz-Latn is the source of truth; the other three locales must expose the exact
// same key set (parity test). The scope literals ('private'/'branch'/'public')
// are backend contract identifiers and are NOT translated — only the scope* pill
// labels below localize (web parity).
export default {
  // ── List screen ──────────────────────────────────────────────────────────
  title: 'Hujjatlar',
  searchPlaceholder: 'Qidirish...',
  empty: 'Hujjatlar yo‘q',
  emptySearch: 'Hech narsa topilmadi',
  loadError: 'Hujjatlarni yuklashda xatolik',
  folderFallback: 'Papka',
  fileFallback: 'Fayl',
  fileCount_one: '{{count}} ta fayl',
  fileCount_other: '{{count}} ta fayl',
  unknownType: 'Fayl',
  notViewable: 'ochib bo‘lmaydi',

  // ── Scope pill (labels only; the literals stay untranslated) ──────────────
  scopePrivate: 'Shaxsiy',
  scopeBranch: 'Filial',
  scopePublic: 'Umumiy',

  // ── Viewer screen ────────────────────────────────────────────────────────
  viewerTitle: 'Hujjat',
  loading: 'Hujjat yuklanmoqda...',
  openError: 'Hujjatni ochishda xatolik',
  unsupportedTitle: 'Fayl turi qo‘llab-quvvatlanmaydi',
  unsupportedMessage: 'Bu turdagi faylni ilovada ochib bo‘lmaydi.',
} as const;
