// Saves a downloaded binary (an .xlsx export) where the user can find it.
//
// No new native module is needed (an OTA must not add one): `expo-file-system` is already in the
// binary (form drafts use it). On Android/iOS the user picks a folder through the system folder
// picker and the file is created there; on web it is a normal browser download.
import { Platform } from 'react-native';
import type { AxiosRequestConfig } from 'axios';
import { apiClient } from '@/api/client';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type SaveResult = 'saved' | 'cancelled';

/** Writes `data` to a user-chosen folder (native) or triggers a download (web). */
export async function saveBinaryFile(data: ArrayBuffer, filename: string, mime: string = XLSX_MIME): Promise<SaveResult> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return 'saved';
  }
  const fs = await import('expo-file-system');
  let dir: InstanceType<typeof fs.Directory>;
  try {
    dir = await fs.Directory.pickDirectoryAsync();
  } catch {
    return 'cancelled';
  }
  dir.createFile(filename, mime).write(new Uint8Array(data));
  return 'saved';
}

/** Fetches a binary from the API (authenticated) and saves it. */
export async function downloadAndSave(
  req: Pick<AxiosRequestConfig, 'url' | 'method' | 'params' | 'data'>,
  filename: string,
  mime: string = XLSX_MIME,
): Promise<SaveResult> {
  const res = await apiClient.request<ArrayBuffer>({ ...req, responseType: 'arraybuffer', timeout: 120_000 });
  return saveBinaryFile(res.data, filename, mime);
}
