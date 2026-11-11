import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { MEDICAL_CHECKUPS, MEDICAL_EMPLOYEE, MEDICAL_EMPLOYEES, MEDICAL_MY_PATIENTS, MEDICAL_QR_RESOLVE, MEDICAL_QUEUE, MEDICAL_STATION_STATUS } from '@/api/urls';
import { useAuthStore } from '@/store/authStore';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '@/test/renderWithProviders';
import DoctorDeskScreen from '../screens/DoctorDeskScreen';
import DoctorScanScreen from '../screens/DoctorScanScreen';
import PatientCardScreen from '../screens/PatientCardScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: '9' }),
}));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

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

const doctor = (extra: Record<string, unknown> = {}) =>
  useAuthStore.setState({
    user: { id: 1, type: 'employee', employee: { id: 5 }, is_doctor: true, medical_specialties: [{ id: 2, name: 'Terapevt' }], ...extra } as never,
    isAuthenticated: true,
  } as never);

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
  scanHandler = undefined;
  doctor();
});
afterEach(() => mock.restore());

const EMP = '901234567890123456789012';
const DOOR = '911234567890123456789012';

const card = (over: Record<string, unknown> = {}) => ({
  employee: {
    id: 9,
    legal_name: 'Aliyev Vali',
    branch_name: 'Filial',
    department_name: "Bo'lim",
    job_position_name: 'Haydovchi',
    birth_date: '1990-01-01',
    gender: 1,
  },
  checkups: [
    { id: 1, checkup_date: '2025-05-01', specialty_name: 'LOR', doctor_name: 'Dr X', conclusion: 'Eski', can_edit: false },
    { id: 2, checkup_date: '2026-10-01', specialty_name: 'Terapevt', doctor_name: 'Men', conclusion: 'Yangi', can_edit: true },
  ],
  annual_indexes: [],
  can_add_checkup: true,
  visit: {
    id: 3,
    status: 'in_progress',
    stations_done: 0,
    stations_total: 2,
    stations: [
      { id: 21, specialty_id: 2, specialty_name: 'Terapevt', status: 'present' },
      { id: 22, specialty_id: 5, specialty_name: 'LOR', status: 'waiting' },
    ],
  },
  my_station_ids: [21],
  ...over,
});

