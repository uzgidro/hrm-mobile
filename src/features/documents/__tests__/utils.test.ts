import type { DocumentFolder, HrmFile } from '@/types';
import {
  fileDisplayName,
  fileExtension,
  isViewableInOnlyOffice,
  scopeLabelKey,
  filterFolders,
  filterFiles,
} from '../utils';

const file = (o: Partial<HrmFile>): HrmFile => ({ id: 1, ...o });
const folder = (o: Partial<DocumentFolder>): DocumentFolder => ({ id: 1, ...o });

describe('fileDisplayName', () => {
  it('prefers original_filename', () => {
    expect(fileDisplayName(file({ original_filename: 'Report.docx', file_filename: 'x.docx' }))).toBe('Report.docx');
  });
  it('falls back to file_filename', () => {
    expect(fileDisplayName(file({ original_filename: null, file_filename: 'x.docx' }))).toBe('x.docx');
  });
  it('returns empty string when both missing', () => {
    expect(fileDisplayName(file({}))).toBe('');
  });
});

describe('fileExtension', () => {
  it('extracts the lowercased extension without the dot', () => {
    expect(fileExtension(file({ original_filename: 'Plan 2026.XLSX' }))).toBe('xlsx');
  });
  it('handles multiple dots (takes the last segment)', () => {
    expect(fileExtension(file({ original_filename: 'a.b.pdf' }))).toBe('pdf');
  });
  it('returns empty string when there is no extension', () => {
    expect(fileExtension(file({ original_filename: 'README' }))).toBe('');
    expect(fileExtension(file({}))).toBe('');
  });
});

describe('isViewableInOnlyOffice', () => {
  it('true for word/cell/slide/pdf document types', () => {
    expect(isViewableInOnlyOffice(file({ original_filename: 'a.docx' }))).toBe(true);
    expect(isViewableInOnlyOffice(file({ original_filename: 'a.xlsx' }))).toBe(true);
    expect(isViewableInOnlyOffice(file({ original_filename: 'a.pptx' }))).toBe(true);
    expect(isViewableInOnlyOffice(file({ original_filename: 'a.pdf' }))).toBe(true);
    expect(isViewableInOnlyOffice(file({ original_filename: 'note.txt' }))).toBe(true);
  });
  it('false for images / archives / unknown that OnlyOffice cannot open', () => {
    expect(isViewableInOnlyOffice(file({ original_filename: 'photo.jpg' }))).toBe(false);
    expect(isViewableInOnlyOffice(file({ original_filename: 'data.zip' }))).toBe(false);
    expect(isViewableInOnlyOffice(file({ original_filename: 'noext' }))).toBe(false);
    expect(isViewableInOnlyOffice(file({}))).toBe(false);
  });
});

describe('scopeLabelKey', () => {
  it('maps each scope literal to its i18n key', () => {
    expect(scopeLabelKey('private')).toBe('documents.scopePrivate');
    expect(scopeLabelKey('branch')).toBe('documents.scopeBranch');
    expect(scopeLabelKey('public')).toBe('documents.scopePublic');
  });
  it('returns null for missing/unknown scope', () => {
    expect(scopeLabelKey(null)).toBeNull();
    expect(scopeLabelKey(undefined)).toBeNull();
    expect(scopeLabelKey('weird' as never)).toBeNull();
  });
});

describe('filterFolders', () => {
  const folders = [
    folder({ id: 1, name: 'HR hujjatlar' }),
    folder({ id: 2, name: 'Buxgalteriya' }),
  ];
  it('returns all when query is blank', () => {
    expect(filterFolders(folders, '')).toHaveLength(2);
    expect(filterFolders(folders, '   ')).toHaveLength(2);
  });
  it('matches folder name case-insensitively', () => {
    expect(filterFolders(folders, 'hr')).toEqual([folders[0]]);
    expect(filterFolders(folders, 'BUX')).toEqual([folders[1]]);
  });
  it('returns [] for undefined input', () => {
    expect(filterFolders(undefined, 'hr')).toEqual([]);
  });
});

describe('filterFiles', () => {
  const files = [
    file({ id: 1, original_filename: 'Report.docx' }),
    file({ id: 2, original_filename: 'Budget.xlsx' }),
  ];
  it('returns all when query is blank', () => {
    expect(filterFiles(files, '')).toHaveLength(2);
  });
  it('matches original_filename case-insensitively', () => {
    expect(filterFiles(files, 'report')).toEqual([files[0]]);
    expect(filterFiles(files, 'BUDGET')).toEqual([files[1]]);
  });
  it('does NOT match the file_filename fallback (web parity: original_filename only)', () => {
    const list = [file({ id: 9, original_filename: null, file_filename: 'secret.docx' })];
    expect(filterFiles(list, 'secret')).toEqual([]);
  });
  it('returns [] for undefined input', () => {
    expect(filterFiles(undefined, 'x')).toEqual([]);
  });
});
