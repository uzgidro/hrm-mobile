import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../api/storage';
import { ThemeColors, darkColors, lightColors } from './palettes';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedScheme = 'light' | 'dark';

const MODE_KEY = 'theme_mode';

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: ResolvedScheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

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
    return { colors, scheme, mode, setMode, isDark: scheme === 'dark' };
  }, [scheme, mode, setMode]);

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
    };
  }
  return ctx;
}

// Helper for building themed StyleSheets:
//   const styles = useThemedStyles(makeStyles);
// where makeStyles = (c: ThemeColors) => StyleSheet.create({...})
export function useThemedStyles<T>(factory: (c: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
