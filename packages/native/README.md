# @chiko111/scene-kit-native

React Native renderer for **scene-kit** scenes. Animations run on the UI thread (Reanimated 4), animated WebP/GIF via expo-image, pauses in background and when `active={false}`.

```bash
npm i @chiko111/scene-kit-native @chiko111/scene-kit-core react-native-reanimated react-native-worklets expo-image
```

```tsx
import { SceneView } from '@chiko111/scene-kit-native';

<SceneView scene={scene} palette={palette} active={isFocused} onAction={handleAction} />
```

Requires React Native 0.81+ with the New Architecture, Reanimated 4 (+ `react-native-worklets/plugin` in Babel) and Expo modules (`npx install-expo-modules@latest` in bare apps). Full docs: https://github.com/chiko111/scene-kit#readme
