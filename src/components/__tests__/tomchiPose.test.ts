import {
  canBlink,
  caretRatio,
  EYE_LEFT,
  EYE_RIGHT,
  HAND_REST_LEFT,
  HAND_REST_RIGHT,
  lookXToPupilDX,
  moodForLogin,
  tomchiPose,
} from '../mascot/tomchiPose';

// Tomchi maskoti login ekranida foydalanuvchiga "javob beradi": login yozilganda
// ko'zi kursorni kuzatadi, parol yashirin bo'lsa qo'li bilan ko'zini yopadi,
// parol ko'rsatilsa bitta ko'zini ochib mo'ralaydi. Bu testlar shu shartnomani
// qulflaydi (animatsiya komponenti faqat shu qiymatlarga o'tadi).

describe('lookXToPupilDX', () => {
  it('chap chekka → chapga, o\'ng chekka → o\'ngga, o\'rtasi → markaz', () => {
    expect(lookXToPupilDX(0)).toBeCloseTo(-3.5);
    expect(lookXToPupilDX(1)).toBeCloseTo(3.5);
    expect(lookXToPupilDX(0.5)).toBeCloseTo(0);
  });

  it('chegaradan tashqari va noto\'g\'ri qiymatlarni cheklaydi', () => {
    expect(lookXToPupilDX(-2)).toBeCloseTo(-3.5);
    expect(lookXToPupilDX(9)).toBeCloseTo(3.5);
    expect(lookXToPupilDX(Number.NaN)).toBeCloseTo(0);
  });
});

describe('caretRatio', () => {
  it('matn uzaygan sari o\'ngga siljiydi va 1 dan oshmaydi', () => {
    expect(caretRatio('')).toBe(0);
    expect(caretRatio('a'.repeat(14))).toBeCloseTo(0.5);
    expect(caretRatio('a'.repeat(100))).toBe(1);
  });

  it('nolinchi kenglikda markazni qaytaradi', () => {
    expect(caretRatio('abc', 0)).toBe(0.5);
  });
});

describe('tomchiPose', () => {
  it('idle: ko\'zlar ochiq, qo\'llar yon tomonda', () => {
    const p = tomchiPose('idle');
    expect(p.lidLeft).toBe(0);
    expect(p.lidRight).toBe(0);
    expect(p.handLeft).toEqual(HAND_REST_LEFT);
    expect(p.handRight).toEqual(HAND_REST_RIGHT);
  });

  it('watching: qorachiq kursor tomonga va pastga (maydonga) qaraydi', () => {
    const left = tomchiPose('watching', 0);
    const right = tomchiPose('watching', 1);
    expect(left.pupilDX).toBeLessThan(0);
    expect(right.pupilDX).toBeGreaterThan(0);
    expect(left.pupilDY).toBeGreaterThan(0);
  });

  it('shy: ikkala ko\'z yumuq va qo\'llar ko\'zlarni yopadi', () => {
    const p = tomchiPose('shy');
    expect(p.lidLeft).toBe(1);
    expect(p.lidRight).toBe(1);
    expect(p.handLeft.x).toBe(EYE_LEFT.x);
    expect(p.handRight.x).toBe(EYE_RIGHT.x);
  });

  it('peek: chap ko\'z yopiq, o\'ng ko\'z ochiq, o\'ng qo\'l pastga tushgan', () => {
    const p = tomchiPose('peek', 0.3);
    expect(p.lidLeft).toBe(1);
    expect(p.lidRight).toBe(0);
    expect(p.handLeft.x).toBe(EYE_LEFT.x);
    expect(p.handRight.y).toBeGreaterThan(EYE_RIGHT.y + 10);
  });

  it('happy: sakraydi, sad: og\'iz pastga egilgan', () => {
    expect(tomchiPose('happy').bodyY).toBeLessThan(0);
    const [, y1, , cy] = tomchiPose('sad').mouth;
    expect(cy).toBeLessThan(y1); // boshqaruv nuqtasi yuqorida → qovog'i solingan
    const [, sy1, , scy] = tomchiPose('idle').mouth;
    expect(scy).toBeGreaterThan(sy1); // jilmayish
  });
});

describe('loading', () => {
  it("ko'zlar ochiq, qo'llar joyida — harakat komponentdagi siklda", () => {
    const p = tomchiPose('loading');
    expect(p.lidLeft).toBe(0);
    expect(p.lidRight).toBe(0);
    expect(p.handLeft).toEqual(HAND_REST_LEFT);
    expect(p.bodyY).toBe(0);
  });
});

describe('canBlink', () => {
  it('ko\'z yopiq holatlarda pirpiratmaydi', () => {
    expect(canBlink('idle')).toBe(true);
    expect(canBlink('watching')).toBe(true);
    expect(canBlink('shy')).toBe(false);
    expect(canBlink('peek')).toBe(false);
    expect(canBlink('happy')).toBe(false);
    expect(canBlink('loading')).toBe(true);
  });
});

describe('moodForLogin', () => {
  it('fokus va parol ko\'rinishiga qarab kayfiyatni tanlaydi', () => {
    expect(moodForLogin({ focused: null, passwordVisible: false })).toBe('idle');
    expect(moodForLogin({ focused: 'username', passwordVisible: false })).toBe('watching');
    expect(moodForLogin({ focused: 'password', passwordVisible: false })).toBe('shy');
    expect(moodForLogin({ focused: 'password', passwordVisible: true })).toBe('peek');
  });

  it('natija fokusdan ustun turadi', () => {
    expect(moodForLogin({ focused: 'password', passwordVisible: false, result: 'error' })).toBe('sad');
    expect(moodForLogin({ focused: null, passwordVisible: false, result: 'success' })).toBe('happy');
  });
});
