import { groupLabel } from '../PhoneDirectoryScreen';
import type { PhoneDirectoryEntry } from '@/types';

// Bo'lim sarlavhasi (web guruhlash pariteti): qatorlar serverdan struktura
// tartibida keladi, sarlavha faqat bo'lim/filial O'ZGARGANDA chiziladi.
const name = (id?: number | null) => (id === 1 ? 'Bosh apparat' : id === 2 ? 'Filial B' : null);
const e = (p: Partial<PhoneDirectoryEntry>): PhoneDirectoryEntry => ({ id: 0, ...p });

describe('groupLabel', () => {
  it('first row and department change → department header', () => {
    expect(groupLabel(e({ department_name: 'Kadrlar', branch_id: 1 }), undefined, name)).toBe('Bosh apparat · Kadrlar');
    expect(groupLabel(e({ department_name: 'Buxgalteriya', branch_id: 1 }), e({ department_name: 'Kadrlar', branch_id: 1 }), name)).toBe('Buxgalteriya');
  });
  it('same department → no header', () => {
    expect(groupLabel(e({ department_name: 'Kadrlar', branch_id: 1 }), e({ department_name: 'Kadrlar', branch_id: 1 }), name)).toBeNull();
  });
  it('single-branch scope never names the branch', () => {
    expect(groupLabel(e({ department_name: 'Kadrlar', branch_id: 1 }), undefined, name, false)).toBe('Kadrlar');
  });
  it('branch change is named even for the same department name', () => {
    expect(groupLabel(e({ department_name: 'Kadrlar', branch_id: 2 }), e({ department_name: 'Kadrlar', branch_id: 1 }), name)).toBe('Filial B · Kadrlar');
  });
});
