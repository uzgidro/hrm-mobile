import React from 'react';
import { StyleSheet, Text as RNText } from 'react-native';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import { Button, Chip, ListRow, SearchField, Segmented, Sheet, Toggle, segmentsOverflow, toggleColors } from '@/ui';
import { darkColors, lightColors } from '@/theme/palettes';

/** Chip yuzasi (Pressable/View o'rami ichidagi birinchi View) uslubi. */
const chipFace = (id: string) =>
  StyleSheet.flatten((screen.getByTestId(id).children[0] as unknown as { props: { style: never } }).props.style);

// QA tuzatishlari (W6 vizual QA): varaq sarlavhasi, chip, switch, segment, qidiruv, ListRow, tugma variantlari.
describe('primitivlar D — vizual QA', () => {
  it("Sheet: uzun sarlavha 2 qatorgacha qisqaradi, ✕ har doim ko'rinadi", async () => {
    const onClose = jest.fn();
    const long = 'chorvoq.ges.kadrlar.boshqarmasi.administratori@uzgidro.uz';
    await renderWithProviders(
      <Sheet visible title={long} onClose={onClose}>
        <RNText>tana</RNText>
      </Sheet>,
    );
    const title = screen.getByText(long);
    expect(title.props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(title.props.style)).toMatchObject({ flexShrink: 1, minWidth: 0 });
    const close = screen.getAllByLabelText('Yopish').find((n) => n.props.accessibilityRole === 'button');
    expect(close).toBeTruthy();
  });

  it("Chip: bosiladigan tanlanmagan — surface + chegara; tanlangan — brand; faqat ko'rsatuvchi — chegarasiz", async () => {
    await renderWithProviders(
      <>
        <Chip label="Hammasi" onPress={() => {}} testID="off" />
        <Chip label="Faol" selected onPress={() => {}} testID="on" />
        <Chip label="Teg" testID="static" />
      </>,
    );
    expect(chipFace('off')).toMatchObject({ backgroundColor: lightColors.surface, borderWidth: 1, borderColor: lightColors.borderStrong });
    expect(chipFace('on')).toMatchObject({ backgroundColor: lightColors.brand, borderWidth: 1, borderColor: lightColors.brand });
    expect(chipFace('static')).toMatchObject({ backgroundColor: lightColors.surface2 });
    expect(chipFace('static')).not.toHaveProperty('borderWidth');
  });

  it("Chip tintSelected: tanlanmaganda ham chegara ko'rinadi, qalinlik o'zgarmaydi", async () => {
    await renderWithProviders(<Chip label="Kasal" tone="danger" tintSelected onPress={() => {}} testID="t" />);
    expect(chipFace('t')).toMatchObject({ borderWidth: 1.5, borderColor: lightColors.borderStrong });
  });

  it("toggleColors: o'chiq tutqich qorong'ida fgMuted (trekda ko'rinadi), yorug'da surface; yoqiq — brand / danger", () => {
    const dark = toggleColors(darkColors, true, false);
    expect(dark.thumbColor).toBe(darkColors.fgMuted);
    expect(dark.trackColor.false).toBe(darkColors.borderStrong);
    expect(dark.thumbColor).not.toBe(dark.trackColor.false);
    expect(toggleColors(lightColors, false, false).thumbColor).toBe(lightColors.surface);
    expect(toggleColors(lightColors, false, true).trackColor.true).toBe(lightColors.brand);
    expect(toggleColors(lightColors, false, true, 'danger').trackColor.true).toBe(lightColors.dangerMark);
    expect(toggleColors(darkColors, true, true).thumbColor).toBe(darkColors.fgOnBrand);
  });

  it('Toggle valueChange uzatadi', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<Toggle value={false} onValueChange={onChange} testID="sw" />);
    fireEvent(screen.getByTestId('sw'), 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("segmentsOverflow: sig'masa — true (1px yaxlitlash zaxirasi), konteyner o'lchanmagan — false", () => {
    expect(segmentsOverflow(400, 358)).toBe(true);
    expect(segmentsOverflow(358.5, 358)).toBe(false);
    expect(segmentsOverflow(400, 0)).toBe(false);
  });

  it("Segmented: sig'masa zichlashadi va «davomi bor» xiralashuvi chiqadi; yorliq bir qatorda", async () => {
    await renderWithProviders(
      <Segmented
        testID="seg"
        options={[
          { value: 'a', label: 'Kutilmoqda' },
          { value: 'b', label: 'Tasdiqlangan' },
          { value: 'c', label: 'Rad etilgan' },
          { value: 'd', label: 'Barchasi' },
        ]}
        value="a"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('Barchasi').props.numberOfLines).toBe(1);
    expect(screen.queryByTestId('seg-more')).toBeNull();
    const scroll = screen.getByTestId('seg');
    await fireEvent(scroll.parent!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 358, height: 44 } } });
    await fireEvent(scroll, 'contentSizeChange', 460, 44);
    // Zich rejim: segment ichki chekinishi kichrayadi.
    const tab = screen.getAllByRole('tab')[1];
    expect(StyleSheet.flatten(tab.props.style)).toMatchObject({ paddingHorizontal: 9 });
    // Hali ham sig'masa — o'ng chetda xiralashuv.
    await fireEvent(scroll, 'contentSizeChange', 420, 44);
    expect(screen.getByTestId('seg-more')).toBeTruthy();
  });

  it("SearchField: fokusda pill chegarasi drop rangida (web'da ichki outline o'rniga)", async () => {
    await renderWithProviders(<SearchField value="" onChangeText={() => {}} placeholder="Qidiruv" testID="q" />);
    const box = () => StyleSheet.flatten(screen.getByTestId('q').parent!.props.style);
    expect(box()).toMatchObject({ borderColor: 'transparent' });
    await fireEvent(screen.getByTestId('q'), 'focus');
    expect(box()).toMatchObject({ borderColor: lightColors.drop });
    await fireEvent(screen.getByTestId('q'), 'blur');
    expect(box()).toMatchObject({ borderColor: 'transparent' });
  });

  it("ListRow titleAddon: belgi sarlavha matnidan tashqarida (qisqarganda yo'qolmaydi)", async () => {
    await renderWithProviders(<ListRow title="Harbiy hisob raqami" titleAddon={<RNText>*</RNText>} />);
    const title = screen.getByText('Harbiy hisob raqami');
    expect(title.props.numberOfLines).toBe(1);
    expect(StyleSheet.flatten(title.props.style)).toMatchObject({ flexShrink: 1 });
    expect(screen.getByText('*')).toBeTruthy();
  });

  it('Button link — drop, neutral — siyoh (violet emas)', async () => {
    await renderWithProviders(
      <>
        <Button label="Barcha ma'lumotnomalar" variant="link" onPress={() => {}} />
        <Button label="Bekor qilish" variant="neutral" onPress={() => {}} />
      </>,
    );
    const color = (label: string) => StyleSheet.flatten(screen.getByText(label).props.style).color;
    expect(color("Barcha ma'lumotnomalar")).toBe(lightColors.drop);
    expect(color('Bekor qilish')).toBe(lightColors.fgMuted);
  });
});
