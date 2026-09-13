import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent } from '@/test/renderWithProviders';
import type { Letter } from '@/types';
import { TripAttendanceSection } from '../components/TripAttendanceSection';

// Safar davomati bo'limi (web TripAttendancePanel pariteti): xulosa chiplari
// va kunlar ro'yxati serverdan tayyor keladi; 7 kundan ko'pi yig'ilgan.
const LETTER = { id: 5, status: 'management_approved', letter_type: 'business_trip' } as unknown as Letter;

function day(i: number, status: string) {
  return { date: `2026-09-${String(i).padStart(2, '0')}`, status, first_entrance: null, last_exit: null, work_hours: 8, late_minutes: 0, branch_names: [], event_count: 2 };
}

describe('TripAttendanceSection', () => {
  const mock = new MockAdapter(apiClient);
  afterEach(() => mock.reset());

  it('xulosa + 7 kun, qolgani «yana» tugmasi ortida', async () => {
    mock.onGet(/letters\/5\/trip-attendance/).reply(200, {
      letter_id: 5,
      days: Array.from({ length: 9 }, (_, i) => day(i + 1, i === 0 ? 'late' : 'present')),
      events: [],
      present_days: 8, late_days: 1, absent_days: 0, total_work_hours: 72,
    });
    const { findByText, queryByText, getByText, getByTestId } = await renderWithProviders(<TripAttendanceSection letter={LETTER} />);
    expect(await findByText('72')).toBeTruthy();
    expect(getByText('01.09')).toBeTruthy();
    expect(queryByText('09.09')).toBeNull();
    fireEvent.press(getByTestId('trip-att-more'));
    expect(await findByText('09.09')).toBeTruthy();
  });

  it('qoralama / bekor qilingan safar uchun so\'rov yuborilmaydi', async () => {
    const spy = mock.onGet(/trip-attendance/).reply(200, { days: [day(1, 'present')] });
    const { queryByText } = await renderWithProviders(
      <TripAttendanceSection letter={{ ...LETTER, status: 'cancelled' } as Letter} />,
    );
    expect(queryByText('01.09')).toBeNull();
    expect(spy.history.get.filter((r) => /trip-attendance/.test(r.url ?? '')).length).toBe(0);
  });
});
