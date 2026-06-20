import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { ORDER_ACTS, ORDER_ACT_CATEGORIES, EMPLOYEES_LIST } from '../src/api/urls';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import type { Employee, OrderActCategory } from '../src/types';

type SignerRow = { employee: Employee; signer_type: 'approver' | 'leadership' };

export default function CreateOrderScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const orgBranchId =
    employee?.organization_branches?.[0]?.id ??
    employee?.department?.organization_branch_id;

  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const qc = useQueryClient();

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [signers, setSigners] = useState<SignerRow[]>([]);
  const [saving, setSaving] = useState(false);

  const [catModal, setCatModal] = useState(false);
  const [signerModal, setSignerModal] = useState(false);
  const [signerType, setSignerType] = useState<'approver' | 'leadership'>('approver');

  const { data: categories = [], isLoading: catsLoading } = useQuery<OrderActCategory[]>({
    queryKey: ['order-act-categories'],
    queryFn: () => apiClient.get(ORDER_ACT_CATEGORIES).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: employees = [], isLoading: empsLoading } = useQuery<Employee[]>({
    queryKey: ['employees-list-all'],
    queryFn: () =>
      apiClient.get(EMPLOYEES_LIST, { params: { limit: 500 } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    staleTime: 5 * 60 * 1000,
  });

  const selectedCategory = categories.find((c) => c.id === categoryId);

  function addSigner(emp: Employee) {
    if (signers.some((s) => s.employee.id === emp.id)) {
      setSignerModal(false);
      return;
    }
    setSigners((prev) => [...prev, { employee: emp, signer_type: signerType }]);
    setSignerModal(false);
  }

  function removeSigner(empId: number) {
    setSigners((prev) => prev.filter((s) => s.employee.id !== empId));
  }

  async function handleCreate() {
    if (!categoryId) {
      Alert.alert('Xato', 'Kategoriyani tanlang');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Xato', 'Tavsifni kiriting');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        category_id: categoryId,
        description: description.trim(),
        organization_branch_id: orgBranchId ?? undefined,
        assigned_signers: signers.map((s) => ({
          employee_id: s.employee.id,
          signer_type: s.signer_type,
          can_edit_document: false,
        })),
      };

      const res = await apiClient.post(ORDER_ACTS, body);
      qc.invalidateQueries({ queryKey: ['order-acts'] });
      router.replace({ pathname: '/order-detail', params: { id: res.data.id } } as any);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Xatolik yuz berdi';
      Alert.alert('Xato', String(msg));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Yangi buyruq</Text>
        <TouchableOpacity
          style={[styles.createBtn, saving && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.createBtnText}>Yaratish</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Category */}
        <Text style={styles.label}>Kategoriya *</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setCatModal(true)}
          activeOpacity={0.8}
        >
          {catsLoading ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Text style={selectedCategory ? styles.selectorText : styles.selectorPlaceholder}>
              {selectedCategory?.name ?? "Kategoriyani tanlang..."}
            </Text>
          )}
          <Text style={styles.selectorArrow}>›</Text>
        </TouchableOpacity>

        {/* Description */}
        <Text style={styles.label}>Tavsif *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Buyruq tavsifini kiriting..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Signers */}
        <View style={styles.signersHeader}>
          <Text style={styles.label}>Imzochilar</Text>
          <View style={styles.addSignerRow}>
            <TouchableOpacity
              style={[styles.addSignerBtn, { backgroundColor: colors.primarySoft }]}
              onPress={() => { setSignerType('approver'); setSignerModal(true); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.addSignerBtnText, { color: colors.primary }]}>+ Tasdiqlaydi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addSignerBtn, { backgroundColor: colors.warningSoft }]}
              onPress={() => { setSignerType('leadership'); setSignerModal(true); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.addSignerBtnText, { color: colors.warning }]}>+ Rahbariyat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {signers.length === 0 ? (
          <Text style={styles.emptySigners}>Imzochilar qo'shilmagan</Text>
        ) : (
          signers.map((s) => (
            <View key={s.employee.id} style={styles.signerRow}>
              <View style={styles.signerInfo}>
                <Text style={styles.signerName} numberOfLines={1}>
                  {s.employee.legal_name}
                </Text>
                <View style={[
                  styles.signerTypeBadge,
                  { backgroundColor: s.signer_type === 'approver' ? colors.primarySoft : colors.warningSoft }
                ]}>
                  <Text style={[
                    styles.signerTypeText,
                    { color: s.signer_type === 'approver' ? colors.primary : colors.warning }
                  ]}>
                    {s.signer_type === 'approver' ? 'Tasdiqlaydi' : 'Rahbariyat'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => removeSigner(s.employee.id!)} hitSlop={8}>
                <Text style={styles.removeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Category picker modal */}
      <Modal visible={catModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kategoriya tanlang</Text>
              <TouchableOpacity onPress={() => setCatModal(false)} hitSlop={8}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item.id === categoryId && styles.modalItemActive]}
                  onPress={() => { setCategoryId(item.id); setCatModal(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalItemText, item.id === categoryId && styles.modalItemTextActive]}>
                    {item.name}
                  </Text>
                  {item.id === categoryId && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>Kategoriyalar topilmadi</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Signer picker modal */}
      <Modal visible={signerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {signerType === 'approver' ? 'Tasdiqlaydi' : 'Rahbariyat'} — xodim tanlang
              </Text>
              <TouchableOpacity onPress={() => setSignerModal(false)} hitSlop={8}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {empsLoading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={colors.primaryLight} />
            ) : (
              <FlatList
                data={employees.filter((e) => !signers.some((s) => s.employee.id === e.id))}
                keyExtractor={(e) => String(e.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => addSigner(item)}
                    activeOpacity={0.8}
                  >
                    <View>
                      <Text style={styles.modalItemText}>{item.legal_name}</Text>
                      {!!item.job_position?.name && (
                        <Text style={styles.modalItemSub}>{item.job_position.name}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Text style={styles.modalEmptyText}>Xodimlar topilmadi</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },

    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingTop: 8, paddingBottom: 12, gap: 12,
    },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 24, color: c.text },
    title: { flex: 1, fontSize: 20, fontWeight: '800', color: c.text },
    createBtn: {
      backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 9,
      borderRadius: 20, minWidth: 80, alignItems: 'center',
    },
    createBtnDisabled: { opacity: 0.6 },
    createBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 14 },

    content: { paddingHorizontal: 16, paddingTop: 8 },

    label: { fontSize: 13, fontWeight: '700', color: c.textSecondary, marginBottom: 8, marginTop: 18 },

    selector: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
      paddingHorizontal: 16, paddingVertical: 14, gap: 8,
    },
    selectorText: { flex: 1, fontSize: 15, color: c.text, fontWeight: '500' },
    selectorPlaceholder: { flex: 1, fontSize: 15, color: c.textMuted },
    selectorArrow: { fontSize: 22, color: c.textMuted },

    textArea: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
      paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: c.text,
      minHeight: 110,
    },

    signersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 },
    addSignerRow: { flexDirection: 'row', gap: 8 },
    addSignerBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
    addSignerBtnText: { fontSize: 12, fontWeight: '700' },
    emptySigners: { color: c.textMuted, fontSize: 13, marginTop: 4, marginBottom: 8 },

    signerRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder,
      paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, gap: 10,
    },
    signerInfo: { flex: 1, gap: 4 },
    signerName: { fontSize: 14, fontWeight: '600', color: c.text },
    signerTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    signerTypeText: { fontSize: 11, fontWeight: '700' },
    removeIcon: { fontSize: 16, color: c.textMuted },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      maxHeight: '75%', paddingBottom: 24,
    },
    modalHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    modalTitle: { fontSize: 16, fontWeight: '700', color: c.text, flex: 1, marginRight: 8 },
    modalClose: { fontSize: 18, color: c.textMuted },
    modalItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    modalItemActive: { backgroundColor: c.primarySoft },
    modalItemText: { fontSize: 15, color: c.text, fontWeight: '500' },
    modalItemTextActive: { color: c.primary, fontWeight: '700' },
    modalItemSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    checkIcon: { fontSize: 18, color: c.primary },
    modalEmpty: { alignItems: 'center', paddingTop: 40 },
    modalEmptyText: { color: c.textMuted, fontSize: 14 },
  });
