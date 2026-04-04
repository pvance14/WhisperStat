import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAppShell } from "@/app/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { createGame, listGames } from "@/lib/data";
import type { Database } from "@/lib/database.types";
import { requireSupabase } from "@/lib/supabase";
import { formatDateInputValue, formatDateTime, getErrorMessage, titleCase } from "@/lib/utils";

type GameRow = Database["public"]["Tables"]["games"]["Row"];

const defaultGameDate = formatDateInputValue(new Date().toISOString());

export const GameSetupPage = () => {
  const { selectedTeam, selectedTeamId } = useAppShell();
  const [games, setGames] = useState<GameRow[]>([]);
  const [status, setStatus] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(
    null
  );
  const [draft, setDraft] = useState({
    opponent_name: "",
    game_date: defaultGameDate,
    location: "",
    status: "in_progress" as GameRow["status"],
    current_set: 1
  });

  const loadGames = async () => {
    if (!selectedTeamId) {
      setGames([]);
      return;
    }

    try {
      const nextGames = await listGames(requireSupabase(), selectedTeamId);
      setGames(nextGames);
    } catch (error) {
      setStatus({
        tone: "error",
        message: getErrorMessage(error)
      });
    }
  };

  useEffect(() => {
    void loadGames();
  }, [selectedTeamId]);

  return (
    <div className="grid two">
      <section className="card stack">
        <div>
          <span className="chip">Game setup</span>
          <h3>Create a match context</h3>
          <p className="supporting-text">
            Opponent, date, and venue anchor each match so live capture and reports stay tied to
            the right context.
          </p>
        </div>

        {!selectedTeam ? (
          <StatusMessage tone="info" message="Select a team first, then create a game for it here." />
        ) : (
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              setStatus(null);

              void createGame(requireSupabase(), {
                team_id: selectedTeam.id,
                opponent_name: draft.opponent_name.trim(),
                game_date: new Date(draft.game_date).toISOString(),
                location: draft.location.trim() || null,
                status: draft.status,
                current_set: Number(draft.current_set)
              })
                .then(async () => {
                  setDraft({
                    opponent_name: "",
                    game_date: defaultGameDate,
                    location: "",
                    status: "in_progress",
                    current_set: 1
                  });
                  await loadGames();
                  setStatus({
                    tone: "success",
                    message: "Game created. Dashboard and report routes are ready to use."
                  });
                })
                .catch((error) =>
                  setStatus({
                    tone: "error",
                    message: getErrorMessage(error)
                  })
                );
            }}
          >
            <label className="stack" style={{ gap: "0.4rem" }}>
              <span className="muted">Opponent</span>
              <input
                required
                placeholder="Mountain View HS"
                value={draft.opponent_name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, opponent_name: event.target.value }))
                }
              />
            </label>

            <div className="form-grid two">
              <label className="stack" style={{ gap: "0.4rem" }}>
                <span className="muted">Game date</span>
                <input
                  required
                  type="datetime-local"
                  value={draft.game_date}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, game_date: event.target.value }))
                  }
                />
              </label>

              <label className="stack" style={{ gap: "0.4rem" }}>
                <span className="muted">Location</span>
                <input
                  placeholder="Home gym"
                  value={draft.location}
                  onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
                />
              </label>

              <label className="stack" style={{ gap: "0.4rem" }}>
                <span className="muted">Status</span>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as GameRow["status"]
                    }))
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>

              <label className="stack" style={{ gap: "0.4rem" }}>
                <span className="muted">Current set</span>
                <input
                  required
                  type="number"
                  min={1}
                  value={draft.current_set}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, current_set: Number(event.target.value) }))
                  }
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="button" type="submit">
                Create game
              </button>
            </div>
          </form>
        )}

        {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}
      </section>

      <section className="card stack">
        <div>
          <h3>Existing games</h3>
          <p className="supporting-text">
            These links double as smoke paths for the dashboard and report routes.
          </p>
        </div>

        {games.length === 0 ? (
          <StatusMessage tone="info" message="No games yet for this team." />
        ) : (
          <div className="list">
            {games.map((game) => (
              <div className="list-item" key={game.id}>
                <strong>vs {game.opponent_name}</strong>
                <div className="supporting-text">{formatDateTime(game.game_date)}</div>
                <div className="supporting-text">
                  {titleCase(game.status)} · Set {game.current_set}
                </div>
                <div className="cluster" style={{ marginTop: "0.8rem" }}>
                  <Link className="button-secondary" to={`/app/games/${game.id}`}>
                    Dashboard
                  </Link>
                  <Link className="button-ghost" to={`/app/report/${game.id}`}>
                    Stats report
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
