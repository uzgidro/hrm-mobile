import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../api/storage';
import * as Font from 'expo-font';
import { ThemeColors, darkColors, lightColors } from './palettes';
import { FONT_ASSETS, fontsAreReady, markFontsReady } from './typography';

export type ThemeMode = 'system' | 'light' | 'dark';
type ResolvedScheme = 'light' | 'dark';

const MODE_KEY = 'theme_mode';

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: ResolvedScheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  /** Nunito loaded — `ff()` now returns the real family (styles rebuild on flip). */
  fontsReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [fontsReady, setFontsReady] = useState(fontsAreReady());

  // Nunito (dizayn I). Best-effort: yuklanmasa ilova tizim shriftida ishlayveradi.
  useEffect(() => {
    if (fontsReady) return;
    let alive = true;
    Font.loadAsync(FONT_ASSETS)
      .then(() => {
        markFontsReady();
        if (alive) setFontsReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [fontsReady]);

  // Load persisted preference once on mount.
  useEffect(() => {
    (async () => {
      try {
        const saved = await storage.getItem(MODE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch {}
    })();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    storage.setItem(MODE_KEY, next).catch(() => {});
  }, []);

  const scheme: ResolvedScheme =
    mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;

  const value = useMemo<ThemeContextValue>(() => {
    const colors = scheme === 'light' ? lightColors : darkColors;
    return { colors, scheme, mode, setMode, isDark: scheme === 'dark', fontsReady };
  }, [scheme, mode, setMode, fontsReady]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so a component rendered outside the provider still works.
    return {
      colors: darkColors,
      scheme: 'dark',
      mode: 'system',
      setMode: () => {},
      isDark: true,
      fontsReady: fontsAreReady(),
    };
  }
  return ctx;
}

// Helper for building themed StyleSheets:
//   const styles = useThemedStyles(makeStyles);
// where makeStyles = (c: ThemeColors) => StyleSheet.create({...})
export function useThemedStyles<T>(factory: (c: ThemeColors) => T): T {
  const { colors, fontsReady } = useTheme();
  // fontsReady is a dependency on purpose: factories call ff(), whose result
  // changes when Nunito finishes loading.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(colors), [colors, factory, fontsReady]);
}
