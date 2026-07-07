import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';

// Labeled form section for the create-order screen.
export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.req}> *</Text> : null}</Text>
      {children}
    </View>
  );
}

// A tappable dropdown-style row that opens a PickerModal; shows a spinner while
// its option source is loading, and an optional clear (×) affordance.
export function Selector({
  text, placeholder, loading, onPress, onClear,
}: { text?: string; placeholder: string; loading?: boolean; onPress: () => void; onClear?: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity style={styles.selector} onPress={onPress} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : (
        <Text style={text ? styles.selectorText : styles.selectorPlaceholder} numberOfLines={1}>
          {text ?? placeholder}
        </Text>
      )}
      {onClear ? (
        <TouchableOpacity onPress={onClear} hitSlop={10}><Icon name="close" size={16} color={colors.textMuted} /></TouchableOpacity>
      ) : (
        <Icon name="chevronRight" size={20} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    field: { marginTop: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary, marginBottom: 8 },
    req: { color: c.error },

    selector: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 13, gap: 8 },
    selectorText: { flex: 1, fontSize: 14, color: c.text, fontWeight: '500' },
    selectorPlaceholder: { flex: 1, fontSize: 14, color: c.textMuted },
  });
