import React, { useState } from 'react';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import { ListFilterBar } from '../ListFilterBar';

function Harness() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  return (
    <ListFilterBar
      testID="f"
      search={search}
      onSearch={setSearch}
      placeholder="Qidirish"
      groups={[
        { key: 'type', title: 'Tur', allValue: 'all', allLabel: 'Barcha turlar', options: [{ value: 'a', label: 'Ariza' }], value: type, onChange: setType },
        { key: 'status', title: 'Holat', allValue: 'all', allLabel: 'Barcha holatlar', options: [{ value: 'draft', label: 'Qoralama' }], value: status, onChange: setStatus },
      ]}
    />
  );
}

describe('ListFilterBar — bitta «Filtr» tugmasi (chip qatorlari o\'rniga)', () => {
  beforeEach(() => i18n.changeLanguage('uz-Latn'));

  it('boshida faqat qidiruv + tugma: tur/holat chiplari ekranda yo\'q', async () => {
    await renderWithProviders(<Harness />);
    expect(screen.queryByText('Ariza')).toBeNull();
    expect(screen.queryByText('Qoralama')).toBeNull();
    expect(screen.getByLabelText(i18n.t('common.filters'))).toBeTruthy();
  });

  it('varaqda tanlangan filtr qidiruv ostida chip bo\'lib ko\'rinadi, ✕ bilan olinadi; tugmada soni', async () => {
    await renderWithProviders(<Harness />);
    await fireEvent.press(screen.getByTestId('f-open'));
    await fireEvent.press(screen.getByTestId('f-status-draft'));
    await fireEvent.press(screen.getByTestId('f-apply'));
    expect(screen.getByTestId('f-active-status')).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('common.filtersCount', { count: 1 }))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('f-active-status'));
    expect(screen.queryByTestId('f-active-status')).toBeNull();
  });
});
