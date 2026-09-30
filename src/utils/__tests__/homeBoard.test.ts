import { homeBoardFor } from '../homeBoard';
import type { User } from '@/types';

const u = (x: Record<string, unknown>) => x as unknown as User;
// Multi-org rollari user.employee ichida keladi (getMultiOrgRoles).
const multi = (role: string | string[], extra: Record<string, unknown> = {}) =>
  u({ id: 1, type: 'employee', employee: { id: 5, is_multi_org_user: true, multi_org_employee_role: role }, ...extra });

describe('homeBoardFor — v2 DashboardPage paritet', () => {
  it.each<[string, User | null, string]>([
    ['kpp kiosk akkaunt', u({ id: 1, type: 'kpp' }), 'post'],
    ['monitoring kiosk akkaunt', u({ id: 1, type: 'monitoring' }), 'monitoring'],
    ['monitoring operator xodim', multi('monitoring_operator'), 'monitoring'],
    ['kpp rolidagi xodim', multi('kpp'), 'post'],
    ['HR (string)', multi('hr'), 'leader'],
    ['HR (massiv)', multi(['hr']), 'leader'],
    ['deputy', multi('deputy'), 'leader'],
    ['ministr', multi('ministr'), 'leader'],
    ['kuzatuvchi (dashboard)', multi('dashboard'), 'leader'],
    ['nazoratchi', multi('nazoratchi'), 'leader'],
    ['buxgalter', multi('accounting'), 'leader'],
    ['line manager', u({ id: 1, type: 'employee', employee: { id: 5 }, is_line_manager: true }), 'leader'],
    ['master admin', u({ id: 1, type: 'master-admin' }), 'leader'],
    // v2: devonxona → /orders (master admin bundan mustasno)
    ['devonxona', multi('chancellery'), 'chancellery'],
    ['devonxona + deputy (massiv)', multi(['chancellery', 'deputy']), 'chancellery'],
    ['filial devonxonasi (biriktirilgan)', u({ id: 1, type: 'employee', employee: { id: 5 }, chancellery_branch_ids: [3] }), 'chancellery'],
    // v2: filial admin akkaunti → /filiallar; mehmon → ariza holati
    ['filial admin akkaunti', u({ id: 1, type: 'admin' }), 'admin'],
    ['mehmon', u({ id: 1, type: 'guest' }), 'guest'],
    ['kpp roli (massiv)', multi(['kpp']), 'post'],
    ['oddiy xodim', u({ id: 1, type: 'employee', employee: { id: 5 } }), 'employee'],
    ['null', null, 'employee'],
  ])('%s', (_n, user, board) => expect(homeBoardFor(user)).toBe(board));
});
