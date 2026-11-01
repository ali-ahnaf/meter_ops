# Responsive sizing with `react-native-size-matters`

Use `react-native-size-matters` for any pixel-based dimension that should adapt to device size. It is a dependency of `packages/app`.

Import the short aliases, never the full names:

```tsx
import { ms } from "react-native-size-matters";
```

### Which helper to use

- `ms(size, factor?)` (moderate scale): the default. Font sizes, line heights, padding, margins, gaps, border radius, and fixed widths and heights. It scales gently, so text does not blow up on tablets. The default factor is `0.5`.
- `s(size)` (scale): widths that must scale linearly with screen width, such as a card sized to the screen.
- `vs(size)` (vertical scale): heights that must scale linearly with screen height, such as a hero block pegged to the viewport.
- `mvs(size, factor?)` (moderate vertical scale): heights that should adapt, but not linearly.

### Conventions for this repo

1. Wrap every pixel value in a style in `ms(...)`. Never hard-code the number.

   ```tsx
   const s = StyleSheet.create({
     title: { fontFamily: font.semibold, fontSize: ms(28), letterSpacing: -0.84 },
     body: { fontFamily: font.regular, fontSize: ms(14), lineHeight: ms(20) },
   });
   ```

2. Inline style objects follow the same rule: `<View style={{ gap: ms(8) }}>`.
3. Shared components that take a size prop scale it themselves: `Icon` and `MacroIcon` (`size`), and `Bar` (`height`). Pass the raw number (`<Icon size={16}>`). Wrapping it in `ms()` at the call site scales it twice.
4. A raw `<Svg width height>` outside those components takes `ms(...)` at the call site.
5. Wrap only the numeric pixel value. Leave strings and percentages alone.
6. Do not use `ScaledSheet`. Use `StyleSheet.create` with explicit `ms(...)` calls, so the scaling is visible where the value is written.

### When _not_ to scale

- `0`, and `borderRadius: 999` used for pills and circles.
- `letterSpacing` values below 1 in absolute terms. Scaling them makes kerning uneven.
- `borderWidth` below 2 (hairlines). Scaling them blurs the edge.
- `shadowOffset`, `shadowRadius`, and `elevation`.
- `hitSlop`. It sets the touch area, not a visual size.
- SVG coordinates inside a `viewBox` (`cx`, `cy`, `r`, path data). The `viewBox` scales them.
- Flex, opacity, z-index, animation values, and other non-pixel numbers.
