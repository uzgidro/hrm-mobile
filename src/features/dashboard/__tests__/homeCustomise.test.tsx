import React from 'react';
import { AccessibilityInfo } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import {
  DASHBOARD_EMPLOYEE_COUNT,
  DASHBOARD_EMPLOYEES_BY_CATEGORY,
  DASHBOARD_OVERDUE_TASKS,
  EMPLOYEES_BIRTHDAYS,
  MOBILE_CHECKINS_ME_STATUS,
  SYSTEM_SETTINGS,
  TURNSTILE_ATTENDANCE_EVENTS,
  TURNSTILE_DAY_BOARD,
  WORK_LEAVES,
} from '@/api/urls';
import i18n from '@/i18n';
import { confirm } from '@/lib/confirm';
import { createAppQueryClient } from '@/lib/queryClient';
import { wireSessionCleanup } from '@/lib/sessionCleanup';
import { dismissToast, getToasts } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { act, createTestQueryClient, fireEvent, renderWithProviders, screen, waitFor, within } from '@/test/renderWithProviders';
import { builtinHome } from '../board/homeBlocks';
import HomeCustomiseScreen from '../screens/HomeCustomiseScreen';
import HomeScreen from '../screens/HomeScreen';

jest.mock('expo-router', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
    Redirect: ({ href }: { href: string }) => <RNText>{`redirect:${href}`}</RNText>,
  };
});
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(async () => true) }));

// The per-user file store, in memory: the real one needs the native file system.
const mockFiles = new Map<string, unknown>();
jest.mock('@/lib/formDraft', () => {
  const real = jest.requireActual('@/lib/formDraft');
  return {
    ...real,
    loadDraft: jest.fn(async (k: string) => mockFiles.get(`${real.getDraftOwner()}/${k}`) ?? null),
    saveDraft: jest.fn(async (k: string, v: unknown) => void mockFiles.set(`${real.getDraftOwner()}/${k}`, v)),
  };
});

const SETTING = 'ui-settings/dashboard:board_mobile';
const EMPLOYEE = { id: 1, type: 'employee', employee: { id: 7, legal_name: 'Ali Vali' } };
const HR = {
  id: 2,
  type: 'employee',
  employee: { id: 8, legal_name: 'Vali Ali', is_multi_org_user: true, multi_org_employee_role: 'hr' },
};
const setUser = (user: unknown) => useAuthStore.setState({ user, isAuthenticated: true } as never);

