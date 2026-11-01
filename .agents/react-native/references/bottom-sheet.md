# Bottom sheets

Use `BottomSheetModal` from `src/components/BottomSheetModal.tsx` for any sheet that slides up from the bottom. Do not add `@gorhom/bottom-sheet` or similar without asking, and do not write another `<Modal>` sheet in a screen.

## Usage

Mount the sheet to open it and unmount it in `onClose`. Keep the open state in the screen, typically a key for which content to show:

```tsx
const [info, setInfo] = useState<Info | null>(null);

{info ? (
  <BottomSheetModal onClose={() => setInfo(null)}>
    {(close) => (
      <>
        <Text accessibilityRole="header" style={s.sheetTitle}>{title}</Text>
        <Text style={s.body}>{body}</Text>
        <Button label="Got it" onPress={close} />
      </>
    )}
  </BottomSheetModal>
) : null}
```

`children` is a function that receives `close`. Buttons inside the sheet must call that `close`, not `onClose`, or the sheet vanishes without the slide-down. `onClose` runs only after the exit animation ends. The backdrop tap and Android back already call `close`.

The component owns the modal, backdrop, grabber, rounded top, horizontal padding, the bottom safe-area inset and `gap` between children. The caller only supplies content.

Keep the content's height fixed from the first frame. If it grows while the sheet slides in, `onLayout` fires again mid-animation, the height and timing reset, and the sheet jumps. A fetch that resolves within the 280 ms open is enough to cause this. Render the full layout immediately with placeholder values, and gate actions such as Save on a `loaded` flag. Do not gate the markup on it. `WeightSheet` in `src/app/today.tsx` does this: the readout and `Ruler` render with the profile weight, and the "Last:" line holds `" "` until the fetch returns.

## How it is built, and why

These are the mistakes that made the first version look wrong or drop frames. Keep them if you change the component.

1. `Modal` uses `animationType="none"`. `"slide"` moves the whole modal, so the backdrop slides up with the sheet instead of fading.
2. The backdrop and the sheet are two `Animated.View`s driven by one `Animated.Value` (0 to 1): backdrop `opacity`, sheet `translateY`. Both use `useNativeDriver: true`, and only `opacity` and `transform` are animated.
3. The open animation starts in the sheet's `onLayout`, not in `useEffect` on mount. On mount the native modal is not presented yet, so the first frames are lost and the sheet jumps.
4. `translateY` starts at the measured sheet height, not the window height. Starting at the window height spends half the animation offscreen and then crosses the visible part too fast, which reads as dropped frames.
5. Easing is `Easing.out(Easing.cubic)` for 280 ms to open and `Easing.in(Easing.cubic)` for 220 ms to close. Linear timing looks stiff.
6. The `Animated.Value` is held with `useState(() => new Animated.Value(0))`. `useRef(...).current` fails the `react-hooks/refs` lint rule, because it reads a ref during render.
7. The measured height is an `Animated.Value` set with `setValue` in `onLayout`, not React state. `translateY` is built once as `Animated.multiply(Animated.subtract(1, progress), sheetH)` and is never rebuilt. Calling `setState` in `onLayout` re-renders while the animation starts, and `progress.interpolate(...)` returns a new node. The native driver then swaps nodes mid-animation and the sheet jumps.

Judge smoothness in a release build (`npx expo run:ios --configuration Release` or `npx expo run:android --variant release`). Dev builds can stutter even when animations run on the native driver.

The root is a `KeyboardAvoidingView` with `behavior="padding"`, so a text input in the sheet stays above the keyboard. Do not `autoFocus` it: the keyboard would open while the sheet slides in and move it mid-animation.
