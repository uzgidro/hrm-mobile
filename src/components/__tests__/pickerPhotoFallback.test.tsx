// 2026-10-07: «xodim tanlashda rasmlar chiqmayapti» — kichik nusxa ochilmaganda zaxira to'liq surat
// o'sha <Image> ichida bekor bo'lib, bo'sh kulrang doira qolardi. Endi: thumb → to'liq surat (yangi
// komponent, key) → bosh harf.
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import { PickerModal } from '../PickerModal';

describe('tanlagich rasmi: zaxira zanjiri', () => {
  it("thumb xato → to'liq surat; u ham xato → bosh harf", async () => {
    await renderWithProviders(
      <PickerModal
        visible
        title="Xodim"
        options={[{ value: 1, label: 'Amonov Anzarbek', photo: 'https://x/full.png', photoThumb: 'https://x/thumb.png' }]}
        selected={null}
        onClose={() => {}}
        onSelect={() => {}}
      />,
    );
    const findImg = () => screen.queryAllByTestId('picker-photo');
    expect(findImg()[0].props.source).toEqual({ uri: 'https://x/thumb.png' });
    await fireEvent(findImg()[0], 'error');
    expect(findImg()[0].props.source).toEqual({ uri: 'https://x/full.png' });
    await fireEvent(findImg()[0], 'error');
    expect(findImg()).toHaveLength(0);
    expect(screen.getByText('A')).toBeTruthy();
  });
});
