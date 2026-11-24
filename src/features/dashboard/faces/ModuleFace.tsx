// A compact list of one module on the home screen: the module's icon / tint / name, up to four
// rows that open the same detail screen as the module's own list, and an "all" action that opens
// the module. A face never decides access - the caller checks `canAccessPage`.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { useActiveBranchId } from '@/lib/useActiveBranch';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Avatar, Badge, Card, SearchField, Skeleton, Text } from '@/ui';
import { CATALOG } from '@/utils/moduleCatalog';
import { FACE_SIZE, PHONE_MIN_CHARS, faceQuery, type FacePage } from './faceQueries';
import { buildFace, type FaceRow } from './faceRows';

const SKELETON_ROWS = 3;

export function ModuleFace({ page, title, onOpen }: { page: FacePage; title?: string; onOpen?: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const entry = CATALOG.find((m) => m.page === page);
  const branchId = useActiveBranchId();
  const [term, setTerm] = React.useState('');
  const search = useDebouncedValue(term, 400).trim();
  const isDirectory = page === 'directory';
  const needsTerm = isDirectory && search.length < PHONE_MIN_CHARS;

  const q = useQuery({
    ...faceQuery(page, { branchId, search }),
    select: (raw) => buildFace(raw, t, FACE_SIZE),
  });

  const openAll = () => {
    onOpen?.();
    if (entry) router.push(entry.route as Href);
  };

  return (
    <Card
      testID={`face-${page}`}
      title={title ?? (entry ? t(entry.labelKey) : page)}
      icon={entry?.icon}
      tint={entry?.tint}
      action={{ label: t('common.all'), onPress: openAll }}
    >
      {isDirectory && (
        <View style={styles.search}>
          <SearchField
            value={term}
            onChangeText={setTerm}
            placeholder={t('dashboard.faces.directorySearch')}
            testID="face-directory-search"
          />
        </View>
      )}

      {needsTerm ? (
        <Text variant="caption" tone="subtle" testID={`face-${page}-hint`}>
          {t('dashboard.faces.directoryHint', { min: PHONE_MIN_CHARS })}
        </Text>
      ) : q.isPending ? (
        <View style={styles.list} accessibilityRole="progressbar" accessibilityState={{ busy: true }}>
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton height={14} width="70%" />
              <Skeleton height={10} width="45%" />
            </View>
          ))}
        </View>
      ) : q.isError ? (
        <View style={styles.error}>
          <Text variant="caption" tone="muted" style={styles.errorText}>
            {t('dashboard.faces.loadFailed')}
          </Text>
          <Pressable
            onPress={() => q.refetch()}
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
            style={[styles.retry, { borderColor: c.border }]}
            testID={`face-${page}-retry`}
          >
            <Text variant="label" tone="link">
              {t('common.retry')}
            </Text>
          </Pressable>
        </View>
      ) : q.data.rows.length === 0 ? (
        <Text variant="caption" tone="subtle" testID={`face-${page}-empty`}>
          {t(`dashboard.faces.empty.${page}`)}
        </Text>
      ) : (
        <View style={styles.list}>
          {q.data.note && (
            <Text variant="caption" tone="brand" testID={`face-${page}-note`}>
              {q.data.note}
            </Text>
          )}
          {q.data.rows.map((row) => (
            <FaceRowView key={row.key} row={row} testID={`face-${page}-row-${row.key}`} />
          ))}
        </View>
      )}
    </Card>
  );
}

function FaceRowView({ row, testID }: { row: FaceRow; testID: string }) {
  const { colors: c } = useTheme();
  const label = [row.title, row.subtitle, row.badge?.label].filter(Boolean).join(', ');
  return (
    <Pressable
      testID={testID}
      onPress={() => router.push(row.href)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surface2 }]}
    >
      {row.person && <Avatar name={row.person.name} uri={row.person.uri} thumb={row.person.thumb} size={32} />}
      <View style={styles.text}>
        <Text variant="label" weight="600" numberOfLines={1} grow>
          {row.title}
        </Text>
        {!!row.subtitle && (
          <Text variant="caption" tone="subtle" numberOfLines={1} grow>
            {row.subtitle}
          </Text>
        )}
      </View>
      {row.badge && (
        <View style={styles.badge}>
          <Badge label={row.badge.label} tone={row.badge.tone} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  search: { marginBottom: 8 },
  skeletonRow: { gap: 6, paddingVertical: 8 },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginHorizontal: -6,
    borderRadius: radii.md,
  },
  text: { flex: 1, minWidth: 0, gap: 1 },
  badge: { flexShrink: 1, maxWidth: '46%' },
  error: { gap: 8, alignItems: 'flex-start' },
  errorText: { alignSelf: 'stretch' },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth },
});
