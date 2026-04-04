import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "@/app/AuthProvider";
import { LoadingState } from "@/components/LoadingState";
import { StatusMessage } from "@/components/StatusMessage";
import { listTeams } from "@/lib/data";
import { appLog } from "@/lib/logger";
import { requireSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/utils";

type TeamRow = Database["public"]["Tables"]["teams"]["Row"];

interface AppShellContextValue {
  teams: TeamRow[];
  selectedTeamId: string | null;
  selectedTeam: TeamRow | null;
  isLoadingTeams: boolean;
  teamError: string | null;
  setSelectedTeamId: (teamId: string) => void;
  refreshTeams: () => Promise<void>;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);
const selectedTeamStorageKey = "whisperstat.selectedTeamId";

const readStoredTeamId = () =>
  typeof window === "undefined" ? null : window.localStorage.getItem(selectedTeamStorageKey);

export const AppShell = ({ children }: PropsWithChildren) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(readStoredTeamId());
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);

  const refreshTeams = async () => {
    try {
      setTeamError(null);
      setIsLoadingTeams(true);
      const nextTeams = await listTeams(requireSupabase());
      setTeams(nextTeams);

      const storedTeamId = readStoredTeamId();
      const nextSelectedTeamId =
        (storedTeamId && nextTeams.some((team) => team.id === storedTeamId) && storedTeamId) ||
        (selectedTeamId && nextTeams.some((team) => team.id === selectedTeamId) && selectedTeamId) ||
        nextTeams[0]?.id ||
        null;

      setSelectedTeamIdState(nextSelectedTeamId);
      if (nextSelectedTeamId) {
        window.localStorage.setItem(selectedTeamStorageKey, nextSelectedTeamId);
      }
    } catch (error) {
      setTeamError(getErrorMessage(error));
    } finally {
      setIsLoadingTeams(false);
    }
  };

  useEffect(() => {
    void refreshTeams();
  }, [user?.id]);

  const setSelectedTeamId = (teamId: string) => {
    setSelectedTeamIdState(teamId);
    window.localStorage.setItem(selectedTeamStorageKey, teamId);
    appLog("info", "teams.selected", { teamId });
  };

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;

  const contextValue = useMemo<AppShellContextValue>(
    () => ({
      teams,
      selectedTeamId,
      selectedTeam,
      isLoadingTeams,
      teamError,
      setSelectedTeamId,
      refreshTeams
    }),
    [teams, selectedTeamId, selectedTeam, isLoadingTeams, teamError]
  );

  if (isLoadingTeams) {
    return <LoadingState label="Loading your teams" />;
  }

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className="app-shell">
        <div className="mobile-top-bar">
          <div className="brand-mark">WS</div>
          <select
            value={selectedTeamId ?? ""}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            disabled={teams.length === 0}
          >
            {teams.length === 0 ? <option value="">Create team</option> : null}
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">WS</div>
          <div className="brand-copy">
            <h1>WhisperStat</h1>
            <p>Phase 6 MVP loop for roster setup, live capture, reports, and post-game review.</p>
          </div>
        </div>

          <div className="sidebar-panel stack">
            <div>
              <strong>Coach session</strong>
              <p className="supporting-text" style={{ marginTop: "0.35rem" }}>
                {user?.email ?? "Signed in"}
              </p>
            </div>
            <label className="stack" style={{ gap: "0.4rem" }}>
              <span className="muted">Active team</span>
              <select
                value={selectedTeamId ?? ""}
                onChange={(event) => setSelectedTeamId(event.target.value)}
                disabled={teams.length === 0}
              >
                {teams.length === 0 ? <option value="">Create your first team</option> : null}
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            {teamError ? <StatusMessage tone="error" message={teamError} /> : null}
          </div>

          <nav style={{ marginTop: "1rem" }}>
            <NavLink to="/app" end className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
              <span>Overview</span>
              <span className="muted">{teams.length} teams</span>
            </NavLink>
            <NavLink to="/app/roster" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
              <span>Roster</span>
              <span className="muted">Players</span>
            </NavLink>
            <NavLink
              to="/app/games/new"
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            >
              <span>Game Setup</span>
              <span className="muted">Matches</span>
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            <button
              className="button-secondary"
              type="button"
              onClick={() => {
                void signOut().then(() => navigate("/auth"));
              }}
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="main-content">
          {teams.length === 0 ? (
            <StatusMessage
              tone="info"
              message="No teams yet. Use the overview page to create one, then the roster and game setup pages will unlock."
            />
          ) : null}
          {children ?? <Outlet />}
        </main>

        <nav className="mobile-bottom-bar">
          <NavLink to="/app" end className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <span>Dashboard</span>
            <span className="muted">Teams</span>
          </NavLink>
          <NavLink to="/app/roster" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <span>Roster</span>
            <span className="muted">Players</span>
          </NavLink>
          <NavLink
            to="/app/games/new"
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <span>Play</span>
            <span className="muted">Matches</span>
          </NavLink>
        </nav>
      </div>
    </AppShellContext.Provider>
  );
};

export const useAppShell = () => {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error("useAppShell must be used inside AppShell.");
  }

  return context;
};
