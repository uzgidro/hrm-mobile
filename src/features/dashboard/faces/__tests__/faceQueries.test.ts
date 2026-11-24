import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  LETTERS_LIST,
  NAVBATCHILIK_GROUPS,
  NAVBATCHILIK_GROUP_MEMBERS,
  ORDER_ACTS,
  PHONE_DIRECTORY,
  SUPPORT_TICKETS,
  VEHICLE_ACCESS,
  VEHICLE_REQUESTS,
  WORK_LEAVES,
  WORK_SCHEDULE_DAYS_BY_GROUP,
  DASHBOARD_ROSTER_COMPOSITION,
  TASKS_OVERDUE,
} from '@/api/urls';
import {
  FACE_PAGES,
  FACE_SIZE,
  faceKeys,
  faceQuery,
  fetchDirectory,
  fetchDuty,
  fetchIjro,
  fetchLeaveRequests,
  fetchLetters,
  fetchOrders,
  fetchRoster,
  fetchSupport,
  fetchVehicles,
  isFacePage,
} from '../faceQueries';

const mock = new MockAdapter(apiClient);
afterEach(() => mock.reset());

describe('face request functions', () => {
  it('asks for one small page of orders', async () => {
    mock.onGet(ORDER_ACTS).reply(200, { items: [{ id: 1 }], total: 1 });
    expect(await fetchOrders()).toEqual([{ id: 1 }]);
    expect(mock.history.get[0].params).toEqual({ page: 1, size: FACE_SIZE });
  });

  it('letters: rows waiting for me, otherwise the latest', async () => {
    mock.onGet(LETTERS_LIST, { params: { page: 1, size: FACE_SIZE, action_required: true } }).reply(200, { items: [{ id: 5 }], total: 7 });
    expect(await fetchLetters()).toEqual({ items: [{ id: 5 }], awaiting: 7 });

    mock.reset();
    mock.onGet(LETTERS_LIST, { params: { page: 1, size: FACE_SIZE, action_required: true } }).reply(200, { items: [], total: 0 });
    mock.onGet(LETTERS_LIST, { params: { page: 1, size: FACE_SIZE } }).reply(200, { items: [{ id: 9 }], total: 1 });
    expect(await fetchLetters()).toEqual({ items: [{ id: 9 }], awaiting: 0 });
  });

  it('leave requests: pending, slim, active branch', async () => {
    mock.onGet(WORK_LEAVES).reply(200, { items: [], total: 0 });
    await fetchLeaveRequests(5);
    expect(mock.history.get[0].params).toEqual({ page: 1, size: FACE_SIZE, status: 'pending', slim: true, organization_branch_id: 5 });
  });

  it('ijro: late first, open when nothing is late', async () => {
    mock.onGet(TASKS_OVERDUE, { params: { page: 1, size: FACE_SIZE, status: 'late' } }).reply(200, []);
    mock.onGet(TASKS_OVERDUE, { params: { page: 1, size: FACE_SIZE, status: 'open' } }).reply(200, [{ id: 3 }]);
    expect(await fetchIjro()).toEqual([{ id: 3 }]);
  });

  it('support: new tickets (urgent first) then taken, capped', async () => {
    mock.onGet(SUPPORT_TICKETS, { params: { page: 1, size: FACE_SIZE, mine: true, status: 'open', sort: 'priority' } }).reply(200, {
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
    mock.onGet(SUPPORT_TICKETS, { params: { page: 1, size: FACE_SIZE, mine: true, status: 'in_progress' } }).reply(200, {
      items: [{ id: 4 }, { id: 5 }],
    });
    expect((await fetchSupport()).map((x) => x.id)).toEqual([1, 2, 3, 4]);
  });

  it('vehicles: the approver queue, the fleet queue, and no request without a right', async () => {
    mock.onGet(VEHICLE_ACCESS).reply(200, { can_approve: true });
    mock.onGet(VEHICLE_REQUESTS).reply(200, { items: [{ id: 1 }], total: 1 });
    expect(await fetchVehicles()).toEqual([{ id: 1 }]);
    expect(mock.history.get[1].params).toEqual({ page: 1, size: FACE_SIZE, status: 'awaiting_approval' });

    mock.reset();
    mock.onGet(VEHICLE_ACCESS).reply(200, { can_manage: true });
    mock.onGet(VEHICLE_REQUESTS).reply(200, { items: [], total: 0 });
    await fetchVehicles();
    expect(mock.history.get[1].params.status).toBe('pending');

    mock.reset();
    mock.onGet(VEHICLE_ACCESS).reply(200, { can_manage: false, can_approve: false });
    expect(await fetchVehicles()).toEqual([]);
    expect(mock.history.get).toHaveLength(1);
  });

  it('duty: active groups, who is on today, names from the members', async () => {
    mock.onGet(NAVBATCHILIK_GROUPS).reply(200, {
      items: [
        { id: 1, name: 'A', is_active: true, weekdays: [], shifts: [{ start: '08:00', end: '20:00' }] },
        { id: 2, name: 'Off', is_active: false },
      ],
    });
    mock.onGet(WORK_SCHEDULE_DAYS_BY_GROUP(1)).reply(200, [
      { employee_id: 10, is_day_off: false },
      { employee_id: 11, is_day_off: true },
    ]);
    mock.onGet(NAVBATCHILIK_GROUP_MEMBERS(1)).reply(200, [{ id: 10, legal_name: 'Ali' }]);
    const rows = await fetchDuty(3);
    expect(rows).toEqual([{ key: '1-10', name: 'Ali', photo: undefined, group: 'A', from: '08:00', to: '20:00' }]);
    expect(mock.history.get[0].params).toEqual({ size: 100, organization_branch_id: 3 });
  });

  it('roster: reads the summary and the hired-this-year bucket', async () => {
    mock.onGet(DASHBOARD_ROSTER_COMPOSITION).reply(200, {
      summary: { total: 10, no_birth_date: 2, no_position: 1, seniority: { '<1': 4 } },
    });
    expect(await fetchRoster(1)).toEqual({ total: 10, no_birth_date: 2, no_position: 1, hired_year: 4 });
  });

  it('directory: search with first rows only', async () => {
    mock.onGet(PHONE_DIRECTORY).reply(200, { items: [{ id: 1 }], total: 1 });
    await fetchDirectory(' ab ');
    expect(mock.history.get[0].params).toEqual({ page: 1, size: FACE_SIZE, search: 'ab' });
  });
});

describe('face query factory', () => {
  it('keys carry the page; the branch only enters the key of branched faces', () => {
    expect(faceKeys.face('orders', { branchId: 4 })).toEqual(['dashboard', 'faces', 'orders', null, null]);
    expect(faceKeys.face('guests', { branchId: 4 })).toEqual(['dashboard', 'faces', 'guests', 4, null]);
    expect(faceKeys.face('directory', { search: ' ab ' })[5 - 1]).toBe('ab');
  });

  it('is quiet: no retry, no toast, 60s fresh; the directory waits for two characters', () => {
    const o = faceQuery('orders');
    expect(o.retry).toBe(false);
    expect(o.staleTime).toBe(60_000);
    expect(o.meta).toEqual({ skipErrorToast: true });
    expect(faceQuery('directory', { search: 'a' }).enabled).toBe(false);
    expect(faceQuery('directory', { search: 'ab' }).enabled).toBe(true);
  });

  it('every face page is a known page', () => {
    expect(FACE_PAGES.every((p) => isFacePage(p))).toBe(true);
    expect(isFacePage('kpi')).toBe(false);
  });
});
