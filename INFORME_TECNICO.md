# Informe Técnico — Proyecto BioForo

**Versión del informe:** 2026-08-21
**Estado:** MVP funcional conectado a Supabase (RLS activo, PWA instalable)
**Lenguaje de UI:** Español (es-CO / es genérico)
**Repositorio:** `bioforo` (raíz: `C:\Users\sedgu\Documents\GitHub\Bioforo`)

---

## 1. Visión general del producto

**BioForo** es una aplicación web móvil-first (PWA) para **registrar, explorar y compartir avistamientos de biodiversidad** (flora, fauna, aves, insectos y ecosistemas) dentro de una comunidad. Los usuarios pueden publicar especies con foto, ubicación GPS y categoría; visualizarlas en un feed y en un mapa interactivo con clustering; dar likes y comentar; recibir notificaciones en tiempo real; y gestionar su perfil editable con avatar.

El enfoque de diseño es **dark forest** (verde hoja / bosque oscuro), mobile-first con marco tipo teléfono en pantallas grandes y sidebar en desktop.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión | Notas |
|------|-----------|---------|-------|
| Lenguaje | TypeScript | ~6.0.2 | `strict`-ish, `noUnusedLocals/Parameters` |
| UI framework | React | ^19.2.0 | Hooks, sin clases de componentes |
| Build/dev | Vite | ^8.1.1 | `@/` alias → `src/` |
| Routing | react-router-dom | ^7.18.1 | `createBrowserRouter` (data router) |
| Estilos | TailwindCSS | ^3.4.19 | Tema custom `bio`/`forest`, `darkMode: "class"` |
| PostCSS | postcss + autoprefixer | 8.5 / 10.5 | Pipeline estándar |
| Backend | Supabase (cliente JS) | ^2.110.2 | Auth + Postgres + Storage + Realtime |
| Estado global | Zustand | ^5.0.14 | Stores: `authStore`, `notificationsStore`, `sightingsStore` |
| Formularios | react-hook-form | ^7.81.0 | + `@hookform/resolvers` |
| Validación | Zod | ^4.4.3 | Esquemas login/register/publish |
| Mapas | Leaflet + react-leaflet + markercluster | 1.9.4 / ^5.0.0 / ^1.5.3 | Clustering, popups, geolocalización |
| Fechas | date-fns | ^4.4.0 | Locale `es` (relativo "hace X") |
| Iconos | lucide-react | ^1.23.0 | Íconos SVG |
| Toasts | react-hot-toast | ^2.6.0 | Toaster global en `AppLayout` |
| PWA | vite-plugin-pwa | ^1.3.0 | Service worker + manifest |

**Scripts npm:** `dev` (vite), `build` (`tsc && vite build`), `preview` (vite preview).

---

## 3. Arquitectura y estructura de carpetas

