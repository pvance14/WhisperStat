import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { StatusMessage } from "@/components/StatusMessage";
import { getGameBundle } from "@/lib/data";
import type { Database } from "@/lib/database.types";
import { buildPlayerStatRows, summarizeEvents } from "@/lib/stats";
import { requireSupabase } from "@/lib/supabase";
import { formatDateTime, getErrorMessage } from "@/lib/utils";

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

  useEffect(() => {
    if (!gameId) {
      return;
    }

    setIsLoading(true);

    void getGameBundle(requireSupabase(), gameId)
      .then((bundle) => {
        setGame(bundle.game);
        setPlayers(bundle.players);
        setEvents(bundle.events);
        setStatus(null);
      })
      .catch((error) =>
        {
          setGame(null);
          setStatus({
            tone: "error",
            message: getErrorMessage(error)
          });
        }
      )
      .finally(() => setIsLoading(false));
  }, [gameId]);

  const statRows = useMemo(
    () => (game ? buildPlayerStatRows(players, events, game.current_set) : []),
    [players, events, game]
  );
  const totals = useMemo(() => summarizeEvents(events), [events]);

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

  const leaders = [...statRows].sort((left, right) => right.totals.kill - left.totals.kill).slice(0, 3);

  return (
    <div className="grid">
      <section className="page-header page-panel">
        <div>
          <span className="chip">In-app visual stats report</span>
          <h2>Current match report: vs {game.opponent_name}</h2>
          <p>
            Phase 2 wires the report route early because the MVP explicitly includes an on-screen
            current-game stats report even though export remains stretch.
          </p>
        </div>
        <div className="metric-card">
          <p>Game date</p>
          <div className="metric-value" style={{ fontSize: "1.2rem" }}>
            {formatDateTime(game.game_date)}
          </div>
        </div>
      </section>

      {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}

      <div className="grid three">
        <div className="card stack">
          <h3>Kills</h3>
          <div className="metric-value">{totals.kill}</div>
          <p className="supporting-text">Whole-match total from persisted events.</p>
        </div>
        <div className="card stack">
          <h3>Digs</h3>
          <div className="metric-value">{totals.dig}</div>
          <p className="supporting-text">Useful placeholder for later defensive trends.</p>
        </div>
        <div className="card stack">
          <h3>Total errors</h3>
          <div className="metric-value">
            {totals.serve_error + totals.reception_error + totals.attack_error}
          </div>
          <p className="supporting-text">Attack, serve, and reception errors combined.</p>
        </div>
      </div>

      <section className="card stack">
        <div>
          <h3>Top attacking lines</h3>
          <p className="supporting-text">This is a current-game visual readout, not a PDF or exported report.</p>
        </div>
        <div className="grid three">
          {leaders.length === 0 ? (
            <StatusMessage tone="info" message="No stat leaders yet because the event log is empty." />
          ) : (
            leaders.map((row) => (
              <div className="list-item" key={row.playerId}>
                <strong>
                  #{row.jerseyNumber} {row.playerName}
                </strong>
                <div className="supporting-text">Kills: {row.totals.kill}</div>
                <div className="supporting-text">Aces: {row.totals.ace}</div>
                <div className="supporting-text">Blocks: {row.totals.block}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card stack">
        <div>
          <h3>Full player summary</h3>
          <p className="supporting-text">This table becomes the base for Phase 6 narrative generation.</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Kills</th>
              <th>Aces</th>
              <th>Blocks</th>
              <th>Digs</th>
              <th>Sets</th>
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
                <td>{row.totals.kill}</td>
                <td>{row.totals.ace}</td>
                <td>{row.totals.block}</td>
                <td>{row.totals.dig}</td>
                <td>{row.totals.set}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};
