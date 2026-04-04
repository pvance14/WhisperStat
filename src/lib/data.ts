import type { Database } from "@/lib/database.types";
import type { TypedSupabaseClient } from "@/lib/supabase";
import { logAsync } from "@/lib/logger";

type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"];
type TeamUpdate = Database["public"]["Tables"]["teams"]["Update"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];
type GameRow = Database["public"]["Tables"]["games"]["Row"];
type GameInsert = Database["public"]["Tables"]["games"]["Insert"];
type GameUpdate = Database["public"]["Tables"]["games"]["Update"];
type StatEventRow = Database["public"]["Tables"]["stat_events"]["Row"];
type StatEventInsert = Database["public"]["Tables"]["stat_events"]["Insert"];
type StatEventUpdate = Database["public"]["Tables"]["stat_events"]["Update"];
type GameSummaryRow = Database["public"]["Tables"]["game_summaries"]["Row"];
type GameSummaryInsert = Database["public"]["Tables"]["game_summaries"]["Insert"];
type ConfirmStatEventBatchArgs = Database["public"]["Functions"]["confirm_stat_event_batch"]["Args"];

export interface ConfirmStatEventBatchProposal {
  ui_id: string;
  player_id: string;
  event_type: StatEventInsert["event_type"];
}

const touchGame = async (client: TypedSupabaseClient, gameId: string) => {
  const { error } = await client
    .from("games")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", gameId);

  if (error) {
    throw error;
  }
};

export const listTeams = async (client: TypedSupabaseClient) =>
  logAsync("teams.list", async () => {
    const { data, error } = await client
      .from("teams")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return data satisfies TeamRow[];
  });

export const createTeam = async (client: TypedSupabaseClient, payload: TeamInsert) =>
  logAsync("teams.create", async () => {
    const { data, error } = await client.from("teams").insert(payload).select().single();

    if (error) {
      throw error;
    }

    return data satisfies TeamRow;
  }, { teamName: payload.name });

