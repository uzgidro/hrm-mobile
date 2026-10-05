// Sheet: telefonda pastki varaq, planshetda markazlangan modal (max 560).
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, shadow } from '@/theme/tokens';
import { useBreakpoint } from '@/utils/responsive';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { WEB_BREAK } from './webText';

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { sizeClass } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const centered = sizeClass !== 'compact';
  return (
    <Modal visible={visible} transparent animationType={centered ? 'fade' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.backdrop, { backgroundColor: c.overlay }, centered ? styles.center : styles.bottom]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View
          style={[
            styles.panel,
            { backgroundColor: c.elevated },
            shadow('md', c),
            centered ? styles.panelCentered : [styles.panelBottom, { paddingBottom: 16 + insets.bottom }],
          ]}
        >
          {!centered && <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />}
          {title && (
            <View style={styles.header}>
              <Text variant="title" numberOfLines={2} style={[styles.title, WEB_BREAK]}>
                {title}
              </Text>
              <IconButton icon="close" onPress={onClose} accessibilityLabel={t('common.close')} />
            </View>
          )}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  bottom: { justifyContent: 'flex-end' },
  panel: { padding: 16 },
  panelCentered: { width: '100%', maxWidth: 560, borderRadius: radii.xl, maxHeight: '85%' },
  panelBottom: { borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '90%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  // Uzun bo'linmas sarlavha (masalan, e-pochta) ✕ ni chetga surmasin: qisqaradi, 2 qatorgacha o'raladi.
  title: { flex: 1, flexShrink: 1, minWidth: 0, fontSize: 18 },
});
