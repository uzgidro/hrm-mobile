import { dayAttendanceDetail } from '../utils';
import type { AttendanceEvent } from '@/types';

const ev = (id: number, time: string, dir: 'entrance' | 'exit'): AttendanceEvent => ({
  id,
  happen_time: time,
  direction_type: dir,
});

// check_in_out_type is the numeric fallback the backend also sends (1=in, 2=out).
const evNum = (id: number, time: string, cio: 1 | 2): AttendanceEvent => ({
  id,
  happen_time: time,
  check_in_out_type: cio,
});

describe('dayAttendanceDetail', () => {
  it('picks first entry and last exit for the day', () => {
    const events = [
      ev(1, '2026-07-17T08:38:00', 'entrance'),
      ev(2, '2026-07-17T12:00:00', 'exit'),
      ev(3, '2026-07-17T13:00:00', 'entrance'),
      ev(4, '2026-07-17T18:31:00', 'exit'),
    ];
    const d = dayAttendanceDetail(events, '2026-07-17');
    expect(d.firstEntry?.happen_time).toBe('2026-07-17T08:38:00');
    expect(d.lastExit?.happen_time).toBe('2026-07-17T18:31:00');
  });

  it('recognizes the numeric check_in_out_type fallback (1=in, 2=out)', () => {
    const events = [evNum(1, '2026-07-17T09:00:00', 1), evNum(2, '2026-07-17T17:00:00', 2)];
    const d = dayAttendanceDetail(events, '2026-07-17');
    expect(d.firstEntry?.id).toBe(1);
    expect(d.lastExit?.id).toBe(2);
  });

  it('returns the day journal sorted chronologically', () => {
    const events = [
      ev(2, '2026-07-17T18:31:00', 'exit'),
      ev(1, '2026-07-17T08:38:00', 'entrance'),
    ];
    const d = dayAttendanceDetail(events, '2026-07-17');
    expect(d.journal.map((e) => e.id)).toEqual([1, 2]);
  });

  it('ignores events from other days', () => {
    const events = [
      ev(1, '2026-07-16T09:00:00', 'entrance'),
      ev(2, '2026-07-17T09:00:00', 'entrance'),
      ev(3, '2026-07-18T09:00:00', 'exit'),
    ];
    const d = dayAttendanceDetail(events, '2026-07-17');
    expect(d.journal.map((e) => e.id)).toEqual([2]);
    expect(d.lastExit).toBeUndefined();
  });

  it('handles a day with no events', () => {
    const d = dayAttendanceDetail([], '2026-07-17');
    expect(d.firstEntry).toBeUndefined();
    expect(d.lastExit).toBeUndefined();
    expect(d.journal).toEqual([]);
  });

  it('handles an entry with no matching exit (and vice versa)', () => {
    const d = dayAttendanceDetail([ev(1, '2026-07-17T09:00:00', 'entrance')], '2026-07-17');
    expect(d.firstEntry?.id).toBe(1);
    expect(d.lastExit).toBeUndefined();
  });
});
