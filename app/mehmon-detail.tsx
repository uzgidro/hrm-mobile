import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, StyleSheet, Image, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { apiClient } from '../src/api/client';
import { VISITOR_DETAIL } from '../src/api/urls';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { ScreenHeader, HeaderAction } from '../src/components/ScreenHeader';
import { Icon, IconName } from '../src/components/Icon';
import type { Visitor } from '../src/types';

function Row({ icon, label, value, styles, colors }: {
  icon: IconName; label: string; value?: string | null; styles: any; colors: ThemeColors;
}) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}><Icon name={icon} size={18} color={colors.textSecondary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function MehmonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitorId = Number(id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const qc = useQueryClient();

  const { data: v, isLoading } = useQuery<Visitor>({
    queryKey: ['visitor', visitorId],
    queryFn: () => apiClient.get(VISITOR_DETAIL(visitorId)).then((r) => r.data),
    enabled: !!visitorId,
  });

  const active = v?.is_active !== false;

  const onDelete = () => {
    Alert.alert('O\'chirish', "Mehmonni o'chirishni xohlaysizmi?", [
      { text: 'Bekor', style: 'cancel' },
      {
        text: "Ha, o'chirish", style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(VISITOR_DETAIL(visitorId));
            qc.invalidateQueries({ queryKey: ['visitors'] });
            router.back();
          } catch (e: any) {
            Alert.alert('Xatolik', e?.response?.data?.detail || "O'chirishda xatolik");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Mehmon"
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <HeaderAction icon="edit" onPress={() => router.push({ pathname: '/mehmon-form', params: { id: visitorId } } as any)} />
            <HeaderAction icon="trash" onPress={onDelete} color={colors.error} />
          </View>
        }
      />
      {isLoading || !v ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            {v.photo_path ? (
              <Image source={{ uri: v.photo_path }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <Text style={styles.photoInitial}>{(v.legal_name || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.name}>{v.legal_name || 'Mehmon'}</Text>
            {!!(v.organization_name || v.job_position) && (
              <Text style={styles.sub}>{[v.organization_name, v.job_position].filter(Boolean).join(' · ')}</Text>
            )}
            <View style={[styles.badge, { backgroundColor: active ? colors.successSoft : colors.errorSoft }]}>
              <Text style={[styles.badgeText, { color: active ? colors.success : colors.error }]}>
                {active ? 'Aktiv ruxsat' : 'Nofaol'}
              </Text>
            </View>
          </View>

          {!!v.qr_path && (
            <View style={styles.qrCard}>
              <Image source={{ uri: v.qr_path }} style={styles.qr} resizeMode="contain" />
              {!!v.card_no && <Text style={styles.cardNo}>Karta: {v.card_no}</Text>}
            </View>
          )}

          <View style={styles.card}>
            <Row icon="phone" label="Telefon" value={v.phone_number} styles={styles} colors={colors} />
            <Row icon="mail" label="Telegram" value={v.telegram_username ? `@${v.telegram_username.replace(/^@/, '')}` : ''} styles={styles} colors={colors} />
            <Row icon="idcard" label="JSHSHIR" value={v.personal_identification_number} styles={styles} colors={colors} />
          </View>

          <Text style={styles.sectionLabel}>Qabul qiluvchi</Text>
          <View style={styles.card}>
            <Row icon="user" label="Xodim" value={v.host_employee_name} styles={styles} colors={colors} />
            <Row icon="phone" label="Ichki raqam" value={v.host_employee_internal_phone} styles={styles} colors={colors} />
            <Row icon="building" label="Filial" value={v.organization_branch?.name} styles={styles} colors={colors} />
          </View>

          <Text style={styles.sectionLabel}>Ruxsat muddati</Text>
          <View style={styles.card}>
            <Row icon="calendar" label="Boshlanishi" value={v.valid_from ? dayjs(v.valid_from).format('DD.MM.YYYY HH:mm') : ''} styles={styles} colors={colors} />
            <Row icon="calendar" label="Tugashi" value={v.valid_until ? dayjs(v.valid_until).format('DD.MM.YYYY HH:mm') : ''} styles={styles} colors={colors} />
            <Row icon="clock" label="Oxirgi tashrif" value={v.last_visit_time ? dayjs(v.last_visit_time).format('DD.MM.YYYY HH:mm') : ''} styles={styles} colors={colors} />
            <Row icon="checklist" label="Tashriflar soni" value={v.visit_count != null ? String(v.visit_count) : ''} styles={styles} colors={colors} />
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 16, paddingBottom: 24 },

    hero: { alignItems: 'center', paddingVertical: 8, marginBottom: 12 },
    photo: { width: 96, height: 96, borderRadius: 48, backgroundColor: c.skeleton },
    photoFallback: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    photoInitial: { fontSize: 38, fontWeight: '800', color: c.primary },
    name: { fontSize: 20, fontWeight: '800', color: c.text, marginTop: 12, textAlign: 'center' },
    sub: { fontSize: 13, color: c.textSecondary, marginTop: 4, textAlign: 'center' },
    badge: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },

    qrCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 16, alignItems: 'center', marginBottom: 12, gap: 10 },
    qr: { width: 180, height: 180, backgroundColor: '#fff', borderRadius: 8 },
    cardNo: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },

    sectionLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 },
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder },
    rowIcon: { width: 26, alignItems: 'center' },
    rowLabel: { fontSize: 11, color: c.textMuted },
    rowValue: { fontSize: 14, color: c.text, fontWeight: '600', marginTop: 1 },
  });
