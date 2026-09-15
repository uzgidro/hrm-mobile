// Live strength meter + rule checklist under a new-password field. Same rules
// as the server (`lib/passwordStrength`): "medium"/"strong" here is a password
// the save accepts; "weak" always names the missing rule. Nothing is drawn
// until the person starts typing.
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { checkPassword } from '@/lib/passwordStrength';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';

export function PasswordStrengthMeter({ value, username }: { value: string; username?: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const check = useMemo(() => checkPassword(value, username), [value, username]);
  if (!value) return null;

  const tone = check.level === 'strong' ? colors.success : check.level === 'medium' ? colors.warning : colors.error;
  const rows: { key: string; ok: boolean; label: string }[] = [
    { key: 'length', ok: check.rules.length, label: t('password.ruleLength') },
    { key: 'uppercase', ok: check.rules.uppercase, label: t('password.ruleUpper') },
    { key: 'lowercase', ok: check.rules.lowercase, label: t('password.ruleLower') },
    { key: 'digit', ok: check.rules.digit, label: t('password.ruleDigit') },
  ];
  if (check.failed.includes('contains_username')) rows.push({ key: 'u', ok: false, label: t('password.ruleNoLogin') });
  if (check.failed.includes('common')) rows.push({ key: 'c', ok: false, label: t('password.ruleNotCommon') });

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.meterRow}>
        <View style={styles.segments} accessibilityRole="progressbar" accessibilityLabel={t('password.strength')}>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={[styles.segment, { backgroundColor: n <= check.score ? tone : colors.cardBorder }]} />
          ))}
        </View>
        <Text style={[styles.level, { color: tone }]}>{t(`password.level_${check.level}`)}</Text>
      </View>
      {rows.map((r) => (
        <View key={r.key} style={styles.rule}>
          <Icon name={r.ok ? 'check' : 'close'} size={14} color={r.ok ? colors.success : colors.error} />
          <Text style={[styles.ruleText, r.ok && styles.ruleDone]}>{r.label}</Text>
        </View>
      ))}
      {check.level === 'medium' && <Text style={styles.hint}>{t('password.strongHint')}</Text>}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { gap: 4, marginTop: 2 },
    meterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    segments: { flex: 1, flexDirection: 'row', gap: 4 },
    segment: { flex: 1, height: 5, borderRadius: 3 },
    level: { fontSize: 12, fontWeight: '700' },
    rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ruleText: { fontSize: 12, color: c.text },
    ruleDone: { color: c.textMuted, textDecorationLine: 'line-through' },
    hint: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  });
