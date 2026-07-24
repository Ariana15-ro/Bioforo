-- ==============================================================
-- BioForo — Tabla notifications + RLS
-- Reemplaza el mock anterior y permite notificaciones persistentes.
-- ==============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  type text not null check (type in ('like','comment','nearby','follow')),
  sighting_id uuid references public.sightings (id) on delete cascade,
  comment_text text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Notifications select own" on public.notifications;
create policy "Notifications select own"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Notifications insert own" on public.notifications;
create policy "Notifications insert own"
  on public.notifications for insert
  to authenticated
  with check (auth.uid() = actor_id);

drop policy if exists "Notifications update own" on public.notifications;
create policy "Notifications update own"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
