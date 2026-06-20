import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore, isMasterAdmin, isHR } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { EMPLOYEE_DETAIL } from '../src/api/urls';
import { useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { EmployeeFull, WorkExperience, Education } from '../src/types';

const GENDER_MAP: Record<number, string> = { 1: 'Erkak', 2: 'Ayol' };
const MARITAL_MAP: Record<string, string> = {
  single: 'Turmush qurmagan',
  married: 'Turmush qurgan',
  divorced: 'Ajrashgan',
  widowed: 'Beva',
};
const DAYS_MAP: Record<number, string> = {
  0: 'Du', 1: 'Se', 2: 'Chor', 3: 'Pay', 4: 'Ju', 5: 'Sha', 6: 'Ya',
};

export default function ProfileDetailScreen() {
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ id?: string }>();
  const employeeId = params.id ? Number(params.id) : user?.employee?.id;
  const styles = useThemedStyles(makeStyles);

  const isOwnProfile = employeeId === user?.employee?.id;
  // Own profile → see everything. Other employees → only HR/admin see sensitive data.
  const canViewSensitive = isOwnProfile || isMasterAdmin(user) || isHR(user) || user?.type === 'admin';

  const [employee, setEmployee] = useState<EmployeeFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    (async () => {
      try {
        const res = await apiClient.get<EmployeeFull>(EMPLOYEE_DETAIL(employeeId));
        setEmployee(res.data);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [employeeId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator color={styles._spinner.color} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Header styles={styles} title="Ma'lumotnoma" />
        <View style={styles.loadingWrapper}>
          <Text style={styles.errorText}>Ma'lumot topilmadi</Text>
        </View>
      </SafeAreaView>
    );
  }

  const workDays = (employee.working_days || [])
    .map((d) => DAYS_MAP[d] ?? '')
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header
        styles={styles}
        title="Ma'lumotnoma"
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
          <Text style={styles.attendanceBtnIcon}>📅</Text>
          <Text style={styles.attendanceBtnText}>Davomat</Text>
        </TouchableOpacity>

        {canViewSensitive && (
          <Section styles={styles} title="Shaxsiy ma'lumotlar" emoji="👤">
            <InfoRow styles={styles} label="Tug'ilgan sana" value={employee.birth_date ? dayjs(employee.birth_date).format('DD.MM.YYYY') : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Jinsi" value={employee.gender != null ? GENDER_MAP[employee.gender] : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Millati" value={employee.nationality} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Oilaviy holati" value={employee.maritial_status ? (MARITAL_MAP[employee.maritial_status] ?? employee.maritial_status) : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Manzil" value={employee.address} />
          </Section>
        )}

        <Section styles={styles} title="Kontakt ma'lumotlari" emoji="📞">
          <InfoRow styles={styles} label="Telefon" value={employee.phone_number} />
          <Divider styles={styles} />
          <InfoRow styles={styles} label="Ichki telefon" value={employee.internal_phone_number} />
          <Divider styles={styles} />
          <InfoRow styles={styles} label="Email" value={employee.email} />
        </Section>

        {canViewSensitive && (
          <Section styles={styles} title="Ish ma'lumotlari" emoji="💼">
            <InfoRow styles={styles} label="Bo'lim" value={employee.department?.name} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Lavozim" value={employee.job_position?.name} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Ishga kirgan sana" value={employee.job_acceptance_date ? dayjs(employee.job_acceptance_date).format('DD.MM.YYYY') : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Ish soati" value={employee.working_hours_start && employee.working_hours_end ? `${employee.working_hours_start} – ${employee.working_hours_end}` : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Tushlik" value={employee.lunch_start_time && employee.lunch_end_time ? `${employee.lunch_start_time} – ${employee.lunch_end_time}` : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Ish kunlari" value={workDays || null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Rahbar" value={employee.supervisor?.legal_name} />
          </Section>
        )}

        {canViewSensitive && (employee.personal_identification_number || employee.taxpayer_identification_number || employee.pasport_series) && (
          <Section styles={styles} title="Hujjatlar" emoji="🪪">
            <InfoRow styles={styles} label="PINFL" value={employee.personal_identification_number} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="INN" value={employee.taxpayer_identification_number} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Pasport" value={employee.pasport_series && employee.pasport_number ? `${employee.pasport_series} ${employee.pasport_number}` : null} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Pasport berilgan joy" value={employee.pasport_issue_by} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="JSHIR" value={employee.pasport_individual_number} />
            <Divider styles={styles} />
            <InfoRow styles={styles} label="Pensiya hisob raqami" value={employee.individual_accumulative_pension_account_number} />
          </Section>
        )}

        {canViewSensitive && (employee.work_experiences?.length ?? 0) > 0 && (
          <Section styles={styles} title="Mehnat tajribasi" emoji="🏢">
            {employee.work_experiences!.map((exp: WorkExperience, i: number) => (
              <View key={exp.id} style={styles.historyItem}>
                {i > 0 && <Divider styles={styles} />}
                <Text style={styles.historyTitle}>{exp.company_name}</Text>
                <Text style={styles.historySubtitle}>{exp.position}</Text>
                <Text style={styles.historyDate}>
                  {dayjs(exp.start_date).format('DD.MM.YYYY')} – {exp.is_current ? 'hozirgi kungacha' : dayjs(exp.end_date).format('DD.MM.YYYY')}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {canViewSensitive && (employee.educations?.length ?? 0) > 0 && (
          <Section styles={styles} title="Ta'lim" emoji="🎓">
            {employee.educations!.map((edu: Education, i: number) => (
              <View key={edu.id} style={styles.historyItem}>
                {i > 0 && <Divider styles={styles} />}
                <Text style={styles.historyTitle}>{edu.institution_name}</Text>
                <Text style={styles.historySubtitle}>{edu.faculty_name} — {edu.degree_name}</Text>
                <Text style={styles.historyDate}>
                  {dayjs(edu.start_date).format('DD.MM.YYYY')} – {edu.is_current ? 'hozirgi kungacha' : dayjs(edu.end_date).format('DD.MM.YYYY')}
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
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backArrow}>{'<'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {onEdit ? (
        <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
          <Text style={styles.editBtnText}>✏️</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
}

function Section({ styles, title, emoji, children }: { styles: any; title: string; emoji: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
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
    _spinner: { color: c.primaryLight },
    loadingWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: c.textSecondary, fontSize: 15 },

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
