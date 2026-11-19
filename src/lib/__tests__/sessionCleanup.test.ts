// Xavfsizlik auditi 2026-10-09: A chiqib B kirsa, B A ning keshdagi ma'lumotini
// (profil, tabel, maosh) so'rovsiz ko'rmasin.
import { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { wireSessionCleanup } from '../sessionCleanup';
import type { User } from '@/types';

const userA = { id: 1 } as User;
const userB = { id: 2 } as User;

describe('wireSessionCleanup', () => {
  let qc: QueryClient;
  let unwire: () => void;
  beforeEach(() => {
    // gcTime: Infinity — aks holda GC taymeri jest'ni yopilishdan to'xtatadi.
    qc = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    useAuthStore.setState({ user: userA, isAuthenticated: true });
    qc.setQueryData(['me'], { salary: 1000 });
    unwire = wireSessionCleanup(qc);
  });
  afterEach(() => {
    unwire();
    qc.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('chiqish (user → null) keshni darhol tozalaydi', () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    expect(qc.getQueryData(['me'])).toBeUndefined();
  });

  it('boshqa foydalanuvchi kirsa ham tozalanadi', () => {
    useAuthStore.setState({ user: userB });
    expect(qc.getQueryData(['me'])).toBeUndefined();
  });

  it('o\'sha foydalanuvchi yangilansa (parol bayrog\'i va h.k.) kesh qoladi', () => {
    useAuthStore.setState({ user: { ...userA, password_must_change: true } as User });
    expect(qc.getQueryData(['me'])).toEqual({ salary: 1000 });
  });
});
