import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAppShell } from "@/app/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { createGame, createTeam, listGames, listPlayers, updateGame } from "@/lib/data";
import type { Database } from "@/lib/database.types";
import { requireSupabase } from "@/lib/supabase";
import { formatDateTime, getErrorMessage } from "@/lib/utils";

type GameRow = Database["public"]["Tables"]["games"]["Row"];

export const OverviewPage = () => {
  const navigate = useNavigate();
  const { teams, selectedTeam, selectedTeamId, setSelectedTeamId, refreshTeams } = useAppShell();
  const [teamName, setTeamName] = useState("");
  const [recentGames, setRecentGames] = useState<GameRow[]>([]);
  const [hasPlayers, setHasPlayers] = useState<boolean | null>(null);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [opponentDraft, setOpponentDraft] = useState("");

  useEffect(() => {
    if (!selectedTeamId) {
      setRecentGames([]);
      setHasPlayers(null);
      return;
    }

    const loadData = async () => {
      try {
        const [games, players] = await Promise.all([
          listGames(requireSupabase(), selectedTeamId),
          listPlayers(requireSupabase(), selectedTeamId)
        ]);
        setRecentGames(games.slice(0, 4));
        setHasPlayers(players.length > 0);
      } catch (error) {
        setStatus({
          tone: "error",
          message: getErrorMessage(error)
        });
      }
    };
    void loadData();
  }, [selectedTeamId]);

  const handleSaveOpponentName = async (gameId: string) => {
    if (!opponentDraft.trim()) return;
    try {
      await updateGame(requireSupabase(), gameId, { opponent_name: opponentDraft.trim() });
      setRecentGames((current) =>
        current.map((g) => g.id === gameId ? { ...g, opponent_name: opponentDraft.trim() } : g)
      );
      setEditingGameId(null);
      setOpponentDraft("");
    } catch (error) {
      setStatus({ tone: "error", message: getErrorMessage(error) });
    }
  };

  const handleStartQuickMatch = async () => {
    if (!selectedTeam) return;
    setStatus(null);
    setIsWorking(true);
    try {
      const newGame = await createGame(requireSupabase(), {
        team_id: selectedTeam.id,
        opponent_name: "Unknown Opponent",
        game_date: new Date().toISOString(),
        location: "",
        status: "in_progress",
        current_set: 1
      });
      navigate(`/app/games/${newGame.id}`);
    } catch (error) {
      setStatus({ tone: "error", message: getErrorMessage(error) });
      setIsWorking(false);
    }
  };

  if (teams.length === 0) {
    return (
      <div className="setup-shell" style={{ minHeight: 'auto', padding: 0 }}>
        <section className="setup-card card stack" style={{ width: '100%', maxWidth: '100%' }}>
          <div>
            <span className="chip">Welcome</span>
            <h2 style={{ fontSize: "2rem", marginTop: "0.5rem" }}>Create your first team</h2>
            <p className="supporting-text" style={{ fontSize: "1.1rem" }}>
              Let's set up your squad so you can jump right into live gametime stats tracking.
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
                autoFocus
                placeholder="Varsity Volleyball"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
              />
            </label>
            <div className="form-actions" style={{ marginTop: "1rem" }}>
              <button className="button" type="submit" disabled={isWorking} style={{ width: "100%", padding: "1.2rem", fontSize: "1.1rem" }}>
                {isWorking ? "Saving..." : "Create Team"}
              </button>
            </div>
          </form>
          {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}
        </section>
      </div>
    );
  }

  if (hasPlayers === false) {
    return (
      <div className="setup-shell" style={{ minHeight: 'auto', padding: 0 }}>
        <section className="setup-card card stack" style={{ width: '100%', maxWidth: '100%' }}>
          <div>
            <span className="chip">Setup Required</span>
            <h2 style={{ fontSize: "2rem", marginTop: "0.5rem" }}>Add players to {selectedTeam?.name}</h2>
            <p className="supporting-text" style={{ fontSize: "1.1rem" }}>
              Before you can capture stats, the AI needs to know your roster so it can recognize player names and numbers.
            </p>
          </div>
          <div className="cluster" style={{ marginTop: "1rem" }}>
            <Link className="button" to="/app/roster" style={{ padding: "1.2rem", fontSize: "1.1rem", width: "100%" }}>
              Go to Roster Setup
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const todayStr = new Date().toDateString();
  const gameToday = recentGames.find(
    (g) => new Date(g.game_date).toDateString() === todayStr && g.status === "in_progress"
  );

  return (
    <div className="grid">
      <section className="card stack" style={{ background: "linear-gradient(135deg, rgba(8, 27, 58, 0.98), rgba(18, 48, 95, 0.98))", color: "white", padding: "2.5rem 1.5rem" }}>
        {gameToday ? (
          <>
            <div>
              <span className="chip" style={{ background: "rgba(255, 255, 255, 0.2)", color: "white", border: "none" }}>Active Match Found</span>
              <h2 style={{ color: "white", fontSize: "2.5rem", marginTop: "0.5rem", marginBottom: "0.5rem" }}>Game in progress!</h2>
              <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "1.1rem" }}>
                You have a match against {gameToday.opponent_name} happening right now.
              </p>
            </div>
            <Link 
              className="button" 
              to={`/app/games/${gameToday.id}`}
              style={{ padding: "1.5rem", fontSize: "1.2rem", marginTop: "1rem", boxShadow: "0 10px 25px rgba(255, 107, 44, 0.4)" }}
            >
              Resume Today's Match
            </Link>
          </>
        ) : (
          <>
            <div>
              <span className="chip" style={{ background: "rgba(255, 255, 255, 0.2)", color: "white", border: "none" }}>Live Capture</span>
              <h2 style={{ color: "white", fontSize: "2.5rem", marginTop: "0.5rem", marginBottom: "0.5rem" }}>Ready to track?</h2>
              <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "1.1rem" }}>
                Hit start to immediately open the microphone and begin logging stats for {selectedTeam?.name}.
              </p>
            </div>
            <button 
              className="button" 
              onClick={handleStartQuickMatch} 
              disabled={isWorking}
              style={{ padding: "1.5rem", fontSize: "1.2rem", marginTop: "1rem", boxShadow: "0 10px 25px rgba(255, 107, 44, 0.4)" }}
            >
              {isWorking ? "Starting..." : "Start Live Match"}
            </button>
          </>
        )}
        {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}
      </section>

      <div className="grid two">
        <section className="card stack">
          <div>
            <h3>Recent games</h3>
            <p className="supporting-text">View reports and summaries from past matches.</p>
          </div>

          <div className="list">
            {recentGames.length === 0 ? (
              <div className="list-item">
                <strong>No games yet</strong>
                <div className="supporting-text">Capture your first match to see it here.</div>
              </div>
            ) : (
              recentGames.map((game) => (
                <div className="list-item" key={game.id}>
                  {editingGameId === game.id ? (
                    <form
                      className="stack"
                      style={{ gap: "0.5rem" }}
                      onSubmit={(e) => { e.preventDefault(); void handleSaveOpponentName(game.id); }}
                    >
                      <input
                        value={opponentDraft}
                        onChange={(e) => setOpponentDraft(e.target.value)}
                        placeholder="Opponent name"
                        style={{ borderRadius: "0.75rem" }}
                        autoFocus
                      />
                      <div className="form-actions">
                        <button className="button-secondary" type="submit" disabled={!opponentDraft.trim()}>
                          Save
                        </button>
                        <button
                          className="button-ghost"
                          type="button"
                          onClick={() => { setEditingGameId(null); setOpponentDraft(""); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="cluster" style={{ gap: "0.5rem", alignItems: "center" }}>
                        <strong>vs {game.opponent_name}</strong>
                        <button
                          className="button-ghost"
                          type="button"
                          style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
                          onClick={() => { setEditingGameId(game.id); setOpponentDraft(game.opponent_name ?? ""); }}
                        >
                          Rename
                        </button>
                      </div>
                      <div className="supporting-text">{formatDateTime(game.game_date)}</div>
                      <div className="cluster" style={{ marginTop: "0.8rem" }}>
                        <Link
                          className="button-secondary"
                          to={game.status === "completed" ? `/app/summary/${game.id}` : `/app/games/${game.id}`}
                        >
                          Dashboard
                        </Link>
                        <Link className="button-ghost" to={`/app/report/${game.id}`}>
                          Report
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card stack" style={{ alignSelf: "start" }}>
          <div>
            <h3>Team Settings</h3>
            <p className="supporting-text">Make quick adjustments to {selectedTeam?.name}.</p>
          </div>
          {teams.length > 1 && (
            <div className="stack" style={{ gap: "0.4rem" }}>
              <span className="muted">Switch team</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeamId(team.id)}
                    style={{
                      textAlign: "left",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "0.75rem",
                      border: "1.5px solid",
                      borderColor: selectedTeamId === team.id ? "var(--accent, #3b82f6)" : "var(--line)",
                      background: selectedTeamId === team.id ? "var(--accent-subtle, #eff6ff)" : "transparent",
                      color: selectedTeamId === team.id ? "var(--accent, #3b82f6)" : "var(--text)",
                      fontWeight: selectedTeamId === team.id ? 700 : 500,
                      cursor: "pointer",
                    }}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="cluster">
            <Link className="button-secondary" to="/app/roster">
              Manage Roster
            </Link>
            <Link className="button-ghost" to="/app/games/new">
              Advanced Game Setup
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

