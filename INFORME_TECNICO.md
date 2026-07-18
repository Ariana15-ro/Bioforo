# Informe Técnico — Proyecto BioForo

**Versión del informe:** 2026-07-16
**Estado:** Desarrollo temprano / funcional con backend parcial (Supabase conectado, RLS desactivado)
**Lenguaje de UI:** Español (es-CO / es genérico)
**Repositorio:** `bioforo` (raíz: `C:\Users\sedgu\Documents\GitHub\Bioforo`)

---

## 1. Visión general del producto

**BioForo** es una aplicación web móvil-first (PWA) para **registrar, explorar y compartir avistamientos de biodiversidad** (flora, fauna, aves, insectos y ecosistemas) dentro de una comunidad. Los usuarios pueden publicar especies con foto, ubicación GPS y categoría; visualizarlas en un feed y en un mapa interactivo; recibir notificaciones; y gestionar su perfil.

El enfoque de diseño es **dark forest** (verde hoja / bosque oscuro), mobile-first con marco tipo teléfono en pantallas grandes y sidebar en desktop.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión | Notas |
|------|-----------|---------|------|
| Lenguaje | TypeScript | ~6.0.2 | `strict`-ish, `noUnusedLocals/Parameters` |
| UI framework | React | ^19.2.0 | Hooks, sin clases de componentes |
| Build/dev | Vite | ^8.1.1 | `@/` alias → `src/` |
| Routing | react-router-dom | ^7.18.1 | `createBrowserRouter` (data router) |
| Estilos | TailwindCSS | ^3.4.19 | Tema custom `bio`/`forest`, `darkMode: "class"` |
| PostCSS | postcss + autoprefixer | 8.5 / 10.5 | Pipeline estándar |
| Backend | Supabase (cliente JS) | ^2.110.2 | Auth + Postgres + Storage |
| Estado global | Zustand | ^5.0.14 | Stores: `authStore`, `notificationsStore` |
| Formularios | react-hook-form | ^7.81.0 | + `@hookform/resolvers` |
| Validación | Zod | ^4.4.3 | Esquemas login/register/publish |
| Mapas | Leaflet + react-leaflet | 1.9.4 / ^5.0.0 | `@types/leaflet` |
| Fechas | date-fns | ^4.4.0 | Locale `es` (relativo "hace X") |
| Iconos | lucide-react | ^1.23.0 | Íconos SVG |
| Toasts | sonner | ^2.0.7 | Toaster global en `AppLayout` |

**Scripts npm:** `dev` (vite), `build` (`tsc && vite build`), `preview`.

---

## 3. Arquitectura y estructura de carpetas

```
src/
├── main.tsx                 # Bootstrap: StrictMode + Providers + RouterProvider
├── index.css                # Tailwind layers + tema forest base + scrollbar utils
├── vite-env.d.ts            # Tipado de env VITE_*
├── app/
│   ├── providers.tsx        # Wrapper de providers (actualmente passthrough)
│   └── router.tsx           # Definición de rutas + ProtectedRoute
├── types/
│   └── index.ts             # Tipos de dominio: User, Sighting, Category, TabKey
├── lib/
│   ├── supabase.ts          # Cliente singleton Supabase (con degradación mock)
│   ├── api.ts               # Stub de API HTTP (apiGet)
│   ├── mocks.ts             # Datos mock de usuarios y avistamientos
│   └── utils.ts             # `cn()` helper de clases
├── hooks/
│   └── useSupabaseClient.ts # Hook que expone el cliente supabase
├── store/
│   ├── authStore.ts         # Auth con Supabase (session, login, register, logout)
│   └── notificationsStore.ts # Notificaciones mock en memoria + unreadCount
├── components/
│   ├── common/              # Avatar, Logo, Modal, SpeciesImage, Spinner
│   ├── layout/              # AppLayout, BottomNav, Sidebar, tabs
│   └── ui/                  # Button, Card, TextField (primitivos)
└── features/
    ├── auth/                # AuthLayout, LoginPage, RegisterPage
    ├── feed/                # FeedPage (inicio, feed + búsqueda + modal)
    ├── map/                 # MapPage (Leaflet + filtros + geolocalización)
    ├── publish/             # PublishPage (subida imagen + insert Supabase)
    ├── notifications/       # NotificationsPage
    └── profile/             # ProfilePage (stats, badges, galería, logout)

supabase/
└── migrations/
    └── 0001_create_sightings.sql  # Tabla `sightings` + bucket `sightings`

public/
├── icon.svg, manifest.json          # PWA
└── photo-*.jpg                      # Imágenes de respaldo/hero
index.html, vite.config.ts, tailwind.config.js, postcss.config.js, tsconfig.json, .env
```

**Patrón de carpetas:** `features/` por dominio, `components/common` y `components/ui` como biblioteca compartida, `lib/` para servicios, `store/` para estado Zustand, `app/` para wiring de router/providers.

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
| `/profile` | `ProfilePage` | Sí | Perfil de usuario |
| `*` | Redirect → `/` | — | Catch-all |

