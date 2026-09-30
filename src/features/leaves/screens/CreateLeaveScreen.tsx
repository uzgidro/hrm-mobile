import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { NO_WEB_OUTLINE } from '@/theme/web';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/ui/Button';
import { useBreakpoint } from '@/utils/responsive';
import { useCreateLeave, type CreateLeavePayload } from '../api/mutations';
import { leaveApproversQuery, leaveReasonsQuery, leaveRulesQuery } from '../api/queries';
import { approverNotice, earliestLeaveStart, leaveReasonOptions } from '../utils';
import { LeaveDateTimePicker } from '../components/LeaveDateTimePicker';
import { LeaveTypeSheet, LEAVE_TYPES, leaveTypeLabel } from '../components/LeaveTypeSheet';
import { KeyboardAvoider } from '@/components/KeyboardAvoider';

// Web v2 parity (RequestPermissionPage CreateLeaveModal): routing is NOT a
// choice. The request goes to the requester's direct supervisor (else the
// department head, else HR) — decided server-side, so the payload carries no
// assigned_signer_ids. Picking signers by hand let people route around their
// own manager. The form only names the approver (work-leaves/my-approvers),
// states the backdating limit (work-leaves/rules) and offers HR's reason list
// (dictionaries/leave_request_reasons).
export default function CreateLeaveScreen() {
  const { colors } = useTheme();
  const s = useThemedStyles(makeS);
  const { t } = useTranslation();
  const createLeaveMut = useCreateLeave();
  const bp = useBreakpoint();
  const twoCol = bp.isTablet;

  const now = dayjs();
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [startDate, setStartDate] = useState(now.minute(0).second(0));
  const [endDate, setEndDate] = useState(now.add(1, 'hour').minute(0).second(0));
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

  const approversQ = useQuery(leaveApproversQuery());
  const { data: rules } = useQuery(leaveRulesQuery());
  const { data: reasonRows } = useQuery(leaveReasonsQuery());

  const reasons = useMemo(() => leaveReasonOptions(reasonRows, LEAVE_TYPES), [reasonRows]);
  const notice = approverNotice(approversQ.data);
  const earliest = earliestLeaveStart(rules);
  const maxBack = earliest ? rules!.max_days_back : null;

  const handleSubmit = useCallback(async () => {
    if (!endDate.isAfter(startDate)) {
      Alert.alert(t('common.errorTitle'), t('leaves.endMustBeAfterStart'));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('common.errorTitle'), t('leaves.descRequired'));
      return;
    }
    if (earliest && startDate.isBefore(earliest)) {
      Alert.alert(t('common.errorTitle'), t('leaves.tooFarBack', { count: maxBack ?? 0 }));
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateLeavePayload = {
        type: leaveType,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        description: description.trim(),
      };
      await createLeaveMut.mutateAsync(payload);
      Alert.alert(t('common.success'), t('leaves.createdSuccess'), [{ text: t('common.ok'), onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert(t('common.errorTitle'), getApiErrorMessage(e, t('errors.sendFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [leaveType, startDate, endDate, description, earliest, maxBack, createLeaveMut, t]);

  const diffMin = endDate.diff(startDate, 'minute');
  const durationText = (() => {
    if (diffMin <= 0) return null;
    const days = Math.floor(diffMin / 1440);
    const hours = Math.floor((diffMin % 1440) / 60);
    const mins = diffMin % 60;
    return [
      days > 0 && t('leaves.durationDays', { count: days }),
      hours > 0 && t('leaves.durationHours', { count: hours }),
      mins > 0 && t('leaves.durationMinutes', { count: mins }),
    ].filter(Boolean).join(' ');
  })();

  const routeText =
    notice.kind === 'supervisor'
      ? t('leaves.routeToSupervisor', { name: notice.names })
      : notice.kind === 'department_head'
        ? t('leaves.routeToHead', { name: notice.names })
        : t('leaves.routeToNobody');

  return (
    <Screen edges={['top', 'bottom']} maxWidth={600}>
      <ScreenHeader title={t('leaves.createTitle')} />

      <KeyboardAvoider>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.label}>{t('leaves.typeLabel')}</Text>
        <TouchableOpacity style={s.selector} onPress={() => setShowTypeSheet(true)} activeOpacity={0.7}>
          <Text style={s.selectorText}>{leaveTypeLabel(t, leaveType)}</Text>
          <Icon name="chevronRight" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* start/end: the flagship date-from/date-to pair — 2-column row on
            tablet (Task 21), stacked full-width on phone as before. */}
        <View testID="leave-start-end-row" style={twoCol ? s.fieldRow : undefined}>
          <View testID="leave-field-start" style={twoCol ? s.fieldHalf : undefined}>
            <Text style={s.label}>{t('leaves.startLabel')}</Text>
            <TouchableOpacity style={s.selector} onPress={() => setActivePicker('start')} activeOpacity={0.7}>
              <View style={s.dateTimeRow}>
                <Icon name="calendar" size={16} color={colors.textMuted} />
                <Text style={s.dateTimeText}>{startDate.format('DD.MM.YYYY')}</Text>
                <Icon name="clock" size={16} color={colors.textMuted} />
                <Text style={s.dateTimeText}>{startDate.format('HH:mm')}</Text>
              </View>
              <Icon name="chevronRight" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View testID="leave-field-end" style={twoCol ? s.fieldHalf : undefined}>
            <Text style={s.label}>{t('leaves.endLabel')}</Text>
            <TouchableOpacity style={s.selector} onPress={() => setActivePicker('end')} activeOpacity={0.7}>
              <View style={s.dateTimeRow}>
                <Icon name="calendar" size={16} color={colors.textMuted} />
                <Text style={s.dateTimeText}>{endDate.format('DD.MM.YYYY')}</Text>
                <Icon name="clock" size={16} color={colors.textMuted} />
                <Text style={s.dateTimeText}>{endDate.format('HH:mm')}</Text>
              </View>
              <Icon name="chevronRight" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {durationText && (
          <View style={s.durationRow}><Icon name="clock" size={16} color={colors.primaryLight} /><Text style={s.durationText}>{durationText}</Text></View>
        )}
        {diffMin <= 0 && endDate.isValid() && <Text style={s.errorText}>{t('leaves.endBeforeStart')}</Text>}
        {earliest && startDate.isBefore(earliest) && (
          <Text style={s.errorText}>{t('leaves.tooFarBack', { count: maxBack ?? 0 })}</Text>
        )}

        <Text style={s.label}>{t('leaves.commentLabel')}</Text>
        <TextInput
          style={s.textarea}
          placeholder={t('leaves.commentPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          testID="leave-description"
        />

        {/* Routing notice — who the request goes to (not a choice, web v2). */}
        <View style={s.routeCard} testID="leave-route-notice">
          <View style={s.routeIcon}><Icon name="users" size={18} color={colors.primaryLight} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            {approversQ.isLoading ? (
              <ActivityIndicator size="small" color={colors.primaryLight} style={{ alignSelf: 'flex-start' }} />
            ) : (
              <Text style={s.routeText}>{routeText}</Text>
            )}
            {maxBack != null && <Text style={s.routeHint}>{t('leaves.backHint', { count: maxBack })}</Text>}
          </View>
        </View>

        <Button
          label={t('common.send')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={diffMin <= 0}
          size="lg"
          full
          style={s.submitBtn}
          testID="leave-submit"
        />

        <View style={{ height: 32 }} />
      </ScrollView>
      </KeyboardAvoider>

      <LeaveTypeSheet
        visible={showTypeSheet}
        selected={leaveType}
        options={reasons}
        onSelect={setLeaveType}
        onClose={() => setShowTypeSheet(false)}
      />
      <LeaveDateTimePicker visible={activePicker === 'start'} title={t('leaves.startPickerTitle')} value={startDate}
        minDate={earliest ?? undefined}
        onConfirm={(v) => { setStartDate(v); if (v.isAfter(endDate)) setEndDate(v.add(1, 'hour')); }} onClose={() => setActivePicker(null)} />
      <LeaveDateTimePicker visible={activePicker === 'end'} title={t('leaves.endPickerTitle')} value={endDate} minDate={startDate} onConfirm={setEndDate} onClose={() => setActivePicker(null)} />
    </Screen>
  );
}

const makeS = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 12 },
    label: { fontSize: 13, letterSpacing: 0.3, color: c.textSecondary, marginBottom: 6, marginTop: 18, ...ff('900') },
    selector: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 16,
      borderWidth: 2, borderColor: c.cardBorder, paddingHorizontal: 14, minHeight: 52,
    },
    selectorText: { flex: 1, fontSize: 15, color: c.text, ...ff('700') },
    dateTimeRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateTimeText: { fontSize: 15, color: c.text, ...ff('700') },

    // Task 21: 2-column pairing for short fields on tablet (bp.isTablet).
    fieldRow: { flexDirection: 'row', gap: 12 },
    fieldHalf: { flex: 1 },
    durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 2 },
    durationText: { fontSize: 13, color: c.primaryLight, ...ff('800') },
    errorText: { fontSize: 13, color: c.error, marginTop: 6, paddingHorizontal: 2, ...ff('700') },
    textarea: {
      backgroundColor: c.inputBg, borderRadius: 16, borderWidth: 2, borderColor: c.cardBorder,
      paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 15, minHeight: 104,
      ...NO_WEB_OUTLINE, ...ff('700'),
    },
    routeCard: {
      flexDirection: 'row', gap: 12, marginTop: 18, padding: 14, borderRadius: 16,
      borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder, backgroundColor: c.card,
    },
    routeIcon: {
      width: 36, height: 36, borderRadius: 12, backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    routeText: { fontSize: 14, lineHeight: 19, color: c.text, ...ff('700') },
    routeHint: { fontSize: 13, lineHeight: 18, color: c.textSecondary, ...ff('700') },
    submitBtn: { marginTop: 22 },
  });
