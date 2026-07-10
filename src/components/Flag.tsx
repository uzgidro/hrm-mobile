// Simple SVG country flags for the language switcher, in the same react-native-svg
// style as Icon. Emoji flags are avoided on purpose — Android has no country-flag
// emoji font, so 🇺🇿/🇷🇺/🇬🇧 render as letter boxes there. These render identically
// on iOS / Android / web.
//
//   <Flag code="UZ" size={24} />
import React from 'react';
import Svg, { Rect, Circle, Path, G, ClipPath, Defs } from 'react-native-svg';

export type FlagCode = 'UZ' | 'RU' | 'GB';

type Props = {
  code: FlagCode;
  size?: number;
};

// 3:2 flags drawn in a 24×16 viewBox, clipped to rounded corners.
export const Flag = React.memo(function Flag({ code, size = 24 }: Props) {
  const w = size;
  const h = (size * 2) / 3;
  // Unique clip id per instance: the switcher renders 4 flags at once, and on
  // web react-native-svg emits real DOM ids verbatim — a shared id would be
  // invalid HTML and every url(#id) would resolve to the first match.
  const rawId = React.useId();
  const clipId = `flagClip-${rawId.replace(/:/g, '')}`;
  return (
    <Svg width={w} height={h} viewBox="0 0 24 16">
      <Defs>
        <ClipPath id={clipId}>
          <Rect x="0" y="0" width="24" height="16" rx="2" ry="2" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>{render(code)}</G>
      <Rect
        x="0.5"
        y="0.5"
        width="23"
        height="15"
        rx="2"
        ry="2"
        fill="none"
        stroke="rgba(0,0,0,0.12)"
        strokeWidth="1"
      />
    </Svg>
  );
});

function render(code: FlagCode) {
  switch (code) {
    case 'UZ':
      // Uzbekistan: blue / white / green horizontal bands with thin red fimbriations,
      // a crescent + stars in the top-left of the blue band.
      return (
        <>
          <Rect x="0" y="0" width="24" height="16" fill="#fff" />
          <Rect x="0" y="0" width="24" height="5" fill="#1eb0e6" />
          <Rect x="0" y="5" width="24" height="0.6" fill="#ce1126" />
          <Rect x="0" y="10.4" width="24" height="0.6" fill="#ce1126" />
          <Rect x="0" y="11" width="24" height="5" fill="#1eb53a" />
          <Circle cx="3.4" cy="2.5" r="1.6" fill="#fff" />
          <Circle cx="4" cy="2.5" r="1.6" fill="#1eb0e6" />
          <Circle cx="6" cy="1.6" r="0.35" fill="#fff" />
          <Circle cx="6" cy="2.9" r="0.35" fill="#fff" />
          <Circle cx="7.3" cy="1.6" r="0.35" fill="#fff" />
          <Circle cx="7.3" cy="2.9" r="0.35" fill="#fff" />
        </>
      );
    case 'RU':
      // Russia: white / blue / red horizontal bands.
      return (
        <>
          <Rect x="0" y="0" width="24" height="5.34" fill="#fff" />
          <Rect x="0" y="5.34" width="24" height="5.33" fill="#0039a6" />
          <Rect x="0" y="10.67" width="24" height="5.33" fill="#d52b1e" />
        </>
      );
    case 'GB':
      // United Kingdom: Union Jack (simplified).
      return (
        <>
          <Rect x="0" y="0" width="24" height="16" fill="#012169" />
          <Path d="M0 0 L24 16 M24 0 L0 16" stroke="#fff" strokeWidth="3.2" />
          <Path d="M0 0 L24 16 M24 0 L0 16" stroke="#c8102e" strokeWidth="1.6" />
          <Path d="M12 0 V16 M0 8 H24" stroke="#fff" strokeWidth="5.4" />
          <Path d="M12 0 V16 M0 8 H24" stroke="#c8102e" strokeWidth="3.2" />
        </>
      );
  }
}
