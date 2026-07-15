import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { FOLDERS_LIST, FILES_LIST } from '@/api/urls';
import { documentKeys, foldersQuery, rootFilesQuery } from '../queries';
import type { DocumentFolder, HrmFile } from '@/types';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('documentKeys', () => {
  it('builds a hierarchical key tree so `all` is a prefix of folders and root', () => {
    expect(documentKeys.all).toEqual(['documents']);
    expect(documentKeys.folders()).toEqual(['documents', 'folders']);
    expect(documentKeys.root()).toEqual(['documents', 'root']);
    // all is a prefix of both → invalidating it matches folders and root
    expect(documentKeys.folders().slice(0, 1)).toEqual(documentKeys.all);
    expect(documentKeys.root().slice(0, 1)).toEqual(documentKeys.all);
  });
});

describe('foldersQuery', () => {
  it('carries the folders key', () => {
    expect(foldersQuery().queryKey).toEqual(['documents', 'folders']);
  });

  it('lists folders with their embedded files, unwrapping an { items } envelope', async () => {
    const folders: DocumentFolder[] = [
      { id: 1, name: 'HR', scope: 'branch', files: [{ id: 10, original_filename: 'a.docx' }] },
    ];
    mock.onGet(FOLDERS_LIST).reply(200, { items: folders });
    const data = await (foldersQuery().queryFn as () => Promise<DocumentFolder[]>)();
    expect(data).toHaveLength(1);
    expect(data[0].files).toHaveLength(1);
  });

  it('returns a bare array response as-is', async () => {
    mock.onGet(FOLDERS_LIST).reply(200, [{ id: 1 }, { id: 2 }]);
    const data = await (foldersQuery().queryFn as () => Promise<DocumentFolder[]>)();
    expect(data).toHaveLength(2);
  });
});

describe('rootFilesQuery', () => {
  it('carries the root key', () => {
    expect(rootFilesQuery().queryKey).toEqual(['documents', 'root']);
  });

  it('fetches folder-less files with folder_id=0', async () => {
    mock.onGet(FILES_LIST).reply(200, []);
    await (rootFilesQuery().queryFn as () => Promise<HrmFile[]>)();
    expect(mock.history.get[0].params).toEqual({ folder_id: 0 });
  });

  it('unwraps an { items } envelope and returns a bare array as-is', async () => {
    mock.onGet(FILES_LIST).reply(200, { items: [{ id: 3 }] });
    expect(await (rootFilesQuery().queryFn as () => Promise<HrmFile[]>)()).toEqual([{ id: 3 }]);
    mock.resetHistory();
    mock.onGet(FILES_LIST).reply(200, [{ id: 4 }, { id: 5 }]);
    expect(await (rootFilesQuery().queryFn as () => Promise<HrmFile[]>)()).toHaveLength(2);
  });
});
