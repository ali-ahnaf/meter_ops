import { useCallback, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms } from 'react-native-size-matters';
import { color } from '@/theme';

type BottomSheetModalProps = {
  /** Runs after the exit animation. Unmount the sheet here. */
  onClose: () => void;
  /** Receives `close`, which plays the exit animation. Buttons inside must call it. */
  children: (close: () => void) => ReactNode;
};

export function BottomSheetModal({ onClose, children }: BottomSheetModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));
  const [sheetHeight] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => Animated.multiply(Animated.subtract(1, progress), sheetHeight));
  const [sheetOpacity] = useState(() =>
    progress.interpolate({ inputRange: [0, 0.01], outputRange: [0, 1], extrapolate: 'clamp' }),
  );

  const onSheetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const first = (sheetHeight as unknown as { _value: number })._value === 0;
      sheetHeight.setValue(event.nativeEvent.layout.height);
      if (first) {
        Animated.timing(progress, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    },
    [progress, sheetHeight],
  );

  const close = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [onClose, progress]);

  return (
    <Modal animationType="none" onRequestClose={close} statusBarTranslucent transparent visible>
      <KeyboardAvoidingView behavior="padding" style={s.root}>
        <Animated.View style={[s.backdrop, { opacity: progress }]}>
          <Pressable accessibilityLabel="Close" onPress={close} style={s.fill} />
        </Animated.View>
        <Animated.View
          onLayout={onSheetLayout}
          style={[
            s.sheet,
            { maxHeight: windowHeight * 0.9, paddingBottom: insets.bottom + ms(16), opacity: sheetOpacity, transform: [{ translateY }] },
          ]}
        >
          <Animated.View style={s.grabber} />
          <ScrollView bounces={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children(close)}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: color.backdrop },
  fill: { flex: 1 },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: ms(28),
    borderTopRightRadius: ms(28),
    paddingHorizontal: ms(20),
    paddingTop: ms(10),
  },
  grabber: { alignSelf: 'center', width: ms(40), height: 4, borderRadius: 2, backgroundColor: color.borderStrong, marginBottom: ms(12) },
  content: { gap: ms(14) },
});
