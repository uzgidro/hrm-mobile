import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { MEDICAL_ME_CHECKUPS, MEDICAL_ME_QR, MEDICAL_ME_QUEUE_JOIN, MEDICAL_ME_VISIT } from '@/api/urls';
import { toast } from '@/lib/toast';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '@/test/renderWithProviders';
import MedicalExamScreen from '../screens/MedicalExamScreen';
import MyQrScreen from '../screens/MyQrScreen';
import MyResultsScreen from '../screens/MyResultsScreen';
import ScanDoorScreen from '../screens/ScanDoorScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

// The camera reports a code by calling the handler it is given; the test fires it by hand.
let scanHandler: ((e: { data: string }) => void) | undefined;
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: (p: { onBarcodeScanned?: (e: { data: string }) => void }) => {
      scanHandler = p.onBarcodeScanned;
      return React.createElement(View, { testID: 'camera' });
    },
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
  scanHandler = undefined;
});
afterEach(() => mock.restore());

const EMP = '901234567890123456789012';
const DOOR = '911234567890123456789012';

const visit = {
  id: 1,
  campaign_name: '2026 ko‘rigi',
  planned_date: '2026-11-12',
  status: 'in_progress',
  unfinished: false,
  stations_done: 1,
  stations_total: 3,
  stations: [
    { id: 11, specialty_id: 1, specialty_name: 'Terapevt', status: 'done', doctor_name: 'Dr A' },
    { id: 12, specialty_id: 2, specialty_name: 'LOR', status: 'present' },
    { id: 13, specialty_id: 3, specialty_name: 'Okulist', status: 'away' },
  ],
};

