// Fayl qismini FormData'ga qo'shish — bitta joyda, platformaga qarab.
//
// React Native'da `fd.append(field, { uri, name, type })` — RN'ning o'z
// FormData'si shu obyektni fayl sifatida o'qiydi. Brauzerda esa bu obyekt
// `String()` bo'ladi va server "[object Object]" matnini oladi (FastAPI 422:
// «Expected UploadFile, received: <class 'str'>») — vebda hech qanday yuklash
// ishlamas edi. Vebda haqiqiy Blob/File kerak: tanlagich bergan `file` bo'lsa
// shuni, bo'lmasa `uri` (blob:/data: URL) ni fetch qilib Blob olamiz.
import { Platform } from 'react-native';

export type UploadFile = {
  uri: string;
  name: string;
  mimeType?: string;
  /** Vebda tanlagich (`asset.file`) bergan asl File — bo'lsa fetch shart emas. */
  file?: Blob | null;
};

const FALLBACK_TYPE = 'application/octet-stream';

async function toWebBlob(file: UploadFile): Promise<Blob> {
  const blob: Blob = file.file ? file.file : await (await fetch(file.uri)).blob();
  // blob:/data: URL'dan kelgan Blob turi bo'sh bo'lishi mumkin — server
  // `content_type` ga qaraydi, shuning uchun ma'lum turini qo'yib beramiz.
  if (!blob.type && file.mimeType) return blob.slice(0, blob.size, file.mimeType);
  return blob;
}

export async function appendFile(fd: FormData, field: string, file: UploadFile): Promise<void> {
  if (Platform.OS === 'web') {
    fd.append(field, await toWebBlob(file), file.name);
    return;
  }
  fd.append(field, {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || FALLBACK_TYPE,
  } as unknown as Blob);
}

/** Bir nechta fayl — har biri o'sha maydon nomi bilan, tartib saqlanadi. */
export async function appendFiles(fd: FormData, field: string, files: UploadFile[]): Promise<void> {
  for (const f of files) await appendFile(fd, field, f);
}
