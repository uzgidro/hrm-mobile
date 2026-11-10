// Read side of the medical exam day: the employee's own sheet and the doctor's desk.
// Request functions are pure (tested with axios-mock-adapter); the screens wrap them in useQuery.
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  MEDICAL_EMPLOYEE,
  MEDICAL_EMPLOYEES,
  MEDICAL_ME_CHECKUPS,
  MEDICAL_ME_QR,
  MEDICAL_ME_VISIT,
  MEDICAL_QUEUE,
} from '@/api/urls';
import type { MyCheckups, MedicalQr, PatientCard, PatientRow, QueueResponse, Visit } from '../utils/medicalExam';

export const PATIENT_SEARCH_SIZE = 20;
export const PATIENT_SEARCH_MIN = 2;

export const examKeys = {
  all: ['medicalExam'] as const,
  myQr: () => [...examKeys.all, 'my-qr'] as const,
  myVisit: () => [...examKeys.all, 'my-visit'] as const,
  myResults: () => [...examKeys.all, 'my-results'] as const,
  card: (id: number) => [...examKeys.all, 'card', id] as const,
  queue: () => [...examKeys.all, 'queue'] as const,
  search: (term: string) => [...examKeys.all, 'search', term] as const,
};

// ───────────────────────── Request functions ──────────────────────────────

export const fetchMyQr = () => apiClient.get<MedicalQr>(MEDICAL_ME_QR).then((r) => r.data);

/** `{ visit: null }` = the employee is on no list. */
export const fetchMyVisit = () =>
  apiClient.get<{ visit: Visit | null }>(MEDICAL_ME_VISIT).then((r) => r.data?.visit ?? null);

export const fetchMyResults = () =>
  apiClient.get<Partial<MyCheckups>>(MEDICAL_ME_CHECKUPS).then(
    (r): MyCheckups => ({ checkups: r.data?.checkups ?? [], annual_indexes: r.data?.annual_indexes ?? [] }),
  );

/** `via` is journalled by the server: `qr` only for the very first open after a scan. */
export const fetchPatientCard = (id: number, via: 'manual' | 'qr' = 'manual') =>
  apiClient.get<PatientCard>(MEDICAL_EMPLOYEE(id), { params: { via } }).then((r) => r.data);

export const fetchQueue = () => apiClient.get<QueueResponse>(MEDICAL_QUEUE).then((r) => r.data);

export const searchPatients = (term: string) =>
  apiClient
    .get(MEDICAL_EMPLOYEES, { params: { search: term.trim(), size: PATIENT_SEARCH_SIZE } })
    .then((r) => unwrapList<PatientRow>(r.data));

// ───────────────────────────── Query options ──────────────────────────────

export const myQrQuery = () => queryOptions({ queryKey: examKeys.myQr(), queryFn: fetchMyQr });
export const myVisitQuery = () => queryOptions({ queryKey: examKeys.myVisit(), queryFn: fetchMyVisit });
export const myResultsQuery = () => queryOptions({ queryKey: examKeys.myResults(), queryFn: fetchMyResults });
export const queueQuery = (enabled = true) =>
  queryOptions({ queryKey: examKeys.queue(), queryFn: fetchQueue, enabled });
export const patientCardQuery = (id: number) =>
  queryOptions({ queryKey: examKeys.card(id), queryFn: () => fetchPatientCard(id, 'manual'), enabled: id > 0 });
export const patientSearchQuery = (term: string) =>
  queryOptions({
    queryKey: examKeys.search(term.trim()),
    queryFn: () => searchPatients(term),
    enabled: term.trim().length >= PATIENT_SEARCH_MIN,
  });
