// Themed labeled text input used by the create/edit forms.
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { ff } from '../theme/typography';
import { NO_WEB_OUTLINE } from '../theme/web';

export function FormInput({
  label, value, onChangeText, placeholder, required, multiline, keyboardType, error,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  error?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}{required && <Text style={styles.req}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline, !!error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { marginBottom: 14 },
    label: { fontSize: 13, color: c.textSecondary, marginBottom: 6, ...ff('800') },
    req: { color: c.error, ...ff('900') },
    input: {
      minHeight: 48, backgroundColor: c.inputBg, borderWidth: 2, borderColor: c.cardBorder,
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text,
      ...NO_WEB_OUTLINE, ...ff('700'),
    },
    multiline: { minHeight: 96, textAlignVertical: 'top' },
    inputError: { borderColor: c.error },
    errorText: { fontSize: 12, color: c.error, marginTop: 4, ...ff('700') },
  });
