import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ms } from 'react-native-size-matters';
import { color, font } from '@/theme';

export const OWNER_OPTIONS = ['1A', '1B', '2A', '2B', '3A', '3B', '4', '5', '6', '7', 'MM'];

type OwnerPickerProps = { value: string; onChange: (owner: string) => void };

export function OwnerPicker({ value, onChange }: OwnerPickerProps) {
  return (
    <View style={s.wrap}>
      <Text style={s.label}>Owner name</Text>
      <View style={s.options}>
        {OWNER_OPTIONS.map((owner) => {
          const selected = owner === value;
          return (
            <Pressable
              key={owner}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              hitSlop={4}
              onPress={() => onChange(owner)}
              style={[s.option, selected && s.selected]}
            >
              <Text style={[s.optionText, selected && s.selectedText]}>{owner}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: ms(6) },
  label: { fontFamily: font.medium, fontSize: ms(12), color: color.body },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: ms(8) },
  option: { minWidth: 44, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: ms(12), borderRadius: 999, borderWidth: 1, borderColor: color.borderStrong, backgroundColor: color.surface },
  selected: { backgroundColor: color.primary, borderColor: color.primary },
  optionText: { fontFamily: font.medium, fontSize: ms(14), color: color.body },
  selectedText: { color: color.onPrimary },
});
