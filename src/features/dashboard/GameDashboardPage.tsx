import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { StatusMessage } from "@/components/StatusMessage";
import { getGameBundle } from "@/lib/data";
import type { Database } from "@/lib/database.types";
import { buildPlayerStatRows, summarizeEvents, trackedStatTypes } from "@/lib/stats";
import { requireSupabase } from "@/lib/supabase";
import { formatDateTime, getErrorMessage, titleCase } from "@/lib/utils";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type StatEventRow = Database["public"]["Tables"]["stat_events"]["Row"];

export const GameDashboardPage = () => {
  const { gameId } = useParams();
  const [game, setGame] = useState<GameRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [events, setEvents] = useState<StatEventRow[]>([]);
  const [status, setStatus] = useState<{ tone: "info" | "error"; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!gameId) {
      return;
    }

    let isActive = true;

    const load = async () => {
      try {
        setIsLoading(true);
        const nextBundle = await getGameBundle(requireSupabase(), gameId);
        if (!isActive) {
          return;
        }

        setGame(nextBundle.game);
        setPlayers(nextBundle.players);
        setEvents(nextBundle.events);
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

  if (!gameId) {
    return <StatusMessage tone="error" message="Game id is missing from the route." />;
  }

  if (isLoading && !game) {
    return <StatusMessage tone="info" message="Loading game dashboard..." />;
  }

  if (!game) {
    return (
      <StatusMessage
        tone={status?.tone ?? "error"}
        message={status?.message ?? "The game could not be loaded."}
      />
    );
  }

  const statRows = buildPlayerStatRows(players, events, game.current_set);
  const totals = summarizeEvents(events);

  return (
    <div className="grid">
      <section className="page-header page-panel">
        <div>
          <span className="chip">Live dashboard scaffold</span>
          <h2>
            {game.opponent_name} · Set {game.current_set}
          </h2>
          <p>
            Phase 2 keeps this route focused on persisted match state, polling, and stat-table
            structure so Phase 3 can plug capture into a real target.
          </p>
        </div>
        <div className="cluster">
          <Link className="button-secondary" to={`/app/report/${game.id}`}>
            Open report view
          </Link>
        </div>
      </section>

      {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}

      <div className="grid three">
        <div className="metric-card">
          <p>Game date</p>
          <div className="metric-value" style={{ fontSize: "1.3rem" }}>
            {formatDateTime(game.game_date)}
          </div>
        </div>
        <div className="metric-card">
          <p>Status</p>
          <div className="metric-value">{titleCase(game.status)}</div>
        </div>
        <div className="metric-card">
          <p>Tracked events</p>
          <div className="metric-value">{events.filter((event) => event.deleted_at === null).length}</div>
        </div>
      </div>

      <section className="card stack">
        <div>
          <h3>Event totals</h3>
          <p className="supporting-text">Current foundation counts persisted rows only. Capture arrives in Phase 3.</p>
        </div>
        <div className="grid three">
          {trackedStatTypes.map((eventType) => (
            <div className="list-item" key={eventType}>
              <strong>{titleCase(eventType)}</strong>
              <div className="metric-value" style={{ fontSize: "1.5rem" }}>
                {totals[eventType]}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div>
          <h3>Per-player set table</h3>
          <p className="supporting-text">
            The schema, route, and polling path are in place. Later phases will fill these numbers
            with confirmed voice events.
          </p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Kill</th>
              <th>Ace</th>
              <th>Block</th>
              <th>Dig</th>
              <th>Errors</th>
            </tr>
          </thead>
          <tbody>
            {statRows.map((row) => (
              <tr key={row.playerId}>
                <td>
                  <strong>
                    #{row.jerseyNumber} {row.playerName}
                  </strong>
                </td>
                <td>{row.currentSetTotals.kill}</td>
                <td>{row.currentSetTotals.ace}</td>
                <td>{row.currentSetTotals.block}</td>
                <td>{row.currentSetTotals.dig}</td>
                <td>
                  {row.currentSetTotals.serve_error +
                    row.currentSetTotals.reception_error +
                    row.currentSetTotals.attack_error}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};