- **`ProtectedRoute`**: lee `isAuthenticated` y `loading` del `authStore`. Mientras `loading` es true devuelve `null` (previene flash). Si no autenticado → `<Navigate to="/login">`.
- **`AppLayout`** envuelve las rutas protegidas y renderiza `Sidebar` (desktop `md+`), `<Outlet/>` (contenido), `BottomNav` (móvil) y el `<Toaster>` de sonner.
- Las pantallas de auth (`/login`, `/register`) viven **fuera** del shell (sin navegación inferior).

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

**Tabla `public.sightings` (Supabase, snake_case):**
`id uuid PK`, `user_id uuid → auth.users`, `species_name`, `scientific_name`, `category`, `description`, `location`, `image_url`, `latitude double precision`, `longitude double precision`, `created_at timestamptz`.
Índices: `created_at desc`, `category`. **RLS deshabilitado** (solo pruebas).

---

## 6. Backend y servicios (Supabase)

### 6.1 Cliente (`src/lib/supabase.ts`)
Singleton `createClient` con `persistSession` y `autoRefreshToken`. Lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Si faltan, arranca con placeholders y avisa por consola (degradación graceful).

### 6.2 Autenticación (`src/store/authStore.ts`)
Zustand store que:
- Hidrata sesión inicial vía `supabase.auth.getSession()` al crear el store.
- Suscribe `supabase.auth.onAuthStateChange` para mantener `user`/`currentUser`/`isAuthenticated` sincronizados.
- `register(input)`: `signUp` con metadatos `full_name`, `academic_program`; maneja confirmación por email (`needsConfirmation`).
- `login(email, password)`: `signInWithPassword`.
- `logout()`: `signOut`.
- `currentUser` es un perfil (`RegisteredUser`: fullName, academicProgram, email, password) mapeado desde `user_metadata`.

### 6.3 Operaciones de datos
- **Feed** (`FeedPage`): `supabase.from("sightings").select("*").order("created_at", {ascending:false})` → mapea filas a `Sighting`.
- **Mapa** (`MapPage`): misma consulta; filtra por coordenadas válidas.
- **Publish** (`PublishPage`): sube imagen a Storage bucket `sightings` (`upload(path, file, {upsert:true})` → `getPublicUrl`) y hace `insert` en `sightings` con `user_id`, coords, etc. Fallback a object URL local si falla la subida.
- **Notificaciones**: 100% mock en memoria (`notificationsStore`), no hay tabla/backend.
- **Perfil**: usa `currentUser` del authStore; stats/badges/galería son **mock hardcoded**.

### 6.4 API stub (`src/lib/api.ts`)
`apiGet<T>(path)` usa `fetch` contra `VITE_API_BASE_URL ?? "/api"`. No usado actualmente (el acceso a datos pasa directo por el cliente Supabase).

---

## 7. Características funcionales por pantalla

### 7.1 Auth (`features/auth`)
- **LoginPage**: formulario con validación Zod (email, password ≥6). Integra con Supabase. Muestra error inline y navega a `/` en éxito.
- **RegisterPage**: fullName, academicProgram, email, password, confirmPassword (refinamiento de coincidencia). Registra en Supabase, navega a `/`.
- **AuthLayout**: fondo de bosque (Unsplash) con overlay gradiente; en desktop split-view (panel imagen + panel formulario).

### 7.2 Feed / Inicio (`features/feed/FeedPage`)
- Carga avistamientos desde Supabase.
- Búsqueda con **debounce 300ms** (nombre común, descripción, especie).
- **Chips de categoría** scrollables ("Todas", Flora, Fauna, Aves, Insectos, Ecosistemas).
- Grid responsivo (1→4 columnas). Skeleton `Spinner` y empty state.
- **Modal de detalle** (`common/Modal`) con imagen, datos, autor y métricas. Tiempo relativo en español (`date-fns`/es).

### 7.3 Mapa (`features/map/MapPage`)
- **Leaflet** + `react-leaflet`, tiles OpenStreetMap.
- Pines SVG verdes personalizados (`L.divIcon`).
- Filtros por búsqueda + categoría; `flyTo` al primer resultado.
- Botón **"Centrar en mi ubicación"** usa `navigator.geolocation` (fallback a punto de ejemplo en Guaviare).

### 7.4 Publicar (`features/publish/PublishPage`)
- Formulario Zod: imagen obligatoria, nombre común, nombre científico (opcional), categoría, descripción (≥10), lugar.
- Subida de foto a Supabase Storage con preview y fallback local.
- Captura GPS real con fallback.
- Insert en `sightings` y toast de éxito → navega a `/`.

### 7.5 Notificaciones (`features/notifications/NotificationsPage`)
- Lista mock (like, comment, nearby, follow) con avatar, ícono por tipo, tiempo relativo.
- Marca todas como leídas al montar (limpia badge).

