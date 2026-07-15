import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAuthStore, isMasterAdmin, isHR } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { WorkExperience, Education } from '@/types';
import { Icon, type IconName } from '@/components/Icon';
import { LoadingView, ErrorState } from '@/components/StateViews';
import { employeeDetailQuery } from '../api/queries';

export default function EmployeeDetailScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ id?: string }>();
  const employeeId = params.id ? Number(params.id) : user?.employee?.id;
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  const isOwnProfile = employeeId === user?.employee?.id;
  // Own profile → see everything. Other employees → only HR/admin see sensitive data.
  const canViewSensitive = isOwnProfile || isMasterAdmin(user) || isHR(user) || user?.type === 'admin';

  const { data: employee = null, isLoading, refetch } = useQuery(employeeDetailQuery(employeeId ?? 0));
  // Preserve the original imperative semantics: with no id the fetch never ran
  // and `loading` stayed true (spinner shown indefinitely). React Query disables
  // the query when id is falsy, so replicate that "stuck loading" state.
  const loading = employeeId ? isLoading : true;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <LoadingView />
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Header styles={styles} title={t('employees.detailTitle')} />
        <ErrorState title={t('employees.detailNotFound')} onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  const workDays = (employee.working_days || [])
    .map((d) => t(`employees.dayShort.${d}`, { defaultValue: '' }))
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header
        styles={styles}
        title={t('employees.detailTitle')}
        onEdit={isOwnProfile ? () => router.push('/profile-edit') : undefined}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarCard}>
          {employee.photo_path ? (
            <Image source={{ uri: employee.photo_path }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>
                {(employee.legal_name || 'X').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.fullName}>{employee.legal_name}</Text>
          {employee.job_position?.name && <Text style={styles.position}>{employee.job_position.name}</Text>}
          {employee.department?.name && <Text style={styles.department}>{employee.department.name}</Text>}
        </View>

        <TouchableOpacity
          style={styles.attendanceBtn}
          onPress={() =>
            router.push({ pathname: '/employee-calendar', params: { id: employeeId, name: employee.legal_name } })
          }
          activeOpacity={0.85}
        >
          <Icon name="calendar" size={18} color={colors.onPrimary} />
          <Text style={styles.attendanceBtnText}>{t('employees.attendance')}</Text>
        </TouchableOpacity>

        {canViewSensitive && (
          <Section styles={styles} title={t('employees.section.personal')} icon="user">
            <InfoRow styles={styles} label={t('employees.field.birthDate')} value={employee.birth_date ? dayjs(employee.birth_date).format('DD.MM.YYYY') : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.gender')} value={employee.gender != null ? t(`employees.gender.${employee.gender}`, { defaultValue: '' }) || null : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.nationality')} value={employee.nationality} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.marital')} value={employee.maritial_status ? (t(`employees.marital.${employee.maritial_status}`, { defaultValue: '' }) || employee.maritial_status) : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.address')} value={employee.address} />
          </Section>
        )}

        <Section styles={styles} title={t('employees.section.contact')} icon="phone">
          <InfoRow styles={styles} label={t('employees.field.phone')} value={employee.phone_number} />
          <Divider styles={styles} />
          <InfoRow styles={styles} label={t('employees.field.internalPhone')} value={employee.internal_phone_number} />
          <Divider styles={styles} />
          <InfoRow styles={styles} label={t('employees.field.email')} value={employee.email} />
        </Section>

        {canViewSensitive && (
          <Section styles={styles} title={t('employees.section.work')} icon="briefcase">
            <InfoRow styles={styles} label={t('employees.field.department')} value={employee.department?.name} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.position')} value={employee.job_position?.name} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.hireDate')} value={employee.job_acceptance_date ? dayjs(employee.job_acceptance_date).format('DD.MM.YYYY') : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.workHours')} value={employee.working_hours_start && employee.working_hours_end ? `${employee.working_hours_start} – ${employee.working_hours_end}` : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.lunch')} value={employee.lunch_start_time && employee.lunch_end_time ? `${employee.lunch_start_time} – ${employee.lunch_end_time}` : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.workDays')} value={workDays || null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.supervisor')} value={employee.supervisor?.legal_name} />
          </Section>
        )}

        {canViewSensitive && (employee.personal_identification_number || employee.taxpayer_identification_number || employee.pasport_series) && (
          <Section styles={styles} title={t('employees.section.documents')} icon="idcard">
            <InfoRow styles={styles} label={t('employees.field.pinfl')} value={employee.personal_identification_number} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.inn')} value={employee.taxpayer_identification_number} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.passport')} value={employee.pasport_series && employee.pasport_number ? `${employee.pasport_series} ${employee.pasport_number}` : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.passportIssuedBy')} value={employee.pasport_issue_by} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.jshshir')} value={employee.pasport_individual_number} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label={t('employees.field.pensionAccount')} value={employee.individual_accumulative_pension_account_number} />
          </Section>
        )}

        {canViewSensitive && (employee.work_experiences?.length ?? 0) > 0 && (
          <Section styles={styles} title={t('employees.section.experience')} icon="building">
            {employee.work_experiences!.map((exp: WorkExperience, i: number) => (
              <View key={exp.id} style={styles.historyItem}>
                {i > 0 && <Divider styles={styles} />}
                <Text style={styles.historyTitle}>{exp.company_name}</Text>
                <Text style={styles.historySubtitle}>{exp.position}</Text>
                <Text style={styles.historyDate}>
                  {dayjs(exp.start_date).format('DD.MM.YYYY')} – {exp.is_current ? t('employees.presentToDate') : dayjs(exp.end_date).format('DD.MM.YYYY')}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {canViewSensitive && (employee.educations?.length ?? 0) > 0 && (
          <Section styles={styles} title={t('employees.section.education')} icon="graduation">
            {employee.educations!.map((edu: Education, i: number) => (
              <View key={edu.id} style={styles.historyItem}>
                {i > 0 && <Divider styles={styles} />}
                <Text style={styles.historyTitle}>{edu.institution_name}</Text>
                <Text style={styles.historySubtitle}>{edu.faculty_name} — {edu.degree_name}</Text>
                <Text style={styles.historyDate}>
                  {dayjs(edu.start_date).format('DD.MM.YYYY')} – {edu.is_current ? t('employees.presentToDate') : dayjs(edu.end_date).format('DD.MM.YYYY')}
                </Text>
              </View>
            ))}
          </Section>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ styles, title, onEdit }: { styles: any; title: string; onEdit?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Icon name="chevronLeft" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {onEdit ? (
        <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
          <Icon name="edit" size={18} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
}

function Section({ styles, title, icon, children }: { styles: any; title: string; icon: IconName; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={18} color={colors.textSecondary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ styles, label, value }: { styles: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Divider({ styles }: { styles: any }) {
  return <View style={styles.divider} />;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    backArrow: { fontSize: 22, color: c.text, fontWeight: '300' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    editBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    editBtnText: { fontSize: 18 },

    content: { paddingHorizontal: 16, paddingTop: 16 },

    avatarCard: {
      alignItems: 'center', paddingVertical: 24, backgroundColor: c.card,
      borderRadius: 18, borderWidth: 1, borderColor: c.cardBorder, marginBottom: 12,
    },
    avatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 12 },
    avatarFallback: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 34, fontWeight: '700', color: c.primaryLight },
    fullName: { fontSize: 19, fontWeight: '800', color: c.text, marginBottom: 4, textAlign: 'center' },
    position: { fontSize: 13, color: c.primaryLight, fontWeight: '600', marginBottom: 2 },
    department: { fontSize: 12, color: c.textMuted },

    attendanceBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 10, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 14, marginBottom: 12,
    },
    attendanceBtnIcon: { fontSize: 18 },
    attendanceBtnText: { fontSize: 15, fontWeight: '700', color: c.onPrimary },

    section: {
      backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.cardBorder,
      marginBottom: 12, overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    sectionEmoji: { fontSize: 16 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    sectionBody: { paddingHorizontal: 16, paddingVertical: 4 },

    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 11, gap: 12 },
    infoLabel: { fontSize: 13, color: c.textMuted, flex: 1 },
    infoValue: { fontSize: 13, fontWeight: '600', color: c.text, flex: 2, textAlign: 'right' },
    divider: { height: 1, backgroundColor: c.cardBorder },

    historyItem: { paddingVertical: 12 },
    historyTitle: { fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 3 },
    historySubtitle: { fontSize: 13, color: c.textSecondary, marginBottom: 4 },
    historyDate: { fontSize: 12, color: c.textMuted },
  });
