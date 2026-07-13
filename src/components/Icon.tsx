// Lightweight line-icon set built on react-native-svg.
// One consistent 24×24 stroke style across the whole app — replaces the
// emoji we used before for a calmer, more "professional" look.
//
//   <Icon name="home" size={22} color={colors.text} />
//
// Icons are stroke-based and inherit a single `color`. Add new glyphs to
// PATHS below using the same 24×24 viewBox.

import React from 'react';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'orders'
  | 'mail'
  | 'grid'
  | 'user'
  | 'users'
  | 'bell'
  | 'clock'
  | 'checklist'
  | 'wallet'
  | 'news'
  | 'idcard'
  | 'gift'
  | 'calendar'
  | 'sun'
  | 'moon'
  | 'system'
  | 'chevronRight'
  | 'chevronLeft'
  | 'arrowDown'
  | 'arrowUp'
  | 'plus'
  | 'edit'
  | 'building'
  | 'globe'
  | 'logout'
  | 'search'
  | 'close'
  | 'check'
  | 'doc'
  | 'inbox'
  | 'settings'
  | 'lock'
  | 'phone'
  | 'chart'
  | 'briefcase'
  | 'cake'
  | 'graduation'
  | 'target'
  | 'eye'
  | 'eyeOff'
  | 'guest'
  | 'board'
  | 'trash'
  | 'fingerprint'
  | 'help'
  | 'backspace';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Memoized: Icon is rendered dozens of times per screen (tab bars, list rows,
// headers) with primitive props, so React.memo skips re-rendering — and thus
// re-running the glyph switch — whenever the parent re-renders with the same
// name/size/color/strokeWidth.
export const Icon = React.memo(function Icon({
  name,
  size = 24,
  color = '#000',
  strokeWidth = 2,
}: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(name, common)}
    </Svg>
  );
});

