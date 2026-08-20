-- ============================================================
-- BioForo — Endurecimiento de RLS en tablas de negocio (migración 0010)
--
-- Esta migración:
--  1) Habilita RLS en todas las tablas del dominio.
--  2) Elimina políticas viejas conflictivas.
--  3) Define políticas mínimas y seguras por tabla.
--  4) Mantiene compatibilidad con triggers y contadores existentes.
-- ============================================================

-- ============================================================
-- 1) Habilitar RLS (idempotente)
-- ============================================================
alter table public.sightings enable row level security;
alter table public.profiles enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.notifications enable row level security;

-- ============================================================
-- 2) Políticas para sightings
-- ============================================================
drop policy if exists "Sightings lectura pública" on public.sightings;
drop policy if exists "Sightings insert propio" on public.sightings;
drop policy if exists "Sightings update propio" on public.sightings;
drop policy if exists "Sightings delete propio" on public.sightings;

create policy "Sightings lectura pública"
  on public.sightings for select to public using (true);

create policy "Sightings insert propio"
  on public.sightings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Sightings update propio"
  on public.sightings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Sightings delete propio"
  on public.sightings for delete to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- 3) Políticas para profiles
-- ============================================================
drop policy if exists "Profiles lectura pública" on public.profiles;
drop policy if exists "Profiles insert propio" on public.profiles;
drop policy if exists "Profiles update propio" on public.profiles;
drop policy if exists "Profiles delete propio" on public.profiles;

create policy "Profiles lectura pública"
  on public.profiles for select to public using (true);

create policy "Profiles insert propio"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "Profiles update propio"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Profiles delete propio"
  on public.profiles for delete to authenticated
  using (auth.uid() = id);

-- ============================================================
-- 4) Políticas para comments
-- ============================================================
drop policy if exists "Comments lectura pública" on public.comments;
drop policy if exists "Comments insert autenticado" on public.comments;
drop policy if exists "Comments update propio" on public.comments;
drop policy if exists "Comments delete propio" on public.comments;

create policy "Comments lectura pública"
  on public.comments for select to public using (true);

create policy "Comments insert autenticado"
  on public.comments for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Comments update propio"
  on public.comments for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Comments delete propio"
  on public.comments for delete to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- 5) Políticas para likes
-- ============================================================
drop policy if exists "Likes lectura pública" on public.likes;
drop policy if exists "Likes insert autenticado" on public.likes;
drop policy if exists "Likes delete autenticado" on public.likes;

create policy "Likes lectura pública"
  on public.likes for select to public using (true);

create policy "Likes insert autenticado"
  on public.likes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Likes delete autenticado"
  on public.likes for delete to authenticated
  using (auth.uid() = user_id);

-- No se define policy de UPDATE para likes.

-- ============================================================
-- 6) Políticas para notifications
-- ============================================================
drop policy if exists "Notifications select own" on public.notifications;
drop policy if exists "Notifications insert own" on public.notifications;
drop policy if exists "Notifications update own" on public.notifications;

create policy "Notifications select own"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);

create policy "Notifications insert own"
  on public.notifications for insert to authenticated
  with check (auth.uid() = actor_id);

create policy "Notifications update own"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Nota sobre Storage
-- ============================================================

-- Políticas de Storage se deben configurar desde el Dashboard de Supabase
-- (Storage → sightings → Policies) porque requieren privilegios de supabase_storage_admin.
-- Políticas recomendadas:
-- SELECT: público, bucket_id = 'sightings' AND name LIKE 'public/%'
-- INSERT/UPDATE/DELETE: authenticated, bucket_id = 'sightings' AND name LIKE 'public/%'
