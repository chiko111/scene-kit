# scene-kit — инсталиране и настройка

Анимирани банери и блокове, които маркетингът подрежда в бекофиса, а приложението (React Native и web) ги показва без нов release.

```
Бекофис (редактор) ──save──▶ Backend (2 endpoint-а) ◀──load── Приложение (RN / web)
```

---

## 1. Какво трябва от Backend-а

**Само два endpoint-а.** Backend-ът не валидира и не разбира съдържанието. Той пази JSON и го връща.

| Endpoint | Какво прави | Защита |
|---|---|---|
| `PUT /scenes/{id}` | записва тялото на заявката (JSON) под това `id` | **само за логнати в бекофиса** |
| `GET /scenes/{id}` | връща записания JSON (или 404) | публичен |

- `id` е `A–Z a–z 0–9 _ -`, до 64 символа. Да се откаже всичко друго (защита от path traversal).
- Препоръчително: `Cache-Control: max-age=60` на GET-а. Промените стигат до приложенията до 1 минута.
- Грешка при запис: статус ≠ 2xx и по желание `{"error": "текст"}`, който редакторът показва.

**По желание, трети endpoint за качване на снимки** от редактора:
`POST /scene-assets` (multipart, поле `file`) → `{"url": "https://…"}`. Без него снимките се добавят с поставяне на URL от вашия CDN.

> Ако backend-ът е Spring Boot и искате готов код с валидация, история на версиите и upload: `examples/spring-boot`.

---

## 2. Бекофис (React web)

```bash
npm i @chiko111/scene-kit-editor @chiko111/scene-kit-web @chiko111/scene-kit-core
```

Изисква React 19.2+.

```tsx
// sceneApi.ts — едно място с URL-ите
import { createSceneClient } from '@chiko111/scene-kit-core';

export const sceneApi = createSceneClient({
  loadUrl: (id) => `https://api.example.com/scenes/${id}`,
  saveUrl: (id) => `https://api.example.com/scenes/${id}`,
  uploadUrl: 'https://api.example.com/scene-assets', // по желание
  headers: async () => ({ Authorization: `Bearer ${await getToken()}` }), // или credentials: 'include'
});
```

```tsx
// ScenePage.tsx — страница в бекофиса: /scenes/:id
import { Suspense, use } from 'react';
import { SceneEditor } from '@chiko111/scene-kit-editor';
import { sceneApi } from './sceneApi';
import { palette, fonts, FONT } from './sceneTheme';

function Editor({ id }: { id: string }) {
  const existing = use(sceneApi.loadScene(id)); // null → нова празна сцена
  return (
    <div style={{ height: '100vh' }}>
      <SceneEditor
        key={id}
        initialScene={existing ?? undefined}
        palette={palette}
        fonts={fonts}
        fontFamily={FONT}
        routes={['Home', 'Casino', 'LiveCasino', 'Sport', 'Promotions']}
        onSave={sceneApi.saveScene}
        onUpload={sceneApi.uploadAsset}
      />
    </div>
  );
}

export function ScenePage({ id }: { id: string }) {
  return (
    <Suspense fallback={null}>
      <Editor id={id} />
    </Suspense>
  );
}
```

**Нова сцена:** в Properties, когато нищо не е избрано → поле **Scene id** → напр. `home_1` → **Save** (таб JSON).

---

## 3. Тема: цветове и шрифтове (общи за всички)

Сцените не пазят hex цветове и имена на шрифтове, а **ключове**. Всяко приложение подава своите стойности, затова е най-добре да е един общ файл.

```ts
// sceneTheme.ts
import type { FontMap, Palette } from '@chiko111/scene-kit-core';
import { Colors } from '@/constants/Colors';

