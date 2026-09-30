import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import DocumentsTabScreen from '../screens/DocumentsTabScreen';

const mockSetParams = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), setParams: (p: unknown) => mockSetParams(p) },
  useLocalSearchParams: () => mockParams,
}));

describe('DocumentsTabScreen', () => {
  beforeEach(() => {
    mockParams = {};
    mockSetParams.mockClear();
    useAuthStore.setState({ user: { id: 1, type: 'employee', employee: { id: 1 } } as never, isAuthenticated: true } as never);
  });

  it("birinchi segment standart, bosilganda almashadi va URL param yangilanadi", async () => {
    await renderWithProviders(<DocumentsTabScreen renderSegment={(s) => <Text>seg:{s}</Text>} />);
    expect(screen.getByText('seg:orders')).toBeTruthy();
    await fireEvent.press(screen.getByText('Xatlar'));
    expect(screen.getByText('seg:letters')).toBeTruthy();
    expect(mockSetParams).toHaveBeenCalledWith({ seg: 'letters' });
  });

  it('?seg=documents bilan ochiladi', async () => {
    mockParams = { seg: 'documents' };
    await renderWithProviders(<DocumentsTabScreen renderSegment={(s) => <Text>seg:{s}</Text>} />);
    expect(screen.getByText('seg:documents')).toBeTruthy();
  });
});
