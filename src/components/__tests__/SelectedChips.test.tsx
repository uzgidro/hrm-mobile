// Tanlanganlarning NOMI ko'rinishi — ilgari faqat son ("3 ta tanlandi")
// chiqardi va foydalanuvchi kimni tanlaganini oynani qayta ochmasdan
// bilolmasdi (bildirgi/buyruq shikoyati).
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SelectedChips } from '../SelectedChips';

describe('SelectedChips', () => {
  it('har bir tanlovning nomini ko‘rsatadi', async () => {
    const { getByText } = await renderWithProviders(
      <SelectedChips items={[{ value: 1, label: 'Aliyev Vali' }, { value: 2, label: 'Karimov Anvar' }]} />,
    );
    expect(getByText('Aliyev Vali')).toBeTruthy();
    expect(getByText('Karimov Anvar')).toBeTruthy();
  });

  it('bo‘sh ro‘yxatda hech nima chizmaydi', async () => {
    const { queryByTestId } = await renderWithProviders(<SelectedChips items={[]} />);
    expect(queryByTestId('selected-chips')).toBeNull();
  });

  it('olib tashlash tugmasi qiymatni qaytaradi', async () => {
    const onRemove = jest.fn();
    const { getByText, getByTestId } = await renderWithProviders(
      <SelectedChips items={[{ value: 7, label: 'Test Xodim' }]} onRemove={onRemove} />,
    );
    expect(getByText('Test Xodim')).toBeTruthy();
    fireEvent.press(getByTestId('chip-remove-7'));
    expect(onRemove).toHaveBeenCalledWith(7);
  });
});
