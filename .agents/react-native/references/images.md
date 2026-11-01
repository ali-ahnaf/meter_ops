# Images

Covers any screen that shows a photo, thumbnail, or `expo-image-picker` result.

## Rules

1. Import `Image` from `expo-image`, not from `react-native`. It is already a dependency.
   Use `contentFit="cover"`, not `resizeMode`.
2. Put the size on the `Image` itself: `width`, `height` or `aspectRatio`, `borderRadius`
   and a placeholder `backgroundColor` all go in the image's style.
3. Overlays (a "Remove" button, a badge) are absolute siblings of the `Image` inside a
   plain wrapper `View` with no style.
4. Do not stretch an image with `StyleSheet.absoluteFill` inside a rounded wrapper with
   `overflow: "hidden"`. See "Known failure" below.
5. `StyleSheet.absoluteFillObject` no longer exists in RN 0.86. `StyleSheet.absoluteFill`
   is now a plain object, so spread it if you need it in a style.

## Pattern

The photo preview in `src/app/capture.tsx`:

```tsx
import { Image } from "expo-image";

<View>
  <Image source={{ uri: photo }} style={s.photo} contentFit="cover" accessibilityLabel="Plate photo" />
  <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => setPhoto(null)} style={s.remove}>
    <Text style={s.removeText}>Remove</Text>
  </Pressable>
</View>

photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: ms(20), backgroundColor: color.track },
remove: { position: "absolute", top: ms(10), right: ms(10) /* ... */ },
```

## Known failure

On an Android phone (Expo Go, SDK 57, RN 0.86), this layout showed only the grey
placeholder for both camera and library photos:

```tsx
<View style={{ aspectRatio: 4 / 3, borderRadius: 20, backgroundColor: color.track, overflow: "hidden" }}>
  <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" /> {/* react-native Image */}
  <Pressable style={s.remove}>...</Pressable>
</View>
```

`onLoad` fired, so the file loaded, but nothing inside the wrapper was drawn, including
the "Remove" button. Removing `overflow: "hidden"` alone did not fix it. Switching to the
pattern above did. Both changes went in together, so it is not proven which one fixed it.
Use the pattern above for both parts.

## Debugging a blank image

Add temporary handlers to tell a load failure apart from a rendering problem:

```tsx
onLoad={(e) => console.log("image loaded", e.nativeEvent)}
onError={(e) => console.warn("image failed", e.nativeEvent.error)}
```

- `onError` fires: the URI or the decode is the problem.
- `onLoad` fires but nothing shows: the problem is layout or clipping. Check whether
  sibling overlays are visible too.
- Neither fires: the image never got a size or never mounted.

The logs print in the Metro terminal. A `console.warn` also shows as a LogBox banner on
the device. Remove the handlers once the cause is known.

## Picker results

- The `uri` from `expo-image-picker` is a `file://` path in the app cache. Show it
  directly; do not copy it.
- Product rule: never store or upload the original photo, only a small thumbnail. A meal
  photo is untrusted input.
