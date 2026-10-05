import type { User } from '@/types';
import { greetingName } from '../components/HomeHeader';

const u = (x: Partial<User>) => ({ id: 1, type: 'employee', ...x }) as User;

describe('greetingName (v2 getDisplayName)', () => {
  it('a person card → the given name', () => {
    expect(greetingName(u({ employee: { id: 1, legal_name: 'Aliyeva Zulfiya Karimovna' } }))).toBe('Zulfiya');
    expect(greetingName(u({ type: 'admin', employee: null, admin: { legal_name: 'Karimov Javoxir' } }))).toBe(
      'Javoxir',
    );
  });

  it('accounts without a card are greeted by their display name, not «Foydalanuvchi»', () => {
    expect(greetingName(u({ type: 'master-admin', employee: null, username: 'root' }))).toBe('root');
    expect(greetingName(u({ type: 'master-admin', employee: null, master_admin: { email: 'boss@uzgidro.uz' } }))).toBe(
      'boss@uzgidro.uz',
    );
    expect(greetingName(u({ type: 'kpp', employee: null, multi_modal_user: { legal_name: 'KPP 1-post' } }))).toBe(
      'KPP 1-post',
    );
  });

  it('nothing known → empty (the screen falls back to its own label)', () => {
    expect(greetingName(null)).toBe('');
    expect(greetingName(u({ employee: null }))).toBe('');
  });
});
