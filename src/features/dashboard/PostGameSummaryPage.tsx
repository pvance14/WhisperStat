import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { StatusMessage } from "@/components/StatusMessage";
import { getPostGameSummaryBundle, upsertGameSummary } from "@/lib/data";
import type { Database } from "@/lib/database.types";
import { normalizeScoreBySet, summarizeMatchScore } from "@/lib/gameScore";
import { buildPostGameSummary } from "@/lib/postGameSummary";
import { buildPlayerStatRows, summarizeEvents } from "@/lib/stats";
import { requireSupabase } from "@/lib/supabase";
import { formatDateTime, getErrorMessage, titleCase } from "@/lib/utils";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type StatEventRow = Database["public"]["Tables"]["stat_events"]["Row"];
type GameSummaryRow = Database["public"]["Tables"]["game_summaries"]["Row"];

const totalTrackedErrors = (events: StatEventRow[]) => {
  const totals = summarizeEvents(events);
  return totals.attack_error + totals.serve_error + totals.reception_error;
};

const getTopKillLeader = (players: PlayerRow[], events: StatEventRow[], currentSet: number) => {
  const rows = buildPlayerStatRows(players, events, currentSet)
    .filter((row) => row.totals.kill > 0)
    .sort((left, right) => right.totals.kill - left.totals.kill || left.jerseyNumber - right.jerseyNumber);

  return rows[0] ?? null;
};

const isSummaryStale = (game: GameRow, summary: GameSummaryRow | null) => {
  if (!summary) {
    return true;
  }

  return new Date(summary.generated_at).getTime() < new Date(game.updated_at).getTime();
};

