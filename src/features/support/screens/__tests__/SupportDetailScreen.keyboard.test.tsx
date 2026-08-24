/**
 * Texnik yordam TAFSILOTIDA yozishma maydoni klaviatura ostida qolmasligi kerak.
 *
 * AI yordamchidagi bilan BIR XIL sabab (edge-to-edge, Expo SDK 57 — oyna
 * kichraymaydi), lekin joylashuv BOSHQA: bu yerda composer pastga
 * mahkamlangan panel emas, u `ScrollView` ICHIDA, sahifa o'rtasida
 * (`TicketChat` kartasi ilovalar va baholash tugmalaridan yuqorida).
 *
 * Shuning uchun yechim ham boshqa: `KeyboardAvoidingView` ScrollView'ni
 * O'RAYDI — konteyner qisqaradi, ScrollView esa fokusdagi maydonni
 * ko'rinadigan qismga suradi.
 *
 * `keyboardShouldPersistTaps="handled"` ham SHART: usiz klaviatura ochiq
 * turganda "Yuborish" tugmasining BIRINCHI bosilishi yo'qoladi — birinchi
 * teg klaviaturani yopishga ketadi. Loyihadagi barcha forma-ekranlarida shu
 * prop bor edi, FAQAT shu ekranda yo'q edi.
 */
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { SUPPORT_TICKET_DETAIL, SUPPORT_TICKET_MESSAGES, SUPPORT_TICKET_READ } from '@/api/urls';
import { renderWithProviders, waitFor } from '@/test/renderWithProviders';
import SupportDetailScreen from '../SupportDetailScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: '7' }),
}));

describe('SupportDetailScreen — klaviatura', () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    mock.onGet(SUPPORT_TICKET_DETAIL(7)).reply(200, {
      id: 7, description: 'Printer ishlamayapti', status: 'in_progress', priority: 'normal',
    });
    mock.onGet(SUPPORT_TICKET_MESSAGES(7)).reply(200, []);
    mock.onPost(SUPPORT_TICKET_READ(7)).reply(204);
  });
  afterEach(() => mock.restore());

  // NB: `behavior` ning O'ZINI bu yerda tekshirib bo'lmaydi — RN'ning
  // `KeyboardAvoidingView` uni ichida ishlatadi va host View'ga UZATMAYDI
  // (tekshirildi: render natijasida faqat `testID` va `children` qoladi).
  // Shu bois bu yerda TUZILMA qulflanadi (ScrollView KAV ICHIDA), behavior
  // qiymati esa `utils/__tests__/keyboard.test.ts` da.
  it('ScrollView KeyboardAvoidingView ICHIDA — composer klaviatura ostida qolmaydi', async () => {
    const { getByTestId } = await renderWithProviders(<SupportDetailScreen />);
    const kav = await waitFor(() => getByTestId('support-detail-kav'));
    const scroll = getByTestId('support-detail-scroll');
    // Scroll konteyner KAV ning avlodi bo'lishi kerak: aks holda konteyner
    // qisqarmaydi va yozishma maydoni klaviatura ostida qoladi.
    const inside = (node: unknown): boolean =>
      node === scroll
      || (!!node && typeof node === 'object' && 'children' in node
          && (node as { children: unknown[] }).children.some(inside));
    expect(kav.children.some(inside)).toBe(true);
  });

  it('keyboardShouldPersistTaps=handled — birinchi bosish yo\'qolmaydi', async () => {
    const { getByTestId } = await renderWithProviders(<SupportDetailScreen />);
    const scroll = await waitFor(() => getByTestId('support-detail-scroll'));
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  });
});
