import React from 'react';
import { Text as RNText } from 'react-native';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import { EmptyState, ErrorState, LoadingView, bentoLayout, bentoColumnsFor, Bento, MasterDetail, SearchField } from '@/ui';

describe('bentoLayout', () => {
  it.each<[number[], number, number[][]]>([
    [[1, 1, 1, 1], 1, [[0], [1], [2], [3]]],
    [[1, 1, 1, 1], 2, [[0, 1], [2, 3]]],
    [[2, 1, 1, 3], 3, [[0, 1], [2], [3]]],
    [[3, 1], 2, [[0], [1]]], // span 3 → 2 ga qisqaradi, qator to'ladi
    [[], 3, []],
  ])('%j / %i ustun', (spans, cols, rows) => expect(bentoLayout(spans, cols)).toEqual(rows));
});

describe('bentoColumnsFor — konteyner kengligi (rail hisobga olinadi)', () => {
  it.each([
    [360, 1],
    [599, 1],
    [600, 2],
    [760, 2], // 1024 oyna − 264 rail
    [959, 2],
    [960, 3],
    [1100, 3],
  ])('%i → %i', (w, cols) => expect(bentoColumnsFor(w)).toBe(cols));
});

describe("holat ko'rinishlari", () => {
  it('ErrorState qayta urinadi', async () => {
    const onRetry = jest.fn();
    await renderWithProviders(<ErrorState onRetry={onRetry} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('EmptyState sarlavha + amal (yangi action prop)', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<EmptyState title="Hozircha bo'sh" action={{ label: 'Yaratish', onPress }} />);
    fireEvent.press(screen.getByText('Yaratish'));
    expect(onPress).toHaveBeenCalled();
  });

  it('EmptyState eski actionLabel/onAction prop\'larini ham qabul qiladi', async () => {
    const onAction = jest.fn();
    await renderWithProviders(<EmptyState title="Bo'sh" icon="inbox" actionLabel="Tozalash" onAction={onAction} />);
    fireEvent.press(screen.getByTestId('empty-action'));
    expect(onAction).toHaveBeenCalled();
  });

  it('LoadingView skeleton kartalari', async () => {
    await renderWithProviders(<LoadingView rows={2} />);
    expect(screen.getAllByTestId('skeleton-card')).toHaveLength(2);
  });
});

describe('layout primitivlari', () => {
  it('Bento hamma bolalarni chizadi', async () => {
    await renderWithProviders(
      <Bento>
        <Bento.Item span={2}>
          <RNText>A</RNText>
        </Bento.Item>
        <Bento.Item>
          <RNText>B</RNText>
        </Bento.Item>
      </Bento>,
    );
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
  });

  it("MasterDetail telefon kengligida faqat master'ni ko'rsatadi", async () => {
    await renderWithProviders(
      <MasterDetail master={<RNText>ro'yxat</RNText>} detail={<RNText>tafsilot</RNText>} emptyDetail={null} />,
    );
    expect(screen.getByText("ro'yxat")).toBeTruthy();
    expect(screen.queryByText('tafsilot')).toBeNull();
  });

  it('SearchField yozadi', async () => {
    const onChangeText = jest.fn();
    await renderWithProviders(<SearchField value="" onChangeText={onChangeText} placeholder="Qidiruv" />);
    fireEvent.changeText(screen.getByPlaceholderText('Qidiruv'), 'xat');
    expect(onChangeText).toHaveBeenCalledWith('xat');
  });
});
