import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ms } from 'react-native-size-matters';
import { formatSessionDate } from '@lib/meter-ops';
import { formatWaterDate } from '@lib/water-ops';
import { color, font } from '@/theme';

type DateTimeFieldProps = {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  /** `date` picks a day only; `datetime` picks the day, then the time. */
  mode?: 'date' | 'datetime';
};

export function DateTimeField({ label, value, onChange, mode = 'date' }: DateTimeFieldProps) {
  const open = () => {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      onValueChange: (_event, pickedDate) => {
        if (mode === 'date') {
          onChange(pickedDate);
          return;
        }
        DateTimePickerAndroid.open({
          value: pickedDate,
          mode: 'time',
          onValueChange: (_timeEvent, pickedTime) => onChange(pickedTime),
        });
      },
    });
  };

  const text = mode === 'date' ? formatWaterDate(value.toISOString()) : formatSessionDate(value.toISOString());

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <Pressable accessibilityLabel={`${label}: ${text}`} accessibilityRole="button" onPress={open} style={({ pressed }) => [s.field, pressed && s.pressed]}>
        <Text style={s.value}>{text}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: ms(6) },
  label: { fontFamily: font.medium, fontSize: ms(12), color: color.body },
  field: { minHeight: 44, justifyContent: 'center', backgroundColor: color.surface, borderWidth: 1, borderColor: color.borderStrong, borderRadius: ms(14), paddingHorizontal: ms(14) },
  pressed: { opacity: 0.7 },
  value: { fontFamily: font.regular, fontSize: ms(15), color: color.heading },
});
