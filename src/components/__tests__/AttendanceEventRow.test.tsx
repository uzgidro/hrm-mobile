import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { AttendanceEventRow } from '../AttendanceEventRow';
import type { AttendanceEvent } from '@/types';

// Qator avval FAQAT vaqt + "Kirish/Chiqish" ni ko'rsatardi (foydalanuvchi
// 2026-08-19). Bu test qatorda GES nomi ham chiqishini va bosilganda manzil +
// xarita bloki ochilishini qulflaydi.
const event: AttendanceEvent = {
  id: 991,
  happen_time: '2026-08-19T08:12:00',
  direction_type: 'entrance',
  photo_path: 'https://minio.example/turnstile-events/x.jpg',
  turnstile: {
    acs_dev_name: 'Ges 8 kirish',
    locations: [
      { id: 5, name: 'Ges 8', address: 'Chirchiq shahri', latitude: 41.481416, longitude: 69.592347 },
    ],
  },
};

describe('AttendanceEventRow', () => {
  it('qatorda vaqt, yo\'nalish va GES nomi ko\'rinadi', async () => {
    const { getByText } = await renderWithProviders(<AttendanceEventRow event={event} />);
    getByText('08:12');
    getByText('Kirish');
    getByText('Ges 8');
  });

  it('bosilganda tafsilot oynasi manzil bilan ochiladi', async () => {
    const { getByTestId, getByText } = await renderWithProviders(<AttendanceEventRow event={event} />);
    fireEvent.press(getByTestId('attendance-event-991'));
    await waitFor(() => getByText('Chirchiq shahri'));
    getByText('Xaritada ochish');
  });

  it('koordinatasiz hodisada xarita o\'rniga izoh chiqadi', async () => {
    const noCoords: AttendanceEvent = {
      ...event,
      id: 992,
      turnstile: { acs_dev_name: 'KPP', locations: [{ id: 6, name: 'KPP' }] },
    };
    const { getByTestId, getByText } = await renderWithProviders(<AttendanceEventRow event={noCoords} />);
    fireEvent.press(getByTestId('attendance-event-992'));
    await waitFor(() => getByText('Bu joylashuvning koordinatasi kiritilmagan'));
  });
});
