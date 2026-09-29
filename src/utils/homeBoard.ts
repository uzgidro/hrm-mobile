// Bosh sahifada qaysi panel chiqadi — web v2 `pages/DashboardPage.tsx` porti
// (2026-09-29). Tartib muhim: kiosk akkaunt (xodim kartasi yo'q) birinchi, keyin
// monitoring operatori, keyin kpp roli; «apparat» (HR, rahbariyat, line manager,
// kuzatuvchi/nazoratchi, buxgalter, master admin) — rahbar paneli; qolganlar —
// xodim paneli.
import type { User } from '@/types';
import {
  canSeeTeam,
  getRoleKey,
  isAccounting,
  isDashboardViewer,
  isDeputy,
  isHR,
  isLeadership,
  isMasterAdmin,
  isMonitoringOperator,
  isNazoratchi,
  isSeparateAccount,
} from './roles';

export type HomeBoard = 'monitoring' | 'post' | 'leader' | 'employee';

export function homeBoardFor(user: User | null | undefined): HomeBoard {
  if (!user) return 'employee';
  if (isSeparateAccount(user)) return getRoleKey(user) === 'kpp' ? 'post' : 'monitoring';
  if (isMonitoringOperator(user)) return 'monitoring';
  if (getRoleKey(user) === 'kpp') return 'post';
  const apparatus =
    // v2 hasDashboardHome = kuzatuvchi || nazoratchi
    isDashboardViewer(user) ||
    isNazoratchi(user) ||
    isHR(user) ||
    isMasterAdmin(user) ||
    isLeadership(user) ||
    canSeeTeam(user) ||
    isDeputy(user) ||
    isAccounting(user);
  return apparatus ? 'leader' : 'employee';
}
