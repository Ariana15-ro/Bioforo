-- ============================================================
-- BioForo — tabla de avistamientos + bucket de imágenes
-- Ejecuta este script en el SQL Editor de Supabase.
-- ============================================================

-- Tabla de avistamientos
create table if not exists public.sightings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete cascade,
  species_name    text not null,
  scientific_name text,
  category        text,
  description     text,
  location        text,
  image_url       text,
  latitude        double precision,
  longitude       double precision,
  created_at      timestamptz not null default now()
);

create index if not exists sightings_created_at_idx
  on public.sightings (created_at desc);
create index if not exists sightings_category_idx
  on public.sightings (category);

-- Por si la tabla ya existía sin estas columnas, las agregamos de forma segura.
alter table public.sightings
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- RLS desactivado por ahora (solo para pruebas).
-- Actívalo más adelante con políticas adecuadas.
alter table public.sightings disable row level security;

-- Bucket de Storage para las imágenes (público).
insert into storage.buckets (id, name, public)
values ('sightings', 'sightings', true)
on conflict (id) do nothing;
