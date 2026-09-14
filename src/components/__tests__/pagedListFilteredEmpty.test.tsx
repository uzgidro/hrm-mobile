import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PagedList } from '../PagedList';

// Filtr faol bo'lganda bo'sh ro'yxat «hech narsa yo'q» emas, «filtrga mos
// yozuv yo'q» + tozalash tugmasini ko'rsatadi (foydalanuvchi buni «filtr
// buzilgan» deb o'qigan edi, 2026-09-14).
const emptyQuery = {
  data: { pages: [{ items: [], total: 0, page: 1, size: 30, pages: 0 }], pageParams: [1] },
  isLoading: false, isError: false, error: null, isFetching: false, isRefetching: false,
  isFetchingNextPage: false, hasNextPage: false, fetchNextPage: jest.fn(), refetch: jest.fn(),
} as never;

describe('PagedList filtered empty state', () => {
  it('shows the generic empty title without filters', async () => {
    const { findByText, queryByTestId } = await renderWithProviders(
      <PagedList query={emptyQuery} keyExtractor={() => 'x'} renderItem={() => null} emptyTitle="Hech narsa" />,
    );
    expect(await findByText('Hech narsa')).toBeTruthy();
    expect(queryByTestId('empty-action')).toBeNull();
  });

  it('offers to clear filters when they are active', async () => {
    const clear = jest.fn();
    const { findByTestId, queryByText } = await renderWithProviders(
      <PagedList query={emptyQuery} keyExtractor={() => 'x'} renderItem={() => null} emptyTitle="Hech narsa"
        filtersActive onClearFilters={clear} />,
    );
    expect(queryByText('Hech narsa')).toBeNull();
    fireEvent.press(await findByTestId('empty-action'));
    expect(clear).toHaveBeenCalled();
  });
});
