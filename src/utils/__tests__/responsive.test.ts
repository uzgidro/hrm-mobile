import { resolveBreakpoint, TABLET_MIN_WIDTH } from '../responsive';

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
