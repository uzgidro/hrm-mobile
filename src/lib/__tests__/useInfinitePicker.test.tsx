import React, { useState } from 'react';
import { Text } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/test/renderWithProviders';
import { EMPLOYEE_OPTIONS } from '@/api/urls';
import { PickerModal } from '@/components/PickerModal';
import { useEmployeeOptionsPicker } from '../useInfinitePicker';

// Foydalanuvchi 2026-10-06: «Ro'yxat katta bo'lsa, mobilda kesib tashlayapti … mehmonlarda
// tizimdagi xodimlarda». Ilgari faqat 1-sahifa (100 ta) olinardi.
function Harness() {
  const [search, setSearch] = useState('');
  const p = useEmployeeOptionsPicker(search);
  return (
    <>
      <Text testID="rows-count">{p.rows.length}</Text>
      <PickerModal
      visible
      title="Xodim"
      options={p.rows.map((e) => ({ value: e.id, label: e.legal_name ?? '' }))}
      loading={p.loading}
      loadingMore={p.loadingMore}
      onEndReached={p.onEndReached}
      onSearchChange={setSearch}
      selected={null}
      onSelect={() => {}}
      onClose={() => {}}
      />
    </>
  );
}

describe('useEmployeeOptionsPicker + PickerModal — sahifalab yuklash', () => {
  const mock = new MockAdapter(apiClient);
  afterEach(() => mock.reset());

  it("ro'yxat oxiriga yetganda keyingi sahifa so'raladi va uning xodimlari ko'rinadi", async () => {
    mock.onGet(EMPLOYEE_OPTIONS).reply((cfg) => {
      const page = cfg.params.page as number;
      const items = page === 1
        ? Array.from({ length: 50 }, (_, i) => ({ id: i + 1, legal_name: `Xodim ${i + 1}` }))
        : [{ id: 51, legal_name: 'Oxirgi Xodim' }];
      return [200, { items, total: 51, page, size: 50, pages: 2 }];
    });
    await renderWithProviders(<Harness />);
    await screen.findByText('Xodim 1');
    expect(screen.getByTestId('rows-count').props.children).toBe(50);
    await fireEvent(screen.getByTestId('picker-list'), 'endReached');
    await waitFor(() => expect(mock.history.get.some((r) => r.params.page === 2)).toBe(true));
    // FlatList virtual — 51-qator chizilmasligi mumkin, lekin ro'yxatga qo'shilgan.
    await waitFor(() => expect(screen.getByTestId('rows-count').props.children).toBe(51));
    // Oxirgi sahifadan keyin yana so'ralmaydi.
    await fireEvent(screen.getByTestId('picker-list'), 'endReached');
    expect(mock.history.get.filter((r) => r.params.page === 3)).toHaveLength(0);
  });
});
