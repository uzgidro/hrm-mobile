import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import { TaskFormSheet } from '../components/TaskSheets';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

describe('ijro forma sana tanlagichi', () => {
  it("oyna avval yopiq mount bo'lgan, keyin 1-mart muddatli topshiriq bilan ochilgan — tanlagich mart oyida", async () => {
    await i18n.changeLanguage('uz-Latn');
    const task = { id: 2, task_index: 'X', deadline_date: '2026-03-01', task_completed: null, employee_id: 7 };
    const r = await renderWithProviders(<TaskFormSheet task={undefined} onClose={() => {}} />);
    await r.rerender(<TaskFormSheet task={task} onClose={() => {}} />);
    await fireEvent.press(screen.getByLabelText(`${i18n.t('ijro.fieldDeadline')}: 01.03.2026`));
    expect(screen.getByText(/Mart 2026/)).toBeTruthy();
  });
});