```
src/
├── main.tsx                 # Bootstrap: StrictMode + Router
├── index.css                # Tailwind layers + tema forest base + scrollbar utils
├── vite-env.d.ts            # Tipado de env VITE_*
├── app/
│   ├── providers.tsx        # Wrapper de providers (passthrough)
│   └── router.tsx           # Definición de rutas + ProtectedRoute + ProfileRedirect
├── types/
│   └── index.ts             # Tipos de dominio: User, Sighting, Category, TabKey
├── lib/
│   ├── supabase.ts          # Cliente singleton Supabase
│   ├── supabaseQueries.ts   # Queries de dominio (feed, comments, likes, notifications, profile)
│   ├── profileQueries.ts    # Queries específicas de perfil (fetchMyProfile, fetchSightingsByUser)
│   ├── badgeUtils.ts        # Cálculo de badges dinámicos
│   └── utils.ts             # `cn()` helper de clases
├── store/
│   ├── authStore.ts         # Auth con Supabase (session, login, register, logout, setCurrentUser)
│   ├── notificationsStore.ts # Notificaciones persistentes + realtime + unreadCount
│   └── sightingsStore.ts    # Cache compartida de sightings, paginación, modal de detalle
├── components/
│   ├── common/              # Avatar, Logo, Modal, SpeciesImage, Spinner, Skeleton
│   ├── layout/              # AppLayout, BottomNav, Sidebar, tabs
│   ├── map/                 # BiodiversityMap (Leaflet + clustering + popups + near-me)
│   ├── modals/              # PostDetailModal (likes, comments, edit, delete)
│   ├── notifications/       # NotificationBell, NotificationItem, NotificationsRealtimeProvider
│   └── ui/                  # Button, Card, TextField (primitivos)
└── features/
    ├── auth/                # AuthLayout, LoginPage, RegisterPage
    ├── feed/                # FeedPage (inicio, feed, búsqueda, infinite scroll, realtime)
    ├── map/                 # MapPage (filtros, geolocalización)
    ├── publish/             # PublishPage (subida imagen + insert Supabase + GPS)
    ├── notifications/       # NotificationsPage (lista, badge, mark-all-read)
    └── profile/             # ProfilePage (edición, avatar, badges) + PublicProfilePage

supabase/
└── migrations/
    ├── 0001_create_sightings.sql
    ├── 0002_storage_policies.sql
    ├── 0003_sightings_rls.sql
    ├── 0004_storage_bucket_rls.sql
    ├── 0005_comments_likes.sql
    ├── 0006_reparar_rls_0001.sql
    ├── 0007_triggers_contadores.sql
    ├── 0008_tabla_profiles.sql
    ├── 0009_notifications.sql
    └── 0010_harden_rls.sql

public/
├── logo.png                 # Logo oficial del proyecto (~3.2 MB)
├── icon-192.png             # Icono PWA 192x192 (generado desde logo.png)
├── icon-512.png             # Icono PWA 512x512 (generado desde logo.png)
├── manifest.json            # Manifest PWA actualizado
└── (sin icon.svg ni Diseño sin título.png; se usa logo.png como fuente única)

index.html, vite.config.ts, tailwind.config.js, postcss.config.js, tsconfig.json, .env.example
```

**Patrón de carpetas:** `features/` por dominio, `components/common` y `components/ui` como biblioteca compartida, `lib/` para servicios y queries, `store/` para estado Zustand, `app/` para wiring de router/providers.

---

## 4. Sistema de enrutamiento

Router basado en `createBrowserRouter` (`src/app/router.tsx`):

| Ruta | Elemento | Protegida | Descripción |
|------|----------|-----------|-------------|
| `/login` | `LoginPage` | No | Inicio de sesión |
| `/register` | `RegisterPage` | No | Registro de cuenta |
| `/` (index) | `FeedPage` (dentro `AppLayout`) | Sí | Inicio / Feed |
| `/map` | `MapPage` | Sí | Mapa de avistamientos |
| `/publish` | `PublishPage` | Sí | Publicar avistamiento |
| `/notifications` | `NotificationsPage` | Sí | Notificaciones |
| `/profile` | `ProfilePage` | Sí | Perfil propio (edición) |
| `/profile/:userId` | `ProfileRedirect` → `PublicProfilePage` | Sí | Perfil público de otro usuario |
| `*` | Redirect → `/` | — | Catch-all |

- **`ProtectedRoute`**: lee `isAuthenticated` y `loading` del `authStore`. Mientras `loading` es true devuelve `null`. Si no autenticado → `<Navigate to="/login">`.
- **`ProfileRedirect`**: si `:userId` coincide con el usuario autenticado, redirige a `/profile`; si no, muestra `PublicProfilePage`.
- **`AppLayout`** envuelve las rutas protegidas y renderiza `Sidebar` (desktop `md+`), `<Outlet/>`, `BottomNav` (móvil), `NotificationBell` y `<Toaster>` de react-hot-toast.
- Las pantallas de auth viven fuera del shell.

---

## 5. Modelo de datos / Tipos de dominio (`src/types/index.ts`)

