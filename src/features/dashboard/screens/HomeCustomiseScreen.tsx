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
import { groundTop } from '@/theme/accents';
import { confirm } from '@/lib/confirm';
import { goBackOr } from '@/lib/goBack';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { homeBoardFor } from '@/utils/homeBoard';
import { useBreakpoint } from '@/utils/responsive';
import { Bento, Button, Card, IconButton, LoadingView, PageHeader, Screen, Text } from '@/ui';
import {
  CUSTOM_MAX,
  HOME_BLOCK_KEYS,
  blockDef,
  customOf,
  isHomeBlockAvailable,
  moveBlock,
  reorderBlocks,
  sameSetup,
  setupOf,
  visibleHome,
  type HomeBlockKey,
  type HomeBoardKind,
  type HomeSetup,
} from '../board/homeBlocks';
import type { BlockLook, HomeLook } from '../board/homeLook';
import { useHomeBoard } from '../board/useHomeBoard';
import { AddSheet } from '../components/custom/AddSheet';
import { BlockSheet } from '../components/custom/BlockSheet';
import { DesignCard } from '../components/custom/DesignCard';
import { useBlockName } from '../components/custom/customBlocks';
import { HomeDesign } from '../components/HomeBlocks';
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
  const [draft, setDraft] = useState<HomeSetup | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<HomeBlockKey | null>(null);

  const setup = draft ?? home.config;
  const value = setup.blocks;
  const setBlocks = (blocks: HomeBlockKey[]) => setDraft(setupOf(blocks, setup.look, setup.items));
  const setLook = (look: HomeLook | undefined) => setDraft(setupOf(value, look, setup.items));
  const setItem = (k: HomeBlockKey, item: BlockLook) => setDraft(setupOf(value, setup.look, { ...setup.items, [k]: item }));
  const shown = visibleHome(value, user, board);
  const hidden = HOME_BLOCK_KEYS.filter((k) => !value.includes(k) && isHomeBlockAvailable(k, user, board));
  const dirty = !sameSetup(setup, home.config);
  const busy = home.save.isPending || home.reset.isPending;
  const blockName = useBlockName();
  const name = (k: HomeBlockKey) => blockName(k, setup.items?.[k]);
  const notes = value.filter((k) => customOf(k)?.kind === 'note').length;
  const say = (message: string) => AccessibilityInfo.announceForAccessibility(message);

  const place = (next: HomeBlockKey[], k: HomeBlockKey) => {
    setBlocks(next);
    const n = visibleHome(next, user, board).indexOf(k) + 1;
    say(t('dashboard.customise.moved', { name: name(k), n, total: shown.length }));
  };
  const move = (k: HomeBlockKey, dir: -1 | 1) => place(moveBlock(value, shown, k, dir), k);
  const drop = (from: number, to: number) => {
    const k = shown[from];
    if (k && from !== to) place(reorderBlocks(value, shown, from, to), k);
  };
  const remove = (k: HomeBlockKey) => {
    setBlocks(value.filter((x) => x !== k));
    say(t('dashboard.customise.removed', { name: name(k) }));
  };
  const add = (k: HomeBlockKey) => {
    setBlocks([...value, k]);
    say(t('dashboard.customise.added', { name: name(k) }));
  };
  const toggle = (k: HomeBlockKey) => (value.includes(k) ? remove(k) : add(k));
  const addNote = () => {
    const k: HomeBlockKey = `note:${Date.now().toString(36)}`;
    add(k);
    setEditing(k);
  };

  // A failed request shows the app's usual error toast (MutationCache); the draft stays.
  const save = () =>
    home.save.mutate(setup, {
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
    <Screen scroll={false} maxWidth={wide ? 1040 : 720} groundTop={groundTop(setup.look?.bg, c)} testID="home-customise-screen">
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
            <HomeDesign look={setup.look}>
            <Bento columns={wide ? 2 : 1}>
              <Bento.Item>
                <Card title={t('dashboard.customise.onHome')} icon="home" tint="violet" testID="customise-on">
                  {shown.length === 0 ? <Note text={t('dashboard.customise.noneOnHome')} /> : null}
                  <SortableBlocks
                    blocks={shown}
                    disabled={busy}
                    scrollRef={scrollRef}
                    onReorder={drop}
                    onEdit={setEditing}
                    items={setup.items}
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
                  {shown.filter((k) => blockDef(k)?.hintKey).map((k) => (
                    <Text key={k} variant="caption" tone="subtle" style={styles.note}>
                      {`${name(k)} — ${t(blockDef(k)!.hintKey!)}`}
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
                    <View style={styles.adders}>
                      <Button
                        testID="add-page"
                        label={t('dashboard.customise.addPage')}
                        icon="plus"
                        variant="neutral"
                        disabled={busy}
                        onPress={() => setAdding(true)}
                      />
                      <Button
                        testID="add-note"
                        label={t('dashboard.customise.addNote')}
                        icon="edit"
                        variant="neutral"
                        disabled={busy || notes >= CUSTOM_MAX.note}
                        onPress={addNote}
                      />
                    </View>
                  </Card>
                  <DesignCard value={setup.look} onChange={setLook} />
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
            </HomeDesign>
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
      <AddSheet board={board} blocks={value} visible={adding} onClose={() => setAdding(false)} onToggle={toggle} />
      <BlockSheet
        block={editing}
        value={editing ? setup.items?.[editing] : undefined}
        onChange={(item) => editing && setItem(editing, item)}
        onClose={() => setEditing(null)}
      />
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
  adders: { gap: 8, marginTop: 12 },
  note: { paddingVertical: 8 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 },
  save: { minWidth: 220 },
  unsaved: { textAlign: 'center', marginBottom: 8 },
});
