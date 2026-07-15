// Test helper: render a component tree inside the same providers the app uses
// (React Query + Theme + SafeArea). Returns RNTL's render result plus the
// QueryClient so tests can assert cache state.
import React, { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { ThemeProvider } from '../theme/ThemeProvider';

// A fresh QueryClient per render with retries off — tests should not wait on
// React Query's exponential backoff.
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// RNTL 14's render is async (React 19's act is async), so this helper is too —
// always `await renderWithProviders(...)` in tests.
export async function renderWithProviders(
  ui: ReactElement,
  options: RenderOptions & { queryClient?: QueryClient } = {}
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>{children}</ThemeProvider>
          </QueryClientProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    );
  }

  const result = await render(ui, { wrapper: Wrapper, ...renderOptions });
  return { queryClient, ...result };
}

export * from '@testing-library/react-native';
