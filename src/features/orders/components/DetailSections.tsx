import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import type { OrderAct } from '@/types';
import { Section } from './DetailParts';
import { existingOrderDocuments } from '../utils/orderForm';

// The signers / familiarizers / history sections of the decree detail. Split
// out of the screen so it stays composition-only; each block self-hides when
// its list is empty.
export function DetailSections({ order }: { order: OrderAct }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const attachments = existingOrderDocuments(order);

  return (
    <>
      {order.deletion_requested && (
        <View style={styles.noticeCard}>
          <Icon name="close" size={16} color={colors.error} />
          <Text style={styles.noticeText}>{t('orders.deletionRequestedNote')}</Text>
        </View>
      )}

      {(order.assigned_signers?.length ?? 0) > 0 && (
        <Section title={t('orders.sectionSigners')}>
          {order.assigned_signers!.map((s, i) => {
            const sid = s.employee_id ?? s.employee?.id;
            const signed = (order.signers ?? []).some((x) => (x.employee_id ?? x.employee?.id) === sid);
            // Web OrderDetailModal:740 parity: the signer who REJECTED is marked.
            const rejected = !signed && sid != null && (order.rejected_by_id ?? order.rejected_by?.id) === sid;
            const tone = signed ? colors.success : rejected ? colors.error : colors.textMuted;
            return (
              <View key={s.id ?? i} style={styles.signerRow}>
                <View style={[styles.signerDot, { backgroundColor: signed ? colors.success : rejected ? colors.error : colors.cardBorder }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.signerName}>{s.employee?.legal_name || t('orders.signerFallback')}</Text>
                  <Text style={styles.signerType}>
                    {s.signer_type === 'leadership' ? t('orders.signerLeadership') : t('orders.signerApprover')}
                  </Text>
                </View>
                <View style={styles.signerStatusRow}>
                  {signed && <Icon name="check" size={14} color={colors.success} />}
                  {rejected && <Icon name="close" size={14} color={colors.error} />}
                  <Text style={[styles.signerStatus, { color: tone }]}>
                    {signed ? t('orders.signed') : rejected ? t('orders.rejectedByLabel') : t('orders.waiting')}
                  </Text>
                </View>
              </View>
            );
          })}
        </Section>
      )}

      {/* Departments assigned to acknowledge (web OrderDetailModal:700) — the
          per-person list below fills only once the decree is confirmed. */}
      {(order.familiarizer_departments?.length ?? 0) > 0 && (
        <Section title={t('orders.sectionFamiliarizerDepartments')}>
          <View style={styles.chipWrap}>
            {order.familiarizer_departments!.map((d) => (
              <View key={d.id} style={styles.chip}>
                <Text style={styles.chipText}>{d.name || `#${d.id}`}</Text>
              </View>
            ))}
          </View>
        </Section>
      )}

      {(order.familiarizers?.length ?? 0) > 0 && (
        <Section title={t('orders.sectionFamiliarizers')}>
          {order.familiarizers!.map((f, i) => (
            <View key={f.id ?? i} style={styles.signerRow}>
              <View style={[styles.signerDot, { backgroundColor: f.acknowledged ? colors.success : colors.cardBorder }]} />
              <Text style={[styles.signerName, { flex: 1 }]}>{f.employee?.legal_name || t('orders.signerFallback')}</Text>
              <View style={styles.signerStatusRow}>
                {f.acknowledged && <Icon name="check" size={14} color={colors.success} />}
                <Text style={[styles.signerStatus, { color: f.acknowledged ? colors.success : colors.textMuted }]}>
                  {f.acknowledged
                    ? (f.acknowledged_at ? dayjs(f.acknowledged_at).format('DD.MM.YYYY HH:mm') : t('orders.acknowledged'))
                    : t('orders.waiting')}
                </Text>
              </View>
            </View>
          ))}
        </Section>
      )}

      {/* Attached files (the generated decree_* docx is opened via the
          "Hujjatni ochish" button, so it is filtered out here — web :713). */}
      {attachments.length > 0 && (
        <Section title={t('orders.sectionAttachments')}>
          {attachments.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={styles.fileRow}
              activeOpacity={0.7}
              disabled={!d.file_path}
              onPress={() => d.file_path && Linking.openURL(d.file_path)}
            >
              <Icon name="doc" size={16} color={colors.primary} />
              <Text style={styles.fileName} numberOfLines={1}>{d.document_objectname || t('orders.existingFileFallback')}</Text>
            </TouchableOpacity>
          ))}
        </Section>
      )}

      {/* Comments are rendered ONCE — by <CommentsSection/> (live query +
          composer). This block used to duplicate them from the embedded
          `order.comments`, so every comment appeared twice on the screen. */}
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    noticeCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.errorSoft, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: c.error },
    noticeText: { flex: 1, fontSize: 13, color: c.error, fontWeight: '600' },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: c.primarySoft },
    chipText: { fontSize: 12, fontWeight: '600', color: c.primary },
    fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
    fileName: { flex: 1, fontSize: 13, color: c.primary, fontWeight: '600' },
    signerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    signerDot: { width: 10, height: 10, borderRadius: 5 },
    signerName: { fontSize: 14, color: c.text, fontWeight: '600' },
    signerType: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    signerStatus: { fontSize: 12, fontWeight: '600' },
    signerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  });
