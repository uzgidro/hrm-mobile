// Fixed words of the route sheet that goes to the guest. The paper is in the guest's language, not in the
// registrar's, so these columns live beside the dictionaries (same as web v2 `i18n/routeSheet.ts`).
export type SheetLang = 'uz' | 'ru' | 'en';
export const SHEET_LANGS: SheetLang[] = ['uz', 'ru', 'en'];
export const sheetLang = (l?: string | null): SheetLang => (l === 'ru' || l === 'en' ? l : 'uz');

export const SHEET_TEXT: Record<SheetLang, {
  org: string; title: string; with: string; nights: (n: number) => string; outBy: (time: string) => string; id: string; password: string; cabinet: string;
}> = {
  uz: { org: 'Energetiklar sihatgohi', title: "Yo'l varaqasi", with: 'Birga', nights: (n) => `${n} kecha`, outBy: (t) => `xonani ${t} gacha bo'shatish`, id: 'ID raqami', password: 'Parol', cabinet: 'Shaxsiy kabinet' },
  ru: { org: 'Санаторий энергетиков', title: 'Маршрутный лист', with: 'Вместе', nights: (n) => `${n} ноч.`, outBy: (t) => `освободить номер до ${t}`, id: 'ID', password: 'Пароль', cabinet: 'Личный кабинет' },
  en: { org: 'Energetics Sanatorium', title: 'Route sheet', with: 'Together with', nights: (n) => `${n} ${n === 1 ? 'night' : 'nights'}`, outBy: (t) => `leave the room by ${t}`, id: 'ID', password: 'Password', cabinet: 'Guest cabinet' },
};
