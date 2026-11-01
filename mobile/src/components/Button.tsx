import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ms } from 'react-native-size-matters';
import { color, font } from '@/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const textColor = {
  primary: color.onPrimary,
  secondary: color.onSecondary,
  ghost: color.body,
  danger: color.danger,
} as const;

export function Button({ label, onPress, variant = 'primary', icon, disabled = false, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.base,
        s[variant],
        disabled && s.disabled,
        pressed && !disabled && s.pressed,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={ms(18)} color={textColor[variant]} /> : null}
      <Text style={[s.label, { color: textColor[variant] }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: ms(18),
    paddingVertical: ms(10),
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(8),
  },
  primary: { backgroundColor: color.primary },
  secondary: { backgroundColor: color.secondary },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: color.dangerSoft },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
  label: { fontFamily: font.semibold, fontSize: ms(14) },
});
