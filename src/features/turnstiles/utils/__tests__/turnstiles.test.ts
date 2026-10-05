import type { User } from '@/types';
import {
  EMPTY_DOOR,
  EMPTY_ISAPI,
  buildCredentialsBody,
  buildDoorBody,
  buildIsapiBody,
  buildTurnstileBody,
  canRunHikSync,
  doorDirection,
  isOnline,
  isapiPollOutcome,
  isapiTestOutcome,
  onlineCount,
  seedTurnstileForm,
  turnstileName,
  turnstileSubtitle,
} from '../turnstiles';

const u = (x: Record<string, unknown>) => x as unknown as User;

describe('turnstiles utils (v2 TurnstilesPage)', () => {
  it('holat: faqat "1" onlayn; son — ro‘yxatdagilar bo‘yicha', () => {
    expect(isOnline('1')).toBe(true);
    expect(isOnline('0')).toBe(false);
    expect(isOnline(null)).toBe(false);
    expect(onlineCount([{ id: 1, status: '1' }, { id: 2, status: '2' }, { id: 3 }])).toBe(1);
  });

  it('nom: display_name → acs_dev_name → #id; qator osti: IP · manzillar', () => {
    expect(turnstileName({ id: 4, display_name: 'Kirish', acs_dev_name: 'Dev' })).toBe('Kirish');
    expect(turnstileName({ id: 4, acs_dev_name: 'Dev' })).toBe('Dev');
    expect(turnstileName({ id: 4 })).toBe('#4');
    expect(
      turnstileSubtitle({
        id: 1,
        acs_dev_ip: '10.0.0.5',
        locations: [
          { id: 1, name: 'Darvoza' },
          { id: 2, name: 'Orqa' },
        ],
      }),
    ).toBe('10.0.0.5 · Darvoza, Orqa');
    expect(turnstileSubtitle({ id: 1 })).toBe('—');
  });

  it("canRunHikSync: faqat global — master-admin va filialsiz admin; AKT va filialli admin yo'q", () => {
    expect(canRunHikSync(u({ id: 1, type: 'master-admin' }))).toBe(true);
    expect(canRunHikSync(u({ id: 1, type: 'admin', admin: { organization_branch_id: null } }))).toBe(true);
    expect(canRunHikSync(u({ id: 1, type: 'admin', admin: { organization_branch_id: 3 } }))).toBe(false);
    expect(canRunHikSync(u({ id: 1, type: 'employee', akt_branch_ids: [3] }))).toBe(false);
    expect(canRunHikSync(u({ id: 1, type: 'employee', employee: { id: 2 } }))).toBe(false);
  });

  it('turniket formasi: indeks kodi, keyin nom majburiy; bo‘sh — null; port raqam', () => {
    const empty = seedTurnstileForm(null);
    expect(buildTurnstileBody(empty)).toEqual({ ok: false, error: 'turnstiles.codeRequired' });
    expect(buildTurnstileBody({ ...empty, indexCode: 'A1' })).toEqual({ ok: false, error: 'turnstiles.nameRequired' });
    expect(
      buildTurnstileBody({ ...empty, indexCode: ' A1 ', name: ' Kirish ', port: '8080', locationIds: [3] }),
    ).toEqual({
      ok: true,
      body: {
        acs_dev_index_code: 'A1',
        acs_dev_name: 'Kirish',
        acs_dev_ip: null,
        acs_dev_port: 8080,
        acs_dev_code: null,
        treaty_type: null,
        location_ids: [3],
      },
    });
  });

  it('turniket formasi tahrirda qatordan to‘ldiriladi (maxfiy maydonlar yo‘q)', () => {
    expect(
      seedTurnstileForm({
        id: 1,
        acs_dev_index_code: 'A1',
        acs_dev_name: 'Dev',
        acs_dev_ip: '10.0.0.5',
        acs_dev_port: 80,
        treaty_type: 'ISAPI',
        locations: [{ id: 7 }],
      }),
    ).toEqual({
      indexCode: 'A1',
      name: 'Dev',
      ip: '10.0.0.5',
      port: '80',
      devCode: '',
      treatyType: 'ISAPI',
      locationIds: [7],
    });
  });

  it('eshik: kod majburiy; qurilma kodi turniketdan; yo‘nalish — exit bo‘lmasa kirish', () => {
    expect(buildDoorBody(EMPTY_DOOR, 5, 'A1')).toEqual({ ok: false, error: 'turnstiles.doorCodeRequired' });
    expect(buildDoorBody({ ...EMPTY_DOOR, code: ' D1 ', direction: 'exit' }, 5, 'A1')).toEqual({
      ok: true,
      body: {
        turnstile_id: 5,
        door_index_code: 'D1',
        acs_dev_index_code: 'A1',
        door_no: null,
        door_name: null,
        direction_type: 'exit',
      },
    });
    expect(buildDoorBody({ ...EMPTY_DOOR, code: 'D1' }, 5, null).ok && true).toBe(true);
    expect(doorDirection({ direction_type: 'exit' })).toBe('exit');
    expect(doorDirection({ direction_type: null })).toBe('entrance');
  });

  it('ISAPI terminal: IP → parol → kamida bitta manzil; filial tanaga kirmaydi; port bo‘sh — 80', () => {
    expect(buildIsapiBody(EMPTY_ISAPI)).toEqual({ ok: false, error: 'turnstiles.isapiIpRequired' });
    const f = { ...EMPTY_ISAPI, ip: ' 10.2.90.6 ' };
    expect(buildIsapiBody(f)).toEqual({ ok: false, error: 'turnstiles.isapiPasswordRequired' });
    expect(buildIsapiBody({ ...f, password: 'p@ss' })).toEqual({
      ok: false,
      error: 'turnstiles.isapiLocationRequired',
    });
    expect(buildIsapiBody({ ...f, password: 'p@ss', port: '', branchId: 3, locationIds: [11] })).toEqual({
      ok: true,
      body: {
        ip: '10.2.90.6',
        port: 80,
        name: null,
        direction_type: 'entrance',
        location_ids: [11],
        username: 'admin',
        password: 'p@ss',
      },
    });
  });

  it('terminal hisobi: login majburiy; bo‘sh parol — null (joriy qoladi)', () => {
    expect(buildCredentialsBody(' ', 'x')).toEqual({ ok: false, error: 'turnstiles.isapiLoginRequired' });
    expect(buildCredentialsBody(' admin ', '')).toEqual({ ok: true, body: { username: 'admin', password: null } });
    expect(buildCredentialsBody('admin', 'new')).toEqual({ ok: true, body: { username: 'admin', password: 'new' } });
  });

  it('qurilma javoblari: sinov va hodisalarni o‘qish', () => {
    expect(isapiTestOutcome({ online: false, error: 'timeout' })).toEqual({ ok: false, text: 'timeout' });
    expect(isapiTestOutcome({ online: true, model: 'DS-K1T', firmware_version: 'V3.2' })).toEqual({
      ok: true,
      text: 'DS-K1T V3.2',
    });
    expect(isapiTestOutcome({ online: true })).toEqual({ ok: true, text: '—' });
    expect(isapiPollOutcome({ skipped: 'band', detail: 'busy' })).toEqual({ kind: 'busy', detail: 'busy' });
    expect(isapiPollOutcome({ pulled: 5, created: 2 })).toEqual({ kind: 'done', pulled: 5, created: 2 });
  });
});
