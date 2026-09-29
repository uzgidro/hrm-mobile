import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/renderWithProviders';
import { TomchiLoader } from '@/ui/mascot/TomchiLoader';

describe('TomchiLoader', () => {
  it('yuklanish holatini progressbar sifatida e\'lon qiladi va matnni ko\'rsatadi', async () => {
    await renderWithProviders(<TomchiLoader label="Yuklanmoqda" />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByText('Yuklanmoqda')).toBeTruthy();
  });
});
