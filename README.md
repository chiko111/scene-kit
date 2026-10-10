# scene-kit

Визуален редактор за бекофиса → JSON → анимиран компонент в React Native и React DOM.

```
Бекофис (SceneEditor)  ──save──▶  JSON + assets (CDN)  ──fetch──▶  parseScene()  ──▶  <SceneView />
                                                                                       ├─ @chiko111/scene-kit-native (iOS/Android)
                                                                                       └─ @chiko111/scene-kit-web    (web, mobile web)
```

| Пакет | Какво е | Зависимости |
|---|---|---|
| `@chiko111/scene-kit-core` | zod схема, `parseScene`, типове, helpers | `zod@4` |
| `@chiko111/scene-kit-web` | `SceneView` за React DOM, CSS анимации | `react@19.2+` |
| `@chiko111/scene-kit-native` | `SceneView` за RN, Reanimated + expo-image | RN 0.81+ (New Arch), Reanimated 4, expo-image |
| `@chiko111/scene-kit-editor` | Редактор за бекофиса (React DOM) | `react@19.2+`, `@chiko111/scene-kit-web` |

## Инсталация

```bash
# Бекофис
npm i @chiko111/scene-kit-editor @chiko111/scene-kit-web @chiko111/scene-kit-core

# Web сайт
npm i @chiko111/scene-kit-web @chiko111/scene-kit-core

# React Native
npm i @chiko111/scene-kit-native @chiko111/scene-kit-core react-native-reanimated react-native-worklets expo-image

# Backend (валидация преди запис)
npm i @chiko111/scene-kit-core
```

Пакетите са ESM + `.d.ts`. `web` и `editor` са предварително компилирани с React Compiler (auto-memoization и без компилатор в проекта ви). Всички `@chiko111/scene-kit-*` пакети имат една обща версия — ползвайте еднакви версии навсякъде.

## Модел

- **Слоеве**: `image` (статично, анимирано WebP/GIF), `text`, `button`, `shape`. Редът в `nodes` е z-order.
- **Ефекти** (до 4 на слой, всеки тип веднъж): `pulse`, `outlinePulse`, `float`, `fadeIn`. Плюс `shadow`.
- **Действия** (whitelist, никога код или URL): `navigate { route, params? }`, `openPromo { promoId }`, `openGame { gameId }`.
- **Единици**: `frame` е в % от сцената; всичко останало (шрифт, радиус, сянка, outline, float) е в `u` = 1% от **ширината** на сцената. Затова изглежда еднакво на всеки екран.
- **Цветове**: само theme токени (`primary`, `gold`…) — без hex в JSON. Всяка платформа подава своя `palette` от `Colors.*`.

## React Native

```tsx
// PromoBanner.tsx — рендерира се вътре в <Suspense fallback={...}>
import { use } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { parseScene, type Palette, type Scene, type SceneAction } from '@chiko111/scene-kit-core';
import { SceneView } from '@chiko111/scene-kit-native';
import { Colors } from '@/constants/Colors';

const palette: Palette = {
  primary: Colors.primary,
  onPrimary: Colors.onPrimary,
  secondary: Colors.secondary,
  onSecondary: Colors.onSecondary,
  accent: Colors.accent,
  gold: Colors.gold,
  success: Colors.success,
  danger: Colors.danger,
  surface: Colors.surface,
  onSurface: Colors.onSurface,
  background: Colors.background,
  white: Colors.white,
  black: Colors.black,
};

const ALLOWED_ROUTES = new Set(['Home', 'Casino', 'LiveCasino', 'Sport', 'Promotions']);

// use() изисква стабилен promise → кеширан по URL. В продукция: вашият data layer (React Query и т.н.).
const sceneCache = new Map<string, Promise<Scene | null>>();

function loadScene(url: string): Promise<Scene | null> {
  const cached = sceneCache.get(url);
  if (cached) return cached;
  const promise = fetch(url)
    .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((text) => {
      const result = parseScene(text);
      return result.ok ? result.scene : null; // невалидна сцена → нищо (или ваш fallback)
    })
    .catch(() => {
      sceneCache.delete(url); // позволява retry при следващ mount
      return null;
    });
  sceneCache.set(url, promise);
  return promise;
}

type Props = { sceneUrl: string };

export function PromoBanner({ sceneUrl }: Props) {
  const scene = use(loadScene(sceneUrl));
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  const handleAction = (action: SceneAction) => {
    switch (action.type) {
      case 'navigate':
        if (ALLOWED_ROUTES.has(action.route)) navigation.navigate(action.route, action.params);
        return;
      case 'openPromo':
        navigation.navigate('Promo', { id: action.promoId });
        return;
      case 'openGame':
        navigation.navigate('Game', { id: action.gameId });
        return;
    }
  };

  if (!scene) return null;

  return (
    <View style={styles.container}>
      <SceneView scene={scene} palette={palette} active={isFocused} onAction={handleAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16 },
});
```

> `navigation.navigate(action.route, …)` зависи от типизацията на навигацията ви — направете mapping от route към typed screen.

