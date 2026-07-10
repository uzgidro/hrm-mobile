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
} as const;
