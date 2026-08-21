# BioForo

**BioForo** es una red social educativa de avistamientos de biodiversidad, desarrollada como proyecto formativo del SENA (Técnico en Programación). Permite registrar, explorar y compartir registros de flora, fauna, aves, insectos y ecosistemas, integrando fotografía, geolocalización, comunidad y aprendizaje colaborativo.

Demo: [https://bioforo.vercel.app](https://bioforo.vercel.app)

## Características

- Autenticación de usuarios (registro, login, sesión)
- Feed público de avistamientos con búsqueda y filtros por categoría
- Publicación de avistamientos con foto, GPS, categoría y descripción
- Mapa interactivo con clustering de marcadores y popups informativos
- Likes y comentarios en avistamientos
- Notificaciones en tiempo real (likes y comentarios)
- Perfil editable con avatar, nombre, programa académico, bio y ubicación
- Edición y eliminación de avistamientos propios
- Contadores automáticos de likes y comentarios por avistamiento
- Seguridad RLS en Supabase y políticas de Storage controladas

## Stack tecnológico

| Área | Tecnología |
|------|------------|
| Frontend | React 19, Vite, TypeScript |
| Estilos | Tailwind CSS |
| Estado | Zustand |
| Backend | Supabase (Auth, PostgreSQL, Storage, Realtime) |
| Mapas | Leaflet + react-leaflet + markercluster |
| Formularios | react-hook-form + Zod |
| UI | Componentes propios (dark forest) |

## Requisitos

- Node.js >= 18
- Cuenta de Supabase (proyecto configurado)
- Variables de entorno del proyecto

## Configuración

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Ariana15-ro/bioforo.git
   cd bioforo
   ```

2. Instala dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env` en la raíz (usa `.env.example` como referencia):
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```

4. Aplica las migraciones de base de datos desde el SQL Editor de Supabase, en orden:
   - `supabase/migrations/0001_create_sightings.sql`
   - `supabase/migrations/0002_storage_policies.sql`
   - `supabase/migrations/0003_sightings_rls.sql`
   - `supabase/migrations/0004_storage_bucket_rls.sql`
   - `supabase/migrations/0005_comments_likes.sql`
   - `supabase/migrations/0006_reparar_rls_0001.sql`
   - `supabase/migrations/0007_triggers_contadores.sql`
   - `supabase/migrations/0008_tabla_profiles.sql`
   - `supabase/migrations/0009_notifications.sql`
   - `supabase/migrations/0010_harden_rls.sql`

5. Configura el bucket `sightings` en Storage:
   - Lectura pública
   - Escritura autenticada
   - Restricción de path a `public/` (para imágenes de avistamientos y avatares)

6. Inicia el proyecto:
   ```bash
   npm run dev
   ```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |

## Estructura del proyecto

```
src/
  features/       # Módulos de funcionalidad (auth, feed, map, publish, profile, notifications)
  components/     # Componentes compartidos (ui, common, layout, modals, map, notifications)
  lib/            # Utilidades, queries y cliente Supabase
  store/          # Estado global (Zustand)
  types/          # Tipos TypeScript
supabase/
  migrations/     # Migraciones SQL ordenadas
```

## Modelo de datos (resumen)

- `sightings`: avistamientos publicados
- `profiles`: perfil extendido de usuarios (1:1 con auth.users)
- `likes`: likes por avistamiento y usuario
- `comments`: comentarios por avistamiento
- `notifications`: notificaciones por interacciones
- Storage bucket `sightings`: imágenes de avistamientos y avatares

## Seguridad

- Row Level Security (RLS) activo en todas las tablas del dominio (migración `0010_harden_rls.sql`).
- Políticas de lectura pública para contenido visible y escritura restringida por usuario autenticado.
- Storage con lectura pública y escritura autenticada bajo path `public/`.

## Autor / Créditos

Proyecto formativo SENA – Técnico en Programación  
Desarrollado por Ariana / Ariana15-ro
