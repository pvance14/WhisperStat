import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { StatusMessage } from "@/components/StatusMessage";
import { getGameBundle, updateGame } from "@/lib/data";
import type { Database } from "@/lib/database.types";
import { appLog } from "@/lib/logger";
import { parseMatchTranscript, type ParseMatchResult } from "@/lib/matchParser";
import { buildPlayerStatRows, summarizeEvents, trackedStatTypes } from "@/lib/stats";
import { requireSupabase } from "@/lib/supabase";
import { formatDateTime, getErrorMessage, titleCase } from "@/lib/utils";
import { useSpeechCapture } from "@/features/games/useSpeechCapture";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type StatEventRow = Database["public"]["Tables"]["stat_events"]["Row"];

interface ReviewItem {
  id: string;
  transcript: string;
  createdAt: string;
  setNumber: number;
  captureDurationMs: number | null;
  source: "speech" | "manual";
  result: ParseMatchResult;
}

const formatSourceLabel = (source: ReviewItem["source"]) =>
  source === "speech" ? "Voice capture" : "Manual transcript";

export const GameDashboardPage = () => {
  const { gameId } = useParams();
  const [game, setGame] = useState<GameRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [events, setEvents] = useState<StatEventRow[]>([]);
  const [status, setStatus] = useState<{ tone: "info" | "error"; message: string } | null>(null);
  const [captureStatus, setCaptureStatus] = useState<
    { tone: "info" | "success" | "warn" | "error"; message: string } | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [manualTranscript, setManualTranscript] = useState("");
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [isUpdatingSet, setIsUpdatingSet] = useState(false);

  const handleCapturedTranscript = ({
    transcript,
    durationMs,
    source
  }: {
    transcript: string;
    durationMs: number | null;
    source: ReviewItem["source"];
  }) => {
    if (!game) {
      return;
    }

    const parseStartedAt = performance.now();
    const result = parseMatchTranscript({
      transcript,
      players,
      currentSet: game.current_set
    });

    appLog("info", "capture.parse.completed", {
      gameId: game.id,
      source,
      transcriptLength: transcript.length,
      captureDurationMs: durationMs,
      parseDurationMs: Math.round(performance.now() - parseStartedAt),
      outcome: result.kind,
      eventType: result.kind === "proposal" ? result.proposal.eventType : null
    });

    setReviewItems((current) => [
      {
        id: crypto.randomUUID(),
        transcript,
        createdAt: new Date().toISOString(),
        setNumber: game.current_set,
        captureDurationMs: durationMs,
        source,
        result
      },
      ...current
    ].slice(0, 6));

    setManualTranscript("");
    setCaptureStatus(
      result.kind === "proposal"
        ? {
            tone: "success",
            message: `Parsed ${result.proposal.eventLabel} for #${result.proposal.jerseyNumber} ${result.proposal.playerDisplayName}. Review it below before Phase 4 persistence exists.`
          }
        : {
            tone:
              result.clarification.reason === "missing_event_type" ? "warn" : "info",
            message: result.clarification.message
          }
    );
  };

  const {
    isSupported: isSpeechCaptureSupported,
    isListening,
    liveTranscript,
    error: speechError,
    clearError: clearSpeechError,
    startListening,
    stopListening
  } = useSpeechCapture(handleCapturedTranscript);

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

  const changeCurrentSet = async (nextSet: number) => {
    if (nextSet < 1 || nextSet === game.current_set) {
      return;
    }

    try {
      setIsUpdatingSet(true);
      const updatedGame = await updateGame(requireSupabase(), game.id, {
        current_set: nextSet
      });
      setGame(updatedGame);
      setCaptureStatus({
        tone: "success",
        message: `Current set updated to Set ${updatedGame.current_set}. New proposals will use that set number.`
      });
    } catch (error) {
      setCaptureStatus({
        tone: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setIsUpdatingSet(false);
    }
  };

  const canCapture = players.length > 0;

  return (
    <div className="grid">
      <section className="page-header page-panel">
        <div>
          <span className="chip">Phase 3 core match workflow</span>
          <h2>
            {game.opponent_name} · Set {game.current_set}
          </h2>
          <p>
            This route now handles live match context, push-to-talk capture, and review-only event
            proposals. Canonical database writes remain intentionally deferred until explicit
            confirm ships in Phase 4.
          </p>
        </div>
        <div className="cluster">
          <button
            className="button-secondary"
            type="button"
            disabled={isUpdatingSet || game.current_set <= 1}
            onClick={() => {
              void changeCurrentSet(game.current_set - 1);
            }}
          >
            Previous set
          </button>
          <button
            className="button-secondary"
            type="button"
            disabled={isUpdatingSet}
            onClick={() => {
              void changeCurrentSet(game.current_set + 1);
            }}
          >
            {isUpdatingSet ? "Saving..." : "Next set"}
          </button>
          <Link className="button-ghost" to={`/app/report/${game.id}`}>
            Open report view
          </Link>
        </div>
      </section>

      {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}
      {captureStatus ? <StatusMessage tone={captureStatus.tone} message={captureStatus.message} /> : null}

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
          <h3>Live capture and review</h3>
          <p className="supporting-text">
            The parser uses the active roster and current set to create reviewable proposals for
            the MVP stat vocabulary. The raw transcript only appears here during review and is not
            being persisted.
          </p>
        </div>

        {!canCapture ? (
          <StatusMessage
            tone="info"
            message="Add players to the roster before capturing match events so player resolution has real context."
          />
        ) : null}

        <div className="grid two">
          <section className="surface stack capture-panel">
            <div className="cluster">
              <button
                className="button"
                type="button"
                disabled={!canCapture || !isSpeechCaptureSupported}
                onClick={() => {
                  if (isListening) {
                    stopListening();
                    return;
                  }

                  clearSpeechError();
                  startListening();
                }}
              >
                {isListening ? "Stop listening" : "Push to talk"}
              </button>
              <span className="capture-state">
                {isListening ? "Listening for the next stat call..." : "Idle until you start capture"}
              </span>
            </div>

            <div className="supporting-text">
              {isSpeechCaptureSupported
                ? "Web Speech is available in this browser, so you can test real voice capture here."
                : "Web Speech is unavailable in this browser, so the manual transcript parser is the fallback for this session."}
            </div>

            {liveTranscript ? (
              <div className="transcript-box">
                <div className="muted">Live transcript</div>
                <div className="mono">{liveTranscript}</div>
              </div>
            ) : null}

            {speechError ? <StatusMessage tone="error" message={speechError} /> : null}

            <div className="supporting-text">
              Expected phrases: <span className="mono">12 kill</span>, <span className="mono">Jane ace</span>,{" "}
              <span className="mono">Mia serve error</span>, <span className="mono">Julie dig</span>.
            </div>
          </section>

          <form
            className="surface stack form-grid capture-panel"
            onSubmit={(event) => {
              event.preventDefault();

              if (!manualTranscript.trim()) {
                setCaptureStatus({
                  tone: "warn",
                  message: "Enter a transcript first so the review parser has something to work with."
                });
                return;
              }

              handleCapturedTranscript({
                transcript: manualTranscript.trim(),
                durationMs: null,
                source: "manual"
              });
            }}
          >
            <div>
              <h3>Manual transcript fallback</h3>
              <p className="supporting-text">
                This keeps Phase 3 testable even when browser speech support or mic permissions are
                unreliable.
              </p>
            </div>

            <label className="stack" style={{ gap: "0.4rem" }}>
              <span className="muted">Transcript to parse</span>
              <textarea
                rows={5}
                placeholder="Example: 12 kill"
                value={manualTranscript}
                onChange={(event) => setManualTranscript(event.target.value)}
              />
            </label>

            <div className="form-actions">
              <button className="button-secondary" type="submit" disabled={!canCapture}>
                Parse transcript
              </button>
              <button
                className="button-ghost"
                type="button"
                onClick={() => setManualTranscript("")}
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        <section className="review-list">
          <div>
            <h3>Review queue</h3>
            <p className="supporting-text">
              These cards prove the Phase 3 boundary: the app can parse match events into structured
              proposals without silently writing them to <span className="mono">stat_events</span>.
            </p>
          </div>

          {reviewItems.length === 0 ? (
            <StatusMessage
              tone="info"
              message="No review items yet. Capture a voice event or parse a manual transcript to see the Phase 3 loop."
            />
          ) : (
            reviewItems.map((item) => (
              <article
                className={`review-card ${item.result.kind === "proposal" ? "proposal" : "clarification"}`}
                key={item.id}
              >
                <div className="cluster review-header">
                  <div>
                    <strong>
                      {item.result.kind === "proposal"
                        ? `${item.result.proposal.eventLabel} for #${item.result.proposal.jerseyNumber} ${item.result.proposal.playerDisplayName}`
                        : "Needs clarification"}
                    </strong>
                    <div className="supporting-text">
                      {formatSourceLabel(item.source)} · {formatDateTime(item.createdAt)} · Set {item.setNumber}
                    </div>
                  </div>
                  <button
                    className="button-ghost"
                    type="button"
                    onClick={() =>
                      setReviewItems((current) => current.filter((candidate) => candidate.id !== item.id))
                    }
                  >
                    Dismiss
                  </button>
                </div>

                <div className="transcript-box">
                  <div className="muted">Review transcript</div>
                  <div className="mono">{item.transcript}</div>
                </div>

                {item.result.kind === "proposal" ? (
                  <div className="supporting-text">
                    Matched by {item.result.proposal.matchedPlayerBy.join(", ")}. This is review-only and has not
                    been saved to the database yet.
                  </div>
                ) : (
                  <div className="stack" style={{ gap: "0.6rem" }}>
                    <StatusMessage tone="warn" message={item.result.clarification.message} />
                    {item.result.clarification.candidates?.length ? (
                      <div className="candidate-list">
                        {item.result.clarification.candidates.map((candidate) => (
                          <div className="list-item" key={candidate.playerId}>
                            <strong>
                              #{candidate.jerseyNumber} {candidate.playerDisplayName}
                            </strong>
                            <div className="supporting-text">Matched by {candidate.matchedBy.join(", ")}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                {item.captureDurationMs !== null ? (
                  <div className="supporting-text">Voice capture time: {item.captureDurationMs} ms</div>
                ) : null}
              </article>
            ))
          )}
        </section>
      </section>

      <section className="card stack">
        <div>
          <h3>Event totals</h3>
          <p className="supporting-text">
            These counts still reflect persisted rows only. They should stay unchanged while Phase 3
            proposals are review-only.
          </p>
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
            The current set control now drives both this table and the Phase 3 review proposals, so
            live context stays consistent even before event confirmation is added.
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
