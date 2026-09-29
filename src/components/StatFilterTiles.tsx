// Web v2 «stat tiles that double as filters» (GuestsPage, support inbox) in the
// design-I chrome: 2px outline + 4px lip, a coloured icon box, a big number.
// Tapping a tile selects its filter; tapping the active one clears it.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { ff } from '../theme/typography';
import type { Tone } from '../theme/tones';
import { Icon, type IconName } from './Icon';

export type StatTile<K extends string> = {
  key: K;
  label: string;
  value: number | null | undefined;
  icon: IconName;
  tone: Tone;
};

export function StatFilterTiles<K extends string>({
  tiles,
  active,
  onSelect,
  testID,
}: {
  tiles: StatTile<K>[];
  active: K;
  /** Called with the tapped key; the caller maps a re-tap to its «all» key. */
  onSelect: (key: K) => void;
  testID?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.grid} testID={testID}>
      {tiles.map((tile) => {
        const on = tile.key === active;
        return (
          <TouchableOpacity
            key={tile.key}
            style={[styles.tile, on && styles.tileOn]}
            onPress={() => onSelect(tile.key)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${tile.label}: ${tile.value ?? '—'}`}
            testID={testID ? `${testID}-${tile.key}` : undefined}
          >
            <View style={[styles.iconBox, { backgroundColor: tile.tone.fill, borderBottomColor: tile.tone.lip }]}>
              <Icon name={tile.icon} size={18} color="#FFFFFF" strokeWidth={2.3} />
            </View>
            <View style={styles.texts}>
              <Text style={styles.label} numberOfLines={1}>{tile.label}</Text>
              <Text style={styles.value}>{tile.value ?? '—'}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: {
      flexGrow: 1,
      flexBasis: '46%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 2,
      borderBottomWidth: 4,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    tileOn: { borderColor: c.tabBarActiveBorder, backgroundColor: c.primarySoft },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 11,
      borderBottomWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    texts: { flex: 1, minWidth: 0 },
    label: { fontSize: 12.5, color: c.textSecondary, ...ff('800') },
    value: { fontSize: 20, lineHeight: 24, color: c.text, ...ff('900') },
  });
