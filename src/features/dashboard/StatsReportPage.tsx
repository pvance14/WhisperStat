import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { StatusMessage } from "@/components/StatusMessage";
import { getGameBundle } from "@/lib/data";
import type { Database } from "@/lib/database.types";
import {
  buildTrackedSetNumbers,
  getSetScore,
  normalizeScoreBySet,
  summarizeMatchScore
} from "@/lib/gameScore";
import { buildPlayerStatRows, summarizeEvents, trackedStatTypes } from "@/lib/stats";
import { requireSupabase } from "@/lib/supabase";
import { formatDateTime, getErrorMessage, titleCase } from "@/lib/utils";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type StatEventRow = Database["public"]["Tables"]["stat_events"]["Row"];

export const StatsReportPage = () => {
  const { gameId } = useParams();
  const [game, setGame] = useState<GameRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [events, setEvents] = useState<StatEventRow[]>([]);
  const [status, setStatus] = useState<{ tone: "info" | "error"; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"current_set" | "full_match">("current_set");
  const [selectedSet, setSelectedSet] = useState<number | null>(null);

  useEffect(() => {
    if (!gameId) {
      return;
    }

    let isActive = true;

    const load = async () => {
      try {
        setIsLoading(true);
        const bundle = await getGameBundle(requireSupabase(), gameId);

        if (!isActive) {
          return;
        }

        setGame(bundle.game);
        setPlayers(bundle.players);
        setEvents(bundle.events);
        setLastLoadedAt(new Date().toISOString());
        setStatus(null);
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
    const intervalId = window.setInterval(() => {
      void load();
    }, 15000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [gameId]);

  const scoreBySet = useMemo(() => (game ? normalizeScoreBySet(game.score_by_set) : []), [game]);
  const activeEvents = useMemo(
    () => events.filter((event) => event.deleted_at === null),
    [events]
  );
  const trackedSetNumbers = useMemo(
    () => (game ? buildTrackedSetNumbers(activeEvents, scoreBySet, game.current_set) : []),
    [activeEvents, game, scoreBySet]
  );

  useEffect(() => {
    if (!game) {
      return;
    }

    setSelectedSet((current) => {
      if (current !== null && trackedSetNumbers.includes(current)) {
        return current;
      }

      return game.current_set;
    });
  }, [game, trackedSetNumbers]);

  const effectiveSet = selectedSet ?? game?.current_set ?? 1;
  const selectedSetEvents = activeEvents.filter((event) => event.set_number === effectiveSet);
  const statRows = useMemo(
    () => (game ? buildPlayerStatRows(players, activeEvents, effectiveSet) : []),
    [activeEvents, effectiveSet, game, players]
  );
  const displayedTotals = useMemo(
    () => summarizeEvents(viewMode === "full_match" ? activeEvents : selectedSetEvents),
    [activeEvents, selectedSetEvents, viewMode]
  );
  const matchScore = useMemo(() => summarizeMatchScore(scoreBySet), [scoreBySet]);

  if (!gameId) {
    return <StatusMessage tone="error" message="Game id is missing from the route." />;
  }

  if (isLoading && !game) {
    return <StatusMessage tone="info" message="Loading stats report..." />;
  }

  if (!game) {
    return (
      <StatusMessage
        tone={status?.tone ?? "error"}
        message={status?.message ?? "The stats report could not be loaded."}
      />
    );
  }

  const leaders = [...statRows]
    .sort((left, right) => {
      const leftValue = viewMode === "full_match" ? left.totals.kill : left.currentSetTotals.kill;
      const rightValue = viewMode === "full_match" ? right.totals.kill : right.currentSetTotals.kill;
      return rightValue - leftValue;
    })
    .slice(0, 3);
  const topLeaderValue =
    leaders[0]
      ? viewMode === "full_match"
        ? leaders[0].totals.kill
        : leaders[0].currentSetTotals.kill
      : 0;

  return (
    <div className="grid">
      <section className="page-header page-panel page-hero">
        <div className="page-hero-main">
          <div className="eyebrow">Match report</div>
          <div className="hero-title-row">
            <div className="stack-compact">
              <span className="chip">Match stats report</span>
              <h2>Current match report: vs {game.opponent_name}</h2>

            </div>
            <div className="hero-meta">
              <div className="meta-pill">Mode: {viewMode === "full_match" ? "Full match" : `Set ${effectiveSet}`}</div>
              <div className="meta-pill">
                Sets won: <strong>{matchScore.us}-{matchScore.them}</strong>
              </div>
              <div className="meta-pill">Updates: {lastLoadedAt ? "Live" : "Waiting"}</div>
            </div>
          </div>
        </div>
        <div className="page-hero-side">
          <div className="metric-card">
            <p>Game date</p>
            <div className="metric-value" style={{ fontSize: "1.2rem" }}>
              {formatDateTime(game.game_date)}
            </div>
          </div>
          <div className="cluster hero-actions">
            <Link
              className="button-ghost"
              to={game.status === "completed" ? `/app/summary/${game.id}` : `/app/games/${game.id}`}
            >
              {game.status === "completed" ? "Back to summary" : "Back to dashboard"}
            </Link>
          </div>
        </div>
      </section>

      {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}

      <section className="card" style={{ padding: "0.75rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Mode toggle */}
          <div className="segmented-control" aria-label="Report view mode" style={{ flexShrink: 0 }}>
            <button
              className={`button-ghost segment-button ${viewMode === "current_set" ? "is-active" : ""}`}
              type="button"
              aria-pressed={viewMode === "current_set"}
              onClick={() => setViewMode("current_set")}
            >
              Set
            </button>
            <button
              className={`button-ghost segment-button ${viewMode === "full_match" ? "is-active" : ""}`}
              type="button"
              aria-pressed={viewMode === "full_match"}
              onClick={() => setViewMode("full_match")}
            >
              Match
            </button>
          </div>

          {/* Set buttons — only when in set mode */}
          {viewMode === "current_set" && (
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {trackedSetNumbers.map((setNumber) => (
                <button
                  key={setNumber}
                  type="button"
                  onClick={() => setSelectedSet(setNumber)}
                  style={{
                    padding: "0.3rem 0.7rem",
                    borderRadius: "999px",
                    border: "1.5px solid",
                    borderColor: effectiveSet === setNumber ? "var(--accent, #3b82f6)" : "var(--line)",
                    background: effectiveSet === setNumber ? "var(--accent, #3b82f6)" : "transparent",
                    color: effectiveSet === setNumber ? "#fff" : "var(--text-2)",
                    fontWeight: effectiveSet === setNumber ? 700 : 500,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    lineHeight: 1.4
                  }}
                >
                  Set {setNumber}{setNumber === game.current_set ? " ·" : ""}
                </button>
              ))}
            </div>
          )}

          {/* Quick stats */}
          <div style={{ display: "flex", gap: "1rem", marginLeft: "auto", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>
              Kills <strong style={{ color: "var(--text-strong)" }}>{displayedTotals.kill}</strong>
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>
              Digs <strong style={{ color: "var(--text-strong)" }}>{displayedTotals.dig}</strong>
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>
              Sets <strong style={{ color: "var(--text-strong)" }}>{matchScore.us}–{matchScore.them}</strong>
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-3, #aaa)" }}>
              {lastLoadedAt ? `Updated ${formatDateTime(lastLoadedAt)}` : "Loading..."}
            </span>
          </div>
        </div>
      </section>

      <section className="card stack feature-panel">
        <div className="section-copy">
          <h3>Score by set</h3>
        </div>
        <div className="score-strip">
          {trackedSetNumbers.map((setNumber) => {
            const setScore = getSetScore(scoreBySet, setNumber);

            return (
              <div
                className={`list-item ${setNumber === game.current_set ? "is-current-set" : ""}`}
                key={setNumber}
              >
                <strong>Set {setNumber}</strong>
                <div className="supporting-text">
                  {setScore.us}-{setScore.them}
                </div>
                <div className="supporting-text">
                  {setNumber === game.current_set ? "Current set" : "Saved set snapshot"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card stack feature-panel">
        <div className="section-copy">
          <h3>Stat leaders</h3>
        </div>
        {leaders.length === 0 ? (
          <StatusMessage tone="info" message="No stat leaders yet because no plays have been saved." />
        ) : (
          <div className="leaderboard-list">
            {leaders.map((row) => {
              const leaderValue =
                viewMode === "full_match" ? row.totals.kill : row.currentSetTotals.kill;
              const barWidth =
                topLeaderValue > 0 ? Math.max(12, Math.round((leaderValue / topLeaderValue) * 100)) : 12;

              return (
                <div className="list-item stack" key={row.playerId} style={{ gap: "0.65rem" }}>
                  <div className="cluster section-header">
                    <strong>
                      #{row.jerseyNumber} {row.playerName}
                    </strong>
                    <div className="supporting-text" style={{ display: "flex", gap: "0.75rem" }}>
                      <span>Kills {leaderValue}</span>
                      <span>Aces {viewMode === "full_match" ? row.totals.ace : row.currentSetTotals.ace}</span>
                      <span>Blocks {viewMode === "full_match" ? row.totals.block : row.currentSetTotals.block}</span>
                    </div>
                  </div>
                  <div className="leader-bar-track">
                    <div className="leader-bar-fill" style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="info-grid">
        <section className="card stack feature-panel table-card">
          <div className="section-copy">
          <h3>Player stat table</h3>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Set kills</th>
                <th>Set aces</th>
                <th>Set digs</th>
                <th>Set errors</th>
                <th>Match kills</th>
                <th>Match aces</th>
                <th>Match digs</th>
                <th>Match errors</th>
              </tr>
            </thead>
            <tbody>
              {activeEvents.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="table-empty-state">
                      The report fills in after you save the first play. Until then, the set scores you
                      entered still describe the match.
                    </div>
                  </td>
                </tr>
              ) : (
                statRows.map((row) => (
                  <tr key={row.playerId}>
                    <td>
                      <strong>
                        #{row.jerseyNumber} {row.playerName}
                      </strong>
                    </td>
                    <td>{row.currentSetTotals.kill}</td>
                    <td>{row.currentSetTotals.ace}</td>
                    <td>{row.currentSetTotals.dig}</td>
                    <td>
                      {row.currentSetTotals.serve_error +
                        row.currentSetTotals.reception_error +
                        row.currentSetTotals.attack_error}
                    </td>
                    <td>{row.totals.kill}</td>
                    <td>{row.totals.ace}</td>
                    <td>{row.totals.dig}</td>
                    <td>
                      {row.totals.serve_error + row.totals.reception_error + row.totals.attack_error}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="card stack feature-panel">
          <div className="section-copy">
            <h3>All tracked totals</h3>
          </div>
          <div className="grid three" style={{ gap: "0.5rem" }}>
            {trackedStatTypes.map((eventType) => (
              <div key={eventType} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.375rem 0.625rem", background: "var(--surface-2, rgba(255,255,255,0.04))", borderRadius: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>{titleCase(eventType)}</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{displayedTotals[eventType]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
