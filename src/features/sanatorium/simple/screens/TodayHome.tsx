// «Bugun»: the registrar's home. A big «Mehmon keldi» button, a search box, today's numbers, the
// setup checklist banner and the work queue (Kechikkan / Bugun / Tez orada) with ONE main button per card.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { Button, Card, EmptyState, IconButton, ListRow, PageHeader, ProgressBar, Screen, SearchField, SectionHeader, Sheet, StatTile, Text } from '@/ui';
import { guestsQuery } from '../../api/queries';
import { AppointmentSheet } from '../../components/AppointmentSheet';
import { fmtDate, sanErrorMessage } from '../../utils/sanatorium';
import { setupStatusQuery, useNoShow } from '../api';
import { QueueCard } from '../components/QueueCard';
import { StayActionSheets, useCheckOutFlow, type StayActionKind, type StayRef } from '../components/StayActions';
import type { QueueItem, TodayData } from '../types';
import { actionRoute, filterQueue, groupQueue, itemStayIds, setupRequiredLeft } from '../utils';

const STEP_KEYS = ['accept', 'room', 'doctor', 'meal', 'check', 'route'] as const;

export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={open} onClose={onClose} title={t('sanSimple.help.title')} scroll>
      <View style={styles.help} testID="help-sheet">
        {STEP_KEYS.map((k, i) => (
          <View key={k} style={styles.helpRow}>
            <Text variant="heading" tone="brand">{i + 1}</Text>
            <View style={styles.flex}>
              <Text variant="body" weight="600">{t(`sanSimple.help.${k}.title`)}</Text>
              <Text variant="caption" tone="muted">{t(`sanSimple.help.${k}.text`)}</Text>
            </View>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

function stayRef(item: QueueItem): StayRef | null {
  const ids = itemStayIds(item);
  if (!ids.length) return null;
  return {
    id: ids[0]!,
    guestName: item.guest?.full_name,
    plannedFrom: item.planned_from,
    plannedTo: item.planned_to,
    groupIds: ids,
    debt: item.debt,
    roomId: item.room?.id ?? null,
  };
}

export function TodayHome({ data, refreshing, onRefresh }: { data: TodayData; refreshing: boolean; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [help, setHelp] = useState(false);
  const [sheet, setSheet] = useState<{ stay: StayRef; kind: StayActionKind } | null>(null);
  const [apptStay, setApptStay] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const setup = useQuery(setupStatusQuery());
  const guests = useQuery(guestsQuery(search));
  const noShow = useNoShow();
  const checkOut = useCheckOutFlow();

  const items = filterQueue(data.items, search);
  const groups = groupQueue(items);
  const totals = data.totals ?? {};
  const left = setup.data ? setupRequiredLeft(setup.data.items) : 0;
  const showSetup = !!setup.data && setup.data.done < setup.data.total;

  const open = (item: QueueItem) => {
    const ids = itemStayIds(item);
    if (ids[0]) router.push({ pathname: '/sanatorium-stay', params: { id: String(ids[0]) } });
    else if (item.guest?.id) router.push({ pathname: '/sanatorium-guest', params: { id: String(item.guest.id) } });
  };

  const act = async (item: QueueItem, action: string) => {
    const route = actionRoute(item, action);
    if (route) return router.push(route as never);
    const ref = stayRef(item);
    if (!ref) return open(item);
    if (action === 'extend') return setSheet({ stay: ref, kind: 'extend' });
    if (action === 'choose_room') return setSheet({ stay: ref, kind: 'move' });
    if (action === 'take_payment') return setSheet({ stay: ref, kind: 'payment' });
    if (action === 'assign_doctor') return setApptStay(ref.id);
    setBusy(item.key);
    try {
      if (action === 'no_show') {
        const ok = await confirm({ title: t('sanSimple.noShowTitle'), message: t('sanSimple.noShowAsk', { name: item.guest?.full_name ?? '' }), confirmLabel: t('sanSimple.action.no_show'), cancelLabel: t('common.cancel'), destructive: true });
        if (!ok) return;
        try {
          await noShow.mutateAsync({ id: ref.id, whole_group: (ref.groupIds?.length ?? 1) > 1 });
          toast.success(t('sanSimple.noShowDone'));
        } catch (e) {
          toast.error(sanErrorMessage(e, t('errors.generic')));
        }
      } else if (action === 'check_out') {
        const r = await checkOut.run(ref.groupIds ?? [ref.id], item.debt);
        if (r === 'early') open(item);
      }
    } finally {
      setBusy(null);
    }
  };

  const tiles: { key: keyof typeof totals; icon: 'arrowDown' | 'users' | 'arrowUp' | 'building'; tint: 'drop' | 'green' | 'amber' | 'cyan' }[] = [
    { key: 'arriving', icon: 'arrowDown', tint: 'drop' },
    { key: 'in_house', icon: 'users', tint: 'green' },
    { key: 'leaving', icon: 'arrowUp', tint: 'amber' },
    { key: 'free_beds', icon: 'building', tint: 'cyan' },
  ];

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} testID="sanatorium-screen">
      <PageHeader title={t('sanSimple.today.title')} subtitle={fmtDate(data.date)} right={<IconButton icon="help" tone="soft" accessibilityLabel={t('sanSimple.help.title')} onPress={() => setHelp(true)} testID="today-help" />} />
      <View style={styles.stack}>
        <Button testID="today-arrived" label={t('sanSimple.today.arrived')} icon="plus" size="lg" full onPress={() => router.push('/sanatorium-arrive')} />
        <SearchField value={search} onChangeText={setSearch} placeholder={t('sanSimple.today.search')} testID="today-search" />
        <View style={styles.tiles}>
          {tiles.map((x) => (
            <StatTile key={x.key} testID={`tile-${x.key}`} label={t(`sanSimple.totals.${x.key}`)} value={totals[x.key] ?? 0} icon={x.icon} tint={x.tint} labelLines={2} style={styles.tile} />
          ))}
        </View>
        {showSetup && (
          <Card testID="setup-banner">
            <Text variant="heading">{t('sanSimple.setup.banner', { done: setup.data!.done, total: setup.data!.total })}</Text>
            <ProgressBar value={setup.data!.total ? setup.data!.done / setup.data!.total : 0} />
            {left > 0 && <Text variant="caption" tone="muted">{t('sanSimple.setup.requiredLeft', { count: left })}</Text>}
            <Button testID="setup-open" label={t('sanSimple.setup.open')} variant="soft" onPress={() => router.push('/sanatorium-setup')} />
          </Card>
        )}
        {search.trim().length >= 2 && (guests.data ?? []).length > 0 && (
          <>
            <SectionHeader title={t('sanSimple.today.guestsFound')} />
            {(guests.data ?? []).slice(0, 5).map((g) => (
              <ListRow key={g.id} pressable chevron testID={`found-${g.id}`} title={g.full_name} subtitle={g.phone ?? undefined} onPress={() => router.push({ pathname: '/sanatorium-guest', params: { id: String(g.id) } })} />
            ))}
          </>
        )}
        {groups.length === 0 ? (
          <EmptyState title={search.trim() ? t('sanSimple.today.noMatch') : t('sanSimple.today.empty')} />
        ) : (
          groups.map((g) => (
            <View key={g.urgency} style={styles.stack} testID={`group-${g.urgency}`}>
              <SectionHeader title={`${t(`sanSimple.urgency.${g.urgency}`)} (${g.items.length})`} />
              {g.items.map((item) => (
                <QueueCard key={item.key} item={item} busy={busy === item.key} onAction={(a) => void act(item, a)} onOpen={() => open(item)} />
              ))}
            </View>
          ))
        )}
        <Button testID="today-all" label={t('sanSimple.today.allSections')} variant="soft" full onPress={() => router.push('/sanatorium-all')} />
      </View>
      <HelpSheet open={help} onClose={() => setHelp(false)} />
      <StayActionSheets stay={sheet?.stay ?? null} kind={sheet?.kind ?? null} onClose={() => setSheet(null)} />
      <AppointmentSheet stayId={apptStay} onClose={() => setApptStay(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '47%', flexGrow: 1 },
  help: { gap: 12, paddingBottom: 8 },
  helpRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
});
