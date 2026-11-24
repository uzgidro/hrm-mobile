// «Bosh sahifani sozlash» (2026-11-24): which blocks stand on this person's home screen
// and in what order: dragged by the handle, or moved with the arrows (which also serve a
// screen reader, a switch, a keyboard). Counterpart of web v2 `BoardEditor`.
import React, { useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Redirect, type Href } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { confirm } from '@/lib/confirm';
import { goBackOr } from '@/lib/goBack';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { homeBoardFor } from '@/utils/homeBoard';
import { useBreakpoint } from '@/utils/responsive';
import { Bento, Button, Card, IconButton, LoadingView, PageHeader, Screen, Text } from '@/ui';
import {
  HOME_BLOCKS,
  HOME_BLOCK_KEYS,
  isHomeBlockAvailable,
  moveBlock,
  reorderBlocks,
  sameHome,
  visibleHome,
  type HomeBlockKey,
  type HomeBoardKind,
} from '../board/homeBlocks';
import { useHomeBoard } from '../board/useHomeBoard';
import { BlockRow, SortableBlocks } from '../components/SortableBlocks';

const HOME = '/' as Href;

export default function HomeCustomiseScreen() {
  const board = homeBoardFor(useAuthStore((s) => s.user));
  // Kiosk, chancellery, guest… have no home of their own to arrange (deep link).
  return board === 'employee' || board === 'leader' ? <HomeEditor board={board} /> : <Redirect href={HOME} />;
}

