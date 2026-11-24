// Blocks a person adds to their home screen: a button to a page and a note. (The third kind,
// a module's list, is `faces/ModuleFace`.)
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { accentFill, withAccent, type Accent } from '@/theme/accents';
import { CardLookProvider, useCardLook } from '@/theme/CardLook';
import { ThemeColorsOverride, useTheme } from '@/theme/ThemeProvider';
import { LIP, moduleTint, radii } from '@/theme/tokens';
import { Card, Text, WEB_BREAK } from '@/ui';
import type { CatalogEntry } from '@/utils/moduleCatalog';
import { blockDef, customOf, type HomeBlockKey } from '../../board/homeBlocks';
import type { BlockLook } from '../../board/homeLook';

/** The block's name: the person's own, else the catalogue's. */
export function useBlockName(): (key: HomeBlockKey, look?: BlockLook) => string {
  const { t } = useTranslation();
  return (key, look) => {
    if (look?.title) return look.title;
    const def = blockDef(key);
    const name = def ? String(t(def.titleKey)) : key;
    return customOf(key)?.kind === 'page' ? String(t('dashboard.customise.pageButton', { name })) : name;
  };
}

/** One block in a colour of its own. */
export function BlockTint({ accent, children }: { accent?: Accent; children: React.ReactNode }) {
  const { colors: c } = useTheme();
  const colors = React.useMemo(() => (accent ? withAccent(c, accent) : c), [c, accent]);
  const look = React.useMemo(() => ({ ground: accent && colors.brandSoft }), [accent, colors]);
  if (!accent) return <>{children}</>;
  return (
    <ThemeColorsOverride colors={colors}>
      <CardLookProvider look={look}>{children}</CardLookProvider>
    </ThemeColorsOverride>
  );
}

export function PageButton({ entry, title, accent }: { entry: CatalogEntry; title?: string; accent?: Accent }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { radius, ground } = useCardLook();
  const tint = moduleTint(c, entry.tint);
  const label = title ?? t(entry.labelKey);
  return (
    <Pressable
      testID={`page-button-${entry.page}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(entry.route as Href)}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: ground ?? c.surface, borderColor: c.border, borderRadius: radius ?? radii.lg },
        { borderBottomWidth: pressed ? 1.5 : 1.5 + LIP, marginTop: pressed ? LIP : 0 },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: accent ? accentFill(accent) : tint.wash }]}>
        <Icon name={entry.icon} size={18} color={accent ? c.fgOnBrand : tint.fg} />
      </View>
      <Text variant="label" weight="600" numberOfLines={2} style={[styles.label, WEB_BREAK]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function NoteCard({ title, text }: { title?: string; text?: string }) {
  const { t } = useTranslation();
  return (
    <Card title={title ?? t('dashboard.customise.note')} icon="edit" tint="amber">
      <Text variant="body" tone={text ? 'fg' : 'subtle'} style={WEB_BREAK}>
        {text ?? t('dashboard.customise.noteEmpty')}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, minWidth: 0 },
});
