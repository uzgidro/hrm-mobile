// Leave-type bottom sheet for the create-leave form: pick one of HR's
// «leave_request_reasons» (the same list the web form offers). No free text —
// the web has none, and a typed reason matched no filter or report.
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { leaveTypeLabel } from '@/utils/leaveStatus';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { ff } from '@/theme/typography';

// Web-parity: these strings are BOTH the option list AND the value stored/POSTed
// as the leave `type` (CreateLeaveScreen sends `type: leaveType` verbatim), so
// they must stay byte-identical — do NOT translate them. Only the *displayed*
// label is localized, via t('leaves.presetType.<value>'); the raw value is the
// i18n key (values contain no dots, so they are valid nested key paths) and also
// the fallback for custom free-text types. See src/i18n/locales/*/leaves.ts.
//
// This is only the FALLBACK when the dictionary is empty or unreachable, and
// it is byte-identical to the web's LEAVE_REASON_FALLBACK (v2
// RequestPermissionPage) so both apps store the same value. Older requests may
// still carry 'Kasallik' / "Ta'til" / 'Boshqa' — their labels stay in
// leaves.presetType.
export const LEAVE_TYPES = ["Xizmat topshirig'i", 'Shaxsiy sabab'];

// Localized display label for a leave type; custom free-text falls back to itself.
// Lives in `@/utils/leaveStatus` (shared with the attendance Team screen);
// re-exported so the leaves screens keep their import.
export { leaveTypeLabel };

export function LeaveTypeSheet({ visible, selected, onSelect, onClose, options = LEAVE_TYPES }: {
  visible: boolean; selected: string; onSelect: (t: string) => void; onClose: () => void;
  /** HR's «leave_request_reasons» dictionary (web v2); the presets are the fallback. */
  options?: readonly string[];
}) {
  const ts = useThemedStyles(makeTs);
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={ts.overlay} activeOpacity={1} onPress={onClose} />
      <View style={ts.sheet}>
        <View style={ts.handle} />
        <Text style={ts.title}>{t('leaves.typeSheetTitle')}</Text>
        <ScrollView style={ts.list}>
        {options.map((value) => (
          <TouchableOpacity key={value} style={ts.item} onPress={() => { onSelect(value); onClose(); }} activeOpacity={0.7}>
            <Text style={[ts.itemText, selected === value && ts.itemTextActive]}>{leaveTypeLabel(t, value)}</Text>
            {selected === value && <Icon name="check" size={16} color={colors.primaryLight} />}
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeTs = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.overlay },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingBottom: 32 },
    handle: { width: 40, height: 4, backgroundColor: c.cardBorder, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    title: { fontSize: 18, color: c.text, marginBottom: 8, ...ff('900') },
    list: { maxHeight: 360 },
    item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 2, borderBottomColor: c.cardBorder },
    itemText: { flex: 1, fontSize: 15, color: c.text, ...ff('700') },
    itemTextActive: { color: c.primaryLight, ...ff('900') },
  });
