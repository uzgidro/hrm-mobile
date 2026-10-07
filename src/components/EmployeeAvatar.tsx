import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeProvider';
import { useThumbFallback } from '../lib/useThumbFallback';

// Anything with a photo + display name — Employee, EmployeeBirthday, etc.
type AvatarSubject = { photo_path?: string | null; photo_thumb_path?: string | null; legal_name?: string | null };

// Backend kichik nusxasi 160×160 px — 64 dp gacha (≈2.5× zichlik) yetarli.
export const THUMB_MAX_SIZE = 64;

type Props = {
  emp: AvatarSubject;
  size?: number;
  testID?: string;
};

// Shared, memoized avatar. Previously each screen defined its own copy and
// rendered a plain RN <Image> per list row (no caching, unmemoized). expo-image
// adds memory+disk caching so the same employee photo isn't refetched across
// screens, and React.memo skips re-render when emp/size are unchanged.
//
// Kichik avatar `photo_thumb_path` dan (2026-10-06 o'lchov: to'liq surat o'rtacha 27 KB,
// nusxa 1.6 KB — 140 xodimlik jamoa ro'yxati ~3.8 MB → ~0.2 MB). Nusxa yo'q / 404 bo'lsa
// (eski yozuvlar) — to'liq suratga qaytadi.
export const EmployeeAvatar = React.memo(function EmployeeAvatar({ emp, size = 44, testID }: Props) {
  const { colors } = useTheme();
  const radius = size / 2;
  const { uri, key, onError } = useThumbFallback(size <= THUMB_MAX_SIZE ? emp.photo_thumb_path : null, emp.photo_path);

  if (uri) {
    return (
      <Image
        key={key}
        testID={testID}
        source={{ uri }}
        onError={onError}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius, backgroundColor: colors.primarySoft },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.38, color: colors.primaryLight }]}>
        {(emp.legal_name || 'X').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '700' },
});
