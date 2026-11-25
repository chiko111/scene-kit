# @chiko111/scene-kit-native

React Native renderer for **scene-kit** scenes and promo pages. Animations run on the UI thread (Reanimated 4), animated WebP/GIF via expo-image, Lottie layers via lottie-react-native, draw videos via expo-video. Pauses in background and when `active={false}`.

```bash
npm i @chiko111/scene-kit-native @chiko111/scene-kit-core \
  react-native-reanimated react-native-worklets expo-image expo-video lottie-react-native
```

`expo-video` and `lottie-react-native` are new required peers in 0.5. They contain native code, so rebuild the app (`npx expo prebuild` / `pod install`) after installing them.

## Scene

```tsx
import { SceneView } from '@chiko111/scene-kit-native';

<SceneView scene={scene} palette={palette} active={isFocused} onAction={handleAction} />
```

## Page

```tsx
import { PageView } from '@chiko111/scene-kit-native';

<PageView
  page={page}                                          // from parsePage()
  palette={palette}                                    // map theme tokens to your Colors.*
  user={{ loggedIn: true, fields: { tickets: 7 } }}    // display values only, never tokens
  active={isFocused}
  header={<ScreenHeader />}
  onAction={handleAction}
/>
```

Renders scene, widget and slider sections in a scroll view; entrance animations start as sections scroll into view.

Requires React Native 0.81+ with the New Architecture, Reanimated 4 (+ `react-native-worklets/plugin` in Babel) and Expo modules (`npx install-expo-modules@latest` in bare apps). Full docs: https://github.com/chiko111/scene-kit#readme
