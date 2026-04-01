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
type StatEventRow = Database["public"]["Tables"]["stat_events"]["Row"];

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
