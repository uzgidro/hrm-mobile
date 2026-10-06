// Avatar: rasm yoki bosh harflar. Rang nomdan barqaror tanlanadi (moduleTint).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme/ThemeProvider';
import { moduleTint, type ModuleTintKey } from '@/theme/tokens';
import { useThumbFallback } from '@/lib/useThumbFallback';
import { Text } from './Text';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

const TINTS: ModuleTintKey[] = ['violet', 'green', 'orange', 'drop', 'pink', 'amber', 'cyan'];

function tintFor(name: string): ModuleTintKey {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return TINTS[Math.abs(h) % TINTS.length]!;
}

/** `thumb` — kichik nusxa (`photo_thumb_path`): bo'lsa shu yuklanadi, xatoda `uri` ga qaytadi. */
export function Avatar({ name, uri: full, thumb, size = 40 }: { name: string; uri?: string | null; thumb?: string | null; size?: number }) {
  const { colors: c } = useTheme();
  const { uri, onError } = useThumbFallback(thumb, full);
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return (
      <Image
        source={{ uri }}
        onError={onError}
        style={[box, { backgroundColor: c.surface2 }]}
        contentFit="cover"
        accessibilityLabel={name}
      />
    );
  }
  const t = moduleTint(c, tintFor(name));
  return (
    <View style={[box, styles.center, { backgroundColor: t.wash }]} accessibilityLabel={name}>
      <Text variant="label" style={{ color: t.fg, fontSize: size * 0.36, fontWeight: '700' }}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
