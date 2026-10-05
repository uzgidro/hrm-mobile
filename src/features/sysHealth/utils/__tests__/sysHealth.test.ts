import {
  INCIDENT_KINDS,
  checkTone,
  incidentMinutes,
  isReasonValid,
  opsActions,
  overallStatus,
  prettyReport,
  recoveryBody,
  recoveryHasProblems,
  shutdownBody,
} from '../sysHealth';

describe('sysHealth utils (v2 SystemHealthPage + SystemOpsPanel)', () => {
  it("umumiy holat: so'rov yiqilsa «soz» emas; healthy=false — nosozlik", () => {
    expect(overallStatus(true, { healthy: true })).toBe('failed');
    expect(overallStatus(false, { healthy: true })).toBe('healthy');
    expect(overallStatus(false, { healthy: false })).toBe('degraded');
    expect(overallStatus(false, undefined)).toBe('healthy');
  });

  it('tekshiruv rangi: ok yashil, warning sariq, kritik qizil', () => {
    expect(checkTone({ status: 'ok', severity: null })).toBe('success');
    expect(checkTone({ status: 'fail', severity: 'warning' })).toBe('warning');
    expect(checkTone({ status: 'fail', severity: 'critical' })).toBe('danger');
  });

  it("amallar rejimga qarab: ishlayotganda to'xtatish, to'xtatilganda tiklash rejimi ham, tiklashda yo'q", () => {
    expect(opsActions('running')).toEqual(['shutdown']);
    expect(opsActions(undefined)).toEqual(['shutdown']);
    expect(opsActions('maintenance')).toEqual(['enter', 'run', 'resume']);
    expect(opsActions('recovery')).toEqual(['run', 'resume']);
  });

  it("to'xtatish sababi kamida 3 belgi (bo'shliqsiz), tana qirqilgan", () => {
    expect(isReasonValid('  ab ')).toBe(false);
    expect(isReasonValid('abc')).toBe(true);
    expect(shutdownBody('  rejali ish ', true)).toEqual({ reason: 'rejali ish', force: true });
    expect(recoveryBody('rollback')).toEqual({ tx_action: 'rollback', repair: true });
  });

  it('tiklash natijasi va hisobot matni', () => {
    expect(recoveryHasProblems({ ok: false })).toBe(true);
    expect(recoveryHasProblems({ ok: true })).toBe(false);
    expect(recoveryHasProblems(null)).toBe(false);
    expect(prettyReport({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(prettyReport(undefined)).toBe('{}');
  });

  it('hodisa davomiyligi daqiqada', () => {
    expect(incidentMinutes(150)).toBe(3);
    expect(incidentMinutes(null)).toBeNull();
  });
  it("hodisa turlari — server models/system_ops.py dagi to'rttasi (restore — zaxira nusxadan tiklash)", () => {
    expect([...INCIDENT_KINDS].sort()).toEqual(['detected', 'recovery', 'restore', 'shutdown']);
  });
});
