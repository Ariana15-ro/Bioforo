-- ==============================================================
-- BioForo — Tabla profiles (1:1 con auth.users)
-- ==============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  academic_program text,
  avatar_url text,
  bio text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Lectura pública de profiles (puedes cambiarla a authenticated si prefieres).
drop policy if exists "Profiles lectura pública" on public.profiles;
create policy "Profiles lectura pública"
  on public.profiles for select
  to public using (true);

-- Inserción: solo el propio usuario autenticado.
drop policy if exists "Profiles insert propio" on public.profiles;
create policy "Profiles insert propio"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Actualización: solo el propio usuario autenticado.
drop policy if exists "Profiles update propio" on public.profiles;
create policy "Profiles update propio"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Eliminación: solo el propio usuario autenticado.
drop policy if exists "Profiles delete propio" on public.profiles;
create policy "Profiles delete propio"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- Sync automático desde auth.users → profiles (idempotente).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, academic_program, avatar_url)
  values (
    NEW.id,
    NEW.email,
    coalesce((NEW.raw_user_meta_data->>'full_name')::text, ''),
    coalesce((NEW.raw_user_meta_data->>'academic_program')::text, ''),
    coalesce((NEW.raw_user_meta_data->>'avatar_url')::text, '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    academic_program = coalesce(excluded.academic_program, public.profiles.academic_program),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
