import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ms } from 'react-native-size-matters';
import { color } from '@/theme';

type CardProps = { children: ReactNode; style?: StyleProp<ViewStyle> };

export function Card({ children, style }: CardProps) {
  return <View style={[s.card, style]}>{children}</View>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: ms(24),
    borderWidth: 1,
    borderColor: color.border,
    padding: ms(18),
    gap: ms(14),
  },
});
