import React from 'react';
import { act, renderWithProviders } from '@/test/renderWithProviders';
import { toast } from '@/lib/toast';
import { __resetModalLayers, openModalLayer } from '@/lib/modalLayer';
import { ModalToasts, ToastHost } from '../ToastHost';

// RN Modal ildizdagi ToastHost'ni yopadi — toast eng yuqoridagi ochiq modal ICHIDA, bir marta.
describe('toast qatlami', () => {
  afterEach(() => __resetModalLayers());

  it('modal ochiq — ildizdagi host jim (modal yopib qo\'yardi)', async () => {
    const view = await renderWithProviders(<ToastHost />);
    await act(async () => {
      openModalLayer();
      toast.error('Ildizda ko\'rinmaydi');
    });
    expect(view.queryByText('Ildizda ko\'rinmaydi')).toBeNull();
  });

  it('modal ichidagi host toast\'ni ko\'rsatadi; ikki modaldan faqat tepadagisi', async () => {
    const view = await renderWithProviders(
      <>
        <ToastHost />
        <ModalToasts />
        <ModalToasts />
      </>,
    );
    await act(async () => {
      toast.error('Server xatosi');
    });
    expect(view.getAllByText('Server xatosi')).toHaveLength(1);
  });

  it('modal yopilgach — yana ildizda', async () => {
    const view = await renderWithProviders(
      <>
        <ToastHost />
        <ModalToasts visible={false} />
      </>,
    );
    await act(async () => {
      toast.success('Saqlandi');
    });
    expect(view.getByText('Saqlandi')).toBeTruthy();
  });
});
