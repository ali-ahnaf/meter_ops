import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ms } from 'react-native-size-matters';
import { color } from '@/theme';

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'danger' | 'primary';
};

const iconColor = { neutral: color.muted, danger: color.danger, primary: color.onPrimary } as const;

export function IconButton({ icon, label, onPress, tone = 'neutral' }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [s.base, tone === 'primary' && s.primary, pressed && s.pressed]}
    >
      <Ionicons name={icon} size={ms(18)} color={iconColor[tone]} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: color.primary },
  pressed: { opacity: 0.6 },
});
