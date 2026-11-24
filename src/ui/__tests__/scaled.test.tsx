import React from 'react';
import { StyleSheet } from 'react-native';
import { useTextSizeStore, type TextSizeId } from '@/store/textSizeStore';
import { act, renderWithProviders, screen } from '@/test/renderWithProviders';
import { Text as UIText } from '../Text';
import { Text, TextInput, osCap, scaledText } from '../scaled';

const set = (id: TextSizeId) => act(async () => useTextSizeStore.setState({ id }));
const styleOf = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

afterEach(() => act(async () => useTextSizeStore.setState({ id: 'normal', picked: false })));

describe('scaledText', () => {
  it('size and line height grow together', () =>
    expect(scaledText({ fontSize: 12, lineHeight: 16 }, 1.5, 14)).toEqual({ fontSize: 18, lineHeight: 24 }));
  it('no size in the style — the default one', () => expect(scaledText(undefined, 1.25, 14)).toEqual({ fontSize: 17.5 }));
  it('nested without a size — inherits', () => expect(scaledText({}, 1.25, undefined)).toBeUndefined());
});

describe('osCap', () => {
  it("the phone's own setting and ours stay under the total", () => {
    expect(osCap(1.3, 1)).toBe(1.3);
    expect(osCap(1.3, 1.5)).toBeCloseTo(1.6 / 1.5);
    expect(osCap(undefined, 1.25)).toBeCloseTo(1.28);
  });
});

describe('components', () => {
  it('the normal step hands styles over untouched', async () => {
    await renderWithProviders(<Text testID="a" style={{ fontSize: 13 }}>a</Text>);
    expect(styleOf('a').fontSize).toBe(13);
  });
  it('grow at once when the step changes, a nested text once only', async () => {
    await renderWithProviders(
      <>
        <Text testID="a" style={{ fontSize: 12, lineHeight: 16 }}>
          a<Text testID="b">b</Text>
        </Text>
        <UIText testID="c" variant="caption">c</UIText>
        <TextInput testID="d" style={{ fontSize: 15 }} />
      </>,
    );
    await set('xlarge');
    expect(styleOf('a')).toMatchObject({ fontSize: 18, lineHeight: 24 });
    expect(styleOf('b')?.fontSize).toBeUndefined();
    expect(styleOf('c')).toMatchObject({ fontSize: 18, lineHeight: 24 });
    expect(styleOf('d')).toMatchObject({ fontSize: 22.5 });
    await set('normal');
    expect(styleOf('a')).toMatchObject({ fontSize: 12, lineHeight: 16 });
  });
});
