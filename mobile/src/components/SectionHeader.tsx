import { StyleSheet, Text, View } from 'react-native';
import { ms } from 'react-native-size-matters';
import { color, font } from '@/theme';

type SectionHeaderProps = { eyebrow: string; title: string; description?: string };

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <View style={s.wrap}>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      {description ? <Text style={s.description}>{description}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: ms(4) },
  eyebrow: { fontFamily: font.medium, fontSize: ms(11), letterSpacing: 1.4, textTransform: 'uppercase', color: color.muted },
  title: { fontFamily: font.heading, fontSize: ms(20), color: color.heading },
  description: { fontFamily: font.regular, fontSize: ms(13), lineHeight: ms(19), color: color.body },
});
