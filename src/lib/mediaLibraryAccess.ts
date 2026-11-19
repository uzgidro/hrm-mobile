import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Galereyadan tanlashdan oldin ruxsat.
 *
 * Android: `launchImageLibraryAsync` tizim Photo Picker'ini ochadi — u HECH
 * QANDAY ruxsat talab qilmaydi. `requestMediaLibraryPermissionsAsync` esa
 * Android ≤ 12 da `READ_EXTERNAL_STORAGE` ni so'raydi, bu ruxsat 2.0.3 dan
 * manifestdan olib tashlangan (ortiqcha ruxsat — xavfsizlik auditi 2026-10-09)
 * va so'rov doim «rad» qaytarardi. Shuning uchun Android'da so'ramaymiz.
 */
export async function ensureMediaLibraryAccess(): Promise<boolean> {
  if (Platform.OS === 'android') return true;
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return perm.granted;
}
