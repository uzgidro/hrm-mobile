// The body of the home screen: the person's blocks, placed by `homeLayout`. Only the
// blocks in `blocks` are mounted.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useActiveBranchId } from '@/lib/useActiveBranch';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { useBreakpoint } from '@/utils/responsive';
import { Bento, Button, EmptyState, ErrorState } from '@/ui';
// Cards of other features: the buttons must stand on the home screen, the logic stays
// with its own feature (the same exception HomeScreen has always had).
import { CheckinQueueFlusher, TripCheckinCard, useTripCardShown } from '@/features/checkin/components/TripCheckinCard';
import { HomeLeavesCard } from '@/features/leaves/components/HomeLeavesCard';
import { SanatoriumHomeCard } from '@/features/sanatorium/components/HomeCard';
import { HealthHomeCard } from '@/features/health/components/HealthHomeCard';
import { DAY_BLOCKS, type HomeBlockKey, type HomeBoardKind } from '../board/homeBlocks';
import { TOP_CARDS, homeLayout, type HomeSection } from '../board/homeLayout';
import { useBoardDay } from './leader/useBoardDay';
import { TodayTiles } from './leader/TodayTiles';
import { LiveFeedCard } from './leader/LiveFeedCard';
import { TodayStatusCard } from './leader/TodayStatusCard';
import { CompositionCard } from './leader/CompositionCard';
import { DisciplineCard } from './leader/DisciplineCard';
import { BirthdaysCard } from './shared/BirthdaysCard';
import { HeroBlock, StatsBlock, TimelineBlock, WeekBlock } from './employee/myDayBlocks';

const GAP = 12;

export function HomeBlocks({
  board,
  blocks,
  onCustomise,
}: {
  board: HomeBoardKind;
  /** In the person's order, already limited to what the account may see. */
  blocks: readonly HomeBlockKey[];
  onCustomise?: () => void;
}) {
  const { t } = useTranslation();
  const employee = useAuthStore((s) => s.user?.employee);
  const activeBranchId = useActiveBranchId() ?? undefined;
  const { sizeClass, bentoColumns } = useBreakpoint();

  // The trip card speaks only on trip days. A silent one is not laid out — on a tablet it
  // would break a row in two for nothing.
  const tripShown = useTripCardShown(blocks.includes('trip'));
  const keys = blocks.filter((k) => k !== 'trip' || tripShown);

  const day = useBoardDay(activeBranchId, keys.some((k) => DAY_BLOCKS.includes(k)));
  const sections = homeLayout({ board, keys, sizeClass, bentoColumns, dayError: day.isError });
  // The employee board shows the employee's own branch, the leader board the chosen one.
  const birthdaysBranch = board === 'employee' ? (resolveEmployeeBranchId(employee) ?? undefined) : activeBranchId;

  const draw = (key: HomeBlockKey, alone: boolean): React.ReactElement => {
    switch (key) {
      case 'sanatorium':
        return <SanatoriumHomeCard />;
      case 'health':
        return <HealthHomeCard />;
      case 'trip':
        return <TripCheckinCard />;
      case 'leaves':
        return <HomeLeavesCard />;
      case 'hero':
        return <HeroBlock />;
      case 'timeline':
        return <TimelineBlock />;
      case 'stats':
        return <StatsBlock />;
      case 'week':
        return <WeekBlock />;
      case 'tiles':
        return <TodayTiles counts={day.counts} columns={sizeClass === 'medium' || (alone && sizeClass === 'expanded') ? 4 : 2} />;
      case 'live':
        return <LiveFeedCard board={day.hydrated} loading={day.isPending} />;
      case 'status':
        return <TodayStatusCard counts={day.counts} />;
      case 'birthdays':
        return <BirthdaysCard branchId={birthdaysBranch} />;
      case 'composition':
        return <CompositionCard branchId={activeBranchId} />;
      case 'discipline':
        return <DisciplineCard branchId={activeBranchId} />;
    }
  };

  const section = (s: HomeSection, last: boolean) => {
    const alone = s.cells.length === 1;
    const first = s.cells[0]?.keys[0];
    if (s.wide && first) {
      // These cards carry their own bottom margin (they may draw nothing at all).
      const own = TOP_CARDS.includes(first);
      return (
        <View key={first} style={!own && !last && styles.section} testID={`home-block-${first}`}>
          {draw(first, true)}
        </View>
      );
    }
    return (
      <View key={s.cells.map((c) => c.keys.join('+')).join('|') || 'error'} style={!last && styles.section}>
        {s.dayError ? <ErrorState onRetry={() => void day.refetch()} /> : null}
        {s.cells.length > 0 ? (
          <Bento>
            {s.cells.map((c) => (
              <Bento.Item key={c.keys.join('+')} span={c.span}>
                <View style={styles.stack}>
                  {c.keys.map((k) => (
                    <View key={k} testID={`home-block-${k}`}>
                      {draw(k, alone && c.keys.length === 1)}
                    </View>
                  ))}
                </View>
              </Bento.Item>
            ))}
          </Bento>
        ) : null}
      </View>
    );
  };

  return (
    <View testID={`board-${board}`}>
      {/* Exactly one of the two sends the offline marks: the card itself, or this. */}
      {tripShown ? null : <CheckinQueueFlusher />}
      {sections.length === 0 ? (
        <EmptyState
          title={t('dashboard.customise.emptyTitle')}
          message={t('dashboard.customise.emptyHint')}
          action={onCustomise && { label: t('dashboard.customise.button'), onPress: onCustomise }}
        />
      ) : (
        sections.map((s, i) => section(s, i === sections.length - 1))
      )}
      {onCustomise && sections.length > 0 ? (
        <View style={styles.customise}>
          <Button testID="home-customise" label={t('dashboard.customise.button')} icon="edit" variant="neutral" onPress={onCustomise} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: GAP },
  stack: { gap: GAP },
  customise: { alignItems: 'center', marginTop: GAP },
});
