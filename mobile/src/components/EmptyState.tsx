import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ms } from 'react-native-size-matters';
import { color, font } from '@/theme';

type EmptyStateProps = { icon: keyof typeof Ionicons.glyphMap; title: string; message: string };

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <View style={s.wrap}>
      <Ionicons name={icon} size={ms(26)} color={color.faint} />
      <Text style={s.title}>{title}</Text>
      <Text style={s.message}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: ms(8), borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, borderRadius: ms(20), paddingVertical: ms(28), paddingHorizontal: ms(18) },
  title: { fontFamily: font.semibold, fontSize: ms(16), color: color.heading },
  message: { fontFamily: font.regular, fontSize: ms(13), color: color.body, textAlign: 'center' },
});
