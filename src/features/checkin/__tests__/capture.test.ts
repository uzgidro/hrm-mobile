import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import {
  CaptureError,
  distanceMeters,
  formatDistance,
  getCheckinLocation,
  nearestDestination,
  resizeAction,
  takeCheckinPhoto,
} from '../lib/capture';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  CameraType: { front: 'front', back: 'back' },
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const manip = ImageManipulator as jest.Mocked<typeof ImageManipulator>;
const loc = Location as jest.Mocked<typeof Location>;

const pos = (extra: Record<string, unknown> = {}) =>
  ({ coords: { latitude: 41.31, longitude: 69.28, accuracy: 12.4 }, timestamp: 0, ...extra }) as never;

describe('takeCheckinPhoto — faqat kamera', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ruxsat yo\'q — camera_denied, kamera ochilmaydi', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);
    await expect(takeCheckinPhoto()).rejects.toMatchObject({ code: 'camera_denied' });
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('kamera (old) ochiladi, galereya HECH QACHON; 1280px gacha kichraytirib JPEG base64', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', width: 3000, height: 4000 }],
    } as never);
    manip.manipulateAsync.mockResolvedValue({ uri: 'file:///b.jpg', width: 960, height: 1280, base64: 'QUJD' });
    const p = await takeCheckinPhoto();
    expect(picker.launchCameraAsync).toHaveBeenCalledWith(expect.objectContaining({ cameraType: 'front', allowsEditing: false }));
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(manip.manipulateAsync).toHaveBeenCalledWith('file:///a.jpg', [{ resize: { height: 1280 } }], expect.objectContaining({ base64: true, format: 'jpeg' }));
    expect(p?.base64).toBe('data:image/jpeg;base64,QUJD');
  });

  it('bekor qilinsa — null', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null } as never);
    await expect(takeCheckinPhoto()).resolves.toBeNull();
  });
});

describe('getCheckinLocation — avtomatik', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ruxsat yo\'q — location_denied', async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false } as never);
    await expect(getCheckinLocation()).rejects.toBeInstanceOf(CaptureError);
  });

  it('aniq joylashuv, aniqlik yaxlitlanadi', async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true } as never);
    loc.getCurrentPositionAsync.mockResolvedValue(pos());
    await expect(getCheckinLocation()).resolves.toEqual({ latitude: 41.31, longitude: 69.28, accuracy_m: 12, fromCache: false });
  });

  it('soxta GPS (mocked) — location_mocked, oxirgi nuqtaga ham tushmaydi', async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true } as never);
    loc.getCurrentPositionAsync.mockResolvedValue(pos({ mocked: true }));
    await expect(getCheckinLocation()).rejects.toMatchObject({ code: 'location_mocked' });
    expect(loc.getLastKnownPositionAsync).not.toHaveBeenCalled();
  });

  it('GPS javob bermasa — oxirgi ma\'lum nuqta (fromCache)', async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true } as never);
    loc.getCurrentPositionAsync.mockRejectedValue(new Error('no fix'));
    loc.getLastKnownPositionAsync.mockResolvedValue(pos());
    await expect(getCheckinLocation()).resolves.toMatchObject({ fromCache: true });
  });

  it('hech narsa yo\'q — location_unavailable', async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true } as never);
    loc.getCurrentPositionAsync.mockRejectedValue(new Error('no fix'));
    loc.getLastKnownPositionAsync.mockResolvedValue(null);
    await expect(getCheckinLocation()).rejects.toMatchObject({ code: 'location_unavailable' });
  });
});

describe('masofa yordamchilari', () => {
  it('resizeAction — kichik rasmga tegmaydi, kattasini uzun tomoni bo\'yicha', () => {
    expect(resizeAction(800, 600)).toEqual([]);
    expect(resizeAction(4000, 3000)).toEqual([{ resize: { width: 1280 } }]);
  });
  it('haversine ~ Toshkent ichida 1 km', () => {
    const m = distanceMeters({ latitude: 41.3, longitude: 69.28 }, { latitude: 41.309, longitude: 69.28 });
    expect(Math.round(m)).toBeGreaterThan(990);
    expect(Math.round(m)).toBeLessThan(1010);
  });
  it('eng yaqin manzil — koordinatasizlar e\'tiborsiz', () => {
    const here = { latitude: 41.3, longitude: 69.28 };
    const r = nearestDestination(here, [
      { id: 1, latitude: null, longitude: null },
      { id: 2, latitude: 41.4, longitude: 69.28 },
      { id: 3, latitude: 41.301, longitude: 69.28 },
    ]);
    expect(r?.point.id).toBe(3);
    expect(nearestDestination(here, [{ id: 1, latitude: null, longitude: null }])).toBeNull();
  });
  it('formatDistance', () => {
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(850.4)).toBe('850 m');
    expect(formatDistance(12400)).toBe('12 km');
    expect(formatDistance(1500)).toBe('1,5 km');
  });
});
