import { findExecutiveBranchId } from '../branch';
import type { OrganizationBranch } from '../../types';

const b = (id: number, name: string): OrganizationBranch => ({ id, name });

describe('findExecutiveBranchId', () => {
  it('matches the head company (O‘zbekgidroenergo AJ), apostrophe/quote-normalized', () => {
    const branches = [b(3, 'Chirchiq filiali'), b(7, 'O‘zbekgidroenergo" AJ'), b(9, 'Tuyamuyun filiali')];
    expect(findExecutiveBranchId(branches)).toBe(7);
  });

  it('does NOT match a branch (filial) even if it carries the company name', () => {
    const branches = [b(4, 'Ozbekgidroenergo AJ filiali')];
    expect(findExecutiveBranchId(branches)).toBe(1); // falls back
  });

  it('falls back to branch id 1 when no head company is present', () => {
    expect(findExecutiveBranchId([b(2, 'Andijon filiali')])).toBe(1);
    expect(findExecutiveBranchId([])).toBe(1);
    expect(findExecutiveBranchId(null)).toBe(1);
  });
});
