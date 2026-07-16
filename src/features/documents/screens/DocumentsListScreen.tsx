import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, RefreshControl, FlatList, BackHandler,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView, EmptyState, ErrorState } from '@/components/StateViews';
import type { DocumentFolder, HrmFile } from '@/types';
import { foldersQuery, rootFilesQuery } from '../api/queries';
import {
  fileDisplayName, fileExtension, isViewableInOnlyOffice, scopeLabelKey,
  filterFolders, filterFiles,
} from '../utils';

// A flat list of either folders (at root) or files. Folders are 1 level deep
// and embed their files[], so entering a folder is pure local state — no fetch.
type Row =
  | { kind: 'folder'; folder: DocumentFolder }
  | { kind: 'file'; file: HrmFile };

export default function DocumentsListScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<DocumentFolder | null>(null);

  const foldersQ = useQuery(foldersQuery());
  const rootFilesQ = useQuery(rootFilesQuery());

  const isLoading = foldersQ.isLoading || rootFilesQ.isLoading;
  // Both feed one combined view, so a first-load failure of EITHER should show
  // the error state rather than silently rendering a half-empty list.
  const isError = foldersQ.isError || rootFilesQ.isError;
  const isFetching = foldersQ.isFetching || rootFilesQ.isFetching;

  const refetch = () => {
    foldersQ.refetch();
    rootFilesQ.refetch();
  };

  // When a folder is open, re-read it from fresh query data so a background
  // refetch updates its embedded files (the stored object is a snapshot).
  const openFolder = useMemo(() => {
    if (!activeFolder) return null;
    return foldersQ.data?.find((f) => f.id === activeFolder.id) ?? activeFolder;
  }, [activeFolder, foldersQ.data]);

  const rows: Row[] = useMemo(() => {
    if (openFolder) {
      return filterFiles(openFolder.files ?? [], search).map((file) => ({ kind: 'file' as const, file }));
    }
    const folders = filterFolders(foldersQ.data, search).map((folder) => ({ kind: 'folder' as const, folder }));
    const files = filterFiles(rootFilesQ.data, search).map((file) => ({ kind: 'file' as const, file }));
    return [...folders, ...files];
  }, [openFolder, foldersQ.data, rootFilesQ.data, search]);

  const openFile = (file: HrmFile) => {
    if (!isViewableInOnlyOffice(file)) return; // non-office files have no view path
    router.push({ pathname: '/hujjat-viewer', params: { id: String(file.id), name: fileDisplayName(file) } });
  };

  const enterFolder = (folder: DocumentFolder) => {
    setSearch('');
    setActiveFolder(folder);
  };

  const goRoot = () => {
    setSearch('');
    setActiveFolder(null);
  };

  // Android system back / edge-swipe mirrors the header chevron: inside a
  // folder it goes UP to the root list first (the folder is component state,
  // not a route — without this, back would leave the whole screen).
  useFocusEffect(
    useCallback(() => {
      if (!activeFolder) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goRoot();
        return true;
      });
      return () => sub.remove();
    }, [activeFolder])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        {/* In a folder the chevron goes up to the root list; at the root it
            leaves the screen (back to Modules) — before, the root level had
            no back affordance at all. */}
        <TouchableOpacity
          onPress={() => (openFolder ? goRoot() : router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.backBtn}
          hitSlop={10}
        >
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {openFolder ? (openFolder.name || t('documents.folderFallback')) : t('documents.title')}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('documents.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Icon name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState title={t('documents.loadError')} onRetry={refetch} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => (r.kind === 'folder' ? `d${r.folder.id}` : `f${r.file.id}`)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
          renderItem={({ item }) =>
            item.kind === 'folder'
              ? <FolderRow folder={item.folder} styles={styles} colors={colors} onPress={enterFolder} t={t} />
              : <FileRow file={item.file} styles={styles} colors={colors} onPress={openFile} t={t} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="folder"
              title={search ? t('documents.emptySearch') : t('documents.empty')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Rows ──────────────────────────────────────────────────────────────────────
function ScopePill({ scope, styles, t }: { scope: HrmFile['scope']; styles: Styles; t: TFunc }) {
  const key = scopeLabelKey(scope);
  if (!key) return null;
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{t(key)}</Text>
    </View>
  );
}

function FolderRow({
  folder, styles, colors, onPress, t,
}: { folder: DocumentFolder; styles: Styles; colors: ThemeColors; onPress: (f: DocumentFolder) => void; t: TFunc }) {
  const count = folder.files?.length ?? 0;
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => onPress(folder)}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
        <Icon name="folder" size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{folder.name || t('documents.folderFallback')}</Text>
        <Text style={styles.sub}>{t('documents.fileCount', { count })}</Text>
      </View>
      {/* Web parity: the scope pill is shown for files only, never folders. */}
      <Icon name="chevronRight" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function FileRow({
  file, styles, colors, onPress, t,
}: { file: HrmFile; styles: Styles; colors: ThemeColors; onPress: (f: HrmFile) => void; t: TFunc }) {
  const viewable = isViewableInOnlyOffice(file);
  const ext = fileExtension(file);
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={viewable ? 0.8 : 1}
      onPress={() => onPress(file)}
      disabled={!viewable}
    >
      <View style={[styles.iconWrap, { backgroundColor: viewable ? colors.card : colors.skeleton }]}>
        <Icon name="doc" size={22} color={viewable ? colors.textSecondary : colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, !viewable && styles.nameMuted]} numberOfLines={1}>
          {fileDisplayName(file) || t('documents.fileFallback')}
        </Text>
        <Text style={styles.sub}>
          {ext ? ext.toUpperCase() : t('documents.unknownType')}
          {!viewable ? ` · ${t('documents.notViewable')}` : ''}
        </Text>
      </View>
      <View style={styles.right}>
        <ScopePill scope={file.scope} styles={styles} t={t} />
        {viewable && <Icon name="chevronRight" size={18} color={colors.textMuted} />}
      </View>
    </TouchableOpacity>
  );
}

type Styles = ReturnType<typeof makeStyles>;
type TFunc = ReturnType<typeof useTranslation>['t'];

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    backBtn: { width: 32, height: 32, justifyContent: 'center', marginLeft: -6 },
    title: { fontSize: 26, fontWeight: '800', color: c.text, flex: 1 },

    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, height: 44,
      backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.text, paddingVertical: 0 },

    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, flexGrow: 1 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10,
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
    },
    iconWrap: {
      width: 44, height: 44, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.cardBorder,
    },
    name: { fontSize: 15, fontWeight: '700', color: c.text },
    nameMuted: { color: c.textSecondary },
    sub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pill: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
      backgroundColor: c.primarySoft,
    },
    pillText: { fontSize: 10.5, fontWeight: '700', color: c.primary },
  });
