// Every URL / method / body the feature sends — bodies are STRICT on the server (undeclared key → 422).
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  MEDICAL_CHECKUP,
  MEDICAL_CHECKUPS,
  MEDICAL_EMPLOYEE,
  MEDICAL_EMPLOYEES,
  MEDICAL_ME_CHECKUPS,
  MEDICAL_ME_QR,
  MEDICAL_ME_QUEUE_JOIN,
  MEDICAL_ME_VISIT,
  MEDICAL_QR_RESOLVE,
  MEDICAL_QUEUE,
  MEDICAL_STATION_STATUS,
} from '@/api/urls';
import { createCheckup, joinQueue, resolvePatientQr, setStationStatus, updateCheckup } from '../mutations';
import { fetchMyQr, fetchMyResults, fetchMyVisit, fetchPatientCard, fetchQueue, searchPatients } from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

const body = (h: { data?: string }) => JSON.parse(h.data ?? 'null');

describe('URL constants (backend routers)', () => {
  it('match the server paths', () => {
    expect(MEDICAL_ME_QR).toBe('employees/me/medical-qr');
    expect(MEDICAL_ME_VISIT).toBe('employees/me/medical-visit');
    expect(MEDICAL_ME_QUEUE_JOIN).toBe('employees/me/medical-queue/join');
    expect(MEDICAL_ME_CHECKUPS).toBe('employees/me/medical-checkups');
    expect(MEDICAL_QR_RESOLVE).toBe('medical/qr/resolve');
    expect(MEDICAL_QUEUE).toBe('medical/queue');
    expect(MEDICAL_STATION_STATUS(5)).toBe('medical/visit-stations/5/status');
  });
});

describe('employee requests', () => {
  it('GET my QR', async () => {
    mock.onGet(MEDICAL_ME_QR).reply(200, { employee_id: 1, qr: '9'.repeat(24) });
    expect((await fetchMyQr()).qr).toHaveLength(24);
  });
  it('GET my visit unwraps { visit } and tolerates null', async () => {
    mock.onGet(MEDICAL_ME_VISIT).replyOnce(200, { visit: { id: 3, status: 'planned' } });
    expect((await fetchMyVisit())?.id).toBe(3);
    mock.onGet(MEDICAL_ME_VISIT).replyOnce(200, { visit: null });
    expect(await fetchMyVisit()).toBeNull();
  });
  it('GET my results defaults missing arrays', async () => {
    mock.onGet(MEDICAL_ME_CHECKUPS).reply(200, {});
    expect(await fetchMyResults()).toEqual({ checkups: [], annual_indexes: [] });
  });
  it('POST join sends exactly { qr } and returns the visit', async () => {
    mock.onPost(MEDICAL_ME_QUEUE_JOIN).reply(200, { visit: { id: 3, status: 'in_progress' } });
    const v = await joinQueue('911234567890123456789012');
    expect(v.id).toBe(3);
    expect(mock.history.post[0]!.url).toBe(MEDICAL_ME_QUEUE_JOIN);
    expect(body(mock.history.post[0]!)).toEqual({ qr: '911234567890123456789012' });
  });
});

describe('doctor requests', () => {
  it('POST resolve sends exactly { qr } (never in the URL)', async () => {
    mock.onPost(MEDICAL_QR_RESOLVE).reply(200, { employee: { id: 9 }, checkups: [] });
    await resolvePatientQr('901234567890123456789012');
    expect(mock.history.post[0]!.url).toBe(MEDICAL_QR_RESOLVE);
    expect(body(mock.history.post[0]!)).toEqual({ qr: '901234567890123456789012' });
  });
  it('GET card passes via', async () => {
    mock.onGet(MEDICAL_EMPLOYEE(9)).reply(200, { employee: { id: 9 } });
    await fetchPatientCard(9);
    expect(mock.history.get[0]!.url).toBe('medical/employees/9');
    expect(mock.history.get[0]!.params).toEqual({ via: 'manual' });
  });
  it('GET search sends search + size=20 only', async () => {
    mock.onGet(MEDICAL_EMPLOYEES).reply(200, { items: [{ id: 1 }], total: 1 });
    expect(await searchPatients('  ali ')).toEqual([{ id: 1 }]);
    expect(mock.history.get[0]!.params).toEqual({ search: 'ali', size: 20 });
  });
  it('GET queue', async () => {
    mock.onGet(MEDICAL_QUEUE).reply(200, { campaign: null, specialty_ids: [], items: [] });
    expect((await fetchQueue()).items).toEqual([]);
    expect(mock.history.get[0]!.url).toBe('medical/queue');
  });
  it('POST station status sends exactly { status }', async () => {
    mock.onPost(MEDICAL_STATION_STATUS(5)).reply(200, { id: 1, status: 'in_progress' });
    await setStationStatus({ stationId: 5, status: 'away' });
    expect(mock.history.post[0]!.url).toBe('medical/visit-stations/5/status');
    expect(body(mock.history.post[0]!)).toEqual({ status: 'away' });
  });
  it('POST checkup sends the strict body as given', async () => {
    mock.onPost(MEDICAL_CHECKUPS).reply(200, { id: 11 });
    await createCheckup({
      employee_id: 9,
      checkup_date: '2026-11-10',
      conclusion: 'ok',
      recommendation: null,
      diagnoses: [{ code: 'I10', name: 'x' }],
      fitness: 'fit',
    });
    expect(mock.history.post[0]!.url).toBe(MEDICAL_CHECKUPS);
    expect(Object.keys(body(mock.history.post[0]!)).sort()).toEqual(
      ['checkup_date', 'conclusion', 'diagnoses', 'employee_id', 'fitness', 'recommendation'],
    );
  });
  it('PATCH checkup goes to checkups/{id}', async () => {
    mock.onPatch(MEDICAL_CHECKUP(11)).reply(200, { id: 11 });
    await updateCheckup({
      id: 11,
      body: { checkup_date: '2026-11-10', conclusion: null, recommendation: null, diagnoses: [], fitness: null },
    });
    expect(mock.history.patch[0]!.url).toBe('medical/checkups/11');
    expect(body(mock.history.patch[0]!)).not.toHaveProperty('employee_id');
  });
});
