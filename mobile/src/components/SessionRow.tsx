import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ms } from 'react-native-size-matters';
import { color, font } from '@/theme';
import { IconButton } from './IconButton';

type SessionRowProps = {
  id: string;
  title: string;
  subtitle: string;
  onPress?: (id: string) => void;
  onDelete: (id: string) => void;
};

function SessionRowBase({ id, title, subtitle, onPress, onDelete }: SessionRowProps) {
  return (
    <View style={s.row}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        disabled={!onPress}
        onPress={() => onPress?.(id)}
        style={({ pressed }) => [s.body, pressed && s.pressed]}
      >
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
      </Pressable>
      <IconButton icon="trash-outline" label="Delete session" onPress={() => onDelete(id)} tone="danger" />
    </View>
  );
}

export const SessionRow = memo(SessionRowBase);

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: ms(20), paddingRight: ms(6) },
  body: { flex: 1, paddingVertical: ms(14), paddingLeft: ms(16), gap: ms(4) },
  pressed: { opacity: 0.6 },
  title: { fontFamily: font.semibold, fontSize: ms(15), color: color.heading },
  subtitle: { fontFamily: font.regular, fontSize: ms(12), color: color.muted },
});