```ts
interface User { id; username; displayName; avatarUrl?; bio? }
type Category = "Flora" | "Fauna" | "Aves" | "Insectos" | "Ecosistemas"
interface Sighting {
  id; species; commonName; description; imageUrl; location;
  category: Category; latitude; longitude; createdAt(ISO);
  likes; comments; author: User
}
type TabKey = "feed" | "map" | "publish" | "notifications" | "profile"
```

**Tablas principales en Supabase:**
- `public.sightings`: `id uuid PK`, `user_id uuid → auth.users`, `species_name`, `scientific_name`, `category`, `description`, `location`, `image_url`, `latitude`, `longitude`, `created_at timestamptz`, `likes_count integer`, `comments_count integer`.
- `public.profiles`: `id uuid PK → auth.users`, `email`, `full_name`, `academic_program`, `avatar_url`, `bio`, `location`, `created_at`, `updated_at`.
- `public.comments`: `id uuid PK`, `sighting_id → sightings`, `user_id → auth.users`, `comment text`, `created_at`.
- `public.likes`: PK compuesta (`sighting_id`, `user_id`), `created_at`.
- `public.notifications`: `id uuid PK`, `user_id → auth.users`, `actor_id → auth.users`, `type text`, `sighting_id → sightings`, `comment_text`, `read boolean`, `created_at`.

**Storage:** bucket `sightings` con rutas bajo `public/` (imágenes de avistamientos y avatares).

**RLS:** activo en todas las tablas del dominio (migración `0010_harden_rls.sql`).

---

## 6. Backend y servicios (Supabase)

### 6.1 Cliente (`src/lib/supabase.ts`)
Singleton `createClient` con `persistSession` y `autoRefreshToken`. Lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Si faltan, arranca con placeholders y avisa por consola.

### 6.2 Autenticación (`src/store/authStore.ts`)
Zustand store que:
- Hidrata sesión inicial vía `supabase.auth.getSession()`.
- Suscribe `supabase.auth.onAuthStateChange`.
- `register(input)`: `signUp` con metadatos `full_name`, `academic_program`; maneja confirmación por email.
- `login(email, password)`: `signInWithPassword`.
- `logout()`: `signOut`.
- `setCurrentUser`: actualiza el perfil en memoria tras edición/avatar.

### 6.3 Operaciones de datos (`src/lib/supabaseQueries.ts` + `src/lib/profileQueries.ts`)
- **Feed**: `fetchSightings` con paginación, filtros por categoría y búsqueda, y join explícito a `profiles` para resolver autor y avatar.
- **Mapa**: mismas queries; `MapPage` filtra por coordenadas válidas y categoría.
- **Publicar**: `createSighting` + subida a Storage (`public/<uuid>.<ext>`) + insert real.
- **Likes**: `toggleLike` con inserción/borrado y contador en `sightings.likes_count`.
- **Comments**: `addComment` + contador en `sightings.comments_count` + inserción de notificación al dueño.
- **Notifications**: `fetchNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead` contra tabla real.
- **Perfil**: `fetchProfile`, `updateProfile`, `fetchSightingsByUser` desde tablas reales.

### 6.4 Realtime
- **Feed**: suscripción a INSERT en `sightings` para refrescar el feed automáticamente.
- **Notificaciones**: `NotificationsRealtimeProvider` suscrito a INSERT en `notifications` filtrado por `user_id`.
- **PostDetailModal**: suscripciones a INSERT en `likes` y `comments` del avistamiento abierto.

### 6.5 Triggers y contadores
- `handle_new_user`: crea/actualiza `profiles` automáticamente al registrarse.
- `increment_likes_count` / `increment_comments_count`: actualizan contadores en `sightings` con `SECURITY DEFINER`.

---

## 7. Características funcionales por pantalla

### 7.1 Auth (`features/auth`)
- **LoginPage**: formulario Zod (email, password ≥6). Integra con Supabase. Error inline. Navega a `/` en éxito.
- **RegisterPage**: fullName, academicProgram, email, password, confirmPassword. Registra en Supabase, navega a `/`.
- **AuthLayout**: fondo de bosque con overlay gradiente; desktop split-view.