### 7.6 Perfil (`features/profile/ProfilePage`)
- Datos del usuario autenticado (`currentUser`) con fallback mock.
- Stats (12/8/24), badges (Explorador/Fotógrafo/Naturalista), galería de 6 imágenes mock, botón "Editar perfil" (no implementado) y **Cerrar sesión** (logout → `/login`).

---

## 8. Componentes reutilizables

**`common/`**
- `Avatar` — imagen con fallback a iniciales (`onError`).
- `Logo` — wordmark BioForo + ícono Leaf.
- `Modal` — overlay accesible, cierra con Escape/backdrop, bottom-sheet en móvil.
- `SpeciesImage` — `<img>` lazy con fallback `ImageOff` si falla.
- `Spinner` — `Loader2` animado.

**`ui/`**
- `Button` — variantes `primary` / `ghost`, rounded-full.
- `Card` — superficie redondeada forest.
- `TextField` — input labelizado con error inline y `aria-invalid`.

**`layout/`**
- `AppLayout` — shell (sidebar + outlet + bottomnav + toaster).
- `BottomNav` — barra inferior fija móvil, 5 tabs, centro "Publicar" elevado, badge no-leídas.
- `Sidebar` — navegación vertical desktop, "Publicar" como botón verde.
- `tabs.ts` — definición única `TABS` compartida por ambas navs.

---

## 9. Sistema de diseño (Tailwind)

- **Colores custom**: `bio` (verde hoja, `500=#22c55e` primario) y `forest` (`950=#0e1710` fondo profundo).
- **Tipografía**: `Inter` (vía Google Fonts en `index.html`), font-sans.
- **Mobile-first**: `maxWidth.mobile = 28rem`; base = móvil, escala con `md:/lg:`.
- **Tema**: `html class="dark"`; fondo forest con gradientes radiales "canopy".
- Utilidad `.no-scrollbar` para chips scrollables.
- `boxShadow.nav` y `safe-area-inset` para la bottom nav en móviles.

---

## 10. PWA / Configuración de proyecto

- `index.html`: lang `es`, `<html class="dark">`, viewport con `viewport-fit=cover`, manifest, theme-color `#0e1710`, fuente Inter, root `#root`.
- `public/manifest.json`: nombre BioForo, `display: standalone`, icono `/icon.svg`.
- Vite alias `@` → `src`; `tsconfig` con `paths`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, sin emisión (`noEmit`).
- `.env` (ignorado por git) con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` ya configurados apuntando a un proyecto Supabase real.

---

## 11. Estado actual de desarrollo (resumen de madurez)

**Implementado y funcional:**
- Autenticación real contra Supabase (login/registro/logout).
- Feed y Mapa consumiendo la tabla `sightings` real.
- Publicación con subida de imagen a Storage y `insert` real.
- UI completa responsive (móvil + desktop), navegación, modales, toasts, validación de formularios.

**Mock / Pendiente de backend real:**
- Notificaciones (en memoria, sin persistencia).
- Perfil (stats, badges, galería y avatar son hardcode/mock; no hay edición de perfil).
- Geolocalización real (usa API del navegador con fallback a coordenadas de ejemplo).
- `likes`/`comments` de avistamientos siempre `0` (no hay modelo de interacciones).
- Relación autor en avistamientos devuelve "Usuario BioForo" genérico (no se hace join con tabla de perfiles).

**Deuda técnica / riesgos conocidos:**
- `supabase/migrations/0001`: **RLS deshabilitado** — cualquiera con la anon key puede leer/escribir `sightings`. Requiere políticas antes de producción.
- `api.ts` y `hooks/useSupabaseClient.ts` son stubs no usados en el flujo principal.
- `providers.tsx` es passthrough; no hay QueryClient/contexto global.
- No hay tests, ni lint configurado aparte de `tsc` en build.
- `.env` está versionado en el repo (debería estar en `.gitignore` — actualmente solo se ignora `.env.local`).
- El `Card` ui existe pero apenas se usa; el diseño usa clases inline en su lugar.

---

## 12. Guía rápida para otro modelo de IA

Para continuar el desarrollo, los puntos de mayor impacto son:
1. **Crear tabla `profiles`** (y join en Feed/Map para autor real) y **activar RLS** con políticas en `sightings`.
2. **Modelar interacciones** (`likes`, `comments`) y **notificaciones reales** (tabla + posiblemente Edge Functions/triggers).
3. **Perfil editable** (actualizar `user_metadata` o tabla `profiles`) y galería desde datos reales.
4. Reemplazar `mocks.ts` y los fallbacks por datos reales donde aplique.
5. Conectar el stub `api.ts` si se decide un backend propio además de Supabase.

**Convenciones clave:** alias `@/` para imports; componentes en `features/<dominio>`; stores Zustand en `store/`; tipos en `types/`; helpers de UI en `components/ui` y `components/common`; validación con Zod + react-hook-form; estilos con utilidades Tailwind y paleta `bio`/`forest`.
