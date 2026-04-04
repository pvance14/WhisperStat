drop index if exists idx_stat_events_client_event_id;

alter table public.stat_events
  alter column client_event_id type text
  using client_event_id::text;

create unique index if not exists idx_stat_events_client_event_id
  on public.stat_events(client_event_id);

create or replace function public.confirm_stat_event_batch(
  target_game_id uuid,
  target_set_number integer,
  capture_created_at timestamptz,
  target_client_capture_id uuid,
  proposals jsonb
)
returns setof public.stat_events
language plpgsql
set search_path = public
as $$
declare
  expected_count integer;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized.'
      using errcode = '42501';
  end if;

  if not public.owns_game(target_game_id) then
    raise exception 'Game not found or not accessible.'
      using errcode = '42501';
  end if;

  if target_set_number < 1 then
    raise exception 'Set number must be at least 1.'
      using errcode = '23514';
  end if;

  if jsonb_typeof(proposals) <> 'array' then
    raise exception 'Batch proposals must be a JSON array.'
      using errcode = '22023';
  end if;

  expected_count := jsonb_array_length(proposals);

  if expected_count = 0 then
    raise exception 'Batch proposals must include at least one proposal.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(proposals) with ordinality as proposal(payload, ordinality)
    where nullif(proposal.payload->>'ui_id', '') is null
      or btrim(proposal.payload->>'ui_id') = ''
      or nullif(proposal.payload->>'player_id', '') is null
      or nullif(proposal.payload->>'event_type', '') is null
  ) then
    raise exception 'Each batch proposal must include ui_id, player_id, and event_type.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from (
      select proposal.ui_id
      from jsonb_array_elements(proposals) as proposal(payload)
      cross join lateral (
        select proposal.payload->>'ui_id' as ui_id
      ) proposal
      group by proposal.ui_id
      having count(*) > 1
    ) duplicates
  ) then
    raise exception 'Batch proposal ui_id values must be unique within one capture.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(proposals) as proposal(payload)
    cross join lateral (
      select
        nullif(proposal.payload->>'ui_id', '') as ui_id,
        (proposal.payload->>'player_id')::uuid as player_id,
        (proposal.payload->>'event_type')::public.stat_event_type as event_type
    ) proposal
    where not exists (
      select 1
      from public.games
      join public.players on players.team_id = games.team_id
      where games.id = target_game_id
        and players.id = proposal.player_id
    )
  ) then
    raise exception 'One or more batch proposals reference a player outside this game roster.'
      using errcode = '23514';
  end if;

  with normalized_proposals as (
    select
      proposal.payload->>'ui_id' as ui_id,
      (proposal.payload->>'player_id')::uuid as player_id,
      (proposal.payload->>'event_type')::public.stat_event_type as event_type,
      proposal.ordinality
    from jsonb_array_elements(proposals) with ordinality as proposal(payload, ordinality)
  ), inserted as (
    insert into public.stat_events (
      game_id,
      player_id,
      event_type,
      set_number,
      "timestamp",
      client_event_id
    )
    select
      target_game_id,
      proposal.player_id,
      proposal.event_type,
      target_set_number,
      capture_created_at + ((proposal.ordinality - 1) * interval '1 millisecond'),
      target_client_capture_id::text || ':' || proposal.ui_id
    from normalized_proposals proposal
    on conflict (client_event_id) do nothing
    returning id
  )
  select count(*) into expected_count
  from (
    select event_rows.id
    from public.stat_events event_rows
    join jsonb_array_elements(proposals) with ordinality as proposal(payload, ordinality)
      on event_rows.client_event_id = target_client_capture_id::text || ':' || (proposal.payload->>'ui_id')
    where event_rows.game_id = target_game_id
  ) matched_events;

  if expected_count <> jsonb_array_length(proposals) then
    raise exception 'Batch confirm did not resolve every requested event.'
      using errcode = '23514';
  end if;

  update public.games
  set updated_at = timezone('utc', now())
  where id = target_game_id;

  return query
  select event_rows.*
  from public.stat_events event_rows
  join jsonb_array_elements(proposals) with ordinality as proposal(payload, ordinality)
    on event_rows.client_event_id = target_client_capture_id::text || ':' || (proposal.payload->>'ui_id')
  where event_rows.game_id = target_game_id
  order by proposal.ordinality asc;
end;
$$;

grant execute on function public.confirm_stat_event_batch(uuid, integer, timestamptz, uuid, jsonb)
  to authenticated;