### 7.2 Feed / Inicio (`features/feed/FeedPage`)
- Carga avistamientos desde Supabase con paginación (`limit=12`, infinite scroll).
- Búsqueda con **debounce 300ms** (`species_name`, `description`, `location`).
- **Chips de categoría** scrollables.
- Grid responsivo (1→3 columnas). Skeletons y empty states con CTA.
- **Modal de detalle** (`PostDetailModal`): imagen, datos, autor clickeable → perfil público, likes, comentarios, **editar** (dueño), **eliminar** (dueño), confirmación.
- **Navegación a perfil público** desde tarjetas de feed y modal (`/profile/:userId`).

### 7.3 Mapa (`features/map/MapPage`)
- **Leaflet** + `react-leaflet` + `leaflet.markercluster`.
- Pines SVG verdes personalizados (`L.divIcon`).
- **Clustering**: agrupa marcadores cercanos; se separan al hacer zoom.
- **Popups**: miniatura, nombre común, categoría, lugar y botón **Ver detalle** → abre `PostDetailModal`.
- Filtros por búsqueda + categoría.
- Botón **"Cerca de mí"**: geolocalización real + filtro Haversine (~50 km) + fallback a Bogotá con toast.

### 7.4 Publicar (`features/publish/PublishPage`)
- Formulario Zod: imagen obligatoria, nombre común, nombre científico (opcional), categoría, descripción (≥10), lugar.
- Subida de foto a Supabase Storage con preview y fallback local.
- Captura GPS real con fallback.
- Insert en `sightings` y toast de éxito → navega a `/`.

### 7.5 Notificaciones (`features/notifications/NotificationsPage`)
- Lista real desde tabla `notifications` con avatar, ícono por tipo, tiempo relativo.
- Marca todas como leídas al montar (limpia badge).
- **Realtime**: `NotificationsRealtimeProvider` escucha INSERT filtrado por `user_id` y actualiza el store al instante.

### 7.6 Perfil
- **Perfil propio** (`ProfilePage`): edición de nombre, programa, avatar (subida de imagen a Storage), bio, ubicación. Stats y **badges dinámicos** (Explorador, Fotógrafo, Naturalista). Galería de avistamientos propios con CTA a publicar.
- **Perfil público** (`PublicProfilePage`): lectura de perfil y galería de avistamientos de otro usuario. Stats y badges calculados dinámicamente. Empty state neutro.

---

## 8. Componentes reutilizables

**`common/`**
- `Avatar` — imagen con fallback a iniciales (`onError`).
- `Logo` — imagen oficial `/logo.png` + texto "BioForo".
- `Modal` — overlay accesible, cierra con Escape/backdrop, bottom-sheet en móvil.
- `SpeciesImage` — `<img>` lazy con fallback `ImageOff` si falla.
- `Spinner` / `Skeleton` — estados de carga.

**`ui/`**
- `Button` — variantes `primary` / `ghost`, rounded-full.
- `Card` — superficie redondeada forest.
- `TextField` — input labelizado con error inline y `aria-invalid`.

**`layout/`**
- `AppLayout` — shell (sidebar + outlet + bottomnav + notification bell + toaster).
- `BottomNav` — barra inferior fija móvil, 5 tabs, centro "Publicar" elevado, badge no-leídas.
- `Sidebar` — navegación vertical desktop, "Publicar" como botón verde.
- `tabs.ts` — definición única `TABS` compartida.

**`map/`**
- `BiodiversityMap` — contenedor Leaflet con clustering, popups, controlador de ubicación y filtro "Cerca de mí".

**`notifications/`**
- `NotificationBell` — campana con badge y dropdown.
- `NotificationItem` — fila de notificación.
- `NotificationsRealtimeProvider` — suscripción Realtime a INSERT en `notifications`.

**`modals/`**
- `PostDetailModal` — detalle de avistamiento con likes, comments, edición, eliminación y realtime.

---

## 9. Sistema de diseño (Tailwind)