В FlatList/FlashList подавайте `active` от `onViewableItemsChanged`, за да спират анимациите извън екрана. App background се хваща вътрешно (`AppState`).

**Изисквания**
- New Architecture + RN 0.76+ (`boxShadow`, `borderRadius: '50%'`). Тествано типово с RN 0.87.
- Reanimated 4 + `react-native-worklets` (Babel плъгина `react-native-worklets/plugin`).
- `expo-image` → в bare workflow: `npx install-expo-modules@latest`.
- Ползва се `.get()/.set()` на shared values — съвместимо с React Compiler.

## Web (React DOM)

```tsx
import { SceneView } from '@chiko111/scene-kit-web';

<SceneView scene={scene} palette={palette} fontFamily="Inter, sans-serif" onAction={handleAction} />
```

- CSS се инжектира веднъж през React 19 `<style href precedence>` — няма отделен CSS файл.
- Size-ове с `cqw` (container query units) → всички модерни браузъри.
- Автоматична пауза извън екрана (IntersectionObserver) и `prefers-reduced-motion`.

## Бекофис редактор

```tsx
import { parseScene, type Scene } from '@chiko111/scene-kit-core';
import { SceneEditor } from '@chiko111/scene-kit-editor';

<div style={{ height: '100vh' }}>
  <SceneEditor
    initialScene={existing /* вече минала през parseScene */}
    palette={palette}
    fontFamily="Inter, sans-serif"
    routes={['Home', 'Casino', 'LiveCasino', 'Sport', 'Promotions']}
    maxUploadBytes={2 * 1024 * 1024}
    onUpload={async (file) => {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/scene-assets', { method: 'POST', body });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { url } = (await res.json()) as { url: string };
      return url; // https://cdn…
    }}
    onSave={async (scene: Scene) => {
      const res = await fetch(`/api/scenes/${scene.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scene),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }}
  />
</div>
```

- Превюто в редактора е **същият** `@chiko111/scene-kit-web` рендерер → WYSIWYG.
- Drag за местене, ъгли за resize (Shift пази пропорцията), стрелки за nudge (Shift = 1%).
- Undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z): drag или едно писане в поле = една стъпка.
- Delete, Ctrl/Cmd+D (duplicate), Esc (deselect).
- Невалидни стойности никога не влизат в сцената; Save валидира отново.
- Темата на редактора се сменя чрез `--ske-*` CSS променливите.

**Сървърът също трябва да валидира**: `parseScene(body)` в API-то преди запис. Клиентската валидация не е защита.

## Backend (Spring Boot / Java)

Готов пример с endpoint-и, валидация, storage и тестове: [`examples/spring-boot`](examples/spring-boot). Java валидира срещу `scene.schema.json`, която се генерира от същата схема и идва в `@chiko111/scene-kit-core`. За Node backend ползвай `validateScene()` от core.

## Защо е безопасно за App Store / Google Play

JSON-ът е декларативни данни (позиции, текстове, токени, whitelisted actions) — не изпълним код. Няма `eval`, изрази, HTML или произволни URL-и. Изображенията са само `https://`. Неизвестни ефекти/слоеве се пропускат, непозната `version` връща `ok: false` → показвате fallback.

## Ограничения (съзнателни)

- Resize с ъглите игнорира ротацията (ротираният слой се оразмерява в неротирано пространство). Ротацията се задава от полето.
- Анимирано GIF/WebP в браузъра не може да се паузира от `<img>` — паузират се само ефектите. В RN `expo-image` го паузира (`autoplay`).
- Сянката на изображение е правоъгълна (box-shadow) и на двете платформи, за да изглеждат еднакво. За PNG/WebP с прозрачност — "запечете" сянката в самия asset.
- Шрифтът се подава с `fontFamily` на всяко място — същия в редактора, web и app, иначе текстът ще се пренася различно.

## Разработка

```bash
npm install
npm run typecheck   # и четирите пакета
npm test            # unit тестове
npm run build       # tsup → packages/*/dist
npm run check       # всичко горе наведнъж (същото като CI)
npm run demo        # https://localhost:5173 — редактор + "app preview" (ползва src/, без build)
npm run e2e         # Playwright тест срещу пуснатото demo
```

В monorepo-то пакетите се резолват към `src/` чрез export condition `scene-kit-source` (tsconfig `customConditions`, Vite/Vitest `resolve.conditions`). Публикуваните пакети съдържат само `dist/`.

## Release

1. За всяка промяна: `npm run changeset` → избираш patch/minor/major и описание.
2. Push в `main` → GitHub Action отваря PR **"chore: version packages"** (версии + CHANGELOG).
3. Merge на този PR → Action-ът build-ва и публикува в npm с provenance.

Еднократна настройка (вече направена):
- **Trusted publishing** за всеки пакет в npm: package → Settings → Trusted Publisher → GitHub Actions, user `chiko111`, repo `scene-kit`, workflow `release.yml`. Без токени, нищо не изтича.
- GitHub repo → Settings → Actions → General → Workflow permissions: **Read and write** + **Allow GitHub Actions to create and approve pull requests**.

Публикуваните версии остават в npm завинаги — trusted publishing е нужен само за публикуване на нови версии.
