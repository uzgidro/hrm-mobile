// Home-screen shortcuts of the "sections" screens. Each one shows only to the roles the API allows
// and only while its section switch is on.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { IconName } from '@/components/Icon';
import { useAuthStore } from '@/store/authStore';
import { ListRow } from '@/ui';
import type { SanRole } from '../../types';
import { useSanFeatures, type SanFeatureKey } from '../../utils/features';
import { hasSanRole } from '../../utils/sanatorium';

type Link = { route: string; icon: IconName; labelKey: string; roles: SanRole[]; feature: SanFeatureKey | null };

export const SECTIONS2_LINKS: Link[] = [
  { route: '/sanatorium-packages', icon: 'gift', labelKey: 'sanatorium.s2.packages', roles: ['registrar'], feature: 'packages' },
  { route: '/sanatorium-seasons', icon: 'calendar', labelKey: 'sanatorium.s2.seasons', roles: ['registrar'], feature: 'seasonal_pricing' },
  { route: '/sanatorium-quote', icon: 'wallet', labelKey: 'sanatorium.s2.quote', roles: ['registrar'], feature: null },
  { route: '/sanatorium-services', icon: 'orders', labelKey: 'sanatorium.s2.services', roles: ['registrar'], feature: 'paid_services' },
  { route: '/sanatorium-orgs', icon: 'briefcase', labelKey: 'sanatorium.s2.organizations', roles: ['registrar'], feature: 'documents' },
  { route: '/sanatorium-doc-templates', icon: 'doc', labelKey: 'sanatorium.s2.docTemplates', roles: ['registrar'], feature: 'documents' },
  { route: '/sanatorium-schedule', icon: 'board', labelKey: 'sanatorium.s2.schedule', roles: ['registrar', 'doctor', 'nurse'], feature: 'procedure_schedule' },
  { route: '/sanatorium-diets', icon: 'checklist', labelKey: 'sanatorium.s2.diets', roles: ['registrar'], feature: 'diet' },
  { route: '/sanatorium-feedback', icon: 'news', labelKey: 'sanatorium.s2.feedback', roles: ['registrar'], feature: 'feedback' },
  { route: '/sanatorium-feedback', icon: 'news', labelKey: 'sanatorium.s2.myRatings', roles: ['doctor'], feature: 'feedback' },
  { route: '/sanatorium-analytics', icon: 'chart', labelKey: 'sanatorium.s2.analytics', roles: ['registrar'], feature: 'analytics' },
];

/** Links visible for the given roles / switches; a doctor who is also registrar sees the registrar one only. */
export function visibleSections2Links(has: (...r: SanRole[]) => boolean, on: (k: SanFeatureKey) => boolean): Link[] {
  const registrar = has('registrar');
  return SECTIONS2_LINKS.filter((l) => has(...l.roles) && (l.feature ? on(l.feature) : true) && !(registrar && l.labelKey === 'sanatorium.s2.myRatings'));
}

export function Sections2Links() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const f = useSanFeatures();
  const links = visibleSections2Links((...r) => hasSanRole(user, ...r), f.on);
  if (links.length === 0) return null;
  return (
    <View style={styles.links} testID="sections2-links">
      {links.map((l) => (
        <ListRow key={l.labelKey} pressable testID={`link-${l.route.slice(1)}`} title={t(l.labelKey)} chevron onPress={() => router.push(l.route as never)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ links: { gap: 8, marginTop: 8 } });
