// Dizayn «I · Tomchi» aksent tonlari: ikonka qutilari va plitkalar uchun.
// Har birining `fill` (yuz) va `lip` (pastki 3D «lab») rangi bor. Ikkala
// mavzuda bir xil — to'q fonda ham, oqda ham yetarli kontrast beradi.
export type Tone = { fill: string; lip: string };

export const TONES: readonly Tone[] = [
  { fill: '#1CB0F6', lip: '#1899D6' }, // tomchi ko'k
  { fill: '#2BC155', lip: '#1FA548' }, // yashil
  { fill: '#FF9600', lip: '#E08500' }, // to'q sariq
  { fill: '#CE82FF', lip: '#A568CC' }, // binafsha
  { fill: '#FF4B4B', lip: '#D93A3A' }, // qizil
  { fill: '#FFC800', lip: '#E5A800' }, // sariq (shlem)
];

/** Tone for the n-th tile of a section; `shift` staggers sections so neighbours differ. */
export function toneAt(n: number, shift = 0): Tone {
  const len = TONES.length;
  return TONES[(((n + shift) % len) + len) % len];
}
