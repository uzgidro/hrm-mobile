import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { WORK_SCHEDULE_DAYS } from '@/api/urls';
import { createScheduleDay, updateScheduleDay, deleteScheduleDay } from '../mutations';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => mock.restore());

const payload = {
  employee_id: 5, schedule_date: '2026-07-10', schedule_type: 'A',
  working_hours_start: '08:00:00', working_hours_end: '20:00:00', is_day_off: false,
};

describe('schedule-day mutations', () => {
  it('createScheduleDay POSTs with the notify flag and returns the row', async () => {
    mock.onPost(WORK_SCHEDULE_DAYS).reply((cfg) => {
      expect(cfg.params).toMatchObject({ notify_navbatchilik: true });
      expect(JSON.parse(cfg.data)).toMatchObject({ employee_id: 5, schedule_type: 'A' });
      return [200, { id: 99, ...payload }];
    });
    const row = await createScheduleDay(payload);
    expect(row.id).toBe(99);
  });

  it('updateScheduleDay PUTs to the row id', async () => {
    mock.onPut(new RegExp('work-schedule-days/99')).reply(200, { id: 99, ...payload });
    const row = await updateScheduleDay(99, payload);
    expect(row.id).toBe(99);
  });

  it('deleteScheduleDay DELETEs the row', async () => {
    mock.onDelete(new RegExp('work-schedule-days/99')).reply(204);
    await expect(deleteScheduleDay(99)).resolves.toBeUndefined();
  });
});