export const updateTeam = async (
  client: TypedSupabaseClient,
  teamId: string,
  payload: TeamUpdate
) =>
  logAsync("teams.update", async () => {
    const { data, error } = await client
      .from("teams")
      .update(payload)
      .eq("id", teamId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data satisfies TeamRow;
  }, { teamId });

export const listPlayers = async (client: TypedSupabaseClient, teamId: string) =>
  logAsync("players.list", async () => {
    const { data, error } = await client
      .from("players")
      .select("*")
      .eq("team_id", teamId)
      .order("jersey_number", { ascending: true });

    if (error) {
      throw error;
    }

    return data satisfies PlayerRow[];
  }, { teamId });

export const createPlayer = async (client: TypedSupabaseClient, payload: PlayerInsert) =>
  logAsync("players.create", async () => {
    const { data, error } = await client.from("players").insert(payload).select().single();

    if (error) {
      throw error;
    }

    return data satisfies PlayerRow;
  }, { teamId: payload.team_id });

export const updatePlayer = async (
  client: TypedSupabaseClient,
  playerId: string,
  payload: PlayerUpdate & { team_id: string }
) =>
  logAsync("players.update", async () => {
    const { data, error } = await client
      .from("players")
      .update(payload)
      .eq("id", playerId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data satisfies PlayerRow;
  }, { playerId, teamId: payload.team_id });

export const deletePlayer = async (client: TypedSupabaseClient, playerId: string) =>
  logAsync("players.delete", async () => {
    const { error } = await client.from("players").delete().eq("id", playerId);

    if (error) {
      throw error;
    }
  }, { playerId });

export const listGames = async (client: TypedSupabaseClient, teamId: string) =>
  logAsync("games.list", async () => {
    const { data, error } = await client
      .from("games")
      .select("*")
      .eq("team_id", teamId)
      .order("game_date", { ascending: false });

    if (error) {
      throw error;
    }

    return data satisfies GameRow[];
  }, { teamId });

export const createGame = async (client: TypedSupabaseClient, payload: GameInsert) =>
  logAsync("games.create", async () => {
    const { data, error } = await client.from("games").insert(payload).select().single();

    if (error) {
      throw error;
    }

    return data satisfies GameRow;
  }, { teamId: payload.team_id });

export const updateGame = async (
  client: TypedSupabaseClient,
  gameId: string,
  payload: GameUpdate
) =>
  logAsync("games.update", async () => {
    const { data, error } = await client
      .from("games")
      .update(payload)
      .eq("id", gameId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data satisfies GameRow;
  }, { gameId });

export const getGameBundle = async (client: TypedSupabaseClient, gameId: string) =>
  logAsync("games.bundle", async () => {
    const { data: game, error: gameError } = await client
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameError) {
      throw gameError;
    }

    const [{ data: players, error: playersError }, { data: events, error: eventsError }] =
      await Promise.all([
        client.from("players").select("*").eq("team_id", game.team_id).order("jersey_number"),
        client
          .from("stat_events")
          .select("*")
          .eq("game_id", gameId)
          .order("timestamp", { ascending: false })
      ]);

    if (playersError) {
      throw playersError;
    }

    if (eventsError) {
      throw eventsError;
    }

    return {
      game: game satisfies GameRow,
      players: players satisfies PlayerRow[],
      events: events satisfies StatEventRow[]
    };
  }, { gameId });

export const getGameSummary = async (client: TypedSupabaseClient, gameId: string) =>
  logAsync("gameSummaries.get", async () => {
    const { data, error } = await client
      .from("game_summaries")
      .select("*")
      .eq("game_id", gameId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data ?? null) satisfies GameSummaryRow | null;
  }, { gameId });

export const upsertGameSummary = async (
  client: TypedSupabaseClient,
  payload: GameSummaryInsert
) =>
  logAsync("gameSummaries.upsert", async () => {
    const { data, error } = await client
      .from("game_summaries")
      .upsert(payload, { onConflict: "game_id" })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data satisfies GameSummaryRow;
  }, { gameId: payload.game_id });

export const getMostRecentPriorCompletedGame = async (
  client: TypedSupabaseClient,
  game: GameRow
) =>
  logAsync("games.getMostRecentPriorCompletedGame", async () => {
    const { data, error } = await client
      .from("games")
      .select("*")
      .eq("team_id", game.team_id)
      .eq("status", "completed")
      .neq("id", game.id)
      .order("game_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return ((data satisfies GameRow[])[0] ?? null) satisfies GameRow | null;
  }, { gameId: game.id, teamId: game.team_id });

export const getPostGameSummaryBundle = async (client: TypedSupabaseClient, gameId: string) =>
  logAsync("gameSummaries.bundle", async () => {
    const currentBundle = await getGameBundle(client, gameId);
    const [summary, priorGame] = await Promise.all([
      getGameSummary(client, gameId),
      getMostRecentPriorCompletedGame(client, currentBundle.game)
    ]);

    if (!priorGame) {
      return {
        ...currentBundle,
        summary,
        priorGame: null,
        priorEvents: [] as StatEventRow[]
      };
    }

    const { data: priorEvents, error: priorEventsError } = await client
      .from("stat_events")
      .select("*")
      .eq("game_id", priorGame.id)
      .order("timestamp", { ascending: false });

    if (priorEventsError) {
      throw priorEventsError;
    }

    return {
      ...currentBundle,
      summary,
      priorGame,
      priorEvents: priorEvents satisfies StatEventRow[]
    };
  }, { gameId });

export const confirmStatEvent = async (
  client: TypedSupabaseClient,
  payload: StatEventInsert & { client_event_id: string }
) =>
  logAsync("statEvents.confirm", async () => {
    const { data, error } = await client.from("stat_events").insert(payload).select().single();

    if (!error) {
      await touchGame(client, payload.game_id);
      return data satisfies StatEventRow;
    }

    if (error.code === "23505") {
      const { data: existingEvent, error: existingEventError } = await client
        .from("stat_events")
        .select("*")
        .eq("client_event_id", payload.client_event_id)
        .single();

      if (existingEventError) {
        throw error;
      }

      return existingEvent satisfies StatEventRow;
    }

    throw error;
  }, {
    gameId: payload.game_id,
    playerId: payload.player_id,
    eventType: payload.event_type,
    clientEventId: payload.client_event_id
  });

export const confirmStatEventBatch = async (
  client: TypedSupabaseClient,
  payload: ConfirmStatEventBatchArgs
) =>
  logAsync("statEvents.confirmBatch", async () => {
    const { data, error } = await client.rpc("confirm_stat_event_batch", payload);

    if (error) {
      throw error;
    }

    return (data ?? []) satisfies StatEventRow[];
  }, {
    gameId: payload.target_game_id,
    setNumber: payload.target_set_number,
    proposalCount: Array.isArray(payload.proposals) ? payload.proposals.length : 0,
    clientCaptureId: payload.target_client_capture_id
  });

export const updateStatEvent = async (
  client: TypedSupabaseClient,
  eventId: string,
  payload: StatEventUpdate
) =>
  logAsync("statEvents.update", async () => {
    const { data, error } = await client
      .from("stat_events")
      .update(payload)
      .eq("id", eventId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await touchGame(client, data.game_id);
    return data satisfies StatEventRow;
  }, { eventId });

export const softDeleteStatEvent = async (
  client: TypedSupabaseClient,
  eventId: string
) =>
  updateStatEvent(client, eventId, {
    deleted_at: new Date().toISOString()
  });
