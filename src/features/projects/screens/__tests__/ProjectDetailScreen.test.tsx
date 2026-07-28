// Covers Task 22: the projects kanban board keeps its phone layout — columns
// stacked vertically in one scroll view — unchanged on phone/portrait, and on
// tablet-landscape switches to a horizontally-scrolling row of wider tracks
// so several columns are visible side by side. No kanban logic (statuses,
// card completion, navigation to the card detail screen) changes with layout.
//
// Same pattern as OrdersListScreen.test.tsx: mock `useBreakpoint` at its own
// module boundary rather than react-native's `useWindowDimensions` (which
// breaks jest-expo's native-module setup).
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent } from '@/test/renderWithProviders';
import { WORKSPACE_DETAIL, CARDS_LIST } from '@/api/urls';
import ProjectDetailScreen from '../ProjectDetailScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: '1' }),
}));

const PHONE_PORTRAIT = { width: 390, height: 844 };
const TABLET_LANDSCAPE = { width: 1180, height: 820 };

let mockWindowDimensions = PHONE_PORTRAIT;
jest.mock('@/utils/responsive', () => {
  const actual = jest.requireActual('@/utils/responsive');
  return {
    ...actual,
    useBreakpoint: () => actual.resolveBreakpoint(mockWindowDimensions.width, mockWindowDimensions.height),
  };
});

const WORKSPACE = {
  id: 1,
  name: 'Test board',
  columns: [
    { id: 10, name: 'To do', color: '#f00' },
    { id: 11, name: 'Doing', color: '#0f0' },
    { id: 12, name: 'Done', color: '#00f' },
  ],
};

describe('ProjectDetailScreen — tablet landscape board layout', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(() => {
    mockWindowDimensions = PHONE_PORTRAIT;
    mock.onGet(WORKSPACE_DETAIL(1)).reply(200, WORKSPACE);
    mock.onGet(CARDS_LIST).reply(200, []);
  });

  afterEach(() => mock.reset());

  it('phone/portrait: renders columns in a plain vertical stack (no horizontal board ScrollView)', async () => {
    const { findByText, queryByTestId } = await renderWithProviders(<ProjectDetailScreen />);

    expect(await findByText('To do')).toBeTruthy();
    expect(await findByText('Doing')).toBeTruthy();
    expect(await findByText('Done')).toBeTruthy();

    // The tablet-landscape-only horizontal board row is not rendered on phone.
    expect(queryByTestId('projects-board-scroll')).toBeNull();
  });

  it('tablet landscape: renders columns inside a horizontal ScrollView with wider tracks', async () => {
    mockWindowDimensions = TABLET_LANDSCAPE;

    const { findByText, findByTestId } = await renderWithProviders(<ProjectDetailScreen />);

    expect(await findByText('To do')).toBeTruthy();
    expect(await findByText('Doing')).toBeTruthy();
    expect(await findByText('Done')).toBeTruthy();

    const boardScroll = await findByTestId('projects-board-scroll');
    expect(boardScroll.props.horizontal).toBe(true);
  });

  it('tablet landscape: tapping a card still navigates to the card detail route (kanban logic untouched)', async () => {
    mockWindowDimensions = TABLET_LANDSCAPE;
    mock.reset();
    mock.onGet(WORKSPACE_DETAIL(1)).reply(200, WORKSPACE);
    mock.onGet(CARDS_LIST, { params: { column_id: 10 } }).reply(200, [
      { id: 100, title: 'First task', column_id: 10, is_completed: false },
    ]);
    mock.onGet(CARDS_LIST).reply(200, []);

    const { findByText } = await renderWithProviders(<ProjectDetailScreen />);

    const card = await findByText('First task');
    fireEvent.press(card);

    const { router } = jest.requireMock('expo-router');
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/loyiha-card-detail',
      params: { id: '100' },
    });
  });

  it('phone/portrait: same card tap still navigates to the card detail route', async () => {
    mock.reset();
    mock.onGet(WORKSPACE_DETAIL(1)).reply(200, WORKSPACE);
    mock.onGet(CARDS_LIST, { params: { column_id: 10 } }).reply(200, [
      { id: 100, title: 'First task', column_id: 10, is_completed: false },
    ]);
    mock.onGet(CARDS_LIST).reply(200, []);

    const { findByText } = await renderWithProviders(<ProjectDetailScreen />);

    const card = await findByText('First task');
    fireEvent.press(card);

    const { router } = jest.requireMock('expo-router');
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/loyiha-card-detail',
      params: { id: '100' },
    });
  });
});
