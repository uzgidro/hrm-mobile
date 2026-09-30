import { docSegments, pickSegment } from '../utils/docSegments';
import { setNavOverrides } from '@/utils/roles';
import type { User } from '@/types';

const emp = { id: 1, type: 'employee', employee: { id: 1 } } as unknown as User;
afterEach(() => setNavOverrides(undefined));

describe('docSegments', () => {
  it("xodim uchala segmentni ko'radi", () => expect(docSegments(emp)).toEqual(['orders', 'letters', 'documents']));
  it("o'chirilgan modul segmenti yo'q", () => {
    setNavOverrides({ letters: { enabled: false } });
    expect(docSegments(emp)).toEqual(['orders', 'documents']);
  });
});

describe('pickSegment', () => {
  it("so'ralgan mavjud bo'lsa — o'sha", () => expect(pickSegment('letters', ['orders', 'letters'])).toBe('letters'));
  it("so'ralgan yo'q bo'lsa — birinchisi", () => expect(pickSegment('documents', ['orders', 'letters'])).toBe('orders'));
  it("so'rov yo'q — birinchisi", () => expect(pickSegment(undefined, ['letters'])).toBe('letters'));
  it("noma'lum qiymat — birinchisi", () => expect(pickSegment('xyz', ['orders'])).toBe('orders'));
});
