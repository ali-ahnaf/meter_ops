import { StyleSheet, Text } from 'react-native';
import { ms } from 'react-native-size-matters';
import { color, font } from '@/theme';

type PillProps = { label: string; tone?: 'neutral' | 'primary' | 'mother' };

export function Pill({ label, tone = 'neutral' }: PillProps) {
  return (
    <Text style={[s.pill, tone === 'primary' && s.primary, tone === 'mother' && s.mother]}>{label}</Text>
  );
}

const s = StyleSheet.create({
  pill: {
    fontFamily: font.regular,
    fontSize: ms(12),
    color: color.body,
    backgroundColor: color.chip,
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: 999,
    overflow: 'hidden',
  },
  primary: { color: color.primary, backgroundColor: color.primarySoft },
  mother: { color: color.mother, backgroundColor: color.motherChip },
});
