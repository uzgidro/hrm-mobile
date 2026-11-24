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
import { accentTint, withAccent } from '@/theme/accents';
import { useLargeText } from '@/store/textSizeStore';
import { CardLookProvider } from '@/theme/CardLook';
import { ThemeColorsOverride, useTheme } from '@/theme/ThemeProvider';
import { DAY_BLOCKS, customOf, entryOf, type BuiltinKey, type HomeBlockKey, type HomeBoardKind } from '../board/homeBlocks';
import { DEFAULT_GAP, type BlockLook, type HomeLook } from '../board/homeLook';
import { ModuleFace, isFacePage } from '../faces';
import { BlockTint, NoteCard, PageButton } from './custom/customBlocks';
import { TOP_CARDS, homeLayout, type HomeSection } from '../board/homeLayout';
import { useBoardDay } from './leader/useBoardDay';
import { TodayTiles } from './leader/TodayTiles';
import { LiveFeedCard } from './leader/LiveFeedCard';
import { TodayStatusCard } from './leader/TodayStatusCard';
import { CompositionCard } from './leader/CompositionCard';
import { DisciplineCard } from './leader/DisciplineCard';
import { BirthdaysCard } from './shared/BirthdaysCard';
import { HeroBlock, StatsBlock, TimelineBlock, WeekBlock } from './employee/myDayBlocks';

const NO_ITEMS: Record<string, BlockLook> = {};

/** The person's design around whatever stands inside: accent, cards, corners. */
export function HomeDesign({ look, children }: { look?: HomeLook; children: React.ReactNode }) {
  const { colors: c } = useTheme();
  const accent = look?.accent;
  const colors = React.useMemo(() => (accent ? withAccent(c, accent) : c), [c, accent]);
  const card = React.useMemo(
    () => ({
      style: look?.card,
      radius: look?.radius,
      ground: look?.card === 'tint' ? accentTint(accent ?? 'violet', c) : undefined,
    }),
    [look?.card, look?.radius, accent, c],
  );
  return (
    <ThemeColorsOverride colors={colors}>
      <CardLookProvider look={card}>{children}</CardLookProvider>
    </ThemeColorsOverride>
  );
}

export function HomeBlocks({
  board,
  blocks,
  look,
  items = NO_ITEMS,
  onCustomise,
}: {
  board: HomeBoardKind;
  /** In the person's order, already limited to what the account may see. */
  blocks: readonly HomeBlockKey[];
  look?: HomeLook;
  items?: Record<string, BlockLook>;
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

  const gap = look?.gap ?? DEFAULT_GAP;
  const large = useLargeText();
  const below = { marginBottom: gap };

  const draw = (key: HomeBlockKey, alone: boolean): React.ReactElement => (
    <BlockTint accent={items[key]?.accent}>{drawBlock(key, alone)}</BlockTint>
  );
  const drawBlock = (key: HomeBlockKey, alone: boolean): React.ReactElement | null => {
    const custom = customOf(key);
    if (custom) {
      const own = items[key];
      if (custom.kind === 'note') return <NoteCard title={own?.title} text={own?.text} />;
      const entry = entryOf(custom.id);
      if (!entry) return null;
      if (custom.kind === 'page') return <PageButton entry={entry} title={own?.title} accent={own?.accent} />;
      return isFacePage(entry.page) ? <ModuleFace page={entry.page} title={own?.title} /> : null;
    }
    switch (key as BuiltinKey) {
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
    if (s.grid) {
      const keysOf = s.cells.flatMap((c) => c.keys);
      const columns = sizeClass === 'compact' ? (large ? 1 : 2) : sizeClass === 'medium' ? 3 : 4;
      return (
        <View key={keysOf.join('|')} style={[styles.grid, { margin: -gap / 2 }, !last && { marginBottom: gap / 2 }]}>
          {keysOf.map((k) => (
            <View key={k} testID={`home-block-${k}`} style={{ width: `${100 / columns}%`, padding: gap / 2 }}>
              {draw(k, false)}
            </View>
          ))}
        </View>
      );
    }
    if (s.wide && first) {
      // These cards carry their own bottom margin (they may draw nothing at all).
      const own = TOP_CARDS.includes(first);
      return (
        <View key={first} style={!own && !last && below} testID={`home-block-${first}`}>
          {draw(first, true)}
        </View>
      );
    }
    return (
      <View key={s.cells.map((c) => c.keys.join('+')).join('|') || 'error'} style={!last && below}>
        {s.dayError ? <ErrorState onRetry={() => void day.refetch()} /> : null}
        {s.cells.length > 0 ? (
          <Bento gap={gap}>
            {s.cells.map((c) => (
              <Bento.Item key={c.keys.join('+')} span={c.span}>
                <View style={{ gap }}>
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
    <HomeDesign look={look}>
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
    </HomeDesign>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  customise: { alignItems: 'center', marginTop: DEFAULT_GAP },
});
