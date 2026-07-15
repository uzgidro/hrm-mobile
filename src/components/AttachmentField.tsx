// Presentational attachment list + "add file" button for the create forms.
// The picking (expo-document-picker) and upload live in the screens.
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { Icon } from './Icon';

export type PickedFile = { uri: string; name: string; mimeType?: string };

export function AttachmentField({
  label, files, onPick, onRemove,
}: {
  label?: string;
  files: PickedFile[];
  onPick: () => void;
  onRemove: (index: number) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label ?? t('components.attachmentLabel')}</Text>
      {files.map((f, i) => (
        <View key={`${f.uri}-${i}`} style={styles.fileRow}>
          <Icon name="doc" size={16} color={colors.primary} />
          <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
          <TouchableOpacity onPress={() => onRemove(i)} hitSlop={8}>
            <Icon name="trash" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addBtn} onPress={onPick} activeOpacity={0.8}>
        <Icon name="plus" size={15} color={colors.primary} />
        <Text style={styles.addText}>{t('components.addFile')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { marginTop: 16 },
    label: { fontSize: 13, fontWeight: '700', color: c.textSecondary, marginBottom: 8 },
    fileRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    },
    fileName: { flex: 1, fontSize: 13, color: c.text },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      backgroundColor: c.primarySoft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    },
    addText: { fontSize: 13, color: c.primary, fontWeight: '700' },
  });
