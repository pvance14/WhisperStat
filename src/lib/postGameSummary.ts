import type { Database, StatEventType } from "@/lib/database.types";
import { normalizeScoreBySet, summarizeMatchScore } from "@/lib/gameScore";
import { buildPlayerStatRows, summarizeEvents } from "@/lib/stats";
import { formatDateTime, titleCase } from "@/lib/utils";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type StatEventRow = Database["public"]["Tables"]["stat_events"]["Row"];

const summaryTemplateVersion = "template-phase-6-v1";
const errorTypes: StatEventType[] = ["attack_error", "serve_error", "reception_error"];

const formatPlayerLabel = (player: PlayerRow) =>
  `#${player.jersey_number} ${player.first_name} ${player.last_name}`;

const formatPlayerList = (players: PlayerRow[]) => {
  if (players.length === 0) {
    return "";
  }

  if (players.length === 1) {
    return formatPlayerLabel(players[0]);
  }

  if (players.length === 2) {
    return `${formatPlayerLabel(players[0])} and ${formatPlayerLabel(players[1])}`;
  }

  return `${players
    .slice(0, -1)
    .map((player) => formatPlayerLabel(player))
    .join(", ")}, and ${formatPlayerLabel(players.at(-1)!)}`;
};

const countPlayerEvents = (
  playerId: string,
  events: StatEventRow[],
  eventTypes: StatEventType[]
) =>
  events.filter(
    (event) =>
      event.deleted_at === null &&
      event.player_id === playerId &&
      eventTypes.includes(event.event_type)
  ).length;