describe('PatientCardScreen', () => {
  it('shows who, age and sex, the route sheet with only the doctor’s own line actionable, and history newest first', async () => {
    mock.onGet(MEDICAL_EMPLOYEE(9)).reply(200, card());
    await renderWithProviders(<PatientCardScreen />);
    expect(await screen.findByTestId('patient-name')).toHaveTextContent(/Aliyev Vali/);
    expect(screen.getByTestId('patient-age-sex')).toHaveTextContent(/Erkak/);
    expect(screen.getByTestId('patient-age-sex')).toHaveTextContent(/yosh/);
    expect(screen.getByTestId('station-21-set-away')).toBeTruthy();
    expect(screen.queryByTestId('station-22-set-away')).toBeNull();
    const checkups = screen.getAllByTestId(/^checkup-\d+$/);
    expect(checkups.map((c) => c.props.testID)).toEqual(['checkup-2', 'checkup-1']);
    // only the own record is editable
    expect(screen.getByTestId('checkup-2-edit')).toBeTruthy();
    expect(screen.queryByTestId('checkup-1-edit')).toBeNull();
  });

  it('a status tap POSTs exactly { status }', async () => {
    mock.onGet(MEDICAL_EMPLOYEE(9)).reply(200, card());
    mock.onPost(MEDICAL_STATION_STATUS(21)).reply(200, { id: 3, status: 'in_progress' });
    await renderWithProviders(<PatientCardScreen />);
    await fireEvent.press(await screen.findByTestId('station-21-set-away'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ status: 'away' });
    expect(mock.history.post[0]!.url).toBe('medical/visit-stations/21/status');
  });

  it('writes a record: strict body, refetches the card, then offers «Keyingi bemor»', async () => {
    mock.onGet(MEDICAL_EMPLOYEE(9)).reply(200, card());
    mock.onPost(MEDICAL_CHECKUPS).reply(200, { id: 50 });
    await renderWithProviders(<PatientCardScreen />);
    await fireEvent.press(await screen.findByTestId('add-record'));
    await fireEvent.changeText(await screen.findByTestId('record-conclusion'), '  Sog‘lom ');
    await fireEvent.press(screen.getByTestId('diagnosis-add'));
    await fireEvent.changeText(screen.getByTestId('diagnosis-0-code'), 'k29.7');
    await fireEvent.changeText(screen.getByTestId('diagnosis-0-name'), 'Gastrit');
    await fireEvent.press(screen.getByTestId('record-fitness-fit'));
    const gets = mock.history.get.length;
    await fireEvent.press(screen.getByTestId('record-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    const sent = JSON.parse(mock.history.post[0]!.data);
    expect(sent).toMatchObject({
      employee_id: 9,
      conclusion: 'Sog‘lom',
      recommendation: null,
      diagnoses: [{ code: 'K29.7', name: 'Gastrit' }],
      fitness: 'fit',
    });
    expect(sent.specialty_id).toBeUndefined(); // one specialty: the server fills it in
    expect(typeof sent.checkup_date).toBe('string');
    expect(await screen.findByTestId('next-patient')).toBeTruthy();
    await waitFor(() => expect(mock.history.get.length).toBeGreaterThan(gets)); // card refetched
    await fireEvent.press(screen.getByTestId('next-patient'));
    expect(router.replace).toHaveBeenCalledWith('/doctor-scan');
  });

  it('blocks a bad ICD-10 code client-side (no request)', async () => {
    mock.onGet(MEDICAL_EMPLOYEE(9)).reply(200, card());
    await renderWithProviders(<PatientCardScreen />);
    await fireEvent.press(await screen.findByTestId('add-record'));
    await fireEvent.press(await screen.findByTestId('diagnosis-add'));
    await fireEvent.changeText(screen.getByTestId('diagnosis-0-code'), 'ZZ');
    await fireEvent.changeText(screen.getByTestId('diagnosis-0-name'), 'x');
    await fireEvent.press(screen.getByTestId('record-save'));
    expect(await screen.findByText(/MKB-10 kodi noto'g'ri/)).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
  });

  it('with several specialties the choice is required and sent', async () => {
    doctor({ medical_specialties: [{ id: 2, name: 'Terapevt' }, { id: 3, name: 'Nevrolog' }] });
    mock.onGet(MEDICAL_EMPLOYEE(9)).reply(200, card());
    mock.onPost(MEDICAL_CHECKUPS).reply(200, { id: 51 });
    await renderWithProviders(<PatientCardScreen />);
    await fireEvent.press(await screen.findByTestId('add-record'));
    await fireEvent.changeText(await screen.findByTestId('record-conclusion'), 'ok');
    await fireEvent.press(screen.getByTestId('record-save'));
    expect(await screen.findByTestId('record-error')).toHaveTextContent(/Mutaxassislikni tanlang/);
    expect(mock.history.post).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('record-specialty-3'));
    await fireEvent.press(screen.getByTestId('record-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data).specialty_id).toBe(3);
  });

  it('hides «add record» when the card says the caller cannot add', async () => {
    mock.onGet(MEDICAL_EMPLOYEE(9)).reply(200, card({ can_add_checkup: false }));
    await renderWithProviders(<PatientCardScreen />);
    await screen.findByTestId('patient-name');
    expect(screen.queryByTestId('add-record')).toBeNull();
  });

  it('edits an own record with PATCH (no employee_id)', async () => {
    mock.onGet(MEDICAL_EMPLOYEE(9)).reply(200, card());
    mock.onPatch('medical/checkups/2').reply(200, { id: 2 });
    await renderWithProviders(<PatientCardScreen />);
    await fireEvent.press(await screen.findByTestId('checkup-2-edit'));
    await fireEvent.changeText(await screen.findByTestId('record-conclusion'), 'Yangilandi');
    await fireEvent.press(screen.getByTestId('record-save'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    const sent = JSON.parse(mock.history.patch[0]!.data);
    expect(sent.conclusion).toBe('Yangilandi');
    expect(sent).not.toHaveProperty('employee_id');
  });

  it('is closed to a non-doctor', async () => {
    doctor({ is_doctor: false });
    await renderWithProviders(<PatientCardScreen />);
    expect(mock.history.get).toHaveLength(0);
  });
});

describe('DoctorScanScreen', () => {
  it('resolves an employee code and opens the card', async () => {
    mock.onPost(MEDICAL_QR_RESOLVE).reply(200, card());
    await renderWithProviders(<DoctorScanScreen />);
    await act(async () => scanHandler!({ data: EMP }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/doctor-patient', params: { id: '9' } }));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ qr: EMP });
  });

  it('a door code (91…) is not sent to the server', async () => {
    await renderWithProviders(<DoctorScanScreen />);
    await act(async () => scanHandler!({ data: DOOR }));
    expect(await screen.findByTestId('scanner-message')).toHaveTextContent(/eshigining kodi/);
    expect(mock.history.post).toHaveLength(0);
  });

  it('shows the server message when the code is unknown (404)', async () => {
    mock.onPost(MEDICAL_QR_RESOLVE).reply(404, { detail: 'Xodim topilmadi' });
    await renderWithProviders(<DoctorScanScreen />);
    await act(async () => scanHandler!({ data: EMP }));
    expect(await screen.findByTestId('scanner-message')).toHaveTextContent(/Xodim topilmadi/);
  });
});

describe('DoctorDeskScreen', () => {
  it('«Mening bemorlarim» lists today\'s patients, switches to everyone, and a tap opens the card', async () => {
    mock.onGet(MEDICAL_QUEUE).reply(200, { campaign: null, specialty_ids: [], items: [] });
    mock.onGet(MEDICAL_MY_PATIENTS).reply((cfg) =>
      cfg.params?.day
        ? [200, { items: [{ id: 21, legal_name: 'Rahimova Aziza', last_checkup_date: '2026-11-11', record_count: 1 }], total: 1, today: 1 }]
        : [200, { items: [
            { id: 21, legal_name: 'Rahimova Aziza', last_checkup_date: '2026-11-11', record_count: 1 },
            { id: 22, legal_name: 'Toshmatov Bahodir', last_checkup_date: '2026-10-02', record_count: 3 },
          ], total: 2, today: 1 }],
    );
    await renderWithProviders(<DoctorDeskScreen />);
    expect(await screen.findByTestId('my-patient-21')).toBeTruthy();
    expect(screen.queryByTestId('my-patient-22')).toBeNull();
    const first = mock.history.get.find((g) => g.url === MEDICAL_MY_PATIENTS)!;
    expect(first.params).toEqual({ day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), size: 50 });
    await fireEvent.press(screen.getByTestId('patients-all'));
    expect(await screen.findByTestId('my-patient-22')).toHaveTextContent(/3/);
    const all = mock.history.get.filter((g) => g.url === MEDICAL_MY_PATIENTS).pop()!;
    expect(all.params).toEqual({ size: 50 });
    await fireEvent.press(screen.getByText('Toshmatov Bahodir'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/doctor-patient', params: { id: '22' } });
  });

  it('says so plainly when nobody was received today', async () => {
    mock.onGet(MEDICAL_QUEUE).reply(200, { campaign: null, specialty_ids: [], items: [] });
    mock.onGet(MEDICAL_MY_PATIENTS).reply(200, { items: [], total: 0, today: 0 });
    await renderWithProviders(<DoctorDeskScreen />);
    expect(await screen.findByTestId('patients-empty')).toBeTruthy();
  });

  it('lists my queue with status actions, and a tap opens the card', async () => {
    mock.onGet(MEDICAL_QUEUE).reply(200, {
      campaign: { id: 1, name: 'K' },
      specialty_ids: [2],
      items: [
        { station_id: 31, visit_id: 3, specialty_id: 2, specialty_name: 'Terapevt', status: 'present', stations_done: 1, stations_total: 4, employee: { id: 9, legal_name: 'Aliyev Vali' } },
        { station_id: 32, visit_id: 4, specialty_id: 2, specialty_name: 'Terapevt', status: 'waiting', returned: true, return_note: 'Qayta', employee: { id: 10, legal_name: 'Boboyev Ali' } },
      ],
    });
    mock.onPost(MEDICAL_STATION_STATUS(32)).reply(200, { id: 4 });
    await renderWithProviders(<DoctorDeskScreen />);
    expect(await screen.findByTestId('queue-31')).toBeTruthy();
    expect(screen.getByTestId('queue-32')).toHaveTextContent(/Qayta/);
    await fireEvent.press(screen.getByTestId('station-32-set-absent'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ status: 'absent' });
    await fireEvent.press(screen.getByText('Aliyev Vali'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/doctor-patient', params: { id: '9' } });
  });

  it('searches by name (search + size only) after the debounce and opens a patient', async () => {
    mock.onGet(MEDICAL_QUEUE).reply(200, { campaign: null, specialty_ids: [], items: [] });
    mock.onGet(MEDICAL_EMPLOYEES).reply(200, { items: [{ id: 7, legal_name: 'Karimov Sanjar', department_name: 'IT' }], total: 1 });
    await renderWithProviders(<DoctorDeskScreen />);
    expect(await screen.findByTestId('queue-no-campaign')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('desk-search'), 'kar');
    await fireEvent.press(await screen.findByTestId('patient-7', {}, { timeout: 3000 }));
    const call = mock.history.get.find((g) => g.url === MEDICAL_EMPLOYEES)!;
    expect(call.params).toEqual({ search: 'kar', size: 20 });
    expect(router.push).toHaveBeenCalledWith({ pathname: '/doctor-patient', params: { id: '7' } });
  });

  it('is closed to a non-doctor', async () => {
    doctor({ is_doctor: false });
    await renderWithProviders(<DoctorDeskScreen />);
    expect(mock.history.get).toHaveLength(0);
  });
});
