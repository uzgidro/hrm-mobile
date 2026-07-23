// News (Yangiliklar) feature — the NewsScreen feed. uz-Latn is the source of
// truth; the other three locales expose the exact same key set (parity test).
//
// Web-parity note: the news post title/description and organization branch name
// arrive from the backend and are rendered verbatim — only chrome (screen title,
// empty state, and the author / "all employees" fallbacks) is localized here.
export default {
  title: 'Yangiliklar',

  // Fallbacks when a post carries no author / no target branch
  authorFallback: 'Admin',
  allEmployees: 'Barcha xodimlarga',

  // Empty state
  empty: "Yangiliklar yo'q",
  emptyMessage: 'Hozircha yangiliklar mavjud emas',

  // Create form (news-manager only)
  createTitle: 'Yangi yangilik',
  titleLabel: 'Sarlavha',
  titlePlaceholder: 'Yangilik sarlavhasi',
  descriptionLabel: 'Matn',
  descriptionPlaceholder: 'Yangilik matni...',
  branchLabel: 'Filial',
  branchAllOption: 'Barcha filiallar',
  save: 'Saqlash',
  created: 'Yangilik joylandi',
  titleRequired: 'Sarlavha kiritilishi shart',
  errorTitle: 'Xatolik',
} as const;
