import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';

// Labeled form section for the create-order screen. `error` renders the
// validation message right under the offending input — a blocking rule the
// backend would answer with a 400 (a taken decree number, a submitter who is
// also an approver) has to be visible AT the field, not only in a modal alert
// the user dismisses and then cannot re-read.
export function Field({
  label, required, error, children,
}: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.req}> *</Text> : null}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// Files ALREADY attached to the order (edit mode). Read-only on purpose: the
// mobile app has no delete-document endpoint wired, and the list exists so the
// user can see what is on the decree — without it the edit form looked like it
// had no attachments at all and newly picked files silently APPENDED to an
// invisible set (web v1 shows the same list, AddOrderDrawer.jsx:669).
export function ExistingDocuments({
  documents, label, note, fallbackName,
}: {
  documents: { id: number; document_objectname?: string | null }[];
  label: string;
  note: string;
  fallbackName: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (!documents.length) return null;
  return (
    <View testID="order-existing-documents" style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {documents.map((d) => (
        <View key={d.id} style={styles.docRow}>
          <Icon name="doc" size={16} color={colors.primary} />
          <Text style={styles.docName} numberOfLines={1}>{d.document_objectname || fallbackName}</Text>
        </View>
      ))}
      <Text style={styles.docNote}>{note}</Text>
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
    errorText: { marginTop: 6, fontSize: 12, color: c.error, fontWeight: '600' },

    docRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
    },
    docName: { flex: 1, fontSize: 13, color: c.text },
    docNote: { fontSize: 12, color: c.textMuted },
  });
