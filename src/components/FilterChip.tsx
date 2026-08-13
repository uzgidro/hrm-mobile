// Filter/segment chip used by list screens. Was copy-pasted into three screens
// as FilterChip / OrderChip / EmpChip — the bodies differed only by name.
//
// Takes the caller's stylesheet so each screen keeps its own chip sizing; the
// required keys are chip, chipActive, chipText, chipTextActive and the four
// chipSubtle* variants.
import React from 'react';
import { TouchableOpacity, Text, type TextStyle, type ViewStyle } from 'react-native';

export interface ChipStyles {
  chip: ViewStyle;
  chipActive: ViewStyle;
  chipText: TextStyle;
  chipTextActive: TextStyle;
  chipSubtle: ViewStyle;
  chipSubtleActive: ViewStyle;
  chipSubtleText: TextStyle;
  chipSubtleTextActive: TextStyle;
}

export function FilterChip({
  label,
  active,
  onPress,
  styles,
  subtle,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ChipStyles;
  subtle?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        subtle ? styles.chipSubtle : styles.chip,
        active && (subtle ? styles.chipSubtleActive : styles.chipActive),
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text
        style={[
          subtle ? styles.chipSubtleText : styles.chipText,
          active && (subtle ? styles.chipSubtleTextActive : styles.chipTextActive),
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