function render(name: IconName, p: any) {
  switch (name) {
    case 'home':
      return (
        <>
          <Path d="M3 10.5 12 3l9 7.5" {...p} />
          <Path d="M5 9.5V20h14V9.5" {...p} />
          <Path d="M9.5 20v-5h5v5" {...p} />
        </>
      );
    case 'orders':
    case 'doc':
      return (
        <>
          <Path d="M6 3h7l5 5v13H6z" {...p} />
          <Path d="M13 3v5h5" {...p} />
          <Line x1="9" y1="13" x2="15" y2="13" {...p} />
          <Line x1="9" y1="16.5" x2="15" y2="16.5" {...p} />
        </>
      );
    case 'mail':
      return (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="2.5" {...p} />
          <Path d="m4 7 8 6 8-6" {...p} />
        </>
      );
    case 'grid':
      return (
        <>
          <Rect x="3.5" y="3.5" width="7" height="7" rx="1.8" {...p} />
          <Rect x="13.5" y="3.5" width="7" height="7" rx="1.8" {...p} />
          <Rect x="3.5" y="13.5" width="7" height="7" rx="1.8" {...p} />
          <Rect x="13.5" y="13.5" width="7" height="7" rx="1.8" {...p} />
        </>
      );
    case 'user':
      return (
        <>
          <Circle cx="12" cy="8" r="4" {...p} />
          <Path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" {...p} />
        </>
      );
    case 'users':
      return (
        <>
          <Circle cx="9" cy="8" r="3.4" {...p} />
          <Path d="M3 19c0-3.1 2.7-5 6-5s6 1.9 6 5" {...p} />
          <Path d="M16 5.2a3.4 3.4 0 0 1 0 6.5" {...p} />
          <Path d="M17.5 13.4c2 .7 3.5 2.2 3.5 4.6" {...p} />
        </>
      );
    case 'bell':
      return (
        <>
          <Path d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6 2 7H4c.5-1 2-2 2-7Z" {...p} />
          <Path d="M10 20a2 2 0 0 0 4 0" {...p} />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle cx="12" cy="12" r="8.5" {...p} />
          <Path d="M12 7.5V12l3 2" {...p} />
        </>
      );
    case 'checklist':
      return (
        <>
          <Path d="m3 6 1.6 1.6L7.5 4.7" {...p} />
          <Path d="m3 13 1.6 1.6 2.9-2.9" {...p} />
          <Line x1="11" y1="6" x2="21" y2="6" {...p} />
          <Line x1="11" y1="13" x2="21" y2="13" {...p} />
          <Line x1="11" y1="19" x2="18" y2="19" {...p} />
        </>
      );
    case 'wallet':
      return (
        <>
          <Path d="M3 7.5C3 6 4 5 5.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" {...p} />
          <Path d="M16 12h5v-2.5" {...p} />
          <Circle cx="16.5" cy="12.5" r="0.6" fill={p.stroke} stroke={p.stroke} />
        </>
      );
    case 'news':
      return (
        <>
          <Path d="M4 5h12v14H5a1 1 0 0 1-1-1Z" {...p} />
          <Path d="M16 8h3a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2" {...p} />
          <Line x1="7" y1="8.5" x2="13" y2="8.5" {...p} />
          <Line x1="7" y1="12" x2="13" y2="12" {...p} />
          <Line x1="7" y1="15.5" x2="11" y2="15.5" {...p} />
        </>
      );
    case 'idcard':
      return (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="2.5" {...p} />
          <Circle cx="8.5" cy="11" r="2.2" {...p} />
          <Path d="M5.5 16c.4-1.5 1.6-2.2 3-2.2s2.6.7 3 2.2" {...p} />
          <Line x1="14.5" y1="9.5" x2="18" y2="9.5" {...p} />
          <Line x1="14.5" y1="13" x2="18" y2="13" {...p} />
        </>
      );
    case 'gift':
      return (
        <>
          <Rect x="4" y="9" width="16" height="11" rx="1.5" {...p} />
          <Line x1="4" y1="12.5" x2="20" y2="12.5" {...p} />
          <Line x1="12" y1="9" x2="12" y2="20" {...p} />
          <Path d="M12 9C12 6 10.5 4.5 9 4.5S6.5 6 7.5 7.5C8.3 8.7 12 9 12 9Z" {...p} />
          <Path d="M12 9c0-3 1.5-4.5 3-4.5S17.5 6 16.5 7.5C15.7 8.7 12 9 12 9Z" {...p} />
        </>
      );
    case 'calendar':
      return (
        <>
          <Rect x="3.5" y="5" width="17" height="15" rx="2.5" {...p} />
          <Line x1="3.5" y1="9.5" x2="20.5" y2="9.5" {...p} />
          <Line x1="8" y1="3" x2="8" y2="6.5" {...p} />
          <Line x1="16" y1="3" x2="16" y2="6.5" {...p} />
        </>
      );
    case 'sun':
      return (
        <>
          <Circle cx="12" cy="12" r="4" {...p} />
          <Line x1="12" y1="2.5" x2="12" y2="5" {...p} />
          <Line x1="12" y1="19" x2="12" y2="21.5" {...p} />
          <Line x1="2.5" y1="12" x2="5" y2="12" {...p} />
          <Line x1="19" y1="12" x2="21.5" y2="12" {...p} />
          <Line x1="5.2" y1="5.2" x2="6.9" y2="6.9" {...p} />
          <Line x1="17.1" y1="17.1" x2="18.8" y2="18.8" {...p} />
          <Line x1="5.2" y1="18.8" x2="6.9" y2="17.1" {...p} />
          <Line x1="17.1" y1="6.9" x2="18.8" y2="5.2" {...p} />
        </>
      );
    case 'moon':
      return <Path d="M20 14.5A8 8 0 0 1 9.5 4 7.5 7.5 0 1 0 20 14.5Z" {...p} />;
    case 'system':
    case 'settings':
      return (
        <>
          <Rect x="3" y="4.5" width="18" height="12" rx="2" {...p} />
          <Line x1="8" y1="20" x2="16" y2="20" {...p} />
          <Line x1="12" y1="16.5" x2="12" y2="20" {...p} />
        </>
      );
    case 'chevronRight':
      return <Polyline points="9 5 16 12 9 19" {...p} />;
    case 'chevronLeft':
      return <Polyline points="15 5 8 12 15 19" {...p} />;
    case 'arrowDown':
      return (
        <>
          <Line x1="12" y1="4" x2="12" y2="20" {...p} />
          <Polyline points="6 14 12 20 18 14" {...p} />
        </>
      );
    case 'arrowUp':
      return (
        <>
          <Line x1="12" y1="20" x2="12" y2="4" {...p} />
          <Polyline points="6 10 12 4 18 10" {...p} />
        </>
      );
    case 'plus':
      return (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...p} />
          <Line x1="5" y1="12" x2="19" y2="12" {...p} />
        </>
      );
    case 'edit':
      return (
        <>
          <Path d="M5 19h3l9-9-3-3-9 9Z" {...p} />
          <Path d="m14 7 3 3" {...p} />
        </>
      );
    case 'building':
      return (
        <>
          <Rect x="5" y="3" width="14" height="18" rx="1.5" {...p} />
          <Line x1="9" y1="7" x2="9" y2="7" {...p} />
          <Line x1="9" y1="11" x2="9.01" y2="11" {...p} />
          <Line x1="15" y1="7" x2="15" y2="7" {...p} />
          <Line x1="15" y1="11" x2="15.01" y2="11" {...p} />
          <Path d="M10 21v-4h4v4" {...p} />
        </>
      );
    case 'globe':
      return (
        <>
          <Circle cx="12" cy="12" r="8.5" {...p} />
          <Line x1="3.5" y1="12" x2="20.5" y2="12" {...p} />
          <Path d="M12 3.5c2.5 2.4 2.5 14.6 0 17 -2.5-2.4-2.5-14.6 0-17Z" {...p} />
        </>
      );
    case 'logout':
      return (
        <>
          <Path d="M14 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8" {...p} />
          <Polyline points="17 8 21 12 17 16" {...p} />
          <Line x1="21" y1="12" x2="10" y2="12" {...p} />
        </>
      );
    case 'search':
      return (
        <>
          <Circle cx="11" cy="11" r="7" {...p} />
          <Line x1="16" y1="16" x2="21" y2="21" {...p} />
        </>
      );
    case 'close':
      return (
        <>
          <Line x1="6" y1="6" x2="18" y2="18" {...p} />
          <Line x1="18" y1="6" x2="6" y2="18" {...p} />
        </>
      );
    case 'check':
      return <Polyline points="4 12 10 18 20 6" {...p} />;
    case 'inbox':
      return (
        <>
          <Path d="M3.5 13 6 5.5h12L20.5 13" {...p} />
          <Path d="M3.5 13v5a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-5" {...p} />
          <Path d="M3.5 13h4l1.5 2.5h6L16.5 13h4" {...p} />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect x="4.5" y="10.5" width="15" height="10" rx="2.5" {...p} />
          <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...p} />
          <Line x1="12" y1="14" x2="12" y2="17" {...p} />
        </>
      );
    case 'phone':
      return (
        <Path
          d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4.5 6a2 2 0 0 1 2-2Z"
          {...p}
        />
      );
    case 'chart':
      return (
        <>
          <Line x1="4" y1="20" x2="20" y2="20" {...p} />
          <Rect x="6" y="11" width="3.2" height="6" rx="0.8" {...p} />
          <Rect x="11.5" y="7" width="3.2" height="10" rx="0.8" {...p} />
          <Rect x="17" y="13" width="3.2" height="4" rx="0.8" {...p} />
        </>
      );
    case 'briefcase':
      return (
        <>
          <Rect x="3" y="7.5" width="18" height="12" rx="2.5" {...p} />
          <Path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" {...p} />
          <Line x1="3" y1="12.5" x2="21" y2="12.5" {...p} />
        </>
      );
    case 'cake':
      return (
        <>
          <Path d="M4 21h16" {...p} />
          <Path d="M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" {...p} />
          <Path d="M5 16c1.5 0 1.5 1.2 3 1.2S9.5 16 11 16s1.5 1.2 3 1.2S15.5 16 17 16" {...p} />
          <Line x1="12" y1="6" x2="12" y2="9.5" {...p} />
          <Circle cx="12" cy="4.6" r="0.9" {...p} />
        </>
      );
    case 'graduation':
      return (
        <>
          <Path d="M12 4 2.5 8.5 12 13l9.5-4.5L12 4Z" {...p} />
          <Path d="M6.5 11v4.5c0 1.2 2.5 2.5 5.5 2.5s5.5-1.3 5.5-2.5V11" {...p} />
          <Line x1="21.5" y1="8.5" x2="21.5" y2="13" {...p} />
        </>
      );
    case 'target':
      return (
        <>
          <Circle cx="12" cy="12" r="8.5" {...p} />
          <Circle cx="12" cy="12" r="4.5" {...p} />
          <Circle cx="12" cy="12" r="0.8" fill={p.stroke} stroke={p.stroke} />
        </>
      );
    case 'eye':
      return (
        <>
          <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...p} />
          <Circle cx="12" cy="12" r="3" {...p} />
        </>
      );
    case 'eyeOff':
      return (
        <>
          <Path d="M4 5l16 14" {...p} />
          <Path d="M9.5 5.7A8.6 8.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.6" {...p} />
          <Path d="M6.4 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5a8.7 8.7 0 0 0 3.3-.65" {...p} />
          <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" {...p} />
        </>
      );
    case 'guest':
      // visitor: a person + a small pass/badge to the side
      return (
        <>
          <Circle cx="9.5" cy="8" r="3.4" {...p} />
          <Path d="M3.5 20c0-3.4 2.7-5.6 6-5.6 1.2 0 2.3.3 3.2.8" {...p} />
          <Rect x="14" y="13" width="7" height="8" rx="1.5" {...p} />
          <Line x1="16" y1="16" x2="19" y2="16" {...p} />
          <Line x1="16" y1="18.5" x2="19" y2="18.5" {...p} />
        </>
      );
    case 'board':
      // kanban / project board: three columns of differing height
      return (
        <>
          <Rect x="3.5" y="4.5" width="4.3" height="15" rx="1.2" {...p} />
          <Rect x="9.8" y="4.5" width="4.3" height="9.5" rx="1.2" {...p} />
          <Rect x="16.1" y="4.5" width="4.3" height="12" rx="1.2" {...p} />
        </>
      );
    case 'trash':
      return (
        <>
          <Line x1="4" y1="6.5" x2="20" y2="6.5" {...p} />
          <Path d="M9 6.5V4.5h6v2" {...p} />
          <Path d="M6 6.5 7 20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13.5" {...p} />
          <Line x1="10" y1="10" x2="10" y2="17" {...p} />
          <Line x1="14" y1="10" x2="14" y2="17" {...p} />
        </>
      );
    case 'fingerprint':
      // concentric ridge arcs, outermost first, each trailing off downward
      return (
        <>
          <Path d="M7.5 5.4a8.4 8.4 0 0 1 9 0" {...p} />
          <Path d="M4.5 12.5a7.5 7.5 0 0 1 15 0c0 2.9-.7 5.6-1.8 8" {...p} />
          <Path d="M8 12.5a4 4 0 0 1 8 0c0 2.8-.5 5.4-1.5 7.8" {...p} />
          <Path d="M12 12.5c0 2.6-.4 5.1-1.1 7.5" {...p} />
        </>
      );
    case 'help':
      // question mark inside a circle — neutral confirmation glyph
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...p} />
          <Path d="M9.5 9.2a2.5 2.5 0 0 1 4.6 1.3c0 1.7-2.1 2-2.1 3.5" {...p} />
          <Line x1="12" y1="17" x2="12" y2="17.01" {...p} />
        </>
      );
    case 'backspace':
      // keyboard delete key: left-pointing tab with an × inside
      return (
        <>
          <Path d="M20 5H9l-6 7 6 7h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 20 5Z" {...p} />
          <Line x1="12.5" y1="9.5" x2="17.5" y2="14.5" {...p} />
          <Line x1="17.5" y1="9.5" x2="12.5" y2="14.5" {...p} />
        </>
      );
    default:
      return null;
  }
}
