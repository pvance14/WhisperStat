import type { Database, StatEventType } from "@/lib/database.types";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type StatEventRow = Database["public"]["Tables"]["stat_events"]["Row"];

export const trackedStatTypes: StatEventType[] = [
  "kill",
  "ace",
  "serve_error",
  "reception_error",
  "block",
  "dig",
  "attack_error",
  "set"
];

export interface PlayerStatRow {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  totals: Record<StatEventType, number>;
  currentSetTotals: Record<StatEventType, number>;
}

const emptyTotals = () =>
  trackedStatTypes.reduce(
    (accumulator, eventType) => {
      accumulator[eventType] = 0;
      return accumulator;
    },
    {} as Record<StatEventType, number>
  );

export const buildPlayerStatRows = (
  players: PlayerRow[],
  events: StatEventRow[],
  currentSet: number
): PlayerStatRow[] => {
  return players.map((player) => {
    const playerEvents = events.filter(
      (event) => event.player_id === player.id && event.deleted_at === null
    );

    const totals = emptyTotals();
    const currentSetTotals = emptyTotals();

    playerEvents.forEach((event) => {
      totals[event.event_type] += 1;

      if (event.set_number === currentSet) {
        currentSetTotals[event.event_type] += 1;
      }
    });

    return {
      playerId: player.id,
      playerName: `${player.first_name} ${player.last_name}`,
      jerseyNumber: player.jersey_number,
      totals,
      currentSetTotals
    };
  });
};

export const summarizeEvents = (events: StatEventRow[]) =>
  trackedStatTypes.reduce(
    (accumulator, eventType) => {
      accumulator[eventType] = events.filter(
        (event) => event.event_type === eventType && event.deleted_at === null
      ).length;
      return accumulator;
    },
    {} as Record<StatEventType, number>
  );
