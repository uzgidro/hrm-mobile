import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Linking, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { AttendanceEvent } from '@/types';
import { Icon } from '@/components/Icon';
import {
  eventPhotoUrl, eventPlace, isEntryEvent, mapAppUrl, mapViewerUrl,
} from '@/utils/attendanceEvent';

// Turniket (keldi-ketdi) hodisasining bitta qatori + tafsilot oynasi.
//
// Avval qatorda FAQAT vaqt va "Kirish/Chiqish" bor edi (foydalanuvchi
// 2026-08-19: "qaysi GESda va rasm va map chiqmaydi"). Backend bularning
// hammasini allaqachon yuboradi — `photo_path` (Face ID surati),
// `turnstile.locations[]` (nom, manzil, koordinata) — faqat mijoz ko'rsatmasdi.
//
// Xarita O'Z tayler serverimizdagi MapLibre ko'ruvchisi (Env.mapViewerUrl)
// WebView ichida: yangi native bog'liqlik QO'SHILMAYDI (react-native-webview
// allaqachon bor), demak OTA bilan chiqadi, store relizi shart emas.
export function AttendanceEventRow({
  event,
  showBorder = true,
}: {
  event: AttendanceEvent;
  showBorder?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);

  const entry = isEntryEvent(event);
  const place = eventPlace(event);
  const photo = eventPhotoUrl(event);
  const viewer = mapViewerUrl(place);
  const time = dayjs(event.happen_time).format('HH:mm');

  const openInMaps = () => {
    const url = mapAppUrl(place, Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web');
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.row, showBorder && styles.rowBorder]}
        activeOpacity={0.75}
        onPress={() => setOpen(true)}
        testID={`attendance-event-${event.id}`}
      >
        <Text style={styles.time}>{time}</Text>
        <View style={[styles.dirBadge, { backgroundColor: entry ? colors.successSoft : colors.cardBorder }]}>
          <Icon name={entry ? 'arrowDown' : 'arrowUp'} size={14} color={entry ? colors.success : colors.textSecondary} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.dir}>{entry ? t('timesheet.entryTitle') : t('timesheet.exitTitle')}</Text>
          <Text style={styles.place} numberOfLines={1}>
            {place.name ?? t('timesheet.placeUnknown')}
          </Text>
        </View>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Icon name="user" size={16} color={colors.textMuted} />
          </View>
        )}
        <Icon name="chevronRight" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {entry ? t('timesheet.entryTitle') : t('timesheet.exitTitle')} · {time}
                </Text>
                <Text style={styles.cardDate}>{dayjs(event.happen_time).format('DD.MM.YYYY')}</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.cardBody} showsVerticalScrollIndicator={false}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <View style={[styles.photo, styles.photoEmpty]}>
                  <Text style={styles.mutedText}>{t('timesheet.photoMissing')}</Text>
                </View>
              )}

              <View style={styles.placeBlock}>
                <Text style={styles.placeLabel}>{t('timesheet.placeLabel')}</Text>
                <Text style={styles.placeName}>{place.name ?? t('timesheet.placeUnknown')}</Text>
                {!!place.address && <Text style={styles.address}>{place.address}</Text>}
              </View>

              {viewer ? (
                <>
                  <View style={styles.mapWrap} pointerEvents="none">
                    <WebView
                      source={{ uri: viewer }}
                      style={styles.map}
                      scrollEnabled={false}
                      javaScriptEnabled
                      domStorageEnabled
                      originWhitelist={['*']}
                    />
                    {/* Ko'ruvchi markazga belgi qo'ymaydi — belgini o'zimiz
                        chizamiz (xarita aynan koordinataga markazlashtirilgan). */}
                    <View style={styles.pin}>
                      <Icon name="mapPin" size={28} color={colors.error} />
                    </View>
                  </View>
                  <TouchableOpacity style={styles.mapBtn} onPress={openInMaps} activeOpacity={0.85}>
                    <Icon name="mapPin" size={16} color={colors.primaryLight} />
                    <Text style={styles.mapBtnText}>{t('timesheet.openInMaps')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.mutedText}>{t('timesheet.mapMissing')}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    time: { fontSize: 14, fontWeight: '700', color: c.text, width: 46 },
    dirBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    texts: { flex: 1 },
    dir: { fontSize: 13, fontWeight: '600', color: c.text },
    place: { fontSize: 12, color: c.textMuted, marginTop: 1 },
    thumb: { width: 38, height: 38, borderRadius: 8, backgroundColor: c.cardBorder },
    thumbEmpty: { alignItems: 'center', justifyContent: 'center' },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 18 },
    card: { width: '100%', maxHeight: '86%', backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.cardBorder, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    cardDate: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    cardBody: { padding: 16, gap: 14 },
    photo: { width: '100%', height: 220, borderRadius: 12, backgroundColor: c.cardBorder },
    photoEmpty: { alignItems: 'center', justifyContent: 'center' },
    mutedText: { fontSize: 13, color: c.textMuted },
    placeBlock: { gap: 2 },
    placeLabel: { fontSize: 11, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
    placeName: { fontSize: 15, fontWeight: '700', color: c.text },
    address: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
    mapWrap: { height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: c.cardBorder },
    map: { flex: 1, backgroundColor: c.bg },
    pin: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder },
    mapBtnText: { fontSize: 13, fontWeight: '600', color: c.primaryLight },
  });
