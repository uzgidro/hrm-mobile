import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders, fireEvent } from '@/test/renderWithProviders';
import { ModalCard } from '../ModalCard';

// Umumiy dialog-oyna. Ilovada bir xil "overlay + karta + sarlavha + ikkita
// tugma" 7 marta qo'lda takrorlangan edi va nusxalar BIR-BIRIDAN FARQ qilardi
// (radius 16/18, padding 18/20, gap 8/10/12, tugma radiusi 10/12), ikkitasi
// esa mavzu tokenini chetlab o'tib `rgba(0,0,0,0.6)` ni qattiq yozgan edi —
// bu QORONG'I mavzuning qiymati, ya'ni yorug' mavzuda overlay noto'g'ri edi.
describe('ModalCard', () => {
  it('sarlavha va kontentni ko\'rsatadi', async () => {
    const { getByText } = await renderWithProviders(
      <ModalCard visible title="Sarlavha" confirmLabel="Saqlash" onClose={jest.fn()} onSubmit={jest.fn()}>
        <Text>Ichki kontent</Text>
      </ModalCard>,
    );
    getByText('Sarlavha');
    getByText('Ichki kontent');
  });

  it('bekor va tasdiq chaqiriladi', async () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <ModalCard visible title="T" confirmLabel="OK" onClose={onClose} onSubmit={onSubmit} testID="mc">
        <Text>maydon</Text>
      </ModalCard>,
    );
    fireEvent.press(getByTestId('mc-cancel'));
    expect(onClose).toHaveBeenCalled();
    fireEvent.press(getByTestId('mc'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('visible=false bo\'lsa kontent chizilmaydi', async () => {
    const { queryByText } = await renderWithProviders(
      <ModalCard visible={false} title="Yashirin" confirmLabel="OK" onClose={jest.fn()} onSubmit={jest.fn()} />,
    );
    expect(queryByText('Yashirin')).toBeNull();
  });
});
