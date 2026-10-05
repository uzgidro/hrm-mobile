import React from 'react';
import { renderWithProviders, fireEvent, act, waitFor } from '@/test/renderWithProviders';
import { confirm, __resetConfirm } from '@/lib/confirm';
import { ConfirmHost, confirmSheetKey } from '../ConfirmHost';

beforeEach(() => __resetConfirm());
afterEach(() => __resetConfirm());

describe('ConfirmHost', () => {
  it('renders nothing interactive until a confirm() is pending', async () => {
    const { queryByTestId } = await renderWithProviders(<ConfirmHost />);
    expect(queryByTestId('confirm-sheet-confirm')).toBeNull();
  });

  it('shows the sheet for a pending confirm and resolves true on the confirm button', async () => {
    const { getByTestId, getByText } = await renderWithProviders(<ConfirmHost />);

    let result: boolean | undefined;
    await act(async () => {
      confirm({
        title: 'Delete item?',
        message: 'Gone forever',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        destructive: true,
      }).then((r) => {
        result = r;
      });
    });

    await waitFor(() => expect(getByTestId('confirm-sheet-confirm')).toBeTruthy());
    expect(getByText('Delete item?')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('confirm-sheet-confirm'));
    });

    await waitFor(() => expect(result).toBe(true));
  });

  it('resolves false on the cancel button', async () => {
    const { getByTestId } = await renderWithProviders(<ConfirmHost />);

    let result: boolean | undefined;
    await act(async () => {
      confirm({ title: 'X', confirmLabel: 'Yes', cancelLabel: 'No' }).then((r) => {
        result = r;
      });
    });

    await waitFor(() => expect(getByTestId('confirm-sheet-cancel')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByTestId('confirm-sheet-cancel'));
    });

    await waitFor(() => expect(result).toBe(false));
  });
});

describe('confirmSheetKey', () => {
  // react-native-web Modal portali MOUNT paytida body oxiriga qo'shiladi (yopiq bo'lsa ham).
  // Doimiy ConfirmSheet keyin ochilgan Sheet ORQASIDA qolardi — web'da har so'rov yangi mount.
  it('web: har so\'rov uchun yangi kalit (portal eng ustda)', () => {
    expect(confirmSheetKey('web', 1)).not.toBe(confirmSheetKey('web', 2));
    expect(confirmSheetKey('web', null)).not.toBe(confirmSheetKey('web', 1));
  });

  it('native: doimiy kalit (kirish animatsiyasi saqlanadi)', () => {
    expect(confirmSheetKey('ios', 1)).toBe(confirmSheetKey('ios', 2));
    expect(confirmSheetKey('android', null)).toBe(confirmSheetKey('android', 3));
  });
});
