import { buildNavSections, flattenNavItems } from '../navItems';
import type { User } from '../../types';

const t = ((k: string) => k) as any; // identity t — structure assertions only

const ctx = (user: User | null, extra: Partial<{ pendingCount: number; unreadCount: number }> = {}) => ({
  user,
  employee: user?.employee,
  pendingCount: extra.pendingCount ?? 0,
  unreadCount: extra.unreadCount ?? 0,
});

const employeeUser = { type: 'employee', employee: { id: 1, is_multi_org_user: false } } as unknown as User;
const kppUser = {
  type: 'employee',
  employee: { id: 2, is_multi_org_user: true, multi_org_employee_role: 'kpp' },
} as unknown as User;

describe('buildNavSections', () => {
  it('drops items the role cannot access (web-parity via canAccessPage)', () => {
    const keys = flattenNavItems(buildNavSections(t, ctx(kppUser))).map((i) => i.key);
    expect(keys).not.toContain('documents'); // KPP has no documents nav
    expect(keys).toContain('guests');
    expect(keys).toContain('directory');
  });

  it('drops empty sections', () => {
    const sections = buildNavSections(t, ctx(kppUser));
    expect(sections.every((s) => s.items.length > 0)).toBe(true);
  });

  it('threads pendingCount onto requests and unreadCount onto notifications', () => {
    const items = flattenNavItems(buildNavSections(t, ctx(employeeUser, { pendingCount: 3, unreadCount: 7 })));
    expect(items.find((i) => i.key === 'requests')?.badge).toBe(3);
    expect(items.find((i) => i.key === 'notifications')?.badge).toBe(7);
  });

  it('returns a non-empty nav for a regular employee', () => {
    expect(flattenNavItems(buildNavSections(t, ctx(employeeUser))).length).toBeGreaterThan(0);
  });
});
