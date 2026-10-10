# scene-kit × Spring Boot

Backend за бекофис редактора и за приложенията. Тествано на **Spring Boot 4.1** и **3.5**, Java 17+.

```
БЕКОФИС (SceneEditor)                 SPRING BOOT                          ПРИЛОЖЕНИЯ (RN / web)
onUpload(file) ── POST /api/scene-assets ─▶ проверка на файла → assets/
               ◀── { url } ───────────────
onSave(scene)  ── PUT  /api/scenes/{id} ──▶ валидация → scenes/{id}.json
initialScene   ◀─ GET  /api/scenes/{id}
                                            GET /public/scenes/{id} ◀──────── fetch → parseScene → <SceneView/>
                                            GET /public/scene-assets/{file} ◀─ изображенията в сцената
```

## Какво копираш в своя backend

1. Пакета `io.github.chiko111.scenekit` (без `SceneKitApplication`, ако вече имаш приложение). Добави `@ConfigurationPropertiesScan` или `@EnableConfigurationProperties(SceneKitProperties.class)`.
2. `src/main/resources/scene-kit/scene.schema.json`.
3. Зависимостта:
   ```xml
   <dependency>
     <groupId>com.networknt</groupId>
     <artifactId>json-schema-validator</artifactId>
     <version>3.0.8</version>
   </dependency>
   ```
4. Настройките от `application.yml` (`scene-kit.*` и `spring.servlet.multipart.*`).

`scene.schema.json` се генерира от същата схема, която ползват приложенията, и идва в npm пакета (`@chiko111/scene-kit-core/scene.schema.json`). Когато обновиш scene-kit пакетите, обнови и този файл с версията от същия release.

## Endpoint-и

| Метод | Път | За | Защита |
|---|---|---|---|
| POST | `/api/scene-assets` | Качване на снимка (multipart `file`) → `{ "url": "https://…" }` | бекофис |
| PUT | `/api/scenes/{id}` | Запис на сцена (JSON) → 204 | бекофис |
| GET | `/api/scenes/{id}` | Зареждане в редактора | бекофис |
| GET | `/api/scenes` | Списък с id-та | бекофис |
| GET | `/public/scenes/{id}` | Сцената за приложенията (ETag + кеш 60 s) | публичен |
| GET | `/public/scene-assets/{file}` | Снимките (immutable кеш, 1 година) | публичен |

Грешките винаги са `{"error": "...", "details": [...]}`. Редакторът показва `error`.

### Какво се проверява
- **Снимки**: типът се познава по съдържанието (magic bytes), не по името или Content-Type. Разрешени са само WebP/PNG/JPEG/GIF. Името е SHA-256 на съдържанието, така че URL-ът никога не се променя и може да се кешира завинаги.
- **Сцени**: JSON Schema + уникални id-та + по един ефект от тип + до 10 параметъра. Дублирани JSON ключове и непознати полета се отхвърлят. Лимит 256 KB.
- **Пътища**: id и имената на файловете минават през whitelist regex, преди да стигнат до диска (без path traversal).
- **История**: всяко записване пази копие в `scenes/_history/{id}/{timestamp}.json` (одит и rollback).

## Защита на `/api/**` (задължително)

Сложи endpoint-ите под същата защита като останалия бекофис. Пример със Spring Security:

```java
@Bean
SecurityFilterChain sceneKitSecurity(HttpSecurity http) throws Exception {
  return http
      .securityMatcher("/api/scene-assets/**", "/api/scenes/**")
      .authorizeHttpRequests(a -> a.anyRequest().hasRole("BACKOFFICE_EDITOR"))
      .cors(Customizer.withDefaults())
      .csrf(Customizer.withDefaults())   // ако бекофисът ползва cookie сесия
      .build();
}
```

Ако бекофисът е на друг домейн, задай `scene-kit.backoffice-origins`. `/public/**` е публичен по дизайн.

## Как приложенията получават сцената

Сцената е обикновен JSON на фиксиран адрес. Най-простият модел е **id = място в приложението**: `home_banner`, `casino_top`, `promo_welcome`. В бекофиса редактираш сцена `home_banner`, а приложението винаги показва последната запазена версия, до 60 секунди след Save.

```tsx
// React Native — <Suspense fallback={null}><SceneSlot id="home_banner" /></Suspense>
import { use } from 'react';
import { parseScene, type Scene } from '@chiko111/scene-kit-core';
import { SceneView } from '@chiko111/scene-kit-native';

const API = 'https://api.example.com';
const cache = new Map<string, Promise<Scene | null>>();

function loadScene(id: string): Promise<Scene | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  const promise = fetch(`${API}/public/scenes/${encodeURIComponent(id)}`)
    .then((res) => (res.ok ? res.text() : null))
    .then((text) => {
      if (text === null) return null;
      const result = parseScene(text);
      return result.ok ? result.scene : null;
    })
    .catch(() => {
      cache.delete(id);
      return null;
    });
  cache.set(id, promise);
  return promise;
}

export function SceneSlot({ id }: { id: string }) {
  const scene = use(loadScene(id));
  if (!scene) return null; // няма сцена или е невалидна → мястото просто е празно
  return <SceneView scene={scene} palette={palette} onAction={handleAction} />;
}
```

На web е същото, само с `@chiko111/scene-kit-web`.

## Production бележки

- **`public-base-url` трябва да е https.** Схемата приема само `https://` изображения. В dev ползвай HTTPS (или CDN адрес), иначе редакторът ще откаже качената снимка.
- **Няколко инстанции на backend-а**: `storage-dir` трябва да е споделен (NFS/volume) или смени `FileSystemSceneStorage` с S3/R2/GCS имплементация на `SceneStorage`.
- **CDN/nginx**: можеш да сервираш `storage-dir/scenes` и `storage-dir/assets` директно и да махнеш `PublicSceneController`. Тогава `public-base-url` е CDN адресът.

## Тестове

```bash
mvn test
```

`SceneValidatorTest` минава през същите fixtures (`valid-*` / `invalid-*`) като JS тестовете в `@chiko111/scene-kit-core`, така че Java и JS приемат и отхвърлят едно и също. Обновяване на копията в repo-то: `npm run sync:java`.
