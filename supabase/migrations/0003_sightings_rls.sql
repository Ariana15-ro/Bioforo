-- ============================================================
-- BioForo — RLS policies para la tabla "sightings"
-- Soluciona "new row violates row-level security policy" al publicar.
-- Habilita RLS y define políticas seguras (por usuario / lectura pública).
-- Ejecuta en el SQL Editor de Supabase.
-- ============================================================

-- Activa Row Level Security (la app ya envía user_id en los inserts).
alter table public.sightings enable row level security;

-- Lectura: cualquiera (incluido anónimo) puede ver los avistamientos.
drop policy if exists "Sightings lectura pública" on public.sightings;
create policy "Sightings lectura pública"
  on public.sightings
  for select
  to public
  using (true);

-- Inserción: solo el propio usuario autenticado, y user_id debe coincidir.
drop policy if exists "Sightings insert propio" on public.sightings;
create policy "Sightings insert propio"
  on public.sightings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Actualización: solo el dueño del avistamiento.
drop policy if exists "Sightings update propio" on public.sightings;
create policy "Sightings update propio"
  on public.sightings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Eliminación: solo el dueño del avistamiento.
drop policy if exists "Sightings delete propio" on public.sightings;
create policy "Sightings delete propio"
  on public.sightings
  for delete
  to authenticated
  using (auth.uid() = user_id);
