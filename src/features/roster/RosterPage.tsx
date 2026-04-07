import { useEffect, useState } from "react";

import { useAppShell } from "@/app/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { createPlayer, deletePlayer, listPlayers, updatePlayer } from "@/lib/data";
import type { Database } from "@/lib/database.types";
import { requireSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"];

const blankPlayer = {
  first_name: "",
  last_name: "",
  jersey_number: 1,
  position: "",
  aliases: ""
};

export const RosterPage = () => {
  const { selectedTeam, selectedTeamId } = useAppShell();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [draft, setDraft] = useState(blankPlayer);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(
    null
  );

  const loadPlayers = async () => {
    if (!selectedTeamId) {
      setPlayers([]);
      return;
    }

    try {
      const nextPlayers = await listPlayers(requireSupabase(), selectedTeamId);
      setPlayers(nextPlayers);
    } catch (error) {
      setStatus({
        tone: "error",
        message: getErrorMessage(error)
      });
    }
  };

  useEffect(() => {
    void loadPlayers();
  }, [selectedTeamId]);

  return (
    <div className="grid two">
      <section className="card stack">
        <div>
          <span className="chip">Roster</span>
          <h3>{editingPlayerId ? "Edit player" : "Add player"}</h3>
          <p className="supporting-text">
            Each jersey number must be unique on a team so voice and manual entry always map to the
            right player.
          </p>
        </div>

        {!selectedTeam ? (
          <StatusMessage tone="info" message="Create a team first, then build its roster here." />
        ) : (
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              setStatus(null);

              const payload = {
                team_id: selectedTeam.id,
                first_name: draft.first_name.trim(),
                last_name: draft.last_name.trim(),
                jersey_number: Number(draft.jersey_number),
                position: draft.position.trim() || null,
                aliases:
                  draft.aliases.trim().length > 0
                    ? draft.aliases
                        .split(",")
                        .map((alias) => alias.trim())
                        .filter(Boolean)
                    : null
              };

              const action = editingPlayerId
                ? updatePlayer(requireSupabase(), editingPlayerId, payload)
                : createPlayer(requireSupabase(), payload);

              void action
                .then(async () => {
                  setDraft(blankPlayer);
                  setEditingPlayerId(null);
                  await loadPlayers();
                  setStatus({
                    tone: "success",
                    message: editingPlayerId ? "Player updated." : "Player added to roster."
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
            <div className="form-grid two">
              <label className="stack" style={{ gap: "0.4rem" }}>
                <span className="muted">First name</span>
                <input
                  required
                  value={draft.first_name}
                  onChange={(event) => setDraft((current) => ({ ...current, first_name: event.target.value }))}
                />
              </label>

              <label className="stack" style={{ gap: "0.4rem" }}>
                <span className="muted">Last name</span>
                <input
                  required
                  value={draft.last_name}
                  onChange={(event) => setDraft((current) => ({ ...current, last_name: event.target.value }))}
                />
              </label>

              <label className="stack" style={{ gap: "0.4rem" }}>
                <span className="muted">Jersey number</span>
                <input
                  required
                  type="number"
                  min={0}
                  value={draft.jersey_number}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, jersey_number: Number(event.target.value) }))
                  }
                />
              </label>

              <label className="stack" style={{ gap: "0.4rem" }}>
                <span className="muted">Position</span>
                <select
                  value={draft.position}
                  onChange={(event) => setDraft((current) => ({ ...current, position: event.target.value }))}
                >
                  <option value="">— select —</option>
                  <option value="Outside Hitter">Outside Hitter</option>
                  <option value="Opposite Hitter">Opposite Hitter</option>
                  <option value="Middle Blocker">Middle Blocker</option>
                  <option value="Setter">Setter</option>
                  <option value="Libero">Libero</option>
                  <option value="Defensive Specialist">Defensive Specialist</option>
                </select>
              </label>
            </div>

            <label className="stack" style={{ gap: "0.4rem" }}>
              <span className="muted">Aliases</span>
              <input
                placeholder="Jules, Steph, Lefty"
                value={draft.aliases}
                onChange={(event) => setDraft((current) => ({ ...current, aliases: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button className="button" type="submit">
                {editingPlayerId ? "Save player" : "Add player"}
              </button>
              {editingPlayerId ? (
                <button
                  className="button-ghost"
                  type="button"
                  onClick={() => {
                    setEditingPlayerId(null);
                    setDraft(blankPlayer);
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        )}

        {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}
      </section>

      <section className="card stack">
        <div>
          <h3>{selectedTeam ? `${selectedTeam.name} roster` : "Roster list"}</h3>
        </div>

        {players.length === 0 ? (
          <StatusMessage tone="info" message="No players yet. Add the roster on the left to get started." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Player</th>
                <th>#</th>
                <th>Position</th>
                <th>Aliases</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td>
                    <strong>
                      {player.first_name} {player.last_name}
                    </strong>
                  </td>
                  <td>{player.jersey_number}</td>
                  <td>{player.position ?? "—"}</td>
                  <td>{player.aliases?.join(", ") ?? "—"}</td>
                  <td>
                    <div className="cluster">
                      <button
                        className="button-ghost"
                        type="button"
                        onClick={() => {
                          setEditingPlayerId(player.id);
                          setDraft({
                            first_name: player.first_name,
                            last_name: player.last_name,
                            jersey_number: player.jersey_number,
                            position: player.position ?? "",
                            aliases: player.aliases?.join(", ") ?? ""
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="button-ghost"
                        type="button"
                        onClick={() => {
                          void deletePlayer(requireSupabase(), player.id)
                            .then(loadPlayers)
                            .then(() =>
                              setStatus({
                                tone: "success",
                                message: "Player removed from roster."
                              })
                            )
                            .catch((error) =>
                              setStatus({
                                tone: "error",
                                message: getErrorMessage(error)
                              })
                            );
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};