const buildLeaderGroup = (
  players: PlayerRow[],
  events: StatEventRow[],
  eventTypes: StatEventType[]
) => {
  const ranked = players
    .map((player) => ({
      player,
      count: countPlayerEvents(player.id, events, eventTypes)
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.player.jersey_number - right.player.jersey_number);

  if (ranked.length === 0) {
    return null;
  }

  const topCount = ranked[0].count;
  const leaders = ranked.filter((entry) => entry.count === topCount).map((entry) => entry.player);

  return {
    count: topCount,
    leaders
  };
};

const buildMatchResultText = (game: GameRow) => {
  const scores = normalizeScoreBySet(game.score_by_set);

  if (scores.length === 0) {
    return "Manual set scores were not saved, so the result is still based on the event log alone.";
  }

  const matchScore = summarizeMatchScore(scores);
  const finalSet = scores.at(-1)!;

  return `The saved scoreboard closed at ${matchScore.us}-${matchScore.them} in sets, with the last tracked set finishing ${finalSet.us}-${finalSet.them}.`;
};

const buildComparisonText = (
  game: GameRow,
  events: StatEventRow[],
  priorGame: GameRow | null,
  priorEvents: StatEventRow[]
) => {
  if (!priorGame) {
    return "Comparison to a prior completed match is not available yet because this is the first completed game saved for this team.";
  }

  const totals = summarizeEvents(events);
  const priorTotals = summarizeEvents(priorEvents);
  const totalErrors = errorTypes.reduce((sum, eventType) => sum + totals[eventType], 0);
  const priorTotalErrors = errorTypes.reduce((sum, eventType) => sum + priorTotals[eventType], 0);
  const currentMatchScore = summarizeMatchScore(normalizeScoreBySet(game.score_by_set));
  const priorMatchScore = summarizeMatchScore(normalizeScoreBySet(priorGame.score_by_set));

  const comparisonBits: string[] = [];
  const killDelta = totals.kill - priorTotals.kill;
  const digDelta = totals.dig - priorTotals.dig;
  const errorDelta = totalErrors - priorTotalErrors;

  if (killDelta !== 0) {
    comparisonBits.push(
      `${Math.abs(killDelta)} ${killDelta > 0 ? "more" : "fewer"} kills`
    );
  }

  if (digDelta !== 0) {
    comparisonBits.push(`${Math.abs(digDelta)} ${digDelta > 0 ? "more" : "fewer"} digs`);
  }

  if (errorDelta !== 0) {
    comparisonBits.push(
      `${Math.abs(errorDelta)} ${errorDelta < 0 ? "fewer" : "more"} total errors`
    );
  }

  const setDelta = currentMatchScore.us - priorMatchScore.us;

  if (setDelta !== 0) {
    comparisonBits.push(
      `${Math.abs(setDelta)} ${setDelta > 0 ? "more" : "fewer"} set wins`
    );
  }

  if (comparisonBits.length === 0) {
    comparisonBits.push("nearly identical headline totals");
  }

  return `Compared with the previous completed match against ${priorGame.opponent_name} on ${formatDateTime(priorGame.game_date)}, this game finished with ${comparisonBits.slice(0, 3).join(", ")}.`;
};

const buildStandoutText = (players: PlayerRow[], events: StatEventRow[]) => {
  const killLeaders = buildLeaderGroup(players, events, ["kill"]);
  const digLeaders = buildLeaderGroup(players, events, ["dig"]);
  const aceLeaders = buildLeaderGroup(players, events, ["ace"]);

  const sentences: string[] = [];

  if (killLeaders) {
    sentences.push(
      `${formatPlayerList(killLeaders.leaders)} led the attack with ${killLeaders.count} ${killLeaders.count === 1 ? "kill" : "kills"}.`
    );
  }

  if (digLeaders) {
    sentences.push(
      `${formatPlayerList(digLeaders.leaders)} set the defensive pace with ${digLeaders.count} ${digLeaders.count === 1 ? "dig" : "digs"}.`
    );
  }

  if (aceLeaders) {
    sentences.push(
      `From the service line, ${formatPlayerList(aceLeaders.leaders)} contributed ${aceLeaders.count} ${aceLeaders.count === 1 ? "ace" : "aces"}.`
    );
  }

  if (sentences.length === 0) {
    return "The event log is still light, so standout contributors were not clear from the saved stats.";
  }

  return sentences.join(" ");
};

const buildPressureText = (players: PlayerRow[], events: StatEventRow[]) => {
  const totals = summarizeEvents(events);
  const totalErrors = errorTypes.reduce((sum, eventType) => sum + totals[eventType], 0);

  if (totalErrors === 0) {
    return "No serve, reception, or attack errors were logged, so the saved stats do not point to a clear pressure area.";
  }

  const topErrorType = [...errorTypes].sort((left, right) => totals[right] - totals[left])[0];
  const errorLeaders = buildLeaderGroup(players, events, errorTypes);
  const topErrorTypeLabel = titleCase(topErrorType).replace("Error", " error");

  if (!errorLeaders) {
    return `${topErrorTypeLabel} showed up ${totals[topErrorType]} ${totals[topErrorType] === 1 ? "time" : "times"}, which was the clearest pressure point in the saved match data.`;
  }

  return `${topErrorTypeLabel} was the biggest pressure point at ${totals[topErrorType]} ${totals[topErrorType] === 1 ? "event" : "events"}, and ${formatPlayerList(errorLeaders.leaders)} accounted for ${errorLeaders.count} of the team's logged errors across attack, serve, and reception.`;
};

export interface PostGameSummaryBuildResult {
  headline: string;
  narrativeText: string;
  comparisonText: string;
  model: string;
}

export const buildPostGameSummary = ({
  game,
  players,
  events,
  priorGame,
  priorEvents
}: {
  game: GameRow;
  players: PlayerRow[];
  events: StatEventRow[];
  priorGame: GameRow | null;
  priorEvents: StatEventRow[];
}): PostGameSummaryBuildResult => {
  const activeEvents = events.filter((event) => event.deleted_at === null);
  const playerRows = buildPlayerStatRows(players, activeEvents, game.current_set);
  const totalKills = playerRows.reduce((sum, row) => sum + row.totals.kill, 0);
  const headline =
    totalKills > 0
      ? `${totalKills} logged kills against ${game.opponent_name}`
      : `Post-game review vs ${game.opponent_name}`;

  const matchResultText = buildMatchResultText(game);
  const standoutText = buildStandoutText(players, activeEvents);
  const pressureText = buildPressureText(players, activeEvents);
  const comparisonText = buildComparisonText(game, activeEvents, priorGame, priorEvents);

  return {
    headline,
    comparisonText,
    narrativeText: [matchResultText, standoutText, pressureText, comparisonText].join(" "),
    model: summaryTemplateVersion
  };
};
