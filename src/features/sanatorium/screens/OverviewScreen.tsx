// «Umumiy ko'rinish» (web: analytics tab «overview»): the dashboard numbers and charts for the registrar
// and the view-only chairman, which the work-queue home no longer carries.
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageHeader, Screen } from '@/ui';
import { dashboardQuery } from '../api/queries';
import { DashboardOverview } from '../components/DashboardOverview';
import { Denied, QueryBlock, useSanAccess } from '../components/common';
import { fmtDate } from '../utils/sanatorium';

export default function OverviewScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar');
  const q = useQuery(dashboardQuery(allowed));
  if (!allowed) return <Denied />;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-overview-screen">
      <PageHeader title={t('sanStaff.nav.overview')} subtitle={q.data ? `${t('sanatorium.today')}: ${fmtDate(q.data.today)}` : undefined} />
      <QueryBlock query={q}>{(d) => <DashboardOverview d={d} />}</QueryBlock>
    </Screen>
  );
}
