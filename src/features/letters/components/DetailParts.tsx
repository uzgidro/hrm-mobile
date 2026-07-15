import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import type { TimelineItem } from '@/utils/letterStatus';

// Small presentational pieces of the letter detail screen, split out so the
// screen file stays composition-only. Styles are colocated here.

export function DetailHeader() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
        <Icon name="chevronLeft" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('letters.detailTitle')}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function KV({ k, v }: { k: string; v: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  );
}

// One row of the signing timeline. Colour keys off the item's status
// (signed → success, rejected → error, pending → muted), consuming the
// TimelineItem shape produced by getSigningTimeline (letterStatus).
export function SignerRow({ item }: { item: TimelineItem }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const tc =
    item.status === 'signed' ? colors.success : item.status === 'rejected' ? colors.error : colors.textMuted;
  return (
    <View style={styles.signerRow}>
      <View style={[styles.signerDot, { backgroundColor: tc }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.signerName}>{item.name}</Text>
        <Text style={styles.signerType}>{item.role}</Text>
      </View>
      <Text style={[styles.signerStatus, { color: tc }]}>{item.statusText}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: c.text },

    section: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.cardBorder },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

    kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
    kvKey: { fontSize: 13, color: c.textMuted, flex: 1 },
    kvVal: { fontSize: 13, color: c.text, fontWeight: '600', flex: 2, textAlign: 'right' },

    signerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    signerDot: { width: 10, height: 10, borderRadius: 5 },
    signerName: { fontSize: 14, color: c.text, fontWeight: '600' },
    signerType: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    signerStatus: { fontSize: 12, fontWeight: '600' },
  });
