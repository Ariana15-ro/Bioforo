-- ============================================================
-- BioForo — Storage policies para el bucket "sightings"
-- El bucket ya existe y es público (lectura libre). Aquí habilitamos
-- la SUBIDA de imágenes solo para usuarios autenticados.
-- Ejecuta este script en el SQL Editor de Supabase después de la
-- migración 0001.
-- ============================================================

-- Asegura que el bucket exista y sea público (idempotente).
insert into storage.buckets (id, name, public)
values ('sightings', 'sightings', true)
on conflict (id) do nothing;

-- Los usuarios autenticados pueden subir (INSERT) objetos en "sightings".
drop policy if exists "Sightings upload autenticado" on storage.objects;
create policy "Sightings upload autenticado"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'sightings');

-- Los usuarios autenticados pueden actualizar/sobrescribir sus objetos.
drop policy if exists "Sightings update autenticado" on storage.objects;
create policy "Sightings update autenticado"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'sightings');

-- Cualquiera (incluido anónimo) puede leer las imágenes (bucket público).
drop policy if exists "Sightings lectura pública" on storage.objects;
create policy "Sightings lectura pública"
  on storage.objects
  for select
  to public
  using (bucket_id = 'sightings');
