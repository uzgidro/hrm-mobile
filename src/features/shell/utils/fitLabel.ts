// Yozuv o'lchami — eng uzun SO'Z kenglikka sig'adigan qilib. Ruscha yorliqlar
// («Посещаемость», «Интерактивные», «Техподдержка») bitta so'zning o'zi tab /
// plitka kengligidan uzun: numberOfLines bilan ular «Посещаемо…» bo'lib kesilardi
// yoki so'z o'rtasidan bo'linardi («Интерактивн|ые»). Matn (v2 so'zlari) o'zgarmaydi —
// faqat shrift kichrayadi. Hisob taxminiy (o'rtacha harf kengligi `em` × o'lcham),
// shuning uchun web'da ham ishlaydi (RN-web'da `adjustsFontSizeToFit` yo'q).

/** Eng uzun so'zdagi belgilar soni (bo'sh joy / chiziqcha bo'yicha). */
export function longestWord(label: string): number {
  return label.split(/[\s -]+/).reduce((m, w) => Math.max(m, [...w].length), 0);
}

/**
 * `width` (px) ga eng uzun so'z sig'adigan shrift o'lchami: `base` dan katta emas,
 * `min` dan kichik emas, 0.5 px qadam bilan. Kenglik hali o'lchanmagan (0) — `base`.
 */
export function fitLabelFontSize(
  label: string,
  width: number,
  { base, min, em = 0.7 }: { base: number; min: number; em?: number },
): number {
  const chars = longestWord(label);
  if (width <= 0 || chars === 0) return base;
  const fit = Math.floor((width / (chars * em)) * 2) / 2;
  return Math.max(min, Math.min(base, fit));
}
