-- ==============================================================
-- BioForo — Repara contradicción en migrations/0001_create_sightings.sql
-- 0001 ejecutaba `alter table public.sightings disable row level security`
-- bloqueando así las políticas que creamos en 0003.
-- Esta migración la desbloquea de forma idempotente.
-- ==============================================================

alter table public.sightings enable row level security;