export const PostGameSummaryPage = () => {
  const { gameId } = useParams();
  const [game, setGame] = useState<GameRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [events, setEvents] = useState<StatEventRow[]>([]);
  const [priorGame, setPriorGame] = useState<GameRow | null>(null);
  const [priorEvents, setPriorEvents] = useState<StatEventRow[]>([]);
  const [summary, setSummary] = useState<GameSummaryRow | null>(null);
  const [status, setStatus] = useState<{ tone: "info" | "error"; message: string } | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<
    { tone: "info" | "success" | "warn" | "error"; message: string } | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const loadSummaryPage = async ({ forceRegenerate = false }: { forceRegenerate?: boolean } = {}) => {
    const bundle = await getPostGameSummaryBundle(requireSupabase(), gameId!);
    const activeEvents = bundle.events.filter((event) => event.deleted_at === null);
    const activePriorEvents = bundle.priorEvents.filter((event) => event.deleted_at === null);
    const generated = buildPostGameSummary({
      game: bundle.game,
      players: bundle.players,
      events: activeEvents,
      priorGame: bundle.priorGame,
      priorEvents: activePriorEvents
    });
    let nextSummary = bundle.summary;
    let persistenceWarning: string | null = null;

    if (bundle.game.status === "completed" && (forceRegenerate || isSummaryStale(bundle.game, bundle.summary))) {
      try {
        nextSummary = await upsertGameSummary(requireSupabase(), {
          game_id: bundle.game.id,
          narrative_text: generated.narrativeText,
          generated_at: new Date().toISOString(),
          model: generated.model
        });
      } catch (error) {
        nextSummary = null;
        persistenceWarning = `The summary could not be saved right now—you are seeing an on-screen preview only. ${getErrorMessage(error)}`;
      }
    }

    setGame(bundle.game);
    setPlayers(bundle.players);
    setEvents(activeEvents);
    setPriorGame(bundle.priorGame);
    setPriorEvents(activePriorEvents);
    setSummary(nextSummary);
    setStatus(null);
    return {
      ...bundle,
      summary: nextSummary,
      events: activeEvents,
      priorEvents: activePriorEvents,
      persistenceWarning
    };
  };

  useEffect(() => {
    if (!gameId) {
      return;
    }

    let isActive = true;

    const load = async () => {
      try {
        setIsLoading(true);
        const nextBundle = await loadSummaryPage();

        if (!isActive) {
          return;
        }

        setWorkflowStatus(
          nextBundle.persistenceWarning
            ? {
                tone: "warn",
                message: nextBundle.persistenceWarning
              }
            : nextBundle.game.status === "completed"
              ? null
              : {
                  tone: "info",
                  message: "Complete the game on the dashboard to lock in and save the post-game summary."
                }
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        setGame(null);
        setStatus({
          tone: "error",
          message: getErrorMessage(error)
        });
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      isActive = false;
    };
  }, [gameId]);

  const regeneratedSummary = useMemo(() => {
    if (!game) {
      return null;
    }

    return buildPostGameSummary({
      game,
      players,
      events,
      priorGame,
      priorEvents
    });
  }, [events, game, players, priorEvents, priorGame]);

  if (!gameId) {
    return <StatusMessage tone="error" message="Game id is missing from the route." />;
  }

  if (isLoading && !game) {
    return <StatusMessage tone="info" message="Loading post-game summary..." />;
  }

  if (!game) {
    return (
      <StatusMessage
        tone={status?.tone ?? "error"}
        message={status?.message ?? "The post-game summary could not be loaded."}
      />
    );
  }

  const scoreBySet = normalizeScoreBySet(game.score_by_set);
  const matchScore = summarizeMatchScore(scoreBySet);
  const killLeader = getTopKillLeader(players, events, game.current_set);
  const headline = regeneratedSummary?.headline ?? `Post-game review vs ${game.opponent_name}`;
  const comparisonText =
    regeneratedSummary?.comparisonText ??
    "Comparison to a prior completed match is not available yet because this is the first completed game saved for this team.";
  const narrativeText = summary?.narrative_text ?? regeneratedSummary?.narrativeText ?? "";

  return (
    <div className="grid">
      <section className="page-header page-panel page-hero">
        <div className="page-hero-main">
          <div className="eyebrow">Post-game summary</div>
          <div className="hero-title-row">
            <div className="stack-compact">
              <span className="chip">Post-game summary</span>
              <h2>{headline}</h2>
              <p>
                This view turns saved plays and the scoreboard into one clear coaching takeaway
                before you move on to the next match.
              </p>
            </div>
            <div className="hero-meta">
              <div className="meta-pill">Status: {titleCase(game.status)}</div>
              <div className="meta-pill">
                Sets won: <strong>{matchScore.us}-{matchScore.them}</strong>
              </div>
              <div className="meta-pill">
                Summary: <strong>{summary ? "Saved" : "Preview"}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="page-hero-side">
          <div className="metric-card">
            <p>Match date</p>
            <div className="metric-value" style={{ fontSize: "1.2rem" }}>
              {formatDateTime(game.game_date)}
            </div>
          </div>
          <div className="cluster hero-actions">
            <Link className="button-secondary" to={`/app/games/${game.id}`}>
              Back to dashboard
            </Link>
            <Link className="button-ghost" to={`/app/report/${game.id}`}>
              Open report
            </Link>
          </div>
        </div>
      </section>

      {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}
      {workflowStatus ? <StatusMessage tone={workflowStatus.tone} message={workflowStatus.message} /> : null}

      <div className="summary-strip">
        <div className="summary-tile featured">
          <div className="summary-label">Saved plays</div>
          <div className="summary-value">{events.length}</div>
          <div className="summary-support">Undone plays are left out of the story.</div>
        </div>
        <div className="summary-tile">
          <div className="summary-label">Top kill leader</div>
          <div className="summary-value">{killLeader ? killLeader.totals.kill : 0}</div>
          <div className="summary-support">
            {killLeader ? `#${killLeader.jerseyNumber} ${killLeader.playerName}` : "No kills logged yet."}
          </div>
        </div>
        <div className="summary-tile">
          <div className="summary-label">Logged errors</div>
          <div className="summary-value">{totalTrackedErrors(events)}</div>
          <div className="summary-support">Attack, serve, and reception errors combined.</div>
        </div>
        <div className="summary-tile">
          <div className="summary-label">Comparison</div>
          <div className="summary-value">{priorGame ? "Ready" : "None"}</div>
          <div className="summary-support">
            {priorGame
              ? `Prior match: vs ${priorGame.opponent_name}`
              : "No other completed game exists for this team yet."}
          </div>
        </div>
      </div>

      <div className="split-layout sidebar-heavy">
        <section className="card stack feature-panel feature-panel-primary">
          <div className="section-toolbar">
            <div className="section-copy">
              <h3>Saved narrative</h3>
              <p className="supporting-text">
                Built from the same rules every time so the write-up stays clear and easy to trust.
              </p>
            </div>
            {game.status === "completed" ? (
              <button
                className="button"
                type="button"
                disabled={isRegenerating}
                onClick={() => {
                  setWorkflowStatus(null);
                  setIsRegenerating(true);

                  void loadSummaryPage({ forceRegenerate: true })
                    .then((result) =>
                      setWorkflowStatus(
                        result.persistenceWarning
                          ? {
                              tone: "warn",
                              message: result.persistenceWarning
                            }
                          : {
                              tone: "success",
                              message: "Post-game summary regenerated from the latest plays and scoreboard."
                            }
                      )
                    )
                    .catch((error) =>
                      setWorkflowStatus({
                        tone: "error",
                        message: getErrorMessage(error)
                      })
                    )
                    .finally(() => setIsRegenerating(false));
                }}
              >
                {isRegenerating ? "Regenerating..." : "Regenerate summary"}
              </button>
            ) : null}
          </div>

          {game.status !== "completed" ? (
            <StatusMessage
              tone="info"
              message="This game is still in progress. Complete it on the dashboard when you want the saved post-game summary to become official."
            />
          ) : narrativeText ? (
            <article className="summary-narrative-card">
              <div className="summary-narrative-meta">
                <span className="chip summary-chip">
                  {summary?.model ?? regeneratedSummary?.model ?? "Draft summary"}
                </span>
                <span className="supporting-text">
                  Generated {summary ? formatDateTime(summary.generated_at) : "from current saved data"}
                </span>
              </div>
              <p>{narrativeText}</p>
            </article>
          ) : (
            <StatusMessage
              tone="warn"
              message="The summary text is not available yet. Try regenerating once plays and scores are saved."
            />
          )}
        </section>

        <div className="stack">
          <section className="card stack feature-panel">
            <div className="section-copy">
              <h3>Comparison callout</h3>
              <p className="supporting-text">
                We only compare to the last other finished game for this team—keeps the callout easy
                to read.
              </p>
            </div>
            <div className="summary-callout comparison">
              <strong>{priorGame ? `Against ${priorGame.opponent_name}` : "No prior completed game yet"}</strong>
              <p>{comparisonText}</p>
            </div>
          </section>

          <section className="card stack feature-panel">
            <div className="section-copy">
              <h3>Saved set scores</h3>
              <p className="supporting-text">
                Manual scoreboard snapshots still anchor the match result and the summary copy.
              </p>
            </div>
            {scoreBySet.length === 0 ? (
              <StatusMessage
                tone="info"
                message="No set scores were saved for this match, so the write-up describes plays only."
              />
            ) : (
              <div className="score-strip">
                {scoreBySet.map((setScore) => (
                  <div className="list-item" key={setScore.setNumber}>
                    <strong>Set {setScore.setNumber}</strong>
                    <div className="supporting-text">
                      {setScore.us}-{setScore.them}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
