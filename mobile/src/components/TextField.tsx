import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { ms } from 'react-native-size-matters';
import { color, font } from '@/theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & { label: string; multiline?: boolean };

export function TextField({ label, multiline = false, ...inputProps }: TextFieldProps) {
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={color.faint}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[s.input, multiline && s.multiline]}
        {...inputProps}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: ms(6) },
  label: { fontFamily: font.medium, fontSize: ms(12), color: color.body },
  input: {
    minHeight: 44,
    fontFamily: font.regular,
    fontSize: ms(15),
    color: color.heading,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: ms(14),
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
  },
  multiline: { minHeight: ms(200) },
});
