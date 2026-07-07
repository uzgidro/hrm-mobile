import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';

// The reject-reason and register (act-number) modals of the decree detail. Both
// are controlled by the screen; the input values live in the screen so the
// exact validate/close/submit flow of the original is preserved verbatim.
export function RejectModal({
  visible, reason, onChangeReason, onClose, onSubmit,
}: {
  visible: boolean; reason: string; onChangeReason: (t: string) => void;
  onClose: () => void; onSubmit: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>O'zgartirish so'rash</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Sababni yozing..."
            placeholderTextColor={colors.textMuted}
            value={reason}
            onChangeText={onChangeReason}
            multiline
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={onClose}>
              <Text style={styles.modalCancelText}>Bekor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={onSubmit}>
              <Text style={styles.modalConfirmText}>Yuborish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function RegisterModal({
  visible, actNumber, onChangeActNumber, onClose, onSubmit,
}: {
  visible: boolean; actNumber: string; onChangeActNumber: (t: string) => void;
  onClose: () => void; onSubmit: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Ro'yxatga olish</Text>
          <Text style={styles.modalHint}>Buyruq raqamini kiriting (ixtiyoriy)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Buyruq raqami"
            placeholderTextColor={colors.textMuted}
            value={actNumber}
            onChangeText={onChangeActNumber}
            keyboardType="number-pad"
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={onClose}>
              <Text style={styles.modalCancelText}>Bekor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={onSubmit}>
              <Text style={styles.modalConfirmText}>Tasdiqlash</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', paddingHorizontal: 28 },
    modalCard: { backgroundColor: c.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: c.cardBorder },
    modalTitle: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 8 },
    modalHint: { fontSize: 13, color: c.textMuted, marginBottom: 10 },
    modalInput: {
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12,
      padding: 12, fontSize: 15, color: c.text, minHeight: 48, textAlignVertical: 'top', marginBottom: 16,
    },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
    modalCancel: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder },
    modalCancelText: { color: c.textSecondary, fontSize: 15, fontWeight: '700' },
    modalConfirm: { backgroundColor: c.primary },
    modalConfirmText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
  });
