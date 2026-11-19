// Cover thumbnail of a room (its first photo); tapping it opens the gallery. Shows a neutral
// placeholder when the room has no photos.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Text } from '@/ui';
import type { RoomPhoto } from '../types';

export function RoomCover({
  photos,
  size = 64,
  onOpen,
  testID,
}: {
  photos?: RoomPhoto[];
  size?: number;
  /** Open the gallery at the first photo; omitted = not tappable. */
  onOpen?: () => void;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const cover = photos?.[0];
  const box = { width: size, height: size, borderRadius: radii.md, backgroundColor: c.surface2 };
  const body = cover ? (
    <View style={box}>
      <Image source={{ uri: cover.thumb_url }} style={[StyleSheet.absoluteFill, { borderRadius: radii.md }]} contentFit="cover" />
      {photos!.length > 1 && (
        <View style={[styles.count, { backgroundColor: c.overlay }]}>
          <Text variant="caption" style={styles.countText}>{photos!.length}</Text>
        </View>
      )}
    </View>
  ) : (
    <View style={[box, styles.empty]}>
      <Icon name="building" size={Math.round(size / 2.5)} color={c.fgSubtle} />
    </View>
  );
  if (!onOpen || !cover) return <View testID={testID}>{body}</View>;
  return (
    <Pressable onPress={onOpen} accessibilityRole="imagebutton" accessibilityLabel={`${t('sanatorium.photos')} (${photos!.length})`} testID={testID}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', right: 4, bottom: 4, minWidth: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center' },
  countText: { color: 'white', fontSize: 11, lineHeight: 14 },
});
