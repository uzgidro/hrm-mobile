// Yangiliklar — kompaniya sayti uzgidro.uz dan (web v2 NewsPage bilan bir manba, hamma filialga
// bir xil). Karta bosilsa maqola ilova ichida ochiladi (/media, WebView).
import { memo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { useBreakpoint } from '@/utils/responsive';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Screen } from '@/components/Screen';
import { PagedList } from '@/components/PagedList';
import { Icon } from '@/components/Icon';
import { newsImageUrl, newsLang, newsListQuery, type CompanyNews } from '../api/queries';

type Styles = ReturnType<typeof makeStyles>;

const NewsCard = memo(function NewsCard({ item, styles, grid }: { item: CompanyNews; styles: Styles; grid?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Bizning kichik rasm ochilmasa — saytdagi asl rasm.
  const [useSource, setUseSource] = useState(false);
  const img = useSource ? item.image_source : newsImageUrl(item);
  const open = () =>
    router.push({ pathname: '/media', params: { kind: 'page', url: item.url, title: t('news.title') } });
  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={item.title}
      testID={`news-${item.id}`}
      style={({ pressed }) => [styles.card, grid && styles.cardGrid, pressed && styles.pressed]}
    >
      {img ? (
        <Image
          source={{ uri: img }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          onError={() => !useSource && item.image_source && setUseSource(true)}
        />
      ) : null}
      <View style={styles.body}>
        <View style={styles.meta}>
          {!!item.date && <Text style={styles.date}>{dayjs(item.date).format('DD.MM.YYYY HH:mm')}</Text>}
          {item.views != null && (
            <View style={styles.views}>
              <Icon name="eye" size={13} color={colors.textMuted} />
              <Text style={styles.date}>{item.views}</Text>
            </View>
          )}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        {!!item.excerpt && (
          <Text style={styles.excerpt} numberOfLines={3}>
            {item.excerpt}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

export default function NewsScreen() {
  const { t, i18n } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  const cols = bp.isTablet ? (bp.isLandscape ? 3 : 2) : 1;
  const query = useInfiniteQuery(newsListQuery(newsLang(i18n.language)));

  return (
    <Screen edges={['top']}>
      <ScreenHeader title={t('news.title')} subtitle={t('news.sourceSubtitle')} />
      <PagedList
        query={query}
        keyExtractor={(item) => String(item.id)}
        numColumns={cols}
        columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.content}
        emptyIcon="news"
        emptyTitle={t('news.empty')}
        emptyMessage={t('news.emptyMessage')}
        hideCount
        renderItem={(item) => <NewsCard item={item} styles={styles} grid={cols > 1} />}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
    gridRow: { gap: 12 },
    card: { backgroundColor: c.card, borderRadius: 16, marginBottom: 12, borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder, overflow: 'hidden' },
    cardGrid: { flex: 1 },
    pressed: { opacity: 0.85 },
    image: { width: '100%', aspectRatio: 16 / 9, backgroundColor: c.skeleton },
    body: { padding: 14, gap: 6 },
    meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    views: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    date: { fontSize: 12, color: c.textMuted, ...ff('700') },
    title: { fontSize: 16, ...ff('800'), color: c.text, lineHeight: 22 },
    excerpt: { fontSize: 13, color: c.textSecondary, lineHeight: 19, ...ff('700') },
  });
