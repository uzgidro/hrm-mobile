// Text and TextInput that follow the person's text size. The whole app imports them from
// here instead of 'react-native' (lint enforces it): a screen written with RN's own Text
// would stay small while everything around it grows.
//
// At the normal step they hand the props over untouched.
import React, { createContext, useContext } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { MAX_TOTAL_SCALE, useTextScale } from '@/store/textSizeStore';

/** So `useRef<TextInput>` keeps working. */
export type TextInput = RNTextInput;
export type Text = RNText;

/** RN's size when a style names none. */
const DEFAULT_SIZE = 14;
/** A Text inside a Text inherits its size; it must not get the default one. */
const Nested = createContext(false);

const round = (n: number) => Math.round(n * 100) / 100;

/** The size part of a style at `scale`; `undefined` — nothing to change. */
export function scaledText(style: TextStyle | undefined, scale: number, fallback: number | undefined): TextStyle | undefined {
  const size = typeof style?.fontSize === 'number' ? style.fontSize : fallback;
  const line = style?.lineHeight;
  if (size === undefined && typeof line !== 'number') return undefined;
  return {
    ...(size !== undefined && { fontSize: round(size * scale) }),
    ...(typeof line === 'number' && { lineHeight: round(line * scale) }),
  };
}

/** The phone's setting multiplies ours: cap what it may add so both stay readable. */
export const osCap = (given: number | null | undefined, scale: number): number =>
  Math.max(1, Math.min(given || Infinity, MAX_TOTAL_SCALE / scale));

export function Text({ style, maxFontSizeMultiplier, ...rest }: TextProps & { ref?: React.Ref<RNText> }) {
  const scale = useTextScale();
  const nested = useContext(Nested);
  if (scale === 1) {
    return (
      <Nested.Provider value>
        <RNText {...rest} style={style} maxFontSizeMultiplier={maxFontSizeMultiplier} />
      </Nested.Provider>
    );
  }
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  return (
    <Nested.Provider value>
      <RNText
        {...rest}
        style={[flat, scaledText(flat, scale, nested ? undefined : DEFAULT_SIZE)]}
        maxFontSizeMultiplier={osCap(maxFontSizeMultiplier, scale)}
      />
    </Nested.Provider>
  );
}

export function TextInput({ style, maxFontSizeMultiplier, ...rest }: TextInputProps & { ref?: React.Ref<RNTextInput> }) {
  const scale = useTextScale();
  if (scale === 1) return <RNTextInput {...rest} style={style} maxFontSizeMultiplier={maxFontSizeMultiplier} />;
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  return (
    <RNTextInput
      {...rest}
      style={[flat, scaledText(flat, scale, DEFAULT_SIZE)]}
      maxFontSizeMultiplier={osCap(maxFontSizeMultiplier, scale)}
    />
  );
}
