import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';
import { ORDER_ACT_EDITOR_CONFIG } from '@/api/urls';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ErrorState } from '@/components/StateViews';
import { OnlyOfficeFrame } from '@/components/OnlyOfficeFrame';

export default function OrderDocumentScreen() {
  const { id, mode = 'view' } = useLocalSearchParams<{ id: string; mode?: string }>();
  const orderId = Number(id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const { data: config, isLoading, isError, refetch } = useQuery({
    queryKey: ['order-editor-config', orderId, mode],
    queryFn: () =>
      apiClient
        .get(ORDER_ACT_EDITOR_CONFIG(orderId), { params: { mode } })
        .then((r) => r.data),
    enabled: !!orderId,
    staleTime: 0,
    gcTime: 0,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title={t('orders.documentTitle')} />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primaryLight} size="large" />
          <Text style={styles.hint}>{t('orders.documentLoading')}</Text>
        </View>
      ) : isError || !config ? (
        <ErrorState title={t('orders.documentLoadError')} onRetry={() => refetch()} />
      ) : (
        <OnlyOfficeFrame config={config} errorLabel={t('orders.documentOpenError')} title={t('orders.documentTitle')} />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: c.bg },
    hint: { fontSize: 14, color: c.textMuted, ...ff('700') },
  });
