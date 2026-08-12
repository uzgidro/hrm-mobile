// Single source of adaptive layout facts. `resolveBreakpoint` is a PURE function
// (all the branching + all the tests live here); `useBreakpoint` is the thin
// React wrapper over useWindowDimensions so components re-render on rotate/resize.
import { useWindowDimensions } from 'react-native';

// A device is a "tablet" when its SHORTEST side is at least this many dp — the
// orientation-independent way to tell a big screen from a phone in landscape.
export const TABLET_MIN_WIDTH = 600;

export type Breakpoint = {
  width: number;
  height: number;
  isTablet: boolean;
  isLandscape: boolean;
  /** Max width of the centered content column. On phones this equals the full
   *  width (no constraint); on tablets it is capped and never exceeds width. */
  contentMaxWidth: number;
  /** Column count for tile/card grids (modules, employees, …). */
  gridColumns: number;
};

export function resolveBreakpoint(width: number, height: number): Breakpoint {
  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= TABLET_MIN_WIDTH;
  const isLandscape = width > height;

  let maxWidth = width; // phones: no cap
  let gridColumns = 3; // phones (portrait & landscape): 3 tiles

  if (isTablet) {
    if (isLandscape) {
      maxWidth = 760;
      gridColumns = 6;
    } else {
      maxWidth = 720;
      gridColumns = 4;
    }
  }

  // Never exceed the real width (small tablets, split panes, web narrow windows).
  const contentMaxWidth = Math.min(maxWidth, width);

  return { width, height, isTablet, isLandscape, contentMaxWidth, gridColumns };
}

export function useBreakpoint(): Breakpoint {
  const { width, height } = useWindowDimensions();
  return resolveBreakpoint(width, height);
}

// Horizontal screen padding and inter-tile gap for tile/card grids (modules,
// employees, …). Exported so the width math and its tests share one source.
export const GRID_H_PAD = 16;
export const GRID_GAP = 12;

/** Pixel width of one tile in a `columns`-wide grid.
 *
 *  FLOORED on purpose. A fractional width (e.g. 112.333) gets rounded UP by the
 *  native renderer, so `columns*ceil(tile) + (columns-1)*gap` overflows the row
 *  by 1–2px and flex-wrap bumps the last tile onto a new row — the "3 columns
 *  render as 2" bug seen on real phones (Galaxy S25 Ultra). Flooring leaves the
 *  spare 1–2px as harmless right-edge slack and guarantees the row always fits.
 */
export function gridTileWidth(
  contentMaxWidth: number,
  width: number,
  columns: number,
): number {
  const innerWidth = Math.min(contentMaxWidth, width) - GRID_H_PAD * 2;
  return Math.floor((innerWidth - GRID_GAP * (columns - 1)) / columns);
}
