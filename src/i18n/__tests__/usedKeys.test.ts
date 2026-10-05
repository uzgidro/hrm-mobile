// Koddagi har bir LITERAL `t('bo'lim.kalit')` katalogda bo'lishi shart — aks holda
// foydalanuvchi xom kalitni ko'radi (QA: safar xatida «common.yes»). Katalog
// tengligini (4 til) catalogs.test.ts tekshiradi; bu yerda — uz-Latn manbasi.
import fs from 'fs';
import path from 'path';
import i18n from '@/i18n';

const ROOT = path.resolve(__dirname, '../../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      if (!/^(node_modules|__tests__|__smoke__|locales)$/.test(name)) walk(p, out);
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const PLURAL = ['_one', '_other', '_few', '_many'];

it('koddagi literal t() kalitlarining hammasi uz-Latn katalogida bor', () => {
  const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'app'))];
  const missing: string[] = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*['"`]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]+)['"`]/g)) {
      const key = m[1];
      const found =
        i18n.getResource('uz-Latn', 'translation', key) !== undefined ||
        PLURAL.some((s) => i18n.getResource('uz-Latn', 'translation', key + s) !== undefined);
      if (!found) missing.push(`${key}  (${path.relative(ROOT, file)})`);
    }
  }
  expect(missing).toEqual([]);
});
