import { router } from 'expo-router';
import { goBackOr } from '../goBack';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
}));

const mocked = router as unknown as { back: jest.Mock; replace: jest.Mock; canGoBack: jest.Mock };

describe('goBackOr', () => {
  it("tarix bor bo'lsa orqaga qaytadi", () => {
    mocked.canGoBack.mockReturnValue(true);
    goBackOr('/work-leaves');
    expect(mocked.back).toHaveBeenCalledTimes(1);
    expect(mocked.replace).not.toHaveBeenCalled();
  });

  it("chuqur havola (tarix yo'q) — GO_BACK o'rniga ro'yxat ochiladi", () => {
    mocked.canGoBack.mockReturnValue(false);
    goBackOr('/documents?seg=letters');
    expect(mocked.back).not.toHaveBeenCalled();
    expect(mocked.replace).toHaveBeenCalledWith('/documents?seg=letters');
  });
});
