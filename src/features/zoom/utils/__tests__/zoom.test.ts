import i18n from '@/i18n';
import {
  buildCreateBody,
  buildInvitation,
  buildRecurrence,
  canProbe,
  cancelLabelKey,
  composeDuration,
  currentVerdict,
  dayLabelKey,
  expandRecurrence,
  formatMeetingId,
  initialZoomForm,
  inTashkent,
  isClosed,
  isValidReason,
  isoWeekday,
  liveTone,
  meetingActions,
  previewDays,
  recurrenceLabel,
  splitDuration,
  startAtOf,
  startOutcome,
  statusTone,
  statusesForScope,
  submitBlocked,
  tashkentToday,
  tashkentWall,
  timeRangeText,
  validateZoomForm,
  type ZoomAvailability,
  type ZoomForm,
  type ZoomMeeting,
} from '../zoom';

const t = i18n.t.bind(i18n);
beforeAll(async () => {
  await i18n.changeLanguage('uz-Latn');
});

const meeting = (p: Partial<ZoomMeeting> = {}): ZoomMeeting => ({ id: 1, status: 'approved', ...p });
const form = (p: Partial<ZoomForm> = {}): ZoomForm => ({ ...initialZoomForm('2026-10-05'), topic: 'Kengash', ...p });

describe('Toshkent vaqti (qurilma TZ dan mustaqil)', () => {
  it('UTC / offset / mintaqasiz satr → Toshkent devor soati', () => {
    expect(tashkentWall('2026-10-05T04:30:00Z')).toBe('2026-10-05T09:30:00');
    expect(tashkentWall('2026-10-05T04:30:00.123456+00:00')).toBe('2026-10-05T09:30:00');
    expect(tashkentWall('2026-10-05T09:30:00+05:00')).toBe('2026-10-05T09:30:00');
    // Mintaqasiz — server assume_tashkent.
    expect(tashkentWall('2026-10-05T09:30:00')).toBe('2026-10-05T09:30:00');
    // Kun chegarasi: 20:00Z → ertasi 01:00.
    expect(tashkentWall('2026-10-05T20:00:00Z')).toBe('2026-10-06T01:00:00');
    expect(tashkentWall(null)).toBeNull();
    expect(tashkentWall('bekor')).toBeNull();
    expect(inTashkent('2026-10-05T04:30:00Z')!.format('DD.MM.YYYY HH:mm')).toBe('05.10.2026 09:30');
  });

  it('bugun Toshkent bo‘yicha; Bugun/Ertaga/Kecha', () => {
    expect(tashkentToday(Date.parse('2026-10-05T20:00:00Z'))).toBe('2026-10-06');
    expect(dayLabelKey('2026-10-05', '2026-10-05')).toBe('today');
    expect(dayLabelKey('2026-10-06', '2026-10-05')).toBe('tomorrow');
    expect(dayLabelKey('2026-10-04', '2026-10-05')).toBe('yesterday');
    expect(dayLabelKey('2026-10-09', '2026-10-05')).toBeNull();
    expect(dayLabelKey('', '2026-10-05')).toBeNull();
  });

  it('qator vaqti: boshlanish – tugash · davomiylik', () => {
    expect(
      timeRangeText(
        meeting({ start_at: '2026-10-05T05:00:00Z', end_at: '2026-10-05T06:00:00Z', duration_minutes: 60 }),
        t,
      ),
    ).toBe('10:00 – 11:00 · 60 daq');
    expect(timeRangeText(meeting(), t)).toBe('—');
  });
});

describe('taklifnoma (v2 invitation.ts)', () => {
  it('formatMeetingId — 11 raqam Zoom kabi bo‘linadi, qolgani o‘zgarmaydi', () => {
    expect(formatMeetingId(98498148442)).toBe('984 9814 8442');
    expect(formatMeetingId('1234567890')).toBe('1234567890');
    expect(formatMeetingId(null)).toBe('');
  });

  it('buildInvitation — mavzu, Toshkent vaqti, havola, raqam, parol', () => {
    const text = buildInvitation(
      meeting({
        topic: 'Kengash',
        start_at: '2026-10-05T05:00:00Z',
        join_url: 'https://zoom.us/j/98498148442?pwd=x',
        zoom_meeting_id: 98498148442,
        passcode: 'ab12',
      }),
      t,
    );
    expect(text.split('\n')).toEqual([
      t('zoom.invHeader'),
      '',
      'Mavzu: Kengash',
      'Vaqt: 05.10.2026 10:00',
      '',
      "Zoom yig'ilishiga qo'shilish:",
      'https://zoom.us/j/98498148442?pwd=x',
      '',
      "Yig'ilish raqami: 984 9814 8442",
      'Parol: ab12',
    ]);
    // Parolsiz — parol qatori yo'q.
    expect(buildInvitation(meeting({ topic: 'X' }), t)).not.toContain('Parol');
  });
});

