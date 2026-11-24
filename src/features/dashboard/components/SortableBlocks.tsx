// The editor's list of blocks, dragged by the handle at the start of each row
// (react-native-sortables: JS only, on the gesture-handler and reanimated already in the
// binary).
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useReducedMotion, type AnimatedRef } from 'react-native-reanimated';
import type Animated from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { moduleTint, radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Text } from '@/ui';
import { useTextScale } from '@/store/textSizeStore';
import { accentFill } from '@/theme/accents';
import { osCap } from '@/ui/scaled';
import { blockDef, type HomeBlockKey } from '../board/homeBlocks';
import type { BlockLook } from '../board/homeLook';
import { useBlockName } from './custom/customBlocks';

/** Two title lines at the app's text size cap (`maxFontSizeMultiplier` 1.3). */
const ROW = 56;
const MAX_FONT_SCALE = 1.3;

export function SortableBlocks({
  blocks,
  disabled,
  scrollRef,
  onReorder,
  onEdit,
  items,
  actions,
}: {
  blocks: readonly HomeBlockKey[];
  disabled: boolean;
  /** The scroll view the list stands in; it scrolls when a row is held near its edge. */
  scrollRef: AnimatedRef<Animated.ScrollView>;
  onReorder: (from: number, to: number) => void;
  /** Opens the block's own settings. */
  onEdit: (block: HomeBlockKey) => void;
  items?: Record<string, BlockLook>;
  actions: (block: HomeBlockKey) => React.ReactNode;
}) {
  const { fontScale } = useWindowDimensions();
  const reduced = useReducedMotion();
  const epoch = useBackgroundEpoch();
  const textScale = useTextScale();
  const height = Math.round(ROW * textScale * Math.min(Math.max(fontScale, 1), osCap(MAX_FONT_SCALE, textScale)));
  const data = [...blocks];

  const renderItem = useCallback(
    ({ item }: { item: HomeBlockKey }) => (
      <BlockRow block={item} height={height} look={items?.[item]} onPress={() => onEdit(item)} draggable>
        {actions(item)}
      </BlockRow>
    ),
    [actions, height, items, onEdit],
  );

  return (
    // The library sizes its container on the UI thread; on some Android builds the views
    // below then keep their old touch area after a row is added or removed (issue #611).
    // The height set here is ordinary layout, so what follows is always where it is drawn.
    <View style={{ height: height * data.length }}>
      <Sortable.Grid
        key={epoch}
        columns={1}
        data={data}
        keyExtractor={keyOf}
        renderItem={renderItem}
        customHandle
        sortEnabled={!disabled}
        scrollableRef={scrollRef}
        // The row stays inside the list: past it, the scroll view would clip the row away.
        overDrag="none"
        enableActiveItemSnap={false}
        dragActivationDelay={0}
        hapticsEnabled={false}
        // Rows come and go at once; entering/exiting animations would overlap the new rows.
        itemEntering={null}
        itemExiting={null}
        inactiveItemOpacity={1}
        activeItemScale={reduced ? 1 : 1.02}
        activationAnimationDuration={reduced ? 0 : 150}
        dropAnimationDuration={reduced ? 0 : 200}
        onDragEnd={({ fromIndex, toIndex }) => onReorder(fromIndex, toIndex)}
      />
    </View>
  );
}

const keyOf = (k: HomeBlockKey) => k;

/**
 * A number that changes when the app returns from the background. Rows are placed by shared
 * values that a recreated native view does not get back (issue #592: rows overlap until the
 * next drag), so the list starts anew.
 */
function useBackgroundEpoch(): number {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    let away = false;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') away = true;
      else if (s === 'active' && away) {
        away = false;
        setEpoch((n) => n + 1);
      }
    });
    return () => sub.remove();
  }, []);
  return epoch;
}

export function BlockRow({
  block,
  height = ROW,
  draggable = false,
  hint = false,
  plain = false,
  look,
  onPress,
  children,
}: {
  block: HomeBlockKey;
  height?: number;
  draggable?: boolean;
  /** Say under the title when the block appears at all. */
  hint?: boolean;
  /** The module's own name, without «… — button». */
  plain?: boolean;
  look?: BlockLook;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const name = useBlockName();
  const def = blockDef(block);
  if (!def) return null;
  const title = plain ? t(def.titleKey) : name(block, look);
  const tint = moduleTint(c, def.tint);
  const icon = (
    <View style={[styles.icon, { backgroundColor: tint.wash }]}>
      <Icon name={def.icon} size={16} color={tint.fg} />
    </View>
  );
  return (
    <View
      testID={`row-${block}`}
      style={[
        styles.row,
        // The dragged row passes over the others: it needs a ground of its own.
        { borderTopColor: c.border, backgroundColor: c.surface },
        draggable ? { height } : { minHeight: height },
      ]}
    >
      {draggable ? (
        <Sortable.Handle>
          {/* Not a stop for a screen reader: the arrows do the same and say so. */}
          <View
            testID={`drag-${block}`}
            style={[styles.handle, { height }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Icon name="grip" size={16} strokeWidth={3} color={c.fgSubtle} />
            {icon}
          </View>
        </Sortable.Handle>
      ) : (
        icon
      )}
      <Pressable
        testID={onPress && `edit-${block}`}
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress && 'button'}
        accessibilityLabel={onPress && t('dashboard.customise.edit', { name: title })}
        style={[styles.text, !draggable && styles.textGap]}
      >
        <View style={styles.titleRow}>
          {look?.accent ? <View style={[styles.dot, { backgroundColor: accentFill(look.accent) }]} /> : null}
          <Text variant="heading" numberOfLines={2} style={styles.title}>
            {title}
          </Text>
        </View>
        {hint && def.hintKey ? (
          <Text variant="caption" tone="subtle" numberOfLines={2}>
            {t(def.hintKey)}
          </Text>
        ) : null}
      </Pressable>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: StyleSheet.hairlineWidth },
  // 44pt wide; its empty start reaches into the card's padding.
  handle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, width: 44, marginLeft: -8 },
  // Narrow enough for the longest word of a title («Исполнительская») next to the handle
  // and three 44pt targets at 360dp.
  icon: { width: 26, height: 26, borderRadius: radii.xs, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  textGap: { marginLeft: 4 },
  title: { flexShrink: 1, fontSize: 14, lineHeight: 19 },
  // The glyphs line up with the card's edge, the 44pt targets reach into its padding.
  actions: { flexDirection: 'row', marginRight: -12 },
});
