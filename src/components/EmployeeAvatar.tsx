import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeProvider';

// Anything with a photo + display name — Employee, EmployeeBirthday, etc.
type AvatarSubject = { photo_path?: string | null; legal_name?: string | null };

type Props = {
  emp: AvatarSubject;
  size?: number;
  testID?: string;
};

// Shared, memoized avatar. Previously each screen defined its own copy and
// rendered a plain RN <Image> per list row (no caching, unmemoized). expo-image
// adds memory+disk caching so the same employee photo isn't refetched across
// screens, and React.memo skips re-render when emp/size are unchanged.
export const EmployeeAvatar = React.memo(function EmployeeAvatar({ emp, size = 44, testID }: Props) {
  const { colors } = useTheme();
  const radius = size / 2;

  if (emp.photo_path) {
    return (
      <Image
        testID={testID}
        source={{ uri: emp.photo_path }}
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
