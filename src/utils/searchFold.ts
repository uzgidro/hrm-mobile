// Mijoz tomonidagi qidiruv uchun matnni «yig'ish»: kichik harf, o'zbek kirill → lotin,
// apostrof turlari (ʻ ’ ‘ ` ') bir xil, ortiqcha bo'shliqlar bitta. «Ғофуров», «G'ofurov»,
// «Gʻofurov» va «gofurov» bir-biriga mos keladi (backend core/search bilan bir g'oya).

const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'x', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

export function foldText(s: string | null | undefined): string {
  if (!s) return '';
  let out = '';
  for (const ch of s.toLowerCase()) out += CYR[ch] ?? ch;
  return out
    .replace(/[ʻʼ’‘`´']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Har bir so'z (bo'shliq bilan ajratilgan) matnlardan birortasida uchrasa — mos. */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = foldText(query);
  if (!q) return true;
  const hay = fields.map(foldText).join(' ');
  return q.split(' ').every((w) => hay.includes(w));
}
