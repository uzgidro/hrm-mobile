import type { DocumentFolder, DocumentScope, HrmFile } from '@/types';

// ── File naming ──────────────────────────────────────────────────────────────
// The web shows original_filename, falling back to file_filename.
export function fileDisplayName(f: HrmFile): string {
  return f.original_filename || f.file_filename || '';
}

// Lowercased extension without the dot ('' when the name has none).
export function fileExtension(f: HrmFile): string {
  const name = fileDisplayName(f);
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return '';
  return name.slice(dot + 1).toLowerCase();
}

// ── OnlyOffice viewability ───────────────────────────────────────────────────
// Bytes are reachable only through the OnlyOffice editor-config, and that route
// returns 422 unsupported_document_type for anything OnlyOffice can't render.
// Mirror the backend's extension sets (services/onlyoffice.py _OO_WORD/_CELL/
// _SLIDE/_PDF) so we can hide the "open" affordance for files that would 422.
const OO_VIEWABLE = new Set<string>([
  // word
  'docx', 'doc', 'odt', 'rtf', 'txt', 'html', 'htm', 'mht', 'epub', 'fb2',
  'xml', 'djvu', 'docm', 'dot', 'dotx', 'dotm', 'ott',
  // cell
  'xlsx', 'xls', 'ods', 'csv', 'xlsm', 'xlt', 'xltx', 'xltm', 'ots',
  // slide
  'pptx', 'ppt', 'odp', 'ppsx', 'pps', 'pptm', 'potx', 'pot', 'otp',
  // pdf
  'pdf', 'oxps', 'xps',
]);

export function isViewableInOnlyOffice(f: HrmFile): boolean {
  return OO_VIEWABLE.has(fileExtension(f));
}

// ── Scope pill ───────────────────────────────────────────────────────────────
// Web parity: the scope literals are backend contract identifiers (never
// translated); only their display labels localize (documents.scope* keys).
const SCOPE_LABEL_KEYS: Record<DocumentScope, string> = {
  private: 'documents.scopePrivate',
  branch: 'documents.scopeBranch',
  public: 'documents.scopePublic',
};

export function scopeLabelKey(scope: DocumentScope | null | undefined): string | null {
  if (!scope) return null;
  return SCOPE_LABEL_KEYS[scope] ?? null;
}

// ── Client-side search ───────────────────────────────────────────────────────
export function filterFolders(
  folders: DocumentFolder[] | undefined,
  query: string
): DocumentFolder[] {
  const list = folders ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((f) => (f.name ?? '').toLowerCase().includes(q));
}

// Web parity: file search matches on original_filename only (DocumentsPage.jsx),
// not the file_filename fallback used for display.
export function filterFiles(files: HrmFile[] | undefined, query: string): HrmFile[] {
  const list = files ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((f) => (f.original_filename ?? '').toLowerCase().includes(q));
}