function HomeEditor({ board }: { board: HomeBoardKind }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const { sizeClass } = useBreakpoint();
  const user = useAuthStore((s) => s.user);
  const home = useHomeBoard(board);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // `null` — untouched: the screen follows the saved arrangement.
  const [draft, setDraft] = useState<HomeBlockKey[] | null>(null);

  const value = draft ?? home.config;
  const shown = visibleHome(value, user, board);
  const hidden = HOME_BLOCK_KEYS.filter((k) => !value.includes(k) && isHomeBlockAvailable(k, user, board));
  const dirty = !sameHome(value, home.config);
  const busy = home.save.isPending || home.reset.isPending;
  const name = (k: HomeBlockKey) => t(HOME_BLOCKS[k].titleKey);
  const say = (message: string) => AccessibilityInfo.announceForAccessibility(message);

  const place = (next: HomeBlockKey[], k: HomeBlockKey) => {
    setDraft(next);
    const n = visibleHome(next, user, board).indexOf(k) + 1;
    say(t('dashboard.customise.moved', { name: name(k), n, total: shown.length }));
  };
  const move = (k: HomeBlockKey, dir: -1 | 1) => place(moveBlock(value, shown, k, dir), k);
  const drop = (from: number, to: number) => {
    const k = shown[from];
    if (k && from !== to) place(reorderBlocks(value, shown, from, to), k);
  };
  const remove = (k: HomeBlockKey) => {
    setDraft(value.filter((x) => x !== k));
    say(t('dashboard.customise.removed', { name: name(k) }));
  };
  const add = (k: HomeBlockKey) => {
    setDraft([...value, k]);
    say(t('dashboard.customise.added', { name: name(k) }));
  };

  // A failed request shows the app's usual error toast (MutationCache); the draft stays.
  const save = () =>
    home.save.mutate(value, {
      onSuccess: () => {
        toast.success(t('dashboard.customise.saved'));
        goBackOr(HOME);
      },
    });
  const reset = async () => {
    // Nothing saved yet: the draft alone goes back.
    if (!home.isCustom) return setDraft(null);
    const ok = await confirm({
      title: t('dashboard.customise.reset'),
      message: t('dashboard.customise.resetConfirm'),
      confirmLabel: t('dashboard.customise.resetYes'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    home.reset.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('dashboard.customise.resetDone'));
        goBackOr(HOME);
      },
    });
  };

  const wide = sizeClass === 'expanded';
  const compact = sizeClass === 'compact';
  return (
    <Screen scroll={false} maxWidth={wide ? 1040 : 720} testID="home-customise-screen">
      <PageHeader title={t('dashboard.customise.title')} subtitle={t('dashboard.customise.hint')} />
      {!home.ready ? (
        <LoadingView />
      ) : (
        <GestureHandlerRootView style={styles.flex}>
          <Animated.ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <Bento columns={wide ? 2 : 1}>
              <Bento.Item>
                <Card title={t('dashboard.customise.onHome')} icon="home" tint="violet" testID="customise-on">
                  {shown.length === 0 ? <Note text={t('dashboard.customise.noneOnHome')} /> : null}
                  <SortableBlocks
                    blocks={shown}
                    disabled={busy}
                    scrollRef={scrollRef}
                    onReorder={drop}
                    actions={(k) => {
                      const i = shown.indexOf(k);
                      return (
                        <>
                          <IconButton
                            icon="arrowUp"
                            testID={`up-${k}`}
                            accessibilityLabel={t('dashboard.customise.up', { name: name(k) })}
                            disabled={busy || i === 0}
                            onPress={() => move(k, -1)}
                          />
                          <IconButton
                            icon="arrowDown"
                            testID={`down-${k}`}
                            accessibilityLabel={t('dashboard.customise.down', { name: name(k) })}
                            disabled={busy || i === shown.length - 1}
                            onPress={() => move(k, 1)}
                          />
                          <IconButton
                            icon="close"
                            testID={`remove-${k}`}
                            accessibilityLabel={t('dashboard.customise.remove', { name: name(k) })}
                            disabled={busy}
                            onPress={() => remove(k)}
                          />
                        </>
                      );
                    }}
                  />
                  {shown.filter((k) => HOME_BLOCKS[k].hintKey).map((k) => (
                    <Text key={k} variant="caption" tone="subtle" style={styles.note}>
                      {`${name(k)} — ${t(HOME_BLOCKS[k].hintKey!)}`}
                    </Text>
                  ))}
                </Card>
              </Bento.Item>
              <Bento.Item>
                <View style={styles.side}>
                  <Card title={t('dashboard.customise.more')} icon="plus" tint="green" testID="customise-off">
                    {hidden.length === 0 ? <Note text={t('dashboard.customise.noneMore')} /> : null}
                    {hidden.map((k) => (
                      <BlockRow key={k} block={k} hint>
                        <IconButton
                          icon="plus"
                          testID={`add-${k}`}
                          accessibilityLabel={t('dashboard.customise.add', { name: name(k) })}
                          disabled={busy}
                          onPress={() => add(k)}
                        />
                      </BlockRow>
                    ))}
                  </Card>
                  <Button
                    testID="customise-reset"
                    label={t('dashboard.customise.reset')}
                    icon="refresh"
                    variant="neutral"
                    loading={home.reset.isPending}
                    disabled={busy || (!home.isCustom && !dirty)}
                    onPress={() => void reset()}
                  />
                </View>
              </Bento.Item>
            </Bento>
          </Animated.ScrollView>
          <View style={[styles.footer, !compact && styles.footerRow, { borderTopColor: c.border, paddingBottom: 12 + insets.bottom }]}>
            {dirty ? (
              <Text variant="caption" tone="subtle" style={compact && styles.unsaved} testID="customise-unsaved">
                {t('dashboard.customise.unsaved')}
              </Text>
            ) : null}
            <Button
              testID="customise-save"
              label={t('common.save')}
              full={compact}
              style={!compact && styles.save}
              loading={home.save.isPending}
              disabled={busy || !dirty}
              onPress={save}
            />
          </View>
        </GestureHandlerRootView>
      )}
    </Screen>
  );
}

function Note({ text }: { text: string }) {
  return (
    <Text variant="label" tone="subtle" style={styles.note}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingBottom: 16 },
  side: { gap: 12 },
  note: { paddingVertical: 8 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 },
  save: { minWidth: 220 },
  unsaved: { textAlign: 'center', marginBottom: 8 },
});
