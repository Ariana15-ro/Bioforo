-- ============================================================
-- BioForo — comments, likes y contadores de sightings
-- Ejecuta en el SQL Editor de Supabase después de 0001..0004.
-- ============================================================

-- 1) Contadores en sightings (orden descendente por created_at ya tiene índice).
alter table public.sightings
  add column if not exists likes_count integer not null default 0,
  add column if not exists comments_count integer not null default 0;

-- 2) Tabla comments.
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  sighting_id uuid not null references public.sightings (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  comment     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists comments_sighting_id_idx
  on public.comments (sighting_id, created_at);

-- 3) Tabla likes (un like por usuario por avistamiento).
create table if not exists public.likes (
  sighting_id uuid not null references public.sightings (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (sighting_id, user_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.comments enable row level security;
alter table public.likes enable row level security;

-- comments: lectura pública, escritura solo autenticados (dueño del comentario).
drop policy if exists "Comments lectura pública" on public.comments;
create policy "Comments lectura pública"
  on public.comments for select to public using (true);

drop policy if exists "Comments insert autenticado" on public.comments;
create policy "Comments insert autenticado"
  on public.comments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Comments delete propio" on public.comments;
create policy "Comments delete propio"
  on public.comments for delete to authenticated
  using (auth.uid() = user_id);

-- likes: lectura pública, upsert/delete solo autenticados (su propio user_id).
drop policy if exists "Likes lectura pública" on public.likes;
create policy "Likes lectura pública"
  on public.likes for select to public using (true);

drop policy if exists "Likes upsert autenticado" on public.likes;
create policy "Likes upsert autenticado"
  on public.likes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Likes delete autenticado" on public.likes;
create policy "Likes delete autenticado"
  on public.likes for delete to authenticated
  using (auth.uid() = user_id);
