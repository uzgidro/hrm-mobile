// Tahrirlashda sana tanlagich SHU yozuvning sanasidan ochilishi kerak (ISO qiymat,
// ko'rinish formati emas) — review W3 #1/#2.
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import { TempOrderSheet } from '../components/TempOrderSheet';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

describe('forma sana tanlagichlari', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
  });

  it('vaqtinchalik buyruq: 15-mart yozuvi — tanlagich mart oyida ochiladi', async () => {
    const row = {
      id: 1,
      employee: { legal_name: 'A' },
      type: 'kasal',
      start_date: '2026-03-15T00:00:00',
      end_date: '2026-03-20T23:59:59',
    };
    await renderWithProviders(<TempOrderSheet visible row={row} branchId={undefined} onClose={() => {}} />);
    await fireEvent.press(screen.getByLabelText(`${i18n.t('tempOrders.dateFrom')}: 15.03.2026`));
    expect(screen.getByText(/Mart 2026/)).toBeTruthy();
  });
});
