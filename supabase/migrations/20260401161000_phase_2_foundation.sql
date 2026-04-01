create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'game_status') then
    create type public.game_status as enum ('draft', 'in_progress', 'completed');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'stat_event_type') then
    create type public.stat_event_type as enum (
      'kill',
      'ace',
      'serve_error',
      'reception_error',
      'block',
      'dig',
      'attack_error',
      'set'
    );
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_team_owner(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.teams
    where teams.id = target_team_id
      and teams.user_id = auth.uid()
  );
$$;

create or replace function public.owns_game(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.games
    join public.teams on teams.id = games.team_id
    where games.id = target_game_id
      and teams.user_id = auth.uid()
  );
$$;

create or replace function public.validate_stat_event_refs()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  game_team_id uuid;
  player_team_id uuid;
begin
  select games.team_id
  into game_team_id
  from public.games
  where games.id = new.game_id;

  select players.team_id
  into player_team_id
  from public.players
  where players.id = new.player_id;

  if game_team_id is null then
    raise exception 'Game % does not exist.', new.game_id;
  end if;

  if player_team_id is null then
    raise exception 'Player % does not exist.', new.player_id;
  end if;

  if game_team_id <> player_team_id then
    raise exception 'Player % does not belong to the same team as game %.', new.player_id, new.game_id;
  end if;

  return new;
end;
$$;

grant execute on function public.is_team_owner(uuid) to authenticated;
grant execute on function public.owns_game(uuid) to authenticated;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) > 0),
  last_name text not null check (char_length(trim(last_name)) > 0),
  jersey_number integer not null check (jersey_number >= 0),
  position text,
  aliases text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint players_team_id_jersey_number_key unique (team_id, jersey_number)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent_name text not null check (char_length(trim(opponent_name)) > 0),
  game_date timestamptz not null,
  location text,
  status public.game_status not null default 'in_progress',
  current_set integer not null default 1 check (current_set >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.stat_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  event_type public.stat_event_type not null,
  set_number integer not null check (set_number >= 1),
  "timestamp" timestamptz not null default timezone('utc', now()),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notes text,
  deleted_at timestamptz,
  client_event_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.game_summaries (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references public.games(id) on delete cascade,
  narrative_text text not null,
  generated_at timestamptz not null,
  model text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_games_team_id on public.games(team_id);
create index if not exists idx_players_team_id on public.players(team_id);
create index if not exists idx_stat_events_game_set on public.stat_events(game_id, set_number);
create index if not exists idx_stat_events_game_player on public.stat_events(game_id, player_id);
create index if not exists idx_stat_events_player_event on public.stat_events(player_id, event_type);
create unique index if not exists idx_stat_events_client_event_id
  on public.stat_events(client_event_id)
  where client_event_id is not null;

drop trigger if exists set_players_updated_at on public.players;
create trigger set_players_updated_at
before update on public.players
for each row
execute function public.set_updated_at();

drop trigger if exists set_games_updated_at on public.games;
create trigger set_games_updated_at
before update on public.games
for each row
execute function public.set_updated_at();

drop trigger if exists validate_stat_event_refs on public.stat_events;
create trigger validate_stat_event_refs
before insert or update on public.stat_events
for each row
execute function public.validate_stat_event_refs();

alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.stat_events enable row level security;
alter table public.game_summaries enable row level security;

drop policy if exists "teams_select_own" on public.teams;
create policy "teams_select_own"
on public.teams
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "teams_insert_own" on public.teams;
create policy "teams_insert_own"
on public.teams
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "teams_update_own" on public.teams;
create policy "teams_update_own"
on public.teams
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "teams_delete_own" on public.teams;
create policy "teams_delete_own"
on public.teams
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "players_select_team_owner" on public.players;
create policy "players_select_team_owner"
on public.players
for select
to authenticated
using (public.is_team_owner(team_id));

drop policy if exists "players_insert_team_owner" on public.players;
create policy "players_insert_team_owner"
on public.players
for insert
to authenticated
with check (public.is_team_owner(team_id));

drop policy if exists "players_update_team_owner" on public.players;
create policy "players_update_team_owner"
on public.players
for update
to authenticated
using (public.is_team_owner(team_id))
with check (public.is_team_owner(team_id));

drop policy if exists "players_delete_team_owner" on public.players;
create policy "players_delete_team_owner"
on public.players
for delete
to authenticated
using (public.is_team_owner(team_id));

drop policy if exists "games_select_team_owner" on public.games;
create policy "games_select_team_owner"
on public.games
for select
to authenticated
using (public.is_team_owner(team_id));

drop policy if exists "games_insert_team_owner" on public.games;
create policy "games_insert_team_owner"
on public.games
for insert
to authenticated
with check (public.is_team_owner(team_id));

drop policy if exists "games_update_team_owner" on public.games;
create policy "games_update_team_owner"
on public.games
for update
to authenticated
using (public.is_team_owner(team_id))
with check (public.is_team_owner(team_id));

drop policy if exists "games_delete_team_owner" on public.games;
create policy "games_delete_team_owner"
on public.games
for delete
to authenticated
using (public.is_team_owner(team_id));

drop policy if exists "stat_events_select_game_owner" on public.stat_events;
create policy "stat_events_select_game_owner"
on public.stat_events
for select
to authenticated
using (public.owns_game(game_id));

drop policy if exists "stat_events_insert_game_owner" on public.stat_events;
create policy "stat_events_insert_game_owner"
on public.stat_events
for insert
to authenticated
with check (public.owns_game(game_id));

drop policy if exists "stat_events_update_game_owner" on public.stat_events;
create policy "stat_events_update_game_owner"
on public.stat_events
for update
to authenticated
using (public.owns_game(game_id))
with check (public.owns_game(game_id));

drop policy if exists "stat_events_delete_game_owner" on public.stat_events;
create policy "stat_events_delete_game_owner"
on public.stat_events
for delete
to authenticated
using (public.owns_game(game_id));

drop policy if exists "game_summaries_select_game_owner" on public.game_summaries;
create policy "game_summaries_select_game_owner"
on public.game_summaries
for select
to authenticated
using (public.owns_game(game_id));

drop policy if exists "game_summaries_insert_game_owner" on public.game_summaries;
create policy "game_summaries_insert_game_owner"
on public.game_summaries
for insert
to authenticated
with check (public.owns_game(game_id));

drop policy if exists "game_summaries_update_game_owner" on public.game_summaries;
create policy "game_summaries_update_game_owner"
on public.game_summaries
for update
to authenticated
using (public.owns_game(game_id))
with check (public.owns_game(game_id));

drop policy if exists "game_summaries_delete_game_owner" on public.game_summaries;
create policy "game_summaries_delete_game_owner"
on public.game_summaries
for delete
to authenticated
using (public.owns_game(game_id));
