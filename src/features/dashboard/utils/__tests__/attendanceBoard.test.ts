import {
  buildAttendanceRows,
  countByStatus,
  countDirections,
  getDisplayStatus,
  hydrateDayBoard,
  type BoardEvent,
  type DayBoard,
} from '../attendanceBoard';

const emp = (id: number, legal_name = `E${id}`) => ({ id, legal_name }) as never;
const ev = (employee_id: number, time: string, dir: 'entrance' | 'exit', extra: Partial<BoardEvent> = {}): BoardEvent => ({
  employee_id,
  happen_time: `2026-09-29T${time}:00+05:00`,
  direction_type: dir,
  ...extra,
});

describe('buildAttendanceRows — v2 porti', () => {
  it("kategoriya ro'yxatlari + voqealar → bitta qator har xodimga", () => {
    const rows = buildAttendanceRows([ev(1, '08:50', 'entrance'), ev(2, '09:40', 'entrance'), ev(2, '18:05', 'exit')], {
      present_employees: [emp(1), emp(2)],
      late_employees: [emp(2)],
      absent_employees: [emp(3)],
      on_vacation_employees: [emp(4)],
    });
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(by[1].category).toBe('present');
    expect(by[2].category).toBe('late'); // maxsus holat 'present' dan oldin
    expect(by[2].hasExited).toBe(true);
    expect(by[3].category).toBe('absent');
    expect(by[4].category).toBe('vacation');
  });

  it("kelmaganlar ro'yxatida bo'lsa-yu, voqeasi bor — keldi deb hisoblanadi", () => {
    const [row] = buildAttendanceRows([ev(3, '10:00', 'entrance')], { absent_employees: [emp(3)] });
    expect(row.category).toBe('present');
  });

  it("hech bir ro'yxatda yo'q, lekin voqeasi bor — present", () => {
    const [row] = buildAttendanceRows([ev(9, '08:00', 'entrance', { employee: emp(9) })], {});
    expect(row.category).toBe('present');
  });

  it('eng erta kirish va eng kech chiqish olinadi', () => {
    const [row] = buildAttendanceRows(
      [ev(1, '09:10', 'entrance'), ev(1, '08:55', 'entrance'), ev(1, '17:00', 'exit'), ev(1, '18:30', 'exit')],
      { present_employees: [emp(1)] },
    );
    expect(row.entry?.happen_time).toContain('08:55');
    expect(row.exit?.happen_time).toContain('18:30');
  });

  it("bo'sh kirish — xato emas", () => {
    expect(buildAttendanceRows([], undefined)).toEqual([]);
  });
});

describe('countByStatus / countDirections', () => {
  it('donut hisoblagichlari', () => {
    const rows = buildAttendanceRows([ev(1, '08:50', 'entrance')], {
      present_employees: [emp(1)],
      late_employees: [emp(2)],
      absent_employees: [emp(3)],
      on_business_trip_employees: [emp(4)],
    });
    expect(countByStatus(rows)).toMatchObject({ present: 1, late: 1, arrived: 2, absent: 1, trip: 1, other: 1, total: 4 });
  });

  it("yo'nalish: direction_type, check_in_out_type, qurilma nomi", () => {
    expect(
      countDirections([
        ev(1, '08:00', 'entrance'),
        ev(1, '12:00', 'exit'),
        { employee_id: 2, happen_time: 'x', check_in_out_type: 2 },
        { employee_id: 3, happen_time: 'x', turnstile: { acs_dev_name: 'Chiqish-1' } },
        { employee_id: 4, happen_time: 'x' },
      ]),
    ).toEqual({ entries: 2, exits: 3 });
  });
});

describe('getDisplayStatus', () => {
  it('kech kelgan, hali ichkarida → arrived/success', () => {
    const [row] = buildAttendanceRows([ev(2, '09:40', 'entrance')], { late_employees: [emp(2)] });
    expect(getDisplayStatus(row)).toMatchObject({ key: 'arrived', tone: 'success' });
  });
  it('chiqib ketgan → left/neutral', () => {
    const [row] = buildAttendanceRows([ev(1, '08:00', 'entrance'), ev(1, '18:00', 'exit')], { present_employees: [emp(1)] });
    expect(getDisplayStatus(row)).toMatchObject({ key: 'left', tone: 'neutral' });
  });
  it('rad etilgan kirish → denied/danger', () => {
    const [row] = buildAttendanceRows([ev(1, '08:00', 'entrance', { is_granted: false })], { present_employees: [emp(1)] });
    expect(getDisplayStatus(row)).toMatchObject({ key: 'denied', tone: 'danger' });
  });
});

describe('hydrateDayBoard', () => {
  it("id'lar bo'yicha xodim/turniket ulanadi, latest tartibi saqlanadi", () => {
    const board: DayBoard = {
      day: '2026-09-29',
      entries: 2,
      exits: 1,
      total: 3,
      max_id: 12,
      people: [{ employee_id: 1, entry_id: 10, exit_id: 12, last_id: 12, last_direction: 'exit' }],
      latest: [12, 11],
      events: [
        { id: 10, employee_id: 1, happen_time: 't1', direction_type: 'entrance', turnstile_id: 5 },
        { id: 11, employee_id: 2, happen_time: 't2', direction_type: 'entrance', turnstile_id: 5 },
        { id: 12, employee_id: 1, happen_time: 't3', direction_type: 'exit', turnstile_id: 5 },
      ],
      employees: [emp(1, 'Ali'), emp(2, 'Vali')],
      turnstiles: [{ id: 5, acs_dev_name: 'Asosiy kirish' }],
    };
    const h = hydrateDayBoard(board);
    expect(h.entries).toBe(2);
    expect(h.latest.map((e) => e.id)).toEqual([12, 11]);
    expect(h.latest[0].employee).toMatchObject({ legal_name: 'Ali' });
    expect(h.latest[0].turnstile_name).toBe('Asosiy kirish');
    expect(h.personEvents.map((e) => e.id).sort()).toEqual([10, 12]);
  });
  it("undefined → bo'sh", () => {
    expect(hydrateDayBoard(undefined)).toMatchObject({ entries: 0, exits: 0, latest: [], personEvents: [] });
  });
});
