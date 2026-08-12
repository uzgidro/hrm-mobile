import {
  resolveBreakpoint,
  TABLET_MIN_WIDTH,
  gridTileWidth,
  GRID_H_PAD,
  GRID_GAP,
} from '../responsive';

describe('resolveBreakpoint', () => {
  it('treats a phone portrait as non-tablet portrait', () => {
    const b = resolveBreakpoint(390, 844);
    expect(b.isTablet).toBe(false);
    expect(b.isLandscape).toBe(false);
    // phone content column is unconstrained (full width)
    expect(b.contentMaxWidth).toBe(390);
    expect(b.gridColumns).toBe(3);
  });

  it('treats a phone landscape as non-tablet (shortest side < 600) landscape', () => {
    const b = resolveBreakpoint(844, 390);
    expect(b.isTablet).toBe(false);
    expect(b.isLandscape).toBe(true);
    expect(b.gridColumns).toBe(3);
  });

  it('detects a tablet by its shortest side >= 600 regardless of orientation', () => {
    expect(resolveBreakpoint(768, 1024).isTablet).toBe(true); // portrait
    expect(resolveBreakpoint(1024, 768).isTablet).toBe(true); // landscape
  });

  it('caps content width and grows grid columns on tablet portrait', () => {
    const b = resolveBreakpoint(768, 1024);
    expect(b.isLandscape).toBe(false);
    expect(b.contentMaxWidth).toBe(720);
    expect(b.gridColumns).toBe(4);
  });

  it('uses a wider content cap and 6 grid columns on tablet landscape', () => {
    const b = resolveBreakpoint(1024, 768);
    expect(b.isLandscape).toBe(true);
    expect(b.contentMaxWidth).toBe(760);
    expect(b.gridColumns).toBe(6);
  });

  it('never lets contentMaxWidth exceed the actual width', () => {
    // a small tablet in portrait narrower than the cap keeps full width
    const b = resolveBreakpoint(610, 900);
    expect(b.contentMaxWidth).toBe(610);
  });

  it('exposes the tablet threshold', () => {
    expect(TABLET_MIN_WIDTH).toBe(600);
  });
});

describe('gridTileWidth', () => {
  // The bug: a fractional tile width (e.g. 112.333) is rounded UP by the native
  // renderer, so `cols*ceil(tile) + (cols-1)*gap` overflows the container by
  // 1–2px and flex-wrap bumps the 3rd tile onto its own row → "2 per row" on
  // real phones (reported on Galaxy S25 Ultra). Flooring guarantees the row fits.
  const fits = (width: number, columns: number) => {
    const inner = Math.min(width, width) - GRID_H_PAD * 2;
    const tile = gridTileWidth(width, width, columns);
    // Even after the renderer rounds each tile UP, the row must not exceed inner.
    return Math.ceil(tile) * columns + GRID_GAP * (columns - 1) <= inner;
  };

  it('returns an integer width (no fractional pixels to round up)', () => {
    for (const w of [360, 375, 390, 393, 412, 414, 428, 432, 480]) {
      expect(Number.isInteger(gridTileWidth(w, w, 3))).toBe(true);
    }
  });

  it('fits 3 tiles + 2 gaps within the content row on every common phone width', () => {
    for (const w of [360, 375, 390, 393, 412, 414, 428, 432, 480]) {
      expect(fits(w, 3)).toBe(true);
    }
  });

  it('fits the tablet column counts too (4 portrait, 6 landscape)', () => {
    expect(fits(720, 4)).toBe(true);
    expect(fits(760, 6)).toBe(true);
  });

  it('caps the row to contentMaxWidth, not the raw width (tablet centered column)', () => {
    // width 900 but content capped at 720 → tiles sized off 720, not 900.
    const tile = gridTileWidth(720, 900, 4);
    const inner = 720 - GRID_H_PAD * 2;
    expect(Math.ceil(tile) * 4 + GRID_GAP * 3).toBeLessThanOrEqual(inner);
  });

  it('exposes the grid padding/gap constants used by the modules screen', () => {
    expect(GRID_H_PAD).toBe(16);
    expect(GRID_GAP).toBe(12);
  });
});
