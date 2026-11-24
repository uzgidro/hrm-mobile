import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { UI_SETTING } from '@/api/urls';
import { storage } from '@/api/storage';
import { useAuthStore } from '@/store/authStore';
import { useTextSizeStore } from '@/store/textSizeStore';
import { TEXT_SIZE_KEY, TEXT_SIZE_SAVE_MS, fetchTextSize, pickTextSize } from '../textSizeSync';

const mock = new MockAdapter(apiClient);
const URL = UI_SETTING(TEXT_SIZE_KEY);
const user = (id: number | null) => useAuthStore.setState({ user: id == null ? null : { id } } as never);
const wait = () => new Promise((r) => setTimeout(r, TEXT_SIZE_SAVE_MS + 100));

beforeEach(() => {
  mock.reset();
  mock.onPut(URL).reply(200, {});
  useTextSizeStore.setState({ id: 'normal', picked: false });
});
afterEach(() => user(null));

it('several taps — applied at once, one request with the last step', async () => {
  user(1);
  pickTextSize('medium');
  pickTextSize('large');
  expect(useTextSizeStore.getState()).toMatchObject({ id: 'large', picked: true });
  await wait();
  expect(mock.history.put.map((r) => JSON.parse(r.data))).toEqual([{ value: { font: 'large' } }]);
});

it('signed out in between — nothing is written to the next account', async () => {
  user(1);
  pickTextSize('large');
  user(2);
  await wait();
  expect(mock.history.put).toHaveLength(0);
});

it("the account's copy: a known step, else null", async () => {
  mock.onGet(URL).replyOnce(200, { value: { font: 'xlarge' } });
  await expect(fetchTextSize()).resolves.toBe('xlarge');
  mock.onGet(URL).replyOnce(200, { value: { font: 'giant' } });
  await expect(fetchTextSize()).resolves.toBeNull();
  mock.onGet(URL).replyOnce(200, { value: null });
  await expect(fetchTextSize()).resolves.toBeNull();
});

describe('hydrate', () => {
  it.each([
    [JSON.stringify({ id: 'large', picked: true }), { id: 'large', picked: true }],
    ['not json', { id: 'normal', picked: false }],
    [JSON.stringify({ id: 'giant' }), { id: 'normal', picked: false }],
    [null, { id: 'normal', picked: false }],
  ])('%p', async (stored, want) => {
    const spy = jest.spyOn(storage, 'getItem').mockResolvedValueOnce(stored);
    await useTextSizeStore.getState().hydrate();
    expect(useTextSizeStore.getState()).toMatchObject({ ...want, hydrated: true });
    spy.mockRestore();
  });
});
