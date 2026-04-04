import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAppShell } from "@/app/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { createTeam, listGames, updateTeam } from "@/lib/data";
import type { Database } from "@/lib/database.types";
import { requireSupabase } from "@/lib/supabase";
import { formatDateTime, getErrorMessage } from "@/lib/utils";

type GameRow = Database["public"]["Tables"]["games"]["Row"];

export const OverviewPage = () => {
  const { teams, selectedTeam, selectedTeamId, refreshTeams } = useAppShell();
  const [teamName, setTeamName] = useState("");
  const [renameValue, setRenameValue] = useState(selectedTeam?.name ?? "");
  const [recentGames, setRecentGames] = useState<GameRow[]>([]);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(
    null
  );
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    setRenameValue(selectedTeam?.name ?? "");
  }, [selectedTeam?.id, selectedTeam?.name]);

  useEffect(() => {
    if (!selectedTeamId) {
      setRecentGames([]);
      return;
    }

    void listGames(requireSupabase(), selectedTeamId)
      .then((games) => setRecentGames(games.slice(0, 4)))
      .catch((error) =>
        setStatus({
          tone: "error",
          message: getErrorMessage(error)
        })
      );
  }, [selectedTeamId]);

  return (
    <div className="grid">
      <section className="page-header page-panel">
        <div>
          <span className="chip">Overview</span>
          <h2>Your teams and setup</h2>
          <p>
            When you are signed in, manage teams, rosters, and games from here, with quick links into
            live tracking and reports.
          </p>
        </div>
        <div className="cluster">
          <div className="metric-card">
            <p>Teams ready</p>
            <div className="metric-value">{teams.length}</div>
          </div>
        </div>
      </section>

      {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}

      <div className="grid two">
        <section className="card stack">
          <div>
            <h3>Create a team</h3>
            <p className="supporting-text">
              You can run several teams under one account—handy for school, club, or separate squads.
            </p>
          </div>

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              setStatus(null);
              setIsWorking(true);

              void createTeam(requireSupabase(), { name: teamName })
                .then(async () => {
                  setTeamName("");
                  await refreshTeams();
                  setStatus({
                    tone: "success",
                    message: "Team created. You can switch to it from the left sidebar."
                  });
                })
                .catch((error) =>
                  setStatus({
                    tone: "error",
                    message: getErrorMessage(error)
                  })
                )
                .finally(() => setIsWorking(false));
            }}
          >
            <label className="stack" style={{ gap: "0.4rem" }}>
              <span className="muted">Team name</span>
              <input
                required
                placeholder="Varsity Volleyball"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
              />
            </label>
            <div className="form-actions">
              <button className="button" type="submit" disabled={isWorking}>
                {isWorking ? "Saving..." : "Create team"}
              </button>
            </div>
          </form>
        </section>

        <section className="card stack">
          <div>
            <h3>Rename active team</h3>
            <p className="supporting-text">
              Rename the active team when the name changes so roster and games stay aligned.
            </p>
          </div>

          {!selectedTeam ? (
            <StatusMessage tone="info" message="Create a team first to unlock team-level editing." />
          ) : (
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                setStatus(null);
                setIsWorking(true);

                void updateTeam(requireSupabase(), selectedTeam.id, { name: renameValue })
                  .then(async () => {
                    await refreshTeams();
                    setStatus({
                      tone: "success",
                      message: "Team name updated."
                    });
                  })
                  .catch((error) =>
                    setStatus({
                      tone: "error",
                      message: getErrorMessage(error)
                    })
                  )
                  .finally(() => setIsWorking(false));
              }}
            >
              <label className="stack" style={{ gap: "0.4rem" }}>
                <span className="muted">Selected team</span>
                <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
              </label>
              <div className="form-actions">
                <button className="button-secondary" type="submit" disabled={isWorking}>
                  Save rename
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      <div className="grid two">
        <section className="card stack">
          <div>
            <h3>Next setup steps</h3>
            <p className="supporting-text">
              Finish roster and game setup here, then jump into capture from the dashboard.
            </p>
          </div>

          <div className="cluster">
            <Link className="button" to="/app/roster">
              Manage roster
            </Link>
            <Link className="button-secondary" to="/app/games/new">
              Create game
            </Link>
          </div>
        </section>

        <section className="card stack">
          <div>
            <h3>Recent games for active team</h3>
            <p className="supporting-text">Open a game from the list to use the live dashboard and reports.</p>
          </div>

          {selectedTeam ? (
            <div className="list">
              {recentGames.length === 0 ? (
                <div className="list-item">
                  <strong>No games yet</strong>
                  <div className="supporting-text">Create the first match to start tracking from the dashboard.</div>
                </div>
              ) : (
                recentGames.map((game) => (
                  <div className="list-item" key={game.id}>
                    <strong>vs {game.opponent_name}</strong>
                    <div className="supporting-text">{formatDateTime(game.game_date)}</div>
                    <div className="cluster" style={{ marginTop: "0.8rem" }}>
                      <Link className="button-secondary" to={`/app/games/${game.id}`}>
                        Open dashboard
                      </Link>
                      <Link className="button-ghost" to={`/app/report/${game.id}`}>
                        Open report
                      </Link>
                      {game.status === "completed" ? (
                        <Link className="button-ghost" to={`/app/summary/${game.id}`}>
                          Open summary
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <StatusMessage tone="info" message="Select or create a team to see its recent games." />
          )}
        </section>
      </div>
    </div>
  );
};
