import MockAdapter from 'axios-mock-adapter';
import { Platform } from 'react-native';
import { apiClient } from '@/api/client';
import { appendFile, appendFiles } from '../formFile';

const realOS = Platform.OS;
const realFetch = global.fetch;
afterEach(() => {
  Platform.OS = realOS;
  global.fetch = realFetch;
});

function fakeFd() {
  const append = jest.fn();
  return { fd: { append } as unknown as FormData, append };
}

describe('appendFile — native', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
  });

  it("RN {uri,name,type} obyektini qo'shadi (fetch qilmaydi)", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const { fd, append } = fakeFd();
    await appendFile(fd, 'file', { uri: 'file:///a.pdf', name: 'a.pdf', mimeType: 'application/pdf' });
    expect(append).toHaveBeenCalledWith('file', { uri: 'file:///a.pdf', name: 'a.pdf', type: 'application/pdf' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("turi noma'lum bo'lsa application/octet-stream", async () => {
    const { fd, append } = fakeFd();
    await appendFile(fd, 'file', { uri: 'file:///x', name: 'x' });
    expect(append.mock.calls[0][1]).toEqual({ uri: 'file:///x', name: 'x', type: 'application/octet-stream' });
  });
});

describe('appendFile — web', () => {
  beforeEach(() => {
    Platform.OS = 'web';
  });

  it("uri ni fetch qilib haqiqiy Blob qo'shadi (nomi bilan), turini to'ldiradi", async () => {
    global.fetch = jest.fn(async () => ({ blob: async () => new Blob(['%PDF']) })) as unknown as typeof fetch;
    const fd = new FormData();
    await appendFile(fd, 'file', { uri: 'blob:http://localhost/1', name: 'a.pdf', mimeType: 'application/pdf' });
    expect(global.fetch).toHaveBeenCalledWith('blob:http://localhost/1');
    const part = fd.get('file') as File;
    expect(part).toBeInstanceOf(Blob);
    expect(part.name).toBe('a.pdf');
    expect(part.type).toBe('application/pdf');
    expect(part.size).toBe(4);
  });

  it("tanlagich bergan File bo'lsa fetch qilmaydi", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const fd = new FormData();
    const file = new Blob(['img'], { type: 'image/png' });
    await appendFile(fd, 'files', { uri: 'blob:x', name: 'p.png', mimeType: 'image/png', file });
    expect(global.fetch).not.toHaveBeenCalled();
    expect((fd.get('files') as File).type).toBe('image/png');
  });

  it("appendFiles: har fayl o'sha maydonda, tartib saqlanadi", async () => {
    global.fetch = jest.fn(async (u: string) => ({ blob: async () => new Blob([u]) })) as unknown as typeof fetch;
    const fd = new FormData();
    await appendFiles(fd, 'files', [
      { uri: 'blob:1', name: '1.txt' },
      { uri: 'blob:2', name: '2.txt' },
    ]);
    expect((fd.getAll('files') as File[]).map((f) => f.name)).toEqual(['1.txt', '2.txt']);
  });

  it('so\'rov tanasida "[object Object]" emas, Blob ketadi', async () => {
    global.fetch = jest.fn(async () => ({ blob: async () => new Blob(['data']) })) as unknown as typeof fetch;
    const mock = new MockAdapter(apiClient);
    mock.onPost('/up').reply(200, {});
    const fd = new FormData();
    await appendFile(fd, 'file', { uri: 'blob:z', name: 'z.bin' });
    // Token o'qish (storage) vebda localStorage'ga boradi — so'rovning o'zi platformadan qat'iy.
    Platform.OS = realOS;
    await apiClient.post('/up', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    const body = mock.history.post[0]!.data as FormData;
    expect(body.get('file')).toBeInstanceOf(Blob);
    expect(body.get('file')).not.toBe('[object Object]');
    mock.restore();
  });
});
