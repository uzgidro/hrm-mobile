// Journey block of the stay screen: current stage, the history of moves and a «move» button for
// the registrar / room keeper. Hidden while the journey section is switched off.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Badge, Button, Card, Text } from '@/ui';
import { journeyStayQuery } from '../../api/sections1';
import { useSanFeatures } from '../../utils/features';
import { pickLang } from '../../utils/sections1';
import { fmtDateTime, hasSanRole } from '../../utils/sanatorium';
import { MoveStageSheet } from './JourneySheets';

export function JourneyCard({ stayId }: { stayId: number }) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { on } = useSanFeatures();
  const enabled = on('journey');
  const q = useQuery(journeyStayQuery(stayId, enabled));
  const [move, setMove] = useState(false);
  if (!enabled || q.isError || !q.data) return null;
  const d = q.data;
  const name = (s: { name_uz: string; name_ru: string | null; name_en: string | null } | null) =>
    s ? pickLang(i18n.language, { uz: s.name_uz, ru: s.name_ru, en: s.name_en }) : '—';
  return (
    <Card title={t('san1.journey.title')} icon="target" testID="stay-journey">
      <View style={styles.row}>
        <Text variant="heading" style={styles.flex}>{name(d.current)}</Text>
        {d.inferred && <Badge label={t('san1.journey.inferred')} tone="neutral" />}
      </View>
      {d.history.length === 0 && <Text variant="caption" tone="muted">{t('san1.journey.noHistory')}</Text>}
      {[...d.history].reverse().map((h) => (
        <View key={h.id} style={styles.hist}>
          <Text variant="body">{name(h.stage)}</Text>
          <Text variant="caption" tone="muted">
            {[fmtDateTime(h.entered_at), h.auto ? t('san1.journey.auto') : h.by, h.note].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ))}
      {hasSanRole(user, 'registrar', 'room_keeper') && (
        <Button testID="stay-journey-move" label={t('san1.journey.move')} variant="soft" size="sm" onPress={() => setMove(true)} />
      )}
      <MoveStageSheet stayId={move ? stayId : null} currentId={d.current?.id} onClose={() => setMove(false)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  flex: { flex: 1 },
  hist: { paddingVertical: 4 },
});
