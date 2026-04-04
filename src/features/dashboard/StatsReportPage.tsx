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
              <span className="chip">Phase 6 in-app visual stats report</span>
              <h2>Current match report: vs {game.opponent_name}</h2>
              <p>
                This report should answer the big questions fast: what set or match view you are in,
                what the score says, and who is standing out.
              </p>
            </div>
            <div className="hero-meta">
              <div className="meta-pill">Mode: {viewMode === "full_match" ? "Full match" : `Set ${effectiveSet}`}</div>
              <div className="meta-pill">
                Sets won: <strong>{matchScore.us}-{matchScore.them}</strong>
              </div>
              <div className="meta-pill">Sync: {lastLoadedAt ? "Live" : "Waiting"}</div>
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
            <Link className="button-ghost" to={`/app/games/${game.id}`}>
              Back to dashboard
            </Link>
            {game.status === "completed" ? (
              <Link className="button-secondary" to={`/app/summary/${game.id}`}>
                Open summary
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}

      <section className="card stack feature-panel">
        <div className="section-toolbar">
          <div className="section-copy">
            <h3>View controls</h3>
            <p className="supporting-text">
              Current set stays obvious for live use, but you can also flip to full-match totals without leaving the game.
            </p>
          </div>
          <div className="supporting-text">
            {lastLoadedAt ? `Last sync ${formatDateTime(lastLoadedAt)}` : "Waiting for first sync..."}
          </div>
        </div>

        <div className="section-toolbar">
          <div className="segmented-control" aria-label="Report view mode">
            <button
              className={`button-ghost segment-button ${viewMode === "current_set" ? "is-active" : ""}`}
              type="button"
              aria-pressed={viewMode === "current_set"}
              onClick={() => setViewMode("current_set")}
            >
              Current set
            </button>
            <button
              className={`button-ghost segment-button ${viewMode === "full_match" ? "is-active" : ""}`}
              type="button"
              aria-pressed={viewMode === "full_match"}
              onClick={() => setViewMode("full_match")}
            >
              Full match
            </button>
          </div>
          <label className="stack" style={{ gap: "0.35rem", minWidth: "11rem" }}>
            <span className="muted">Set focus</span>
            <select
              value={effectiveSet}
              onChange={(event) => setSelectedSet(Number(event.target.value))}
            >
              {trackedSetNumbers.map((setNumber) => (
                <option key={setNumber} value={setNumber}>
                  Set {setNumber}
                  {setNumber === game.current_set ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="summary-strip">
        <div className="summary-tile featured">
          <div className="summary-label">{viewMode === "full_match" ? "Match kills" : `Set ${effectiveSet} kills`}</div>
          <div className="summary-value">{displayedTotals.kill}</div>
          <div className="summary-support">Confirmed, non-deleted events only.</div>
        </div>
        <div className="summary-tile">
          <div className="summary-label">{viewMode === "full_match" ? "Match digs" : `Set ${effectiveSet} digs`}</div>
          <div className="summary-value">{displayedTotals.dig}</div>
          <div className="summary-support">The same aggregate rules used on the dashboard.</div>
        </div>
        <div className="summary-tile">
          <div className="summary-label">Sets won</div>
          <div className="summary-value">
            {matchScore.us}-{matchScore.them}
          </div>
          <div className="summary-support">Calculated from the saved manual set scores.</div>
        </div>
        <div className="summary-tile">
          <div className="summary-label">Focus</div>
          <div className="summary-value">{viewMode === "full_match" ? "All" : effectiveSet}</div>
          <div className="summary-support">
            {viewMode === "full_match" ? "Whole match overview." : "Single-set view for live coaching."}
          </div>
        </div>
      </div>

      <section className="card stack feature-panel">
        <div className="section-copy">
          <h3>Score by set</h3>
          <p className="supporting-text">
            Manual scorekeeping persists on the game record, so refreshes and the report route agree on the match state.
          </p>
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
          <p className="supporting-text">
            Lightweight visuals are enough here. The goal is fast comparison, not a polished export artifact.
          </p>
        </div>
        {leaders.length === 0 ? (
          <StatusMessage tone="info" message="No stat leaders yet because the event log is empty." />
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
                    <div>
                      <strong>
                        #{row.jerseyNumber} {row.playerName}
                      </strong>
                      <div className="supporting-text">
                        {viewMode === "full_match" ? "Whole match" : `Set ${effectiveSet}`} kills: {leaderValue}
                      </div>
                    </div>
                    <div className="supporting-text">
                      Aces {viewMode === "full_match" ? row.totals.ace : row.currentSetTotals.ace} · Blocks{" "}
                      {viewMode === "full_match" ? row.totals.block : row.currentSetTotals.block}
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
          <p className="supporting-text">
            Each row keeps both the focused set and the whole match visible so coaches can glance at context without switching pages.
          </p>
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
                      The report will populate after the first confirmed event. Until then, saved set
                      scores still show match context.
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
            <p className="supporting-text">
              This is the compact cross-check section for the MVP stat vocabulary.
            </p>
          </div>
          <div className="grid three">
            {trackedStatTypes.map((eventType) => (
              <div className="list-item" key={eventType}>
                <strong>{titleCase(eventType)}</strong>
                <div className="metric-value" style={{ fontSize: "1.5rem" }}>
                  {displayedTotals[eventType]}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
