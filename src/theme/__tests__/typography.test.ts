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

describe('Text weight prop (faux-bold oldini olish)', () => {
  it("weight — fontWeight emas, yuklangan shrift oilasi", async () => {
    const React = jest.requireActual('react');
    const { StyleSheet } = jest.requireActual('react-native');
    const { renderWithProviders } = jest.requireActual('@/test/renderWithProviders');
    const { Text } = jest.requireActual('@/ui');
    markFontsReady();
    const s = await renderWithProviders(React.createElement(Text, { variant: 'label', weight: '700' }, 'x'));
    const st = StyleSheet.flatten(s.getByText('x').props.style);
    expect(st.fontFamily).toBe('Inter_700Bold');
    expect(st.fontWeight).toBeUndefined();
  });
});


describe("Text style.fontWeight → shrift oilasi (barcha mavjud chaqiruvlar uchun)", () => {
  it("style'dagi fontWeight olib tashlanadi, mos oila qo'yiladi", async () => {
    const React = jest.requireActual('react');
    const { StyleSheet } = jest.requireActual('react-native');
    const { renderWithProviders } = jest.requireActual('@/test/renderWithProviders');
    const { Text } = jest.requireActual('@/ui');
    markFontsReady();
    const s = await renderWithProviders(React.createElement(Text, { variant: 'caption', style: { fontWeight: '800', fontSize: 10 } }, 'y'));
    const st = StyleSheet.flatten(s.getByText('y').props.style);
    expect(st.fontFamily).toBe('Inter_700Bold');
    expect(st.fontWeight).toBeUndefined();
    expect(st.fontSize).toBe(10);
  });
});
