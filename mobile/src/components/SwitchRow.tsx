import { StyleSheet, Switch, Text, View } from 'react-native';
import { ms } from 'react-native-size-matters';
import { color, font } from '@/theme';

type SwitchRowProps = {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export function SwitchRow({ label, hint, value, onValueChange, disabled = false }: SwitchRowProps) {
  return (
    <View style={[s.row, disabled && s.disabled]}>
      <View style={s.text}>
        <Text style={s.label}>{label}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onValueChange}
        thumbColor={value ? color.primary : color.surface}
        trackColor={{ false: color.borderStrong, true: color.primaryBorder }}
        value={value}
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ms(12), minHeight: 44 },
  disabled: { opacity: 0.5 },
  text: { flex: 1, gap: ms(2) },
  label: { fontFamily: font.medium, fontSize: ms(14), color: color.body },
  hint: { fontFamily: font.regular, fontSize: ms(12), color: color.muted },
});
