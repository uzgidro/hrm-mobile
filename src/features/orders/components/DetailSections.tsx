import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import type { OrderAct } from '@/types';
import { Section } from './DetailParts';

// The signers / familiarizers / history sections of the decree detail. Split
// out of the screen so it stays composition-only; each block self-hides when
// its list is empty.
export function DetailSections({ order }: { order: OrderAct }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  return (
    <>
      {(order.assigned_signers?.length ?? 0) > 0 && (
        <Section title={t('orders.sectionSigners')}>
          {order.assigned_signers!.map((s, i) => {
            const sid = s.employee_id ?? s.employee?.id;
            const signed = (order.signers ?? []).some((x) => (x.employee_id ?? x.employee?.id) === sid);
            return (
              <View key={s.id ?? i} style={styles.signerRow}>
                <View style={[styles.signerDot, { backgroundColor: signed ? colors.success : colors.cardBorder }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.signerName}>{s.employee?.legal_name || t('orders.signerFallback')}</Text>
                  <Text style={styles.signerType}>
                    {s.signer_type === 'leadership' ? t('orders.signerLeadership') : t('orders.signerApprover')}
                  </Text>
                </View>
                <View style={styles.signerStatusRow}>
                  {signed && <Icon name="check" size={14} color={colors.success} />}
                  <Text style={[styles.signerStatus, { color: signed ? colors.success : colors.textMuted }]}>
                    {signed ? t('orders.signed') : t('orders.waiting')}
                  </Text>
                </View>
              </View>
            );
          })}
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
                  {f.acknowledged ? t('orders.acknowledged') : t('orders.waiting')}
                </Text>
              </View>
            </View>
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
    signerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    signerDot: { width: 10, height: 10, borderRadius: 5 },
    signerName: { fontSize: 14, color: c.text, fontWeight: '600' },
    signerType: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    signerStatus: { fontSize: 12, fontWeight: '600' },
    signerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  });