describe('holat va amallar', () => {
  it('holat → ton; noma’lum — neytral', () => {
    expect(statusTone('pending')).toBe('warning');
    expect(statusTone('approved')).toBe('success');
    expect(statusTone('rejected')).toBe('danger');
    expect(statusTone('ended')).toBe('neutral');
    expect(statusTone('weird')).toBe('neutral');
    expect(isClosed('cancelled')).toBe(true);
    expect(isClosed('approved')).toBe(false);
  });

  it('faol tab — faqat pending/approved filtri; arxiv — hammasi', () => {
    expect(statusesForScope('active')).toEqual(['pending', 'approved']);
    expect(statusesForScope('archive')).toEqual(['pending', 'approved', 'rejected', 'cancelled', 'ended']);
  });

  it('amallar faqat server bayroqlaridan (can_manage / can_approve)', () => {
    const none = meetingActions(meeting({ join_url: 'https://z', passcode: '1' }));
    expect(none).toEqual({
      join: true,
      passcode: true,
      approve: false,
      reject: false,
      start: false,
      hostKey: false,
      cancel: false,
      cancelSeries: false,
    });
    const approver = meetingActions(meeting({ status: 'pending', can_approve: true, can_manage: true }));
    expect(approver.approve && approver.reject && approver.cancel).toBe(true);
    expect(approver.start).toBe(false);
    const owner = meetingActions(meeting({ can_manage: true, series_id: 4 }));
    expect(owner.start && owner.hostKey && owner.cancel && owner.cancelSeries).toBe(true);
    // Yopilgan yig'ilishda qo'shilish/bekor yo'q (v2: arxivda «Qo'shilish» chiqmasin).
    const closed = meetingActions(meeting({ status: 'ended', can_manage: true, join_url: 'https://z' }));
    expect(closed.join || closed.cancel || closed.start).toBe(false);
  });

  it('bekor yorlig‘i: boshlangan → Tugatish, seriya → shu kun, aks holda Bekor', () => {
    expect(cancelLabelKey(meeting({ is_started: true, series_id: 2 }))).toBe('zoom.finish');
    expect(cancelLabelKey(meeting({ is_live: true }))).toBe('zoom.finish');
    expect(cancelLabelKey(meeting({ series_id: 2 }))).toBe('zoom.cancelThisDay');
    expect(cancelLabelKey(meeting())).toBe('common.cancel');
  });

  it('«Boshlash» natijasi — yozuv holati bo‘yicha toast', () => {
    expect(startOutcome({ recording: 'failed', warning: 'scope' })).toEqual({
      kind: 'error',
      key: 'zoom.recordingFailed',
      params: { reason: 'scope' },
    });
    expect(startOutcome({ recording: 'armed' }).key).toBe('zoom.recordingArmed');
    expect(startOutcome({ recording: 'started' }).key).toBe('zoom.recordingStarted');
    expect(startOutcome({ recording: 'off' })).toEqual({ kind: 'success', key: 'zoom.startOpened' });
  });

  it('jonli chip toni va rad sababi', () => {
    expect(liveTone({ is_full: true, live_count: 2 })).toBe('danger');
    expect(liveTone({ is_full: false, live_count: 1 })).toBe('success');
    expect(liveTone({ is_full: false, live_count: 0 })).toBe('neutral');
    expect(isValidReason(' a ')).toBe(false);
    expect(isValidReason('ok')).toBe(true);
  });
});

describe('takrorlash', () => {
  it('yorliq (v2 recurrenceLabel)', () => {
    expect(recurrenceLabel({ type: 'daily', interval: 1 }, t)).toBe('Har kuni');
    expect(recurrenceLabel({ type: 'daily', interval: 3 }, t)).toBe('har 3 kunda');
    expect(recurrenceLabel({ type: 'weekly', interval: 2, weekdays: [1, 3] }, t)).toBe('har 2 haftada (Du, Cho)');
    expect(recurrenceLabel({ type: 'monthly', interval: 1 }, t)).toBe('Har oy');
    expect(recurrenceLabel(null, t)).toBe('');
  });

  it('ISO hafta kuni', () => {
    expect(isoWeekday('2026-10-05')).toBe(1); // dushanba
    expect(isoWeekday('2026-10-11')).toBe(7); // yakshanba
  });

  it('kunlik / haftalik / oylik kengaytirish (server qoidasi)', () => {
    expect(expandRecurrence('2026-10-05T10:00:00', { type: 'daily', interval: 2, weekdays: [], count: 3 })).toEqual([
      '2026-10-05T10:00:00',
      '2026-10-07T10:00:00',
      '2026-10-09T10:00:00',
    ]);
    // Dushanba boshlanish + Chorshanba; boshlanish kuni doim kiradi.
    expect(expandRecurrence('2026-10-05T10:00:00', { type: 'weekly', interval: 1, weekdays: [3], count: 4 })).toEqual([
      '2026-10-05T10:00:00',
      '2026-10-07T10:00:00',
      '2026-10-12T10:00:00',
      '2026-10-14T10:00:00',
    ]);
    // 31-sana bo'lmagan oylar o'tkazib yuboriladi.
    expect(expandRecurrence('2026-01-31T09:00:00', { type: 'monthly', interval: 1, weekdays: [], count: 3 })).toEqual([
      '2026-01-31T09:00:00',
      '2026-03-31T09:00:00',
      '2026-05-31T09:00:00',
    ]);
    expect(expandRecurrence('2026-10-05T10:00:00', { type: 'daily', interval: 1, weekdays: [], count: 1 })).toEqual([]);
  });

  it('ko‘rinish matni — 6 tadan ko‘pi qisqartiriladi', () => {
    const days = expandRecurrence('2026-10-05T10:00:00', { type: 'daily', interval: 1, weekdays: [], count: 8 });
    expect(previewDays(days)).toBe('05.10, 06.10, 07.10, 08.10, 09.10, 10.10 … 12.10.2026');
    expect(previewDays(days.slice(0, 2))).toBe('05.10, 06.10');
  });
});