describe('MedicalExamScreen (my visit)', () => {
  it('shows the planned day, status in words and the route sheet with station words', async () => {
    mock.onGet(MEDICAL_ME_VISIT).reply(200, { visit });
    await renderWithProviders(<MedicalExamScreen />);
    expect(await screen.findByTestId('visit-day')).toHaveTextContent(/12\.11\.2026/);
    expect(screen.getByTestId('visit-status')).toHaveTextContent(/Ko'rikda/);
    expect(screen.getByTestId('station-status-11')).toHaveTextContent(/O'tdi/);
    expect(screen.getByTestId('station-status-12')).toHaveTextContent(/Joyida/);
    expect(screen.getByTestId('station-status-13')).toHaveTextContent(/Tashqarida/);
    expect(screen.getByTestId('route-progress')).toHaveTextContent(/1\ \/\ 3/);
    expect(screen.queryByTestId('visit-unfinished')).toBeNull();
  });

  it('says «come back» when unfinished', async () => {
    mock.onGet(MEDICAL_ME_VISIT).reply(200, { visit: { ...visit, unfinished: true, status: 'arrived' } });
    await renderWithProviders(<MedicalExamScreen />);
    expect(await screen.findByTestId('visit-unfinished')).toBeTruthy();
  });

  it('shows the head doctor’s final fitness and conclusion when finalized', async () => {
    mock.onGet(MEDICAL_ME_VISIT).reply(200, {
      visit: { ...visit, status: 'finalized', final_fitness: 'fit_limited', final_conclusion: 'Cheklov bilan', finalized_by_name: 'Bosh S.' },
    });
    await renderWithProviders(<MedicalExamScreen />);
    const final = await screen.findByTestId('visit-final');
    expect(final).toHaveTextContent(/Cheklov\ bilan\ yaroqli/);
    expect(final).toHaveTextContent(/Bosh\ S\./);
  });

  it('explains when the employee is on no list, and still offers the QR', async () => {
    mock.onGet(MEDICAL_ME_VISIT).reply(200, { visit: null });
    await renderWithProviders(<MedicalExamScreen />);
    expect(await screen.findByText("Siz ro'yxatda yo'qsiz")).toBeTruthy();
    await fireEvent.press(screen.getByTestId('exam-open-qr'));
    expect(router.push).toHaveBeenCalledWith('/medical-exam-qr');
  });
});

describe('MyQrScreen', () => {
  it('draws the QR and keeps the 24 digits grouped under it, with the typing explanation', async () => {
    mock.onGet(MEDICAL_ME_QR).reply(200, { employee_id: 1, legal_name: 'Aliyev Vali', branch_name: 'Filial', qr: EMP });
    await renderWithProviders(<MyQrScreen />);
    const digits = await screen.findByTestId('qr-digits');
    expect(digits.props.accessibilityLabel).toBe('9012 3456 7890 1234 5678 9012');
    expect(screen.getByText('Aliyev Vali')).toBeTruthy();
    expect(screen.getByTestId('qr-explain')).toHaveTextContent(/qo'lda kiritadi/);
    expect(screen.getByTestId('qr-symbol')).toBeTruthy();
  });
});

describe('MyResultsScreen', () => {
  it('groups by year with the yearly index', async () => {
    mock.onGet(MEDICAL_ME_CHECKUPS).reply(200, {
      checkups: [
        {
          id: 5,
          checkup_date: '2026-11-02',
          specialty_name: 'Terapevt',
          doctor_name: 'Dr A',
          conclusion: 'Sog‘lom',
          recommendation: 'Sport',
          diagnoses: [{ code: 'I10', name: 'Gipertoniya' }],
          fitness: 'fit',
        },
        { id: 4, checkup_date: '2025-05-02', specialty_name: 'LOR' },
      ],
      annual_indexes: [{ year: 2026, health_index: 'good' }],
    });
    await renderWithProviders(<MyResultsScreen />);
    expect(await screen.findByTestId('year-2026')).toBeTruthy();
    expect(screen.getByTestId('year-2025')).toBeTruthy();
    expect(screen.getByTestId('year-2026-index')).toHaveTextContent(/Yaxshi/);
    expect(screen.getByText('I10 — Gipertoniya')).toBeTruthy();
    expect(screen.getByText('Yaroqli')).toBeTruthy();
  });
});

describe('ScanDoorScreen', () => {
  it('refuses the employee’s own code (90…) without calling the server', async () => {
    await renderWithProviders(<ScanDoorScreen />);
    await act(async () => scanHandler!({ data: EMP }));
    expect(await screen.findByTestId('scanner-message')).toHaveTextContent(/shaxsiy\ kodingiz/);
    expect(mock.history.post).toHaveLength(0);
  });

  it('refuses garbage without calling the server', async () => {
    await renderWithProviders(<ScanDoorScreen />);
    await act(async () => scanHandler!({ data: 'https://example.com' }));
    expect(await screen.findByTestId('scanner-message')).toHaveTextContent(/xonasining\ kodi\ emas/);
    expect(mock.history.post).toHaveLength(0);
  });

  it('locks after the first read: a second frame does not repeat the request', async () => {
    mock.onPost(MEDICAL_ME_QUEUE_JOIN).reply(200, { visit });
    await renderWithProviders(<ScanDoorScreen />);
    await act(async () => scanHandler!({ data: DOOR }));
    await act(async () => scanHandler!({ data: DOOR }));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
  });

  it('joins the queue with a door code (91…), says which queue and returns', async () => {
    mock.onPost(MEDICAL_ME_QUEUE_JOIN).reply(200, { visit });
    await renderWithProviders(<ScanDoorScreen />);
    await act(async () => scanHandler!({ data: DOOR }));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ qr: DOOR });
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('navbatiga yozildingiz'));
  });

  it('shows the server’s readable message on a 400 and lets the user scan again', async () => {
    mock.onPost(MEDICAL_ME_QUEUE_JOIN).reply(400, { code: 'medical_visit_closed', message: 'Bugun ko‘rik kuni emas' });
    await renderWithProviders(<ScanDoorScreen />);
    await act(async () => scanHandler!({ data: DOOR }));
    expect(await screen.findByTestId('scanner-message')).toHaveTextContent(/Bugun\ ko‘rik\ kuni\ emas/);
    expect(router.back).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('scanner-retry'));
    await waitFor(() => expect(screen.queryByTestId('scanner-message')).toBeNull());
  });

  it('medical_qr_invalid from the server is the «not a door code» message', async () => {
    mock.onPost(MEDICAL_ME_QUEUE_JOIN).reply(400, { code: 'medical_qr_invalid', message: 'x' });
    await renderWithProviders(<ScanDoorScreen />);
    await act(async () => scanHandler!({ data: DOOR }));
    expect(await screen.findByTestId('scanner-message')).toHaveTextContent(/xonasining\ kodi\ emas/);
  });
});
