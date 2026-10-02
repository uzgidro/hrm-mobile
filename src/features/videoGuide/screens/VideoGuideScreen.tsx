// v3 Video qo'llanma — web v2 `VideoGuidePage` porti: rol/filial bo'yicha videolar
// galereyasi, qidiruv. Ijro tizim pleyeri orqali (`Linking`): `expo-video` native
// dependency bo'lib, `expo.version` ko'tarishni talab qilardi. Yuklash/tahrir
// (faqat admin) — web'da.
import React, { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { toast } from '@/lib/toast';
import { Icon } from '@/components/Icon';
import { Card, EmptyState, ErrorState, PageHeader, Screen, SearchField, Skeleton, Text } from '@/ui';
import { trackVideoView, videoGuidesQuery, type VideoGuide } from '../api/queries';
import { formatDuration } from '../utils/format';

export default function VideoGuideScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const q = useQuery(videoGuidesQuery());
  const videos = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = q.data ?? [];
    return term ? all.filter((v) => v.title?.toLowerCase().includes(term)) : all;
  }, [q.data, search]);

  const open = async (v: VideoGuide) => {
    if (!v.video_url) return toast.error(t('videoGuide.noVideo'));
    void trackVideoView(v.id);
    try {
      await Linking.openURL(v.video_url);
    } catch {
      toast.error(t('videoGuide.openFailed'));
    }
  };

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <PageHeader title={t('videoGuide.title')} subtitle={t('videoGuide.subtitle')} />
      <View style={styles.search}>
        <SearchField value={search} onChangeText={setSearch} placeholder={t('videoGuide.searchPlaceholder')} />
      </View>
      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <Skeleton height={220} />
      ) : videos.length === 0 ? (
        <Card>
          <EmptyState title={t('videoGuide.empty')} message={t('videoGuide.emptyHint')} />
        </Card>
      ) : (
        <View style={styles.grid}>
          {videos.map((v) => (
            <Pressable
              key={v.id}
              testID={`video-${v.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${t('videoGuide.watch')}: ${v.title}`}
              onPress={() => void open(v)}
              style={styles.cell}
            >
              <Card>
                <View style={[styles.thumb, { backgroundColor: colors.brandSoft }]}>
                  <Icon name="eye" size={34} color={colors.brand} />
                  {v.duration_seconds != null && (
                    <View style={styles.duration}>
                      <Text variant="caption" style={{ color: colors.fgOnBrand }}>
                        {formatDuration(v.duration_seconds)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text variant="label" numberOfLines={2}>
                  {v.title}
                </Text>
                {!!v.description && (
                  <Text variant="caption" tone="muted" numberOfLines={2}>
                    {v.description}
                  </Text>
                )}
                <Text variant="caption" tone="subtle">
                  {t('videoGuide.views', { count: v.view_count })}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { flexBasis: '47%', flexGrow: 1, minWidth: 150 },
  thumb: {
    aspectRatio: 16 / 9,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  duration: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
});
