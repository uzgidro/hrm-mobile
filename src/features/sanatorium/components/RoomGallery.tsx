// Full-screen swipe gallery of a room's photos (1600 px images, presigned URLs — no auth header).
import React, { useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { Text } from '@/ui';
import type { RoomPhoto } from '../types';

export type GalleryState = { title: string; photos: RoomPhoto[]; index: number } | null;

export function RoomGallery({ state, onClose }: { state: GalleryState; onClose: () => void }) {
  return (
    <Modal visible={!!state} transparent animationType="fade" onRequestClose={onClose}>
      {state && <Viewer state={state} onClose={onClose} />}
    </Modal>
  );
}

// Mounted per opening, so it starts on the tapped photo without any effect.
function Viewer({ state, onClose }: { state: NonNullable<GalleryState>; onClose: () => void }) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(state.index);
  const list = useRef<FlatList<RoomPhoto>>(null);
  // Arrows next to swiping: a mouse (web) cannot swipe, and they help accessibility.
  const go = (to: number) => {
    if (to < 0 || to >= state.photos.length) return;
    list.current?.scrollToIndex({ index: to, animated: true });
    setIndex(to);
  };
  return (
      <View style={styles.root} testID="room-gallery">
        {state && (
          <FlatList
            ref={list}
            initialScrollIndex={state.index}
            data={state.photos}
            keyExtractor={(p) => String(p.id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, height }}>
                <Image source={{ uri: item.url }} style={styles.img} contentFit="contain" accessibilityLabel={state.title} />
              </View>
            )}
          />
        )}
        {index > 0 && (
          <Pressable onPress={() => go(index - 1)} accessibilityRole="button" accessibilityLabel={t('sanatorium.prevPhoto')} style={[styles.arrow, styles.arrowLeft]} testID="gallery-prev">
            <Icon name="chevronLeft" size={28} color="white" />
          </Pressable>
        )}
        {index < state.photos.length - 1 && (
          <Pressable onPress={() => go(index + 1)} accessibilityRole="button" accessibilityLabel={t('sanatorium.nextPhoto')} style={[styles.arrow, styles.arrowRight]} testID="gallery-next">
            <Icon name="chevronRight" size={28} color="white" />
          </Pressable>
        )}
        <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Text variant="heading" style={styles.title} numberOfLines={1}>{state?.title}</Text>
          <Text variant="label" style={styles.title} testID="gallery-counter">{state ? `${index + 1}/${state.photos.length}` : ''}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={12} style={styles.close} testID="gallery-close">
            <Icon name="close" size={22} color="white" />
          </Pressable>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  // A photo viewer is always dark, in light and dark themes alike.
  root: { flex: 1, backgroundColor: 'black' },
  img: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: 'rgba(0,0,0,0.45)' },
  title: { color: 'white' },
  close: { marginLeft: 'auto', padding: 4 },
  arrow: { position: 'absolute', top: '45%', padding: 10, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.45)' },
  arrowLeft: { left: 8 },
  arrowRight: { right: 8 },
});