- **Colores custom**: `bio` (verde hoja, `500=#22c55e` primario) y `forest` (`950=#0e1710` fondo profundo).
- **Tipografía**: `Inter` (vía Google Fonts en `index.html`), font-sans.
- **Mobile-first**: base = móvil, escala con `md:/lg:`.
- **Tema**: `html class="dark"`; fondo forest con gradientes radiales "canopy".
- Utilidad `.no-scrollbar` para chips scrollables.
- `safe-area-inset` para bottom nav en móviles.

---

## 10. PWA / Configuración de proyecto

- `index.html`: lang `es`, `<html class="dark">`, viewport con `viewport-fit=cover`, manifest, theme-color `#0e1710`, fuente Inter, favicon `/logo.png`, apple-touch-icon `/logo.png`.
- `public/manifest.json`: nombre BioForo, `display: standalone`, `background_color` y `theme_color` `#0e1710`, iconos `icon-192.png` e `icon-512.png`.
- `vite.config.ts`: `vite-plugin-pwa` con `registerType: "autoUpdate"`, icon generado desde `public/logo.png`, runtime caching de fuentes Google.
- Build genera `dist/sw.js` + `dist/workbox-*.js` con precache del shell.
- Vite alias `@` → `src`; `tsconfig` con `paths`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noEmit`.
- `.env.example` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

---

## 11. Estado actual de desarrollo (resumen de madurez)

**Implementado y funcional:**
- Autenticación real contra Supabase (login/registro/logout).
- Feed público con infinite scroll, búsqueda, filtros, realtime y modal de detalle.
- Mapa interactivo con clustering, popups informativos, filtros y "Cerca de mí".
- Publicación de avistamientos con subida de imagen a Storage y GPS.
- Likes y comentarios reales con contadores automáticos.
- Notificaciones reales (tabla `notifications`) con realtime y badge.
- Perfil editable con avatar upload, bio, ubicación y badges dinámicos.
- Perfil público de cualquier usuario con galería clickeable.
- RLS activo en todas las tablas del dominio (migración `0010_harden_rls.sql`).
- PWA instalable (manifest + service worker).
- UI completa responsive (móvil + desktop), navegación, modales, toasts, validación de formularios.

**Código limpio:**
- Sin archivos muertos ni stubs sin usar (`mocks.ts`, `api.ts`, `useSupabaseClient.ts` eliminados).

**Deuda técnica / riesgos conocidos:**
- `.env` contiene credenciales reales de Supabase en disco. Aunque está en `.gitignore`, hay que verificar que no exista en historial de git; de existir, rotar la anon key.
- `public/logo.png` pesa ~3.2 MB y queda excluido del precache de Workbox. Conviene comprimirlo o convertirlo a WebP/AVIF.
- `npm audit` reporta 4 vulnerabilidades `high` en dependencias de producción.
- No hay tests unitarios/integración.
- No hay eslint/prettier configurado (solo `tsc` en build).
- No hay CI/CD.
- `Card.tsx` existe pero apenas se usa en la UI actual.

---

## 12. Guía rápida para otro modelo de IA

Para continuar el desarrollo, los puntos de mayor impacto son:
1. **Comprimir `public/logo.png`** y regenerar iconos PWA para reducir peso de carga.
2. **Rotar `VITE_SUPABASE_ANON_KEY`** si `.env` llegó a estar versionado; purgar del historial si aplica.
3. **Agregar `eslint` + `prettier`** para calidad de código.
4. **Configurar tests mínimos con Vitest** (auth store, queries críticas, RLS policies).
5. **Agregar CI/CD básico** (lint + typecheck + build en cada PR).

**Convenciones clave:** alias `@/` para imports; componentes en `features/<dominio>`; stores Zustand en `store/`; tipos en `types/`; helpers de UI en `components/ui` y `components/common`; validación con Zod + react-hook-form; estilos con utilidades Tailwind y paleta `bio`/`forest`; toasts con `react-hot-toast`; PWA con `vite-plugin-pwa`.
