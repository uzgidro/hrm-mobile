// Hujjat blanki (web v2 `features/tabel/BranchBlankModal` + `useBranchBlank`) — sof mantiq: har hujjat
// turining (bildirgi, ariza, buyruq) blanki, standart bloklar (tegilmagan = yoqilgan), PATCH tanasi.
//
// Bo'sh qoldirilgan har maydon «avvalgidek» degani: server faqat to'ldirilganini almashtiradi, shuning uchun
// draft v2 kabi saqlangan obyektdan boshlanadi va foydalanuvchi tegmagan kalit yuborilmaydi.

/** Qaysi hujjatning blanki. `decree` — buyruq. Kodlar tarjima qilinmaydi. */
export const BLANK_DOC_TYPES = ['explanatory', 'application', 'decree'] as const;
export type BlankDocType = (typeof BLANK_DOC_TYPES)[number];

export interface BlankBlocks {
  number_date?: boolean;
  addressee?: boolean;
  sign_qr?: boolean;
  sign_position?: boolean;
  city?: boolean;
  city_text?: string;
  signature_section?: boolean;
}
export type BlockKey = Exclude<keyof BlankBlocks, 'city_text'>;

export type Margins = { top?: number; bottom?: number; left?: number; right?: number };
export const MARGIN_SIDES = ['top', 'bottom', 'left', 'right'] as const;

export interface BranchBlank {
  /** Yuklangan tayyor .docx — u turganda quyidagi forma qo'llanmaydi. O'z endpointlari bilan boshqariladi. */
  file?: { bucket?: string; name?: string; original?: string | null } | null;
  logo?: boolean;
  logo_width_cm?: number;
  logo_align?: 'left' | 'center' | 'right';
  header_lines?: string[];
  title?: string;
  footer?: string;
  margins?: Margins;
  blocks?: BlankBlocks;
}

/** Sarlavha bo'sh bo'lsa generator chiqaradigan nom — hujjat matni, tarjima qilinmaydi (v2). */
export const DEFAULT_BLANK_TITLE: Record<BlankDocType, string> = {
  explanatory: 'Bildirgi',
  application: 'Ariza',
  decree: 'BUYRUG‘I',
};

/** Sarlavha qatorlari chegarasi (server `header_lines` validatori). */
export const MAX_HEADER_LINES = 8;

/** Saqlangan blank (bo'lmasa — bo'sh obyekt). */
export function seedBlank(
  templates: Record<string, BranchBlank | undefined> | null | undefined,
  doc: BlankDocType,
): BranchBlank {
  return { ...(templates?.[doc] ?? {}) };
}

/** Yuklangan .docx (bo'lmasa null) — v2 `uploaded`. */
export const uploadedFile = (saved: BranchBlank) => (saved.file?.name ? saved.file : null);

/** `undefined` — tegilmagan, server uni «yoqilgan» deb o'qiydi. */
export const blockOn = (draft: BranchBlank, k: BlockKey) => (draft.blocks ?? {})[k] !== false;

export function toggleBlock(draft: BranchBlank, k: BlockKey): BranchBlank {
  return { ...draft, blocks: { ...(draft.blocks ?? {}), [k]: !blockOn(draft, k) } };
}

/** Hujjat turiga qarab ko'rinadigan bloklar (v2 tartibida). */
export function blocksFor(doc: BlankDocType): BlockKey[] {
  if (doc === 'decree') return ['city', 'signature_section', 'sign_qr'];
  return [...(doc === 'explanatory' ? (['number_date'] as BlockKey[]) : []), 'addressee', 'sign_position', 'sign_qr'];
}

/** v2 `num`: vergul ham qabul qilinadi; bo'sh yoki son emas — undefined (maydon yuborilmaydi). */
export function parseDecimal(v: string): number | undefined {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

/**
 * Server chegaralari (`DocumentTemplate`: logo eni 0.5–8 sm, chekkalar 0–10 sm) — so'rovdan oldin, aks holda
 * server 422 qaytaradi. Xato i18n kaliti yoki null.
 */
export function validateBlank(draft: BranchBlank): string | null {
  const w = draft.logo_width_cm;
  if (w != null && (w < 0.5 || w > 8)) return 'tabelSettings.logoWidthRange';
  for (const side of MARGIN_SIDES) {
    const m = draft.margins?.[side];
    if (m != null && (m < 0 || m > 10)) return 'tabelSettings.marginRange';
  }
  return null;
}

/**
 * v2 `submit`: bo'sh qatorlar tashlanadi (server ham tashlaydi), `file` yuborilmaydi — eski nusxa yangi
 * yuklanganini bosib ketmasin. Faqat SHU hujjat turi yuboriladi: server qolganlarini tegmasdan qoldiradi.
 */
export function buildBlankBody(doc: BlankDocType, draft: BranchBlank) {
  const rest: BranchBlank = { ...draft };
  delete rest.file;
  return {
    document_templates: {
      [doc]: { ...rest, header_lines: (draft.header_lines ?? []).map((l) => l.trim()).filter(Boolean) },
    },
  };
}
