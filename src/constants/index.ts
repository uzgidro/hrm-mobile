import { darkColors } from '../theme/palettes';
import { Env } from '../config/env';

export const API_BASE_URL = Env.apiUrl;

// Backward-compatible static palette (dark). Screens that have not yet been
// migrated to the theme system keep importing COLORS from here. New / redesigned
// screens should use `useTheme()` from src/theme/ThemeProvider instead.
export const COLORS = darkColors;

export { darkColors, lightColors } from '../theme/palettes';
export type { ThemeColors } from '../theme/palettes';
