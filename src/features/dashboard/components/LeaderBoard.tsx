// v3 rahbar paneli (maket b-light.png): bugungi tile'lar → jonli tashrif →
// bugungi holat → tug'ilgan kunlar → tarkib → ijro intizomi. Har karta o'z
// so'rovi va o'z xatosi bilan. compact — bitta ustun; medium — 2; expanded — 3.
import React from 'react';
import { View } from 'react-native';
import { useBreakpoint } from '@/utils/responsive';
import { Bento, ErrorState } from '@/ui';
import { useBoardDay } from './leader/useBoardDay';
import { TodayTiles } from './leader/TodayTiles';
import { LiveFeedCard } from './leader/LiveFeedCard';
import { TodayStatusCard } from './leader/TodayStatusCard';
import { CompositionCard } from './leader/CompositionCard';
import { DisciplineCard } from './leader/DisciplineCard';
import { BirthdaysCard } from './shared/BirthdaysCard';
import { useActiveBranchId } from '@/lib/useActiveBranch';

export function LeaderBoard() {
  const activeBranchId = useActiveBranchId();
  const branchId = activeBranchId ?? undefined;
  const { sizeClass } = useBreakpoint();
  const day = useBoardDay(branchId);

  if (day.isError) return <ErrorState onRetry={() => day.refetch()} />;

  const tiles = <TodayTiles counts={day.counts} columns={sizeClass === 'medium' ? 4 : 2} />;
  const live = <LiveFeedCard board={day.hydrated} loading={day.isPending} />;
  const status = <TodayStatusCard counts={day.counts} />;

  return (
    <View testID="board-leader" style={{ gap: 12 }}>
      {sizeClass === 'expanded' ? (
        <Bento>
          <Bento.Item>{live}</Bento.Item>
          <Bento.Item>
            <CompositionCard branchId={branchId} />
          </Bento.Item>
          <Bento.Item>{tiles}</Bento.Item>
        </Bento>
      ) : (
        <>
          {tiles}
          <Bento>
            <Bento.Item>{live}</Bento.Item>
            <Bento.Item>{status}</Bento.Item>
          </Bento>
        </>
      )}
      <Bento>
        {sizeClass === 'expanded' ? <Bento.Item>{status}</Bento.Item> : null}
        <Bento.Item>
          <BirthdaysCard branchId={branchId} />
        </Bento.Item>
        {sizeClass !== 'expanded' ? (
          <Bento.Item>
            <CompositionCard branchId={branchId} />
          </Bento.Item>
        ) : null}
        <Bento.Item>
          <DisciplineCard branchId={branchId} />
        </Bento.Item>
      </Bento>
    </View>
  );
}
