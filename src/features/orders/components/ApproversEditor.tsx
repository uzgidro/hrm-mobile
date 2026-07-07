import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { Selector } from './FormParts';

export type Approver = { employee_id: number; can_edit_document: boolean };

// The "Kelishuvchilar" (approvers) editor block of the create-order form:
// add/remove rows, pick an employee per row, and toggle its edit-document flag.
export function ApproversEditor({
  approvers, employeesLoading, nameFor, onAdd, onRemove, onPick, onToggleEdit,
}: {
  approvers: Approver[];
  employeesLoading: boolean;
  nameFor: (employeeId: number | null) => string | undefined;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onPick: (index: number) => void;
  onToggleEdit: (index: number, value: boolean) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <>
      <View style={styles.approversHead}>
        <Text style={styles.fieldLabel}>Kelishuvchilar</Text>
        <TouchableOpacity style={styles.addApproverBtn} onPress={onAdd} activeOpacity={0.8}>
          <Icon name="plus" size={14} color={colors.primary} />
          <Text style={styles.addApproverText}>Qo'shish</Text>
        </TouchableOpacity>
      </View>

      {approvers.length === 0 ? (
        <Text style={styles.emptyApprovers}>Kelishuvchilar qo'shilmagan</Text>
      ) : (
        approvers.map((a, idx) => (
          <View key={idx} style={styles.approverCard}>
            <View style={styles.approverRow}>
              <View style={{ flex: 1 }}>
                <Selector
                  loading={employeesLoading}
                  text={nameFor(a.employee_id || null)}
                  placeholder="FIO yoki lavozim"
                  onPress={() => onPick(idx)}
                />
              </View>
              <TouchableOpacity style={styles.removeApprover} onPress={() => onRemove(idx)} hitSlop={6}>
                <Icon name="close" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>Buyruqni tahrirlash huquqi</Text>
              <Switch
                value={a.can_edit_document}
                onValueChange={(v) => onToggleEdit(idx, v)}
                trackColor={{ false: colors.cardBorder, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        ))
      )}
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    fieldLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary, marginBottom: 8 },
    approversHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 8 },
    addApproverBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.primarySoft, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14 },
    addApproverText: { color: c.primary, fontSize: 12, fontWeight: '700' },
    emptyApprovers: { color: c.textMuted, fontSize: 13 },
    approverCard: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, padding: 10, marginBottom: 8, gap: 8 },
    approverRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    removeApprover: { width: 40, height: 44, backgroundColor: c.errorSoft, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
    editLabel: { fontSize: 12, color: c.textSecondary },
  });
