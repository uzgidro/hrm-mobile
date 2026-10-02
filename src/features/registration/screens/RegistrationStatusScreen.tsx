// v3 Ariza holati — web v2 `RegistrationStatusPage` porti (TZ 4.2.2 «мониторинг
// статуса своей заявки»). Mehmon rolidagi foydalanuvchining asosiy ekrani:
// arizasi qay bosqichda, rad etilgan bo'lsa — sababi, va yuborgan ma'lumotlari.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Screen,
  Skeleton,
  Text,
  toneColors,
  type Tone,
} from '@/ui';
import { myRegistrationQuery, type Registration } from '../api/queries';

const TONE: Record<string, Tone> = { pending: 'warning', approved: 'success', rejected: 'danger' };
const ICON: Record<string, IconName> = { pending: 'clock', approved: 'check', rejected: 'close' };
const fmt = (d?: string | null) => (d ? dayjs(d).format('DD.MM.YYYY') : null);

export default function RegistrationStatusScreen() {
  const { t } = useTranslation();
  const q = useQuery(myRegistrationQuery());

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <PageHeader title={t('regStatus.title')} subtitle={t('regStatus.subtitle')} />
      {q.isPending ? (
        <Skeleton height={160} />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <Card>
          <EmptyState title={t('regStatus.none')} message={t('regStatus.noneHint')} />
        </Card>
      ) : (
        <Status row={q.data} />
      )}
    </Screen>
  );
}

function Status({ row }: { row: Registration }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tone = TONE[row.status] ?? 'neutral';
  const tc = toneColors(colors, tone);
  const reviewed = fmt(row.reviewed_at);
  const claim = row.is_uge_employee
    ? [row.claimed_branch_name, row.claimed_department_name, row.claimed_job_position_name].filter(Boolean).join(' · ')
    : t('regStatus.guest');
  const fields: [string, string | null | undefined][] = [
    [t('regStatus.username'), row.username],
    [t('regStatus.email'), row.email],
    [t('regStatus.phone'), row.phone_number],
    [t('regStatus.birthDate'), fmt(row.birth_date)],
    [t('regStatus.pinfl'), row.pinfl],
    [t('regStatus.passport'), row.passport_number],
    [t('regStatus.nationality'), row.nationality_name],
    [t('regStatus.citizenship'), row.citizenship_name],
    [t('regStatus.address'), row.address],
    [t('regStatus.claim'), claim],
  ];

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.head}>
          <View style={[styles.iconBox, { backgroundColor: tc.soft }]}>
            <Icon name={ICON[row.status] ?? 'clock'} size={26} color={tc.fg} />
          </View>
          <View style={styles.body}>
            <View style={styles.nameRow}>
              {!!row.photo_url && <Avatar name={row.full_name ?? '?'} uri={row.photo_url} size={32} />}
              <Text variant="heading">{row.full_name || '—'}</Text>
            </View>
            <Badge label={t(`regStatus.status_${row.status}`, { defaultValue: row.status })} tone={tone} />
            <Text variant="body" tone="muted">
              {t(`regStatus.hint_${row.status}`, { defaultValue: '' })}
            </Text>
          </View>
        </View>
        {row.status === 'rejected' && !!row.reject_reason && (
          <View style={[styles.reason, { backgroundColor: toneColors(colors, 'danger').soft }]}>
            <Text variant="label">{t('regStatus.rejectReason')}</Text>
            <Text variant="body">{row.reject_reason}</Text>
          </View>
        )}
        {!!reviewed && (
          <Text variant="caption" tone="subtle" style={styles.reviewed}>
            {`${t('regStatus.reviewed')}: ${reviewed}${row.reviewed_by_name ? ` · ${row.reviewed_by_name}` : ''}`}
          </Text>
        )}
      </Card>
      <Card title={t('regStatus.submitted')}>
        {fields.map(([label, value]) => (
          <View key={label} style={[styles.kv, { borderBottomColor: colors.border }]}>
            <Text variant="caption" tone="muted" style={styles.kvLabel}>
              {label}
            </Text>
            <Text variant="body" style={styles.kvValue}>
              {value || '—'}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  head: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  iconBox: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  reason: { marginTop: 12, borderRadius: radii.sm, padding: 10, gap: 2 },
  reviewed: { marginTop: 10 },
  kv: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  kvLabel: { width: '40%' },
  kvValue: { flex: 1 },
});
