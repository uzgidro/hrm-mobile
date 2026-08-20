import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { MENU_BADGES } from '@/api/urls';
import { notificationKeys, menuBadgesQuery, type MenuBadges } from '../queries';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => mock.restore());

// Menyu raqamlari — web chap menyusidagi qizil sonlarning aynan manbai
// (backend 60s keshlaydi). Mobilда bular pastki tab bar (Bildirgi/Buyruqlar)
// va Modullar plitkalarida (Loyihalar/Hujjatlar/Texnik yordam) chiziladi.
describe('menuBadgesQuery', () => {
  it("kalit `notifications` ostida — amal bajarilgach bitta invalidate yetadi", () => {
    expect(notificationKeys.menuBadges()).toEqual(['notifications', 'menu-badges']);
    expect(notificationKeys.menuBadges().slice(0, 1)).toEqual(notificationKeys.all);
  });

  it("javobni to'ldiradi (yetishmagan kalitlar 0 bo'ladi)", async () => {
    mock.onGet(MENU_BADGES).reply(200, { letters: 3, orders: 1 });
    const data = (await (menuBadgesQuery().queryFn as () => Promise<MenuBadges>)());
    expect(data).toEqual({ letters: 3, orders: 1, support: 0, projects: 0, fleet: 0, documents: 0 });
  });

  it('xato bo\'lsa menyuni yiqitmaydi — nol raqamlar qaytadi', async () => {
    mock.onGet(MENU_BADGES).reply(500);
    const data = (await (menuBadgesQuery().queryFn as () => Promise<MenuBadges>)());
    expect(data).toEqual({ letters: 0, orders: 0, support: 0, projects: 0, fleet: 0, documents: 0 });
  });
});