export const palette: Palette = {
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

// ключ (пази се в сцената) → шрифт.
// RN: името на bundle-натия шрифт. Web/бекофис: CSS font-family (заредена на страницата).
export const fonts: FontMap = {
  heading: 'Montserrat-Bold',
  body: 'Inter-Regular',
};

export const FONT = 'Inter-Regular'; // шрифт по подразбиране
```

Непознат ключ води до шрифта по подразбиране, без грешка.

---

## 4. React Native приложение

```bash
npm i @chiko111/scene-kit-native @chiko111/scene-kit-core react-native-reanimated react-native-worklets expo-image
npx install-expo-modules@latest   # само в bare проект без Expo modules
cd ios && pod install
```

- React Native 0.81+ с **New Architecture**.
- `babel.config.js` → плъгин `'react-native-worklets/plugin'` (последен в списъка).

```tsx
// SceneSlot.tsx
import { use } from 'react';
import { SceneView } from '@chiko111/scene-kit-native';
import type { SceneAction } from '@chiko111/scene-kit-core';
import { sceneApi } from './sceneApi'; // само loadUrl е нужен в приложението
import { palette, fonts, FONT } from './sceneTheme';

type Props = { id: string; active?: boolean; maxHeight?: number };

export function SceneSlot({ id, active, maxHeight }: Props) {
  const scene = use(sceneApi.loadScene(id));
  if (!scene) return null; // няма сцена / невалидна → мястото остава празно

  const handleAction = (action: SceneAction) => {
    switch (action.type) {
      case 'navigate': /* navigation.navigate(action.route, action.params) — само позволени екрани */ return;
      case 'openPromo': /* … action.promoId */ return;
      case 'openGame': /* … action.gameId */ return;
    }
  };

  return (
    <SceneView
      scene={scene}
      palette={palette}
      fonts={fonts}
      fontFamily={FONT}
      active={active}
      maxHeight={maxHeight}
      onAction={handleAction}
    />
  );
}
```

```tsx
// На екрана: всеки слот помни своето id
<Suspense fallback={null}><SceneSlot id="home_1" /></Suspense>
<Suspense fallback={null}><SceneSlot id="home_2" maxHeight={200} /></Suspense>
```

Във FlatList подайте `active` от `onViewableItemsChanged`, за да спират анимациите извън екрана. При app background спират автоматично.

---

## 5. Web приложение

```bash
npm i @chiko111/scene-kit-web @chiko111/scene-kit-core
```

Същото като RN, само `import { SceneView } from '@chiko111/scene-kit-web'`. Анимациите спират автоматично извън екрана.

---

## 6. Размер на сцената

| Prop | Резултат |
|---|---|
| *(нищо)* | цялата ширина на слота, височина по пропорцията |
| `maxWidth={600}` | не по-широка от 600, центрирана |
| `maxHeight={180}` | не по-висока от 180, ширината се намалява пропорционално |
| `fit="contain"` | вписва се в слот с фиксирани ширина и височина |

Сцената никога не се изкривява. Форматът ѝ (16:9, 1:1…) се избира в бекофиса и трябва да пасва на слота.

---

## 7. Какво може редакторът

- **Слоеве:** снимка (вкл. анимирано WebP/GIF), текст (шрифт, размер, тегло, цвят, подравняване), бутон, форма.
- **Ефекти** (всички с избор на цветове, между които се редуват):
  - Pulse: пулсира;
  - Pulsing outline: вълна около елемента;
  - Glow: сияние, преливащо между цветовете (при текст свети около буквите);
  - Blinking edge: рамката мига или прелива между цветовете;
  - Running border light: светлини обикалят рамката, по една на цвят;
  - Float: плава нагоре-надолу;
  - Fade in: плавно появяване.
- **Сянка** с цвят, бутони с позволени действия, undo/redo, import/export на JSON.

Всички анимации са само с opacity/transform (не натоварват), спират извън екрана и уважават "Reduce motion" на устройството.

---

## 8. Обновяване

Всички `@chiko111/scene-kit-*` пакети са с **една и съща версия**. Обновявайте ги заедно навсякъде:

```bash
npm i @chiko111/scene-kit-core@latest @chiko111/scene-kit-native@latest   # и т.н.
```

Нови полета в сцените са винаги по желание. Стари приложения показват новите сцени без непознатите ефекти, вместо да се чупят.
