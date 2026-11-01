---
name: react-native
description: Conventions for building UI in the Expo / React Native app in packages/app. Covers when to extract a reusable component (buttons, text fields, cards, rows) and how to keep the UI smooth (lists, re-renders, animations, images). Use whenever adding or changing a screen, component, list, animation, or style in packages/app, or when the user mentions React Native, Expo, a screen, jank, lag, or scrolling.
---

# React Native UI conventions

Applies to `packages/app` (Expo Router, screens in `src/app/`, shared UI in
`src/components/`, design tokens in `src/theme.ts`). Read `packages/app/AGENTS.md` first
for the Expo version rules; Expo APIs change every SDK, so check the versioned docs rather
than memory.

## References

Read the matching file in `references/` before starting that kind of work:

- `references/responsive-sizing.md`: any `fontSize`, padding, margin, radius, or other
  pixel value in a style. Covers which `react-native-size-matters` helper to use and what
  not to scale.
- `references/keyboard-avoidance.md`: any screen with a text input, form, or bottom sheet
  that the keyboard can cover.
- `references/design-system.md`: a new screen or route, safe-area and `ScrollView` layout,
  screen measurement, or haptics.
- `references/images.md`: any photo, thumbnail, or `expo-image-picker` result on screen,
  or an image that shows blank or grey.
- `references/bottom-sheet.md`: any bottom sheet or slide-up panel. Covers
  `BottomSheetModal` and why its animation is built the way it is.

## 1. Reuse components

Before writing UI, look in `src/components/` for something that already does the job.
`Button.tsx` is the reference for how a shared component looks here.

Extract a component when:

- The same UI element appears on more than one screen. Two uses is the threshold, not three.
  Typical cases: buttons, text fields, section headers, cards, list rows, empty states,
  macro/progress bars, chips.
- A screen copies a block of JSX from another screen and changes only text or a value.
  That is one component with props.

How to build it:

- One component per file in `src/components/`, named export, `PascalCase.tsx`.
- Props describe intent (`variant="primary"`, `label`, `onPress`), not raw styles. Add a
  `style` prop only when a caller actually needs to adjust layout.
- Colors, fonts, and spacing come from `src/theme.ts`. Never hardcode a hex value or font
  name in a screen or component; add a token instead.
- Keep accessibility in the shared component so every caller gets it: `accessibilityRole`,
  `accessibilityState`, `accessibilityLabel` for icon-only controls, and a touch target of
  at least 44x44 (use `hitSlop` if the visual is smaller).
- When you extract, replace every existing copy in the same change. A shared component
  that only one screen uses while others keep their own copy is worse than no component.
- Do not build a component "for later". If only one screen needs it, keep it in that
  screen until a second one does.

## 2. UI smoothness

Target 60 fps on a mid-range Android phone, not just the simulator. Anything that drops
frames during scroll, typing, or a transition is a bug.

Scrolling:

- A screen whose content can grow must scroll. Content grows with list data, user text,
  error messages, translated strings, a small phone, or a large system font size. Do not
  assume it fits because it fits on the simulator.
- Content that can grow without limit (meals, entries, history): `FlatList` /
  `SectionList`, with the rest of the screen in `ListHeaderComponent` /
  `ListFooterComponent` so the page scrolls as one. Never `.map()` inside a `ScrollView`
  for this, and never nest a `FlatList` in a `ScrollView` of the same direction.
- Bounded content that can still overflow (forms, settings, detail screens): a
  `ScrollView` as the first child of the route, per `references/design-system.md`. Screens
  with inputs use `KeyboardAwareScrollView`, per `references/keyboard-avoidance.md`.
- A fixed footer button stays outside the scroll container, as on `today.tsx`.

Lists:
- Always set `keyExtractor` with a stable id, never the array index.
- Wrap the row component in `React.memo` and pass `renderItem` as a stable function
  (defined outside the component or with `useCallback`).
- Set `getItemLayout` when rows have a fixed height.
- Do not add `@shopify/flash-list` or similar without asking; tune `FlatList` first.

Re-renders:

- The React Compiler is not enabled in this app, so memoization is manual. Use
  `useCallback` / `useMemo` for callbacks and objects passed to memoized children or used
  in effect dependency arrays. Do not wrap everything by reflex.
- Styles go in `StyleSheet.create` at the bottom of the file. No inline style objects in
  lists or frequently rendered components; for dynamic parts, combine a static style with
  a small conditional one, as `Button.tsx` does.
- Keep state as low in the tree as possible. A text field's value should not re-render the
  whole screen on every keystroke.
- Derive values during render instead of syncing them into state with `useEffect`.

Animations and interaction:

- Run animations on the native thread: `Animated` with `useNativeDriver: true`, and only
  animate `transform` and `opacity`. Animating `width`, `height`, `top`, or margins runs on
  JS and stutters.
- Give immediate press feedback (the `pressed` state of `Pressable`) and do slow work after
  it, not before.
- Do not block the JS thread with heavy work (big JSON parsing, sorting large arrays) in
  render or in a press handler. Move it out of render, memoize it, or do it on the server.

Images:

- Size images to what is displayed. Request the 256px thumbnail, not the full photo, for
  list rows.
- Give every image explicit dimensions so layout does not jump when it loads.
- Use `Image` from `expo-image` (already installed), per `references/images.md`.

## Before you finish

1. Grep `src/app/` for JSX or styles you just duplicated; extract if it now appears twice.
2. Check that no new hex colors or font names were added outside `src/theme.ts`.
3. Run `npx tsc --noEmit` and `npx expo lint` in `packages/app`.
4. For list or animation changes, say whether you checked it on a device. If not, say so.
