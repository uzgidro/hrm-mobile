import { visibleTabs, TAB_META } from '../tabs';
import { setNavOverrides } from '@/utils/roles';
import type { User } from '@/types';

const u = (x: Record<string, unknown>) => x as unknown as User;
const emp = u({ id: 1, type: 'employee', employee: { id: 1 } });

afterEach(() => setNavOverrides(undefined));

describe('visibleTabs — rolga qarab', () => {
  it('oddiy xodim', () => {
    expect(visibleTabs(emp)).toEqual(['index', 'attendance', 'documents', 'modules', 'profile']);
  });
  it('kpp kiosk', () => expect(visibleTabs(u({ id: 1, type: 'kpp' }))).toEqual(['post', 'profile']));
  it('monitoring kiosk', () => expect(visibleTabs(u({ id: 1, type: 'monitoring' }))).toEqual(['monitoring', 'profile']));
  it("uchala hujjat moduli o'chirilsa documents tabi yo'q", () => {
    setNavOverrides({ orders: { enabled: false }, letters: { enabled: false }, documents: { enabled: false } });
    expect(visibleTabs(emp)).not.toContain('documents');
  });
  it("faqat bittasi qolsa ham documents tabi bor", () => {
    setNavOverrides({ orders: { enabled: false }, letters: { enabled: false } });
    expect(visibleTabs(emp)).toContain('documents');
  });
  it('har tabning meta ma\'lumoti bor', () => {
    for (const k of ['index', 'attendance', 'documents', 'modules', 'profile', 'post', 'monitoring'] as const) {
      expect(TAB_META[k].labelKey).toMatch(/^tabs\./);
    }
  });
});
