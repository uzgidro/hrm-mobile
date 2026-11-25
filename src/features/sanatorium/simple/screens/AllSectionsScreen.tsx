// «Barcha bo'limlar»: every section of the sanatorium in four groups (Mehmonlar, Xonalar, Xizmat, Boshqaruv).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { ListRow, PageHeader, Screen, SectionHeader } from '@/ui';
import { Denied, useSanAccess } from '../../components/common';
import { useSanFeatures } from '../../utils/features';
import { hasSanRole, isSanReadOnly } from '../../utils/sanatorium';
import { visibleGroups } from '../sectionGroups';

export default function AllSectionsScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar', 'room_keeper');
  const user = useAuthStore((s) => s.user);
  const { on } = useSanFeatures();
  if (!allowed) return <Denied />;
  // The quote calculator is a POST: the view-only account does not get it (as in the home shortcuts).
  const readOnly = isSanReadOnly(user);
  const groups = visibleGroups((...r) => hasSanRole(user, ...r), on)
    .map((g) => ({ ...g, links: g.links.filter((l) => !(readOnly && l.route === '/sanatorium-quote')) }))
    .filter((g) => g.links.length > 0);
  return (
    <Screen testID="sanatorium-all-screen">
      <PageHeader title={t('sanSimple.today.allSections')} />
      {groups.map((g) => (
        <View key={g.key} style={styles.group} testID={`section-group-${g.key}`}>
          <SectionHeader title={t(`sanSimple.group.${g.key}`)} />
          {g.links.map((l) => (
            <ListRow key={l.route} pressable chevron testID={`link-${l.route.slice(1)}`} title={t(l.labelKey)} onPress={() => router.push(l.route as never)} />
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ group: { gap: 8, marginBottom: 8 } });
