// 2026-10-06: «push telefonga Telegram kabi top panelda chiqib turmayapti» — Android'da tepada
// chiqish kanal muhimligiga bog'liq; diagnostika buni ko'rsatadi va kanal sozlamasini ochadi.
import { Linking, Platform } from 'react-native';
import { getAndroidChannelAlert, openChannelSettings } from '../notifications';

const mockGetChannel = jest.fn();
const mockSetChannel = jest.fn(async () => null);
jest.mock('expo-notifications', () => ({
  AndroidImportance: { UNKNOWN: 0, UNSPECIFIED: 1, NONE: 2, MIN: 3, LOW: 4, DEFAULT: 5, HIGH: 6, MAX: 7 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  getNotificationChannelAsync: (...a: unknown[]) => mockGetChannel(...a),
  setNotificationChannelAsync: (...a: unknown[]) => mockSetChannel(...(a as [])),
  setNotificationHandler: jest.fn(),
}));


describe('Android kanali: tepada chiqadimi', () => {
  const origOS = Platform.OS;
  beforeAll(() => Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true }));
  afterAll(() => Object.defineProperty(Platform, 'OS', { get: () => origOS, configurable: true }));
  beforeEach(() => {
    mockGetChannel.mockReset();
    mockSetChannel.mockClear();
  });

  it('HIGH/MAX — heads_up; DEFAULT/LOW — silent; NONE — off', async () => {
    mockGetChannel.mockResolvedValueOnce({ importance: 7 });
    expect(await getAndroidChannelAlert()).toBe('heads_up');
    mockGetChannel.mockResolvedValueOnce({ importance: 5 });
    expect(await getAndroidChannelAlert()).toBe('silent');
    mockGetChannel.mockResolvedValueOnce({ importance: 2 });
    expect(await getAndroidChannelAlert()).toBe('off');
  });

  it('kanal hali yo\'q bo\'lsa — yaratiladi va qayta o\'qiladi', async () => {
    mockGetChannel.mockResolvedValueOnce(null).mockResolvedValueOnce({ importance: 7 });
    expect(await getAndroidChannelAlert()).toBe('heads_up');
    expect(mockSetChannel).toHaveBeenCalledWith('default', expect.objectContaining({ importance: 7 }));
  });

  it('sozlama: avval aynan kanal, bo\'lmasa ilova bildirishnomalari', async () => {
    const send = jest.spyOn(Linking, 'sendIntent').mockRejectedValueOnce(new Error('no activity')).mockResolvedValueOnce();
    await openChannelSettings('uz.uzgidro.hrm');
    expect(send.mock.calls[0]![0]).toBe('android.settings.CHANNEL_NOTIFICATION_SETTINGS');
    expect(send.mock.calls[0]![1]).toContainEqual({ key: 'android.provider.extra.CHANNEL_ID', value: 'default' });
    expect(send.mock.calls[1]![0]).toBe('android.settings.APP_NOTIFICATION_SETTINGS');
  });
});
