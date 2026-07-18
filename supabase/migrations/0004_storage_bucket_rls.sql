-- ============================================================
-- BioForo — Garantía de bucket "sightings" + RLS de Storage
-- Corrige el error 400 al subir imágenes.
-- Ejecuta en el SQL Editor de Supabase (después de 0001 y 0002).
-- ============================================================

-- 1) Asegura que el bucket exista y sea PÚBLICO.
insert into storage.buckets (id, name, public)
values ('sightings', 'sightings', true)
on conflict (id) do nothing;

update storage.buckets
  set public = true
  where id = 'sightings';

-- 2) Habilita RLS sobre los objetos de storage (Supabase lo requiere para
--    que las policies de abajo se apliquen de forma predecible).
alter table storage.objects enable row level security;

-- 3) Policies de Storage para el bucket "sightings".
--    INSERT: cualquier usuario autenticado puede subir.
drop policy if exists "Sightings upload autenticado" on storage.objects;
create policy "Sightings upload autenticado"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'sightings');

--    SELECT: lectura pública (bucket público).
drop policy if exists "Sightings lectura pública" on storage.objects;
create policy "Sightings lectura pública"
  on storage.objects
  for select
  to public
  using (bucket_id = 'sightings');

--    UPDATE/DELETE: solo el dueño (el usuario autenticado que subió).
drop policy if exists "Sightings update autenticado" on storage.objects;
create policy "Sightings update autenticado"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'sightings');

drop policy if exists "Sightings delete autenticado" on storage.objects;
create policy "Sightings delete autenticado"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'sightings');