describe('own home screen', () => {
  const mock = new MockAdapter(apiClient);
  let saved: unknown;
  let defaults: unknown;

  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    saved = null;
    defaults = undefined;
    mockFiles.clear();
    mock.reset();
    mock.onGet(SETTING).reply(() => [200, { key: 'k', value: saved }]);
    mock.onPut(SETTING).reply((c) => {
      saved = JSON.parse(c.data).value;
      return [200, { value: saved }];
    });
    mock.onDelete(SETTING).reply(() => {
      saved = null;
      return [204];
    });
    mock.onGet(SYSTEM_SETTINGS).reply(() => [200, { values: defaults ? { 'dashboard.defaults': defaults } : {} }]);
    mock.onGet(EMPLOYEES_BIRTHDAYS).reply(200, []);
    mock.onGet().reply(200, { items: [], total: 0 });
    setUser(EMPLOYEE);
  });
  afterEach(() => getToasts().forEach((x) => dismissToast(x.id))); // their timers would hold the worker
  afterAll(() => useAuthStore.setState({ user: null, isAuthenticated: false } as never));

  const asked = (url: string) => mock.history.get.filter((r) => r.url === url).length;
  const onScreen = () => {
    const all = screen.getAllByTestId(/^home-block-/).map((n) => String(n.props.testID).replace('home-block-', ''));
    return [...new Set(all)];
  };
  const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 50)); });

  describe('home', () => {
    it("nothing saved — the role's standard, in today's order", async () => {
      await renderWithProviders(<HomeScreen />);
      await screen.findByTestId('home-customise');
      expect(onScreen()).toEqual(['hero', 'timeline', 'stats', 'week', 'birthdays']);
    });

    it("HR — today's order", async () => {
      setUser(HR);
      await renderWithProviders(<HomeScreen />);
      await screen.findByTestId('home-customise');
      expect(onScreen()).toEqual(['leaves', 'tiles', 'live', 'status', 'birthdays', 'composition', 'discipline']);
    });

    it('saved arrangement: its order, and a block that is off neither mounts nor asks', async () => {
      setUser(HR);
      saved = { board: 'leader', blocks: ['discipline', 'leaves'] };
      await renderWithProviders(<HomeScreen />);
      await screen.findByTestId('home-customise');
      await settle();
      expect(onScreen()).toEqual(['discipline', 'leaves']);
      expect(asked(DASHBOARD_OVERDUE_TASKS)).toBe(1);
      for (const url of [
        TURNSTILE_DAY_BOARD, DASHBOARD_EMPLOYEES_BY_CATEGORY, DASHBOARD_EMPLOYEE_COUNT,
        EMPLOYEES_BIRTHDAYS, MOBILE_CHECKINS_ME_STATUS,
      ]) {
        expect([url, asked(url)]).toEqual([url, 0]);
      }
    });

    it('employee: only birthdays — no attendance of mine, no leaves', async () => {
      saved = { board: 'employee', blocks: ['birthdays'] };
      await renderWithProviders(<HomeScreen />);
      await screen.findByTestId('card-birthdays');
      await settle();
      expect(mock.history.get.filter((r) => r.url === TURNSTILE_ATTENDANCE_EVENTS && r.params?.employee_id)).toEqual([]);
      expect(asked(WORK_LEAVES)).toBe(0);
    });

    it('a block the account may not read is not drawn and not asked', async () => {
      saved = { board: 'employee', blocks: ['composition', 'tiles', 'birthdays'] };
      await renderWithProviders(<HomeScreen />);
      await screen.findByTestId('card-birthdays');
      expect(onScreen()).toEqual(['birthdays']);
      expect(asked(DASHBOARD_EMPLOYEE_COUNT)).toBe(0);
      expect(asked(TURNSTILE_DAY_BOARD)).toBe(0);
    });

    it('every block removed — empty state that opens the editor', async () => {
      saved = { board: 'employee', blocks: [] };
      await renderWithProviders(<HomeScreen />);
      expect(await screen.findByText(i18n.t('dashboard.customise.emptyTitle'))).toBeTruthy();
      await fireEvent.press(screen.getByTestId('empty-action'));
      expect(router.push).toHaveBeenCalledWith('/home-customise');
    });

    it("the administrator's standard for the role", async () => {
      setUser(HR);
      defaults = { 'mobile:hr': { blocks: ['birthdays', 'discipline'] } };
      await renderWithProviders(<HomeScreen />);
      await screen.findByTestId('home-customise');
      expect(onScreen()).toEqual(['birthdays', 'discipline']);
    });

    it.each([404, 500])('server answers %i — the local copy, else the standard', async (code) => {
      mock.onGet(SETTING).reply(code);
      const first = await renderWithProviders(<HomeScreen />);
      await screen.findByTestId('home-customise');
      expect(onScreen()).toEqual(['hero', 'timeline', 'stats', 'week', 'birthdays']);
      await first.unmount();
      mockFiles.set('u1/home-board', { uid: 1, board: 'employee', custom: true, blocks: ['week', 'hero'] });
      await renderWithProviders(<HomeScreen />);
      await screen.findByTestId('home-customise');
      expect(onScreen()).toEqual(['week', 'hero']);
    });

    it('local copy paints before the server answers', async () => {
      mock.onGet(SETTING).reply(() => new Promise(() => {}));
      mockFiles.set('u1/home-board', { uid: 1, board: 'employee', custom: true, blocks: ['week'] });
      await renderWithProviders(<HomeScreen />);
      await screen.findByTestId('home-block-week');
      expect(onScreen()).toEqual(['week']);
      expect(asked(EMPLOYEES_BIRTHDAYS)).toBe(0);
    });

    it('the server answer refreshes the local copy', async () => {
      saved = { board: 'employee', blocks: ['week'] };
      await renderWithProviders(<HomeScreen />);
      await screen.findByTestId('home-block-week');
      await waitFor(() =>
        expect(mockFiles.get('u1/home-board')).toEqual({ uid: 1, board: 'employee', custom: true, blocks: ['week'] }),
      );
    });

    it("another person signs in: neither the cache nor the local copy of the first one is used", async () => {
      const qc = createTestQueryClient();
      const off = wireSessionCleanup(qc);
      saved = { board: 'employee', blocks: ['week'] };
      const view = await renderWithProviders(<HomeScreen />, { queryClient: qc });
      await screen.findByTestId('home-block-week');
      await waitFor(() => expect(mockFiles.get('u1/home-board')).toBeTruthy());
      // A copy filed in the wrong place must not be believed either.
      mockFiles.set('u5/home-board', mockFiles.get('u1/home-board'));
      mock.onGet(SETTING).reply(500);
      await act(async () => setUser({ ...EMPLOYEE, id: 5, employee: { id: 9, legal_name: 'Boshqa Odam' } }));
      await screen.findByTestId('home-block-hero');
      expect(onScreen()).toEqual(['hero', 'timeline', 'stats', 'week', 'birthdays']);
      await view.unmount();
      off();
    });
  });

  describe('editor', () => {
    const rows = (card: 'customise-on' | 'customise-off') =>
      within(screen.getByTestId(card))
        .queryAllByTestId(/^row-/)
        .map((n) => String(n.props.testID).replace('row-', ''));
    const open = async () => {
      await renderWithProviders(<HomeCustomiseScreen />);
      await screen.findByTestId('customise-save');
    };
    const disabled = (id: string) => screen.getByTestId(id).props.accessibilityState?.disabled === true;

    it('lists the blocks on home and the ones that can be added; Save waits for a change', async () => {
      await open();
      expect(rows('customise-on')).toEqual(['trip', 'hero', 'timeline', 'stats', 'week', 'birthdays']);
      expect(rows('customise-off')).toEqual(['leaves']);
      expect(disabled('customise-save')).toBe(true);
      expect(disabled('customise-reset')).toBe(true);
      expect(disabled('up-trip')).toBe(true);
      expect(disabled('down-birthdays')).toBe(true);
      expect(screen.getByLabelText(i18n.t('dashboard.customise.up', { name: i18n.t('dashboard.home.myWeek') }))).toBeTruthy();
    });

    it('move, remove, add, save', async () => {
      await open();
      await fireEvent.press(screen.getByTestId('up-birthdays'));
      await fireEvent.press(screen.getByTestId('remove-stats'));
      await fireEvent.press(screen.getByTestId('add-leaves'));
      expect(rows('customise-on')).toEqual(['trip', 'hero', 'timeline', 'birthdays', 'week', 'leaves']);
      expect(rows('customise-off')).toEqual(['stats']);
      expect(screen.getByTestId('customise-unsaved')).toBeTruthy();
      await fireEvent.press(screen.getByTestId('customise-save'));
      await waitFor(() => expect(router.back).toHaveBeenCalled());
      // Blocks this account cannot see right now keep their places.
      expect(saved).toEqual({
        board: 'employee',
        blocks: ['sanatorium', 'health', 'trip', 'hero', 'timeline', 'birthdays', 'week', 'leaves'],
      });
      await waitFor(() => expect(mockFiles.get('u1/home-board')).toMatchObject({ custom: true }));
    });

    const drag = (fromIndex: number, toIndex: number) =>
      fireEvent(screen.getByTestId('sortable-grid'), 'dragEnd', { fromIndex, toIndex });

    it('drag by the handle, save; unseen blocks keep their places', async () => {
      await open();
      expect(screen.getByTestId('drag-hero', { includeHiddenElements: true })).toBeTruthy();
      await drag(5, 0);
      expect(rows('customise-on')).toEqual(['birthdays', 'trip', 'hero', 'timeline', 'stats', 'week']);
      await drag(2, 4);
      expect(rows('customise-on')).toEqual(['birthdays', 'trip', 'timeline', 'stats', 'hero', 'week']);
      await fireEvent.press(screen.getByTestId('customise-save'));
      await waitFor(() => expect(router.back).toHaveBeenCalled());
      expect(saved).toEqual({
        board: 'employee',
        blocks: ['sanatorium', 'health', 'birthdays', 'trip', 'timeline', 'stats', 'hero', 'week'],
      });
    });

    it('dropped where it was — nothing to save; dragging waits for a save in flight', async () => {
      let answer = () => {};
      mock.onPut(SETTING).reply(() => new Promise((ok) => { answer = () => ok([200, {}]); }));
      await open();
      await drag(1, 1);
      expect(disabled('customise-save')).toBe(true);
      expect(disabled('sortable-grid')).toBe(false);
      await drag(1, 0);
      await fireEvent.press(screen.getByTestId('customise-save'));
      await waitFor(() => expect(disabled('sortable-grid')).toBe(true));
      await act(async () => answer());
      await waitFor(() => expect(router.back).toHaveBeenCalled());
    });

    it('a drag is spoken like an arrow move', async () => {
      const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      await open();
      await drag(1, 0);
      expect(say).toHaveBeenCalledWith(
        i18n.t('dashboard.customise.moved', { name: i18n.t('dashboard.home.myDay'), n: 1, total: 6 }),
      );
    });

    it('undoing the change by hand switches Save off again', async () => {
      await open();
      await fireEvent.press(screen.getByTestId('down-hero'));
      expect(disabled('customise-save')).toBe(false);
      await fireEvent.press(screen.getByTestId('up-hero'));
      expect(disabled('customise-save')).toBe(true);
    });

    it('back to the standard: deletes the saved arrangement after a question', async () => {
      saved = { board: 'employee', blocks: ['week'] };
      await open();
      expect(rows('customise-on')).toEqual(['week']);
      await fireEvent.press(screen.getByTestId('customise-reset'));
      await waitFor(() => expect(router.back).toHaveBeenCalled());
      expect(confirm).toHaveBeenCalled();
      expect(mock.history.delete.map((r) => r.url)).toEqual([SETTING]);
      expect(saved).toBeNull();
    });

    it('back to the standard with nothing saved: only the draft goes back', async () => {
      await open();
      await fireEvent.press(screen.getByTestId('remove-hero'));
      await fireEvent.press(screen.getByTestId('customise-reset'));
      expect(rows('customise-on')).toEqual(['trip', 'hero', 'timeline', 'stats', 'week', 'birthdays']);
      expect(mock.history.delete).toEqual([]);
    });

    it('a failed save: the usual error toast, the draft stays', async () => {
      mock.onPut(SETTING).reply(404);
      const qc = createAppQueryClient();
      // Its ten-minute cache timers would hold the jest worker.
      qc.setDefaultOptions({ queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } });
      await renderWithProviders(<HomeCustomiseScreen />, { queryClient: qc });
      await screen.findByTestId('customise-save');
      await fireEvent.press(screen.getByTestId('remove-hero'));
      await fireEvent.press(screen.getByTestId('customise-save'));
      await waitFor(() => expect(getToasts().some((x) => x.kind === 'error')).toBe(true));
      expect(router.back).not.toHaveBeenCalled();
      expect(rows('customise-on')).not.toContain('hero');
      expect(disabled('customise-save')).toBe(false);
    });

    it('every block can go', async () => {
      saved = { board: 'employee', blocks: ['week'] };
      await open();
      await fireEvent.press(screen.getByTestId('remove-week'));
      expect(screen.getByText(i18n.t('dashboard.customise.noneOnHome'))).toBeTruthy();
      await fireEvent.press(screen.getByTestId('customise-save'));
      await waitFor(() => expect(saved).toEqual({ board: 'employee', blocks: [] }));
    });

    it('a master admin is not offered personal blocks', async () => {
      setUser({ id: 3, type: 'master-admin' });
      await open();
      expect(rows('customise-on')).toEqual(builtinHome('leader').slice(4));
      expect(rows('customise-off')).toEqual([]);
    });

    it('an account without a home of its own is sent home', async () => {
      setUser({ id: 4, type: 'kpp' });
      await renderWithProviders(<HomeCustomiseScreen />);
      expect(screen.getByText('redirect:/')).toBeTruthy();
    });
  });
});
