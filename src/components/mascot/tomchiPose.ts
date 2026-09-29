// Tomchi maskotining holatlari (sof funksiya). Animatsiya komponenti
// (Tomchi.tsx) shu yerdan maqsad qiymatlarni oladi va ularga silliq o'tadi.
// Koordinatalar `assets/mascot/tomchi.svg` dagi viewBox (0 0 120 130) birligida.

export type TomchiMood =
  | 'idle' // kutish: jilmayadi, vaqti-vaqti bilan ko'zini pirpiratadi
  | 'watching' // login maydoni: ko'zi matn kursorini kuzatadi
  | 'shy' // parol yashirin holatda kiritilmoqda: qo'li bilan ko'zini yopadi
  | 'peek' // parol ko'rsatilgan: bitta ko'zini ochib mo'ralaydi
  | 'happy' // muvaffaqiyatli kirish
  | 'sad' // xato (noto'g'ri parol va h.k.)
  | 'loading'; // yuklanmoqda: suvda tebranadi, atrofga qaraydi (Tomchi.tsx dagi sikl)

export type Point = { x: number; y: number };

/** Kvadratik egri chiziq: M x1 y1 Q cx cy x2 y2 */
export type MouthCurve = readonly [number, number, number, number, number, number];

export type TomchiPose = {
  /** Qorachiqning markazdan siljishi */
  pupilDX: number;
  pupilDY: number;
  /** Qovoq: 0 = ochiq, 1 = to'liq yumilgan */
  lidLeft: number;
  lidRight: number;
  handLeft: Point;
  handRight: Point;
  mouth: MouthCurve;
  /** Tananing vertikal siljishi (manfiy = yuqoriga sakrash) */
  bodyY: number;
};

export const EYE_LEFT: Point = { x: 48, y: 76 };
export const EYE_RIGHT: Point = { x: 72, y: 76 };
export const HAND_REST_LEFT: Point = { x: 32, y: 102 };
export const HAND_REST_RIGHT: Point = { x: 88, y: 102 };

const PUPIL_MAX_DX = 3.5;
const PUPIL_DOWN = 2.5;

const MOUTH_SMILE: MouthCurve = [53, 91, 60, 98, 67, 91];
const MOUTH_SOFT: MouthCurve = [54, 92, 60, 96, 66, 92];
const MOUTH_FLAT: MouthCurve = [55, 93, 60, 95, 65, 93];
const MOUTH_GRIN: MouthCurve = [51, 90, 60, 101, 69, 90];
const MOUTH_FROWN: MouthCurve = [53, 95, 60, 89, 67, 95];

/** Kursorning maydondagi nisbiy o'rni (0 = chap chekka, 1 = o'ng) → qorachiq siljishi. */
export function lookXToPupilDX(lookX: number): number {
  const t = Number.isFinite(lookX) ? Math.min(1, Math.max(0, lookX)) : 0.5;
  return -PUPIL_MAX_DX + t * 2 * PUPIL_MAX_DX;
}

/**
 * Matn uzunligidan kursor nisbatini taxminlaydi: maydonga taxminan
 * `visibleChars` belgi sig'adi, undan keyin ko'z o'ng chekkada qoladi.
 */
export function caretRatio(text: string, visibleChars = 28): number {
  if (visibleChars <= 0) return 0.5;
  return Math.min(1, text.length / visibleChars);
}

const coverLeft: Point = { x: EYE_LEFT.x, y: EYE_LEFT.y + 2 };
const coverRight: Point = { x: EYE_RIGHT.x, y: EYE_RIGHT.y + 2 };

export function tomchiPose(mood: TomchiMood, lookX = 0.5): TomchiPose {
  switch (mood) {
    case 'watching':
      return {
        pupilDX: lookXToPupilDX(lookX),
        pupilDY: PUPIL_DOWN,
        lidLeft: 0.15,
        lidRight: 0.15,
        handLeft: HAND_REST_LEFT,
        handRight: HAND_REST_RIGHT,
        mouth: MOUTH_SOFT,
        bodyY: 0,
      };
    case 'shy':
      return {
        pupilDX: 0,
        pupilDY: 0,
        lidLeft: 1,
        lidRight: 1,
        handLeft: coverLeft,
        handRight: coverRight,
        mouth: MOUTH_FLAT,
        bodyY: 0,
      };
    case 'peek':
      return {
        pupilDX: lookXToPupilDX(lookX),
        pupilDY: PUPIL_DOWN + 0.5,
        lidLeft: 1,
        lidRight: 0,
        handLeft: coverLeft,
        // o'ng qo'l pastga tushib, ko'zni ochib qo'yadi
        handRight: { x: EYE_RIGHT.x + 10, y: EYE_RIGHT.y + 18 },
        mouth: MOUTH_SOFT,
        bodyY: 0,
      };
    case 'happy':
      return {
        pupilDX: 0,
        pupilDY: -1,
        lidLeft: 0,
        lidRight: 0,
        handLeft: { x: 18, y: 72 },
        handRight: { x: 102, y: 72 },
        mouth: MOUTH_GRIN,
        bodyY: -6,
      };
    case 'sad':
      return {
        pupilDX: 0,
        pupilDY: PUPIL_DOWN + 0.5,
        lidLeft: 0.35,
        lidRight: 0.35,
        handLeft: HAND_REST_LEFT,
        handRight: HAND_REST_RIGHT,
        mouth: MOUTH_FROWN,
        bodyY: 0,
      };
    case 'loading':
      // Bazaviy poza; tebranish, atrofga qarash va suv halqasi komponentda sikl bo'lib aylanadi.
      return {
        pupilDX: 0,
        pupilDY: 0.5,
        lidLeft: 0,
        lidRight: 0,
        handLeft: HAND_REST_LEFT,
        handRight: HAND_REST_RIGHT,
        mouth: MOUTH_SOFT,
        bodyY: 0,
      };
    case 'idle':
    default:
      return {
        pupilDX: 0,
        pupilDY: 0,
        lidLeft: 0,
        lidRight: 0,
        handLeft: HAND_REST_LEFT,
        handRight: HAND_REST_RIGHT,
        mouth: MOUTH_SMILE,
        bodyY: 0,
      };
  }
}

/** Yuklash siklining bitta aylanishi (ms): tebranish va atrofga qarash shu ritmda. */
export const LOADING_CYCLE_MS = 2400;

/** Ko'z ochiq bo'lgan holatlardagina pirpiratish mantiqli. */
export function canBlink(mood: TomchiMood): boolean {
  return mood === 'idle' || mood === 'watching' || mood === 'sad' || mood === 'loading';
}

/**
 * Login formasi holatidan maskot kayfiyatini chiqaradi.
 * Parol maydoni fokusda: yashirin → 'shy', ko'rsatilgan → 'peek'.
 */
export function moodForLogin(state: {
  focused: 'username' | 'password' | null;
  passwordVisible: boolean;
  result?: 'success' | 'error' | null;
}): TomchiMood {
  if (state.result === 'success') return 'happy';
  if (state.result === 'error') return 'sad';
  if (state.focused === 'password') return state.passwordVisible ? 'peek' : 'shy';
  if (state.focused === 'username') return 'watching';
  return 'idle';
}
