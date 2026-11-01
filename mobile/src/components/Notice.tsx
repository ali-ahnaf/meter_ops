import { StyleSheet, Text } from 'react-native';
import { ms } from 'react-native-size-matters';
import { color, font } from '@/theme';

type NoticeProps = { message: string; tone?: 'error' | 'warning' };

export function Notice({ message, tone = 'error' }: NoticeProps) {
  return (
    <Text accessibilityRole="alert" style={[s.base, tone === 'error' ? s.error : s.warning]}>
      {message}
    </Text>
  );
}

const s = StyleSheet.create({
  base: { fontFamily: font.regular, fontSize: ms(13), lineHeight: ms(19), borderWidth: 1, borderRadius: ms(14), padding: ms(12), overflow: 'hidden' },
  error: { color: color.danger, backgroundColor: color.dangerSoft, borderColor: color.dangerBorder },
  warning: { color: color.warning, backgroundColor: color.warningSoft, borderColor: color.warningBorder },
});
