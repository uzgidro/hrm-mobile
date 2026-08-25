import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders, fireEvent } from '@/test/renderWithProviders';
import { ModalCard } from '../ModalCard';

// ALOHIDA fayl: RNTL da `Modal` portal orqali chiziladi va `fireEvent.press`
// bajarilgan test tugagach ham montajda qolib, KEYINGI testning daraxtini
// soyalaydi. Bu holat tekshirilgan: press'siz ketma-ketlik muammosiz, press'dan
// keyin esa navbatdagi render topilmay qoladi. Shu bois "bloklangan" holatlar
// o'z faylida — har bir fayl toza modul reyestri bilan ishga tushadi.
describe('ModalCard — bloklangan holatlar', () => {
  // Asosiy invariant: bo'sh/nomukammal formada tasdiqlash KETMASLIGI kerak,
  // aks holda backend 400/422 qaytaradi.
  it('disabled — tugma o\'chirilgan va bosilmaydi', async () => {
    const onSubmit = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <ModalCard visible title="T" confirmLabel="OK" disabled onClose={jest.fn()} onSubmit={onSubmit} testID="mc">
        <Text>maydon</Text>
      </ModalCard>,
    );
    const btn = getByTestId('mc');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
