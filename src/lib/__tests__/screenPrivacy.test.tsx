// Maxfiy ekranlarda skrinshot taqiqi: ochilganda yoqiladi, yopilganda o'z kaliti bilan bo'shatiladi.
import { renderHook } from '@testing-library/react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { useSensitiveScreen } from '../screenPrivacy';

const prevent = jest.mocked(ScreenCapture.preventScreenCaptureAsync);
const allow = jest.mocked(ScreenCapture.allowScreenCaptureAsync);

describe('useSensitiveScreen', () => {
  beforeEach(() => {
    prevent.mockClear();
    allow.mockClear();
  });

  it('ekran ochilganda taqiqlaydi, yopilganda xuddi shu kalit bilan bo\'shatadi', async () => {
    const { unmount } = await renderHook(() => useSensitiveScreen());
    expect(prevent).toHaveBeenCalledTimes(1);
    const key = prevent.mock.calls[0]![0];
    await unmount();
    expect(allow).toHaveBeenCalledWith(key);
  });

  it('ikki maxfiy ekran — kalitlar har xil (biri yopilsa ikkinchisi himoyada qoladi)', async () => {
    await renderHook(() => useSensitiveScreen());
    await renderHook(() => useSensitiveScreen());
    expect(prevent).toHaveBeenCalledTimes(2);
    expect(prevent.mock.calls[0]![0]).not.toBe(prevent.mock.calls[1]![0]);
  });

  it('active=false — hech narsa qilmaydi', async () => {
    await renderHook(() => useSensitiveScreen(false));
    expect(prevent).not.toHaveBeenCalled();
  });
});
