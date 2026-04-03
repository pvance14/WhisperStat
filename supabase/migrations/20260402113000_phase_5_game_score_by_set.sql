create or replace function public.is_valid_score_by_set(payload jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(payload) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(payload) as entry
      where jsonb_typeof(entry) <> 'object'
        or jsonb_typeof(entry -> 'setNumber') <> 'number'
        or jsonb_typeof(entry -> 'us') <> 'number'
        or jsonb_typeof(entry -> 'them') <> 'number'
        or (entry ->> 'setNumber')::integer < 1
        or (entry ->> 'us')::integer < 0
        or (entry ->> 'them')::integer < 0
    );
$$;

alter table public.games
  add column if not exists score_by_set jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'games_score_by_set_valid'
  ) then
    alter table public.games
      add constraint games_score_by_set_valid
      check (public.is_valid_score_by_set(score_by_set));
  end if;
end $$;

comment on column public.games.score_by_set is
  'Manual MVP score source of truth. JSON array entries use {setNumber, us, them}.';
