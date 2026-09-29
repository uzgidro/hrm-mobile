import { lightColors, darkColors } from '../palettes';
import { radii, moduleTint } from '../tokens';

// Qiymatlar web v2 src/styles/theme.css dan (2026-09-29) — paritet.
describe('palettes — v2 paritet', () => {
  it('light asosiy tokenlar', () => {
    expect(lightColors.bg).toBe('#F2F3FA');
    expect(lightColors.surface).toBe('#FFFFFF');
    expect(lightColors.surface2).toBe('#F3F3F5');
    expect(lightColors.border).toBe('#E7E8EA');
    expect(lightColors.fg).toBe('#23244A');
    expect(lightColors.fgMuted).toBe('#4A4C6E');
    expect(lightColors.fgSubtle).toBe('#5D5F84');
    expect(lightColors.brand).toBe('#7958FF');
    expect(lightColors.brandStrong).toBe('#6247D9');
    expect(lightColors.brandSoft).toBe('#F2EFFF');
    expect(lightColors.brandDeep).toBe('#523ABA');
    expect(lightColors.success).toBe('#117243');
    expect(lightColors.danger).toBe('#BB2929');
    expect(lightColors.chart1).toBe('#18A15E');
  });

  it('dark asosiy tokenlar', () => {
    expect(darkColors.bg).toBe('#131430');
    expect(darkColors.surface).toBe('#1B1D3E');
    expect(darkColors.fg).toBe('#EAEAF4');
    expect(darkColors.fgSubtle).toBe('#9193B7');
    expect(darkColors.brand).toBe('#7959FC');
    expect(darkColors.brandStrong).toBe('#A99BFF');
  });

  it("Tomchi qo'shimchalari", () => {
    expect(lightColors.drop).toBe('#1CB0F6');
    expect(darkColors.drop).toBe('#49C0F8');
    expect(lightColors.logo).toBe('#0283DE');
    expect(lightColors.brandLip).toBe(lightColors.brandDeep);
  });

  it('eski kalitlar yangi tokenlarga alias', () => {
    for (const c of [lightColors, darkColors]) {
      expect(c.primary).toBe(c.brand);
      expect(c.card).toBe(c.surface);
      expect(c.text).toBe(c.fg);
      expect(c.textSecondary).toBe(c.fgMuted);
      expect(c.textMuted).toBe(c.fgSubtle);
      expect(c.cardBorder).toBe(c.border);
      expect(c.error).toBe(c.danger);
    }
  });

  it('ikki palitra bir xil kalitlarga ega', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('radii va moduleTint', () => {
    expect(radii).toMatchObject({ xs: 10, sm: 12, md: 14, lg: 18, xl: 22, pill: 999 });
    const t = moduleTint(lightColors, 'violet');
    expect(t.fg).toBe(lightColors.brand);
    expect(typeof t.wash).toBe('string');
  });

  it('moduleTint wash qorong\'i rejimda kuchliroq alfa', () => {
    expect(moduleTint(lightColors, 'green').wash.endsWith('1A')).toBe(true);
    expect(moduleTint(darkColors, 'green').wash.endsWith('29')).toBe(true);
  });
});