describe('yaratish formasi', () => {
  it('davomiylik soat+daqiqa, 10..1440 ga qisiladi', () => {
    expect(composeDuration(1, 30)).toBe(90);
    expect(composeDuration(0, 0)).toBe(10);
    expect(composeDuration(24, 45)).toBe(1440);
    expect(splitDuration(90)).toEqual({ hours: 1, minutes: 30 });
    expect(splitDuration(0)).toEqual({ hours: 1, minutes: 0 });
  });

  it('mintaqasiz boshlanish satri (server Toshkent deb oladi)', () => {
    expect(startAtOf({ date: '2026-10-05', time: '14:30' })).toBe('2026-10-05T14:30:00');
    expect(startAtOf({ date: '', time: '14:30' })).toBeNull();
  });

  it('takrorlash qoidasi: interval 1..12 ga qisiladi, haftalik bo‘lmasa weekdays bo‘sh', () => {
    expect(buildRecurrence(form())).toBeNull();
    expect(buildRecurrence(form({ repeat: 'weekly', interval: '40', weekdays: [5, 2], count: '6' }))).toEqual({
      type: 'weekly',
      interval: 12,
      weekdays: [2, 5],
      count: 6,
    });
    expect(buildRecurrence(form({ repeat: 'daily', interval: '', weekdays: [3], count: '5' }))).toEqual({
      type: 'daily',
      interval: 1,
      weekdays: [],
      count: 5,
    });
  });

  it('tekshiruv: mavzu ≥2, davomiylik 5..1440, takror soni 2..50', () => {
    expect(validateZoomForm(form({ topic: ' a ' }))).toBe('topicRequired');
    expect(validateZoomForm(form({ duration: 2000 }))).toBe('durationRange');
    expect(validateZoomForm(form({ repeat: 'daily', count: '1' }))).toBe('repeatCountRange');
    expect(validateZoomForm(form({ repeat: 'daily', count: '51' }))).toBe('repeatCountRange');
    expect(validateZoomForm(form())).toBeNull();
  });

  it('yuboriladigan tana — v2 bilan bir xil (join_before_host doim true)', () => {
    expect(buildCreateBody(form({ topic: ' Kengash ', agenda: '  ', record: true, time: '15:00' }))).toEqual({
      topic: 'Kengash',
      start_at: '2026-10-05T15:00:00',
      duration_minutes: 60,
      agenda: null,
      record: true,
      waiting_room: false,
      join_before_host: true,
      recurrence: null,
    });
  });
});

describe('bandlik', () => {
  const free: ZoomAvailability = {
    date: '2026-10-05',
    max_concurrent: 2,
    meetings: [],
    overlapping_count: 0,
    is_free: true,
  };
  it('so‘rov faqat aniq boshlanish va 5..1440 daqiqada', () => {
    expect(canProbe('2026-10-05T10:00:00', 60)).toBe(true);
    expect(canProbe(null, 60)).toBe(false);
    expect(canProbe('2026-10-05T10:00:00', 4)).toBe(false);
    expect(canProbe('2026-10-05T10:00:00', 1441)).toBe(false);
  });

  it('javob faqat joriy oraliqqa tegishli bo‘lsa ishlatiladi; band — yuborish o‘chiq', () => {
    const a = { start: '2026-10-05T10:00:00', minutes: 60 };
    expect(currentVerdict(free, a, a)).toBe(free);
    expect(currentVerdict(free, a, { ...a, minutes: 90 })).toBeNull();
    expect(currentVerdict(null, a, a)).toBeNull();
    expect(submitBlocked(null)).toBe(false);
    expect(submitBlocked(free)).toBe(false);
    expect(submitBlocked({ ...free, is_free: false })).toBe(true);
  });
});
