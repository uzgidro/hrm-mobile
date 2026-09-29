import { ff, markFontsReady } from '../typography';

describe('ff', () => {
  it("yuklanmaguncha tizim shrifti og'irligi", () => {
    expect(ff('800')).toEqual({ fontWeight: '800' });
    expect(ff('400', 'text')).toEqual({ fontWeight: '400' });
  });

  it('yuklangach display → Nunito, text → Inter', () => {
    markFontsReady();
    expect(ff('900')).toEqual({ fontFamily: 'Nunito_900Black' });
    expect(ff('400', 'text')).toEqual({ fontFamily: 'Inter_400Regular' });
    expect(ff('600', 'text')).toEqual({ fontFamily: 'Inter_600SemiBold' });
    // Inter'da 800/900 yuklanmaydi → 700 ga tushadi
    expect(ff('900', 'text')).toEqual({ fontFamily: 'Inter_700Bold' });
    // Nunito'da 500 yo'q → 600
    expect(ff('500')).toEqual({ fontFamily: 'Nunito_600SemiBold' });
  });
});
