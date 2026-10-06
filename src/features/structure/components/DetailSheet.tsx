// Bo'lim / lavozim tafsiloti (v2 StructurePage jadval ustunlari: indeks, kod,
// rahbarlar, belgilar, yaratilgan sana / qisqa nom, razryad, toifa). Yozish
// amallari (`actions`) — faqat `canManageStructure` bo'lsa, ekran beradi.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge, Sheet, Text } from '@/ui';
import type { Department, JobPosition } from '../api/queries';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      {typeof children === 'string' ? <Text variant="body">{children}</Text> : children}
    </View>
  );
}

export function DepartmentDetail({
  dept,
  onClose,
  actions,
}: {
  dept: Department | null;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  const { t } = useTranslation();
  if (!dept) return null;
  const heads = dept.heads ?? [];
  return (
    <Sheet scroll visible onClose={onClose} title={dept.name || '—'}>
      <View style={styles.body}>
        <View style={styles.badges}>
          {dept.is_secretariat && <Badge label={t('structure.flagSecretariat')} tone="brand" />}
          {dept.is_ijro_manager && <Badge label={t('structure.flagIjro')} tone="success" />}
          {!!dept.closed_at && <Badge label={t('structure.closedBadge')} tone="warning" />}
        </View>
        <Row label={t('structure.colIndex')}>{dept.index != null ? String(dept.index) : '—'}</Row>
        <Row label={t('structure.colCode')}>{dept.code || '—'}</Row>
        <Row label={t('structure.colHeads')}>
          {heads.length === 0 ? (
            <Text variant="body">—</Text>
          ) : (
            <View style={styles.heads}>
              {heads.map((h) => (
                <View key={h.id} style={styles.head}>
                  <Avatar name={h.legal_name ?? '?'} uri={h.photo_thumb_path ?? h.photo_path} size={28} />
                  <Text variant="body">{h.legal_name ?? '—'}</Text>
                </View>
              ))}
            </View>
          )}
        </Row>
        <Row label={t('structure.colCreated')}>
          {dept.created_at ? dayjs(dept.created_at).format('DD.MM.YYYY') : '—'}
        </Row>
        {!!dept.closed_at && (
          <Row label={t('structure.closedOn')}>
            {`${dayjs(dept.closed_at).format('DD.MM.YYYY')}${dept.closed_reason ? ` · ${dept.closed_reason}` : ''}`}
          </Row>
        )}
        {actions}
      </View>
    </Sheet>
  );
}

export function PositionDetail({
  pos,
  onClose,
  actions,
}: {
  pos: JobPosition | null;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  const { t } = useTranslation();
  if (!pos) return null;
  return (
    <Sheet scroll visible onClose={onClose} title={pos.name || '—'}>
      <View style={styles.body}>
        <Row label={t('structure.colShortName')}>{pos.short_name || '—'}</Row>
        <Row label={t('structure.colRazryad')}>{pos.razryad != null ? String(pos.razryad) : '—'}</Row>
        <Row label={t('structure.category')}>
          {pos.category ? t(`structure.cat_${pos.category}`, { defaultValue: pos.category }) : '—'}
        </Row>
        {actions}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 8 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  kv: { gap: 4 },
  heads: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
