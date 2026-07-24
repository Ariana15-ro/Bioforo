-- ==============================================================
-- BioForo — Triggers para mantener sincronizados
-- `sightings.likes_count` y `sightings.comments_count`
-- ==============================================================

-- 1) likes_count
create or replace function public.increment_likes_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.sightings set likes_count = coalesce(likes_count, 0) + 1 where id = NEW.sighting_id;
    return NEW;
  elsif tg_op = 'DELETE' then
    update public.sightings set likes_count = greatest(coalesce(likes_count, 0) - 1, 0) where id = OLD.sighting_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists likes_count_trigger on public.likes;
create trigger likes_count_trigger
  after insert or delete on public.likes
  for each row execute procedure public.increment_likes_count();

-- 2) comments_count
create or replace function public.increment_comments_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.sightings set comments_count = coalesce(comments_count, 0) + 1 where id = NEW.sighting_id;
    return NEW;
  elsif tg_op = 'DELETE' then
    update public.sightings set comments_count = greatest(coalesce(comments_count, 0) - 1, 0) where id = OLD.sighting_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists comments_count_trigger on public.comments;
create trigger comments_count_trigger
  after insert or delete on public.comments
  for each row execute procedure public.increment_comments_count();

-- Nota: los contadores pueden inicializarse si ya existían datos:
-- update public.sightings s
--   set likes_count = coalesce((select count(*) from public.likes l where l.sighting_id = s.id), 0),
--       comments_count = coalesce((select count(*) from public.comments c where c.sighting_id = s.id), 0);
