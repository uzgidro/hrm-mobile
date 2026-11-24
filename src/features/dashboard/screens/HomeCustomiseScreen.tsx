// «Bosh sahifani sozlash» (2026-11-24): which blocks stand on this person's home screen
// and in what order. Arrows, not drag handles: the app ships no drag-list library and an
// OTA cannot add one. Counterpart of web v2 `BoardEditor`.
import React, { useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { moduleTint, radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
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
  sameHome,
  visibleHome,
  type HomeBlockKey,
  type HomeBoardKind,
} from '../board/homeBlocks';
import { useHomeBoard } from '../board/useHomeBoard';

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
  // `null` — untouched: the screen follows the saved arrangement.
  const [draft, setDraft] = useState<HomeBlockKey[] | null>(null);

  const value = draft ?? home.config;
  const shown = visibleHome(value, user, board);
  const hidden = HOME_BLOCK_KEYS.filter((k) => !value.includes(k) && isHomeBlockAvailable(k, user, board));
  const dirty = !sameHome(value, home.config);
  const busy = home.save.isPending || home.reset.isPending;
  const name = (k: HomeBlockKey) => t(HOME_BLOCKS[k].titleKey);
  const say = (message: string) => AccessibilityInfo.announceForAccessibility(message);

  const move = (k: HomeBlockKey, dir: -1 | 1) => {
    const next = moveBlock(value, shown, k, dir);
    setDraft(next);
    const n = visibleHome(next, user, board).indexOf(k) + 1;
    say(t('dashboard.customise.moved', { name: name(k), n, total: shown.length }));
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
        <>
          <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Bento columns={wide ? 2 : 1}>
              <Bento.Item>
                <Card title={t('dashboard.customise.onHome')} icon="home" tint="violet" testID="customise-on">
                  {shown.length === 0 ? <Note text={t('dashboard.customise.noneOnHome')} /> : null}
                  {shown.map((k, i) => (
                    <BlockRow key={k} block={k} first={i === 0}>
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
                    </BlockRow>
                  ))}
                </Card>
              </Bento.Item>
              <Bento.Item>
                <View style={styles.side}>
                  <Card title={t('dashboard.customise.more')} icon="plus" tint="green" testID="customise-off">
                    {hidden.length === 0 ? <Note text={t('dashboard.customise.noneMore')} /> : null}
                    {hidden.map((k, i) => (
                      <BlockRow key={k} block={k} first={i === 0}>
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
          </ScrollView>
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
        </>
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

function BlockRow({ block, first, children }: { block: HomeBlockKey; first: boolean; children: React.ReactNode }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const def = HOME_BLOCKS[block];
  const tint = moduleTint(c, def.tint);
  return (
    <View
      testID={`row-${block}`}
      style={[styles.row, !first && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}
    >
      <View style={[styles.icon, { backgroundColor: tint.wash }]}>
        <Icon name={def.icon} size={16} color={tint.fg} />
      </View>
      <View style={styles.text}>
        <Text variant="heading" numberOfLines={2} style={styles.title}>
          {t(def.titleKey)}
        </Text>
        {def.hintKey ? (
          <Text variant="caption" tone="subtle" numberOfLines={2}>
            {t(def.hintKey)}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingBottom: 16 },
  side: { gap: 12 },
  note: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingVertical: 4 },
  // Small enough for the longest word of a title («Исполнительская») next to three 44pt targets at 360dp.
  icon: { width: 30, height: 30, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, lineHeight: 19 },
  // The glyphs line up with the card's edge, the 44pt targets reach into its padding.
  actions: { flexDirection: 'row', marginRight: -10 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 },
  save: { minWidth: 220 },
  unsaved: { textAlign: 'center', marginBottom: 8 },
});
