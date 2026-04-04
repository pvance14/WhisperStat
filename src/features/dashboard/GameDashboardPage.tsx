import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useSpeechCapture } from "@/features/games/useSpeechCapture";
import { StatusMessage } from "@/components/StatusMessage";
import {
  confirmStatEvent,
  getGameBundle,
  softDeleteStatEvent,
  updateGame,
  updateStatEvent
} from "@/lib/data";
import type { Database, StatEventType } from "@/lib/database.types";
import {
  buildTrackedSetNumbers,
  getSetScore,
  normalizeScoreBySet,
  summarizeMatchScore,
  upsertSetScore
} from "@/lib/gameScore";
import { appLog } from "@/lib/logger";
import {
  parseLastEventCorrection,
  parseMatchTranscript,
  type ParseMatchResult
} from "@/lib/matchParser";
import { buildPlayerStatRows, summarizeEvents, trackedStatTypes } from "@/lib/stats";
import { requireSupabase } from "@/lib/supabase";
import { formatDateTime, getErrorMessage, titleCase } from "@/lib/utils";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type StatEventRow = Database["public"]["Tables"]["stat_events"]["Row"];

interface ReviewItem {
  id: string;
  clientEventId: string;
  transcript: string;
  createdAt: string;
  setNumber: number;
  captureDurationMs: number | null;
  source: "speech" | "manual";
  result: ParseMatchResult;
}

interface EventEditDraft {
  playerId: string;
  eventType: StatEventType;
}

const formatSourceLabel = (source: ReviewItem["source"]) =>
  source === "speech" ? "Voice capture" : "Manual transcript";

const buildEventSummary = (event: StatEventRow, players: PlayerRow[]) => {
  const player = players.find((candidate) => candidate.id === event.player_id);
  const playerLabel = player
    ? `#${player.jersey_number} ${player.first_name} ${player.last_name}`
    : "Unknown player";

  return `${titleCase(event.event_type)} - ${playerLabel}`;
};

export const GameDashboardPage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [events, setEvents] = useState<StatEventRow[]>([]);
  const [status, setStatus] = useState<{ tone: "info" | "error"; message: string } | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<
    { tone: "info" | "success" | "warn" | "error"; message: string } | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [manualTranscript, setManualTranscript] = useState("");
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [isUpdatingSet, setIsUpdatingSet] = useState(false);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventEditDraft, setEventEditDraft] = useState<EventEditDraft | null>(null);
  const [eventLogFilter, setEventLogFilter] = useState<"current" | "all">("current");
  const [correctionTranscript, setCorrectionTranscript] = useState("");
  const [isApplyingCorrection, setIsApplyingCorrection] = useState(false);
  const [scoreDraft, setScoreDraft] = useState({ us: "0", them: "0" });
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [isUpdatingGameStatus, setIsUpdatingGameStatus] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const loadBundle = async (targetGameId: string) => {
    const nextBundle = await getGameBundle(requireSupabase(), targetGameId);
    setGame(nextBundle.game);
    setPlayers(nextBundle.players);
    setEvents(nextBundle.events);
    setLastLoadedAt(new Date().toISOString());
    setStatus(null);
    return nextBundle;
  };

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

    if (game.status === "completed") {
      setWorkflowStatus({
        tone: "warn",
        message: "This game is completed. Reopen it before capturing or parsing additional events."
      });
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

    setReviewItems((current) =>
      [
        {
          id: crypto.randomUUID(),
          clientEventId: crypto.randomUUID(),
          transcript,
          createdAt: new Date().toISOString(),
          setNumber: game.current_set,
          captureDurationMs: durationMs,
          source,
          result
        },
        ...current
      ].slice(0, 8)
    );

    setManualTranscript("");
    setWorkflowStatus(
      result.kind === "proposal"
        ? {
            tone: "success",
            message: `Parsed ${result.proposal.eventLabel} for #${result.proposal.jerseyNumber} ${result.proposal.playerDisplayName}. Confirm it to save, or reject it to keep the log clean.`
          }
        : {
            tone: result.clarification.reason === "missing_event_type" ? "warn" : "info",
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

  const applyLastEventCorrection = async ({
    transcript,
    source,
    durationMs
  }: {
    transcript: string;
    source: "speech" | "manual";
    durationMs: number | null;
  }) => {
    if (game?.status === "completed") {
      setWorkflowStatus({
        tone: "warn",
        message: "This game is completed. Reopen it before correcting saved events."
      });
      return;
    }

    const lastConfirmedEvent = events.find((event) => event.deleted_at === null);

    if (!lastConfirmedEvent) {
      setWorkflowStatus({
        tone: "info",
        message: "There is no confirmed event to correct yet."
      });
      return;
    }

    const correctionResult = parseLastEventCorrection({
      transcript,
      players,
      fallbackPlayerId: lastConfirmedEvent.player_id
    });

    appLog("info", "capture.correction.parsed", {
      gameId: game?.id,
      source,
      durationMs,
      outcome: correctionResult.kind,
      eventId: lastConfirmedEvent.id
    });

    if (correctionResult.kind === "clarification") {
      setWorkflowStatus({
        tone: correctionResult.clarification.reason === "missing_event_type" ? "warn" : "info",
        message: correctionResult.clarification.message
      });
      return;
    }

    try {
      setIsApplyingCorrection(true);
      await updateStatEvent(requireSupabase(), lastConfirmedEvent.id, {
        player_id: correctionResult.proposal.playerId,
        event_type: correctionResult.proposal.eventType
      });
      await loadBundle(gameId!);
      setCorrectionTranscript("");
      setWorkflowStatus({
        tone: "success",
        message: `Updated the last confirmed event to ${correctionResult.proposal.eventLabel} for #${correctionResult.proposal.jerseyNumber} ${correctionResult.proposal.playerDisplayName}.`
      });
    } catch (error) {
      setWorkflowStatus({
        tone: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setIsApplyingCorrection(false);
    }
  };

  const {
    isSupported: isCorrectionSpeechSupported,
    isListening: isCorrectionListening,
    liveTranscript: liveCorrectionTranscript,
    error: correctionSpeechError,
    clearError: clearCorrectionSpeechError,
    startListening: startCorrectionListening,
    stopListening: stopCorrectionListening
  } = useSpeechCapture(({ transcript, durationMs, source }) => {
    void applyLastEventCorrection({
      transcript,
      durationMs,
      source
    });
  });

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

  useEffect(() => {
    if (!game) {
      return;
    }

    const currentSetScore = getSetScore(normalizeScoreBySet(game.score_by_set), game.current_set);
    setScoreDraft({
      us: String(currentSetScore.us),
      them: String(currentSetScore.them)
    });
  }, [game]);

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
  const activeEvents = events.filter((event) => event.deleted_at === null);
  const lastConfirmedEvent = activeEvents[0] ?? null;
  const scoreBySet = normalizeScoreBySet(game.score_by_set);
  const trackedSetNumbers = buildTrackedSetNumbers(events, scoreBySet, game.current_set);
  const currentSetScore = getSetScore(scoreBySet, game.current_set);
  const matchScore = summarizeMatchScore(scoreBySet);
  const visibleEventLog =
    eventLogFilter === "current"
      ? events.filter((event) => event.set_number === game.current_set)
      : events;

  const changeCurrentSet = async (nextSet: number) => {
    if (game.status === "completed") {
      setWorkflowStatus({
        tone: "warn",
        message: "This game is completed. Reopen it before changing the current set."
      });
      return;
    }

    if (nextSet < 1 || nextSet === game.current_set) {
      return;
    }

    try {
      setIsUpdatingSet(true);
      const updatedGame = await updateGame(requireSupabase(), game.id, {
        current_set: nextSet
      });
      setGame(updatedGame);
      setWorkflowStatus({
        tone: "success",
        message: `Current set updated to Set ${updatedGame.current_set}. New proposals and event-log filters will use that set.`
      });
    } catch (error) {
      setWorkflowStatus({
        tone: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setIsUpdatingSet(false);
    }
  };

  const handleSaveCurrentSetScore = async () => {
    if (game.status === "completed") {
      setWorkflowStatus({
        tone: "warn",
        message: "This game is completed. Reopen it before changing the saved scoreboard."
      });
      return;
    }

    const us = Number(scoreDraft.us);
    const them = Number(scoreDraft.them);

    if (!Number.isInteger(us) || us < 0 || !Number.isInteger(them) || them < 0) {
      setWorkflowStatus({
        tone: "warn",
        message: "Scores must be whole numbers at or above zero before they can be saved."
      });
      return;
    }

    try {
      setIsSavingScore(true);
      const updatedGame = await updateGame(requireSupabase(), game.id, {
        score_by_set: upsertSetScore(scoreBySet, {
          setNumber: game.current_set,
          us,
          them
        })
      });
      setGame(updatedGame);
      setWorkflowStatus({
        tone: "success",
        message: `Saved the manual score for Set ${game.current_set}. This score now survives refresh and drives the report view.`
      });
    } catch (error) {
      setWorkflowStatus({
        tone: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleGameStatusChange = async (nextStatus: GameRow["status"]) => {
    if (nextStatus === game.status) {
      return;
    }

    try {
      setIsUpdatingGameStatus(true);
      const updatedGame = await updateGame(requireSupabase(), game.id, {
        status: nextStatus
      });
      setGame(updatedGame);
      setWorkflowStatus({
        tone: "success",
        message:
          nextStatus === "completed"
            ? "Game marked completed. Sending you to the post-game summary."
            : "Game moved back to in progress so you can keep capturing or correcting events."
      });

      if (nextStatus === "completed") {
        navigate(`/app/summary/${updatedGame.id}`);
      }
    } catch (error) {
      setWorkflowStatus({
        tone: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setIsUpdatingGameStatus(false);
    }
  };

  const handleConfirmReviewItem = async (itemId: string) => {
    if (game.status === "completed") {
      setWorkflowStatus({
        tone: "warn",
        message: "This game is completed. Reopen it before confirming queued review items."
      });
      return;
    }

    const item = reviewItems.find((candidate) => candidate.id === itemId);

    if (!item || item.result.kind !== "proposal") {
      return;
    }

    try {
      setActiveReviewId(itemId);
      await confirmStatEvent(requireSupabase(), {
        game_id: game.id,
        player_id: item.result.proposal.playerId,
        event_type: item.result.proposal.eventType,
        set_number: item.setNumber,
        timestamp: item.createdAt,
        client_event_id: item.clientEventId
      });
      await loadBundle(gameId);
      setReviewItems((current) => current.filter((candidate) => candidate.id !== itemId));
      setWorkflowStatus({
        tone: "success",
        message: `Confirmed ${item.result.proposal.eventLabel} for #${item.result.proposal.jerseyNumber} ${item.result.proposal.playerDisplayName}. The live stats now reflect it.`
      });
    } catch (error) {
      setWorkflowStatus({
        tone: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setActiveReviewId(null);
    }
  };

  const handleRejectReviewItem = (itemId: string) => {
    if (game.status === "completed") {
      setWorkflowStatus({
        tone: "warn",
        message: "This game is completed. Reopen it before changing the review queue."
      });
      return;
    }

    setReviewItems((current) => current.filter((candidate) => candidate.id !== itemId));
    setWorkflowStatus({
      tone: "info",
      message: "Proposal discarded. Nothing was written to the database."
    });
  };

  const handleUndoEvent = async (eventId: string, message: string) => {
    if (game.status === "completed") {
      setWorkflowStatus({
        tone: "warn",
        message: "This game is completed. Reopen it before undoing confirmed events."
      });
      return;
    }

    try {
      setActiveEventId(eventId);
      await softDeleteStatEvent(requireSupabase(), eventId);
      await loadBundle(gameId);
      if (editingEventId === eventId) {
        setEditingEventId(null);
        setEventEditDraft(null);
      }
      setWorkflowStatus({
        tone: "success",
        message
      });
    } catch (error) {
      setWorkflowStatus({
        tone: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setActiveEventId(null);
    }
  };

  const handleStartEventEdit = (event: StatEventRow) => {
    if (game.status === "completed") {
      setWorkflowStatus({
        tone: "warn",
        message: "This game is completed. Reopen it before editing logged events."
      });
      return;
    }

    setEditingEventId(event.id);
    setEventEditDraft({
      playerId: event.player_id,
      eventType: event.event_type
    });
  };

  const handleSaveEventEdit = async () => {
    if (!editingEventId || !eventEditDraft) {
      return;
    }

    if (game.status === "completed") {
      setWorkflowStatus({
        tone: "warn",
        message: "This game is completed. Reopen it before saving event edits."
      });
      return;
    }

    try {
      setActiveEventId(editingEventId);
      await updateStatEvent(requireSupabase(), editingEventId, {
        player_id: eventEditDraft.playerId,
        event_type: eventEditDraft.eventType
      });
      await loadBundle(gameId);
      setEditingEventId(null);
      setEventEditDraft(null);
      setWorkflowStatus({
        tone: "success",
        message: "Event log change saved. Aggregates were recalculated from the updated event row."
      });
    } catch (error) {
      setWorkflowStatus({
        tone: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setActiveEventId(null);
    }
  };

  const canCapture = players.length > 0;
  const isGameCompleted = game.status === "completed";

  return (
    <div className="grid">
      <section className="page-header page-panel page-hero">
        <div className="page-hero-main">
          <div className="eyebrow">Live game dashboard</div>
          <div className="hero-title-row">
            <div className="stack-compact">
              <span className="chip">Phase 6 live capture and post-game loop</span>
              <h2>
                vs {game.opponent_name} · Set {game.current_set}
              </h2>
              <p>
                Confirmed capture stays first. Score, set control, and game status stay close so
                coaches can trust the current match state without hunting.
              </p>
            </div>
            <div className="hero-meta">
              <div className="meta-pill">Status: {titleCase(game.status)}</div>
              <div className="meta-pill">
                Score: <strong>{currentSetScore.us}-{currentSetScore.them}</strong>
              </div>
              <div className="meta-pill">Sync: {lastLoadedAt ? "Live" : "Waiting"}</div>
            </div>
          </div>
        </div>

        <div className="page-hero-side">
          <div className="metric-card">
            <p>Game date</p>
            <div className="metric-value" style={{ fontSize: "1.3rem" }}>
              {formatDateTime(game.game_date)}
            </div>
          </div>
          <div className="cluster hero-actions">
            <button
              className="button-secondary"
              type="button"
              disabled={isUpdatingSet || game.current_set <= 1 || isGameCompleted}
              onClick={() => {
                void changeCurrentSet(game.current_set - 1);
              }}
            >
              Previous set
            </button>
            <button
              className="button-secondary"
              type="button"
              disabled={isUpdatingSet || isGameCompleted}
              onClick={() => {
                void changeCurrentSet(game.current_set + 1);
              }}
            >
              {isUpdatingSet ? "Saving..." : "Next set"}
            </button>
            <Link className="button-ghost" to={`/app/report/${game.id}`}>
              Open report view
            </Link>
            {game.status === "completed" ? (
              <Link className="button-ghost" to={`/app/summary/${game.id}`}>
                Open summary
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="summary-strip">
        <div className="summary-tile featured">
          <div className="summary-label">Current set</div>
          <div className="summary-value">{game.current_set}</div>
          <div className="summary-support">New proposals and current-set filters use this value.</div>
        </div>
        <div className="summary-tile">
          <div className="summary-label">Saved score</div>
          <div className="summary-value">
            {currentSetScore.us}-{currentSetScore.them}
          </div>
          <div className="summary-support">Manual scoreboard source of truth for Set {game.current_set}.</div>
        </div>
        <div className="summary-tile">
          <div className="summary-label">Confirmed events</div>
          <div className="summary-value">{activeEvents.length}</div>
          <div className="summary-support">Only active, confirmed rows count toward live totals.</div>
        </div>
        <div className="summary-tile">
          <div className="summary-label">Sets won</div>
          <div className="summary-value">
            {matchScore.us}-{matchScore.them}
          </div>
          <div className="summary-support">Calculated from the saved set snapshots.</div>
        </div>
      </div>

      {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}
      {workflowStatus ? <StatusMessage tone={workflowStatus.tone} message={workflowStatus.message} /> : null}

      <div className="split-layout sidebar-heavy">
        <section className="card stack feature-panel feature-panel-primary">
          <div className="section-toolbar">
            <div className="section-copy">
              <h3>Live capture and confirmation</h3>
              <p className="supporting-text">
                Start capture, review the parse, then confirm or discard it without leaving this
                work zone.
              </p>
            </div>
            <div className="supporting-text">
              {isListening ? "Mic active" : "Ready for the next stat call"}
            </div>
          </div>

          {!canCapture ? (
            <StatusMessage
              tone="info"
              message="Add players to the roster before capturing match events so player resolution has real context."
            />
          ) : null}
          {isGameCompleted ? (
            <StatusMessage
              tone="info"
              message="This match is locked because it is marked completed. Reopen the game to capture, confirm, undo, or edit anything."
            />
          ) : null}

          <div className="split-layout capture-layout">
            <section className="surface stack capture-panel action-panel primary">
              <div className="action-panel-header">
                <h3>Voice capture</h3>
                <p className="supporting-text">
                  The fastest live path is still push-to-talk followed by an explicit confirm step.
                </p>
              </div>

              <div className="cluster">
                <button
                  className="button capture-cta"
                  type="button"
                  disabled={!canCapture || !isSpeechCaptureSupported || isGameCompleted}
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
                  ? "Web Speech is available in this browser."
                  : "Web Speech is unavailable in this browser, so manual transcript parsing is the fallback. This is expected on some phones and privacy-restricted browsers."}
              </div>

              {liveTranscript ? (
                <div className="transcript-box">
                  <div className="muted">Live transcript</div>
                  <div className="mono">{liveTranscript}</div>
                </div>
              ) : null}

              {speechError ? <StatusMessage tone="error" message={speechError} /> : null}

              <div className="supporting-text">
                Try <span className="mono">12 kill</span>, <span className="mono">Jane ace</span>,{" "}
                <span className="mono">Mia serve error</span>, or <span className="mono">Julie dig</span>.
              </div>
            </section>

            <form
              className="surface stack form-grid capture-panel action-panel"
              onSubmit={(event) => {
                event.preventDefault();

                if (!manualTranscript.trim()) {
                  setWorkflowStatus({
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
              <div className="action-panel-header">
                <h3>Manual transcript fallback</h3>
                <p className="supporting-text">
                  Use this when browser mic support is unreliable and you still want the same
                  confirm flow.
                </p>
              </div>

              <label className="stack" style={{ gap: "0.4rem" }}>
                <span className="muted">Transcript to parse</span>
                <textarea
                  rows={5}
                  placeholder="Example: 12 kill"
                  value={manualTranscript}
                  disabled={isGameCompleted}
                  onChange={(event) => setManualTranscript(event.target.value)}
                />
              </label>

              <div className="form-actions">
                <button className="button-secondary" type="submit" disabled={!canCapture || isGameCompleted}>
                  Parse transcript
                </button>
                <button
                  className="button-ghost"
                  type="button"
                  disabled={isGameCompleted}
                  onClick={() => setManualTranscript("")}
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          <section className="review-list">
            <div className="section-copy">
              <h3>Review queue</h3>
              <p className="supporting-text">
                Proposed events should read like decisions: who, what happened, and the confirm
                action to commit it.
              </p>
            </div>

            {reviewItems.length === 0 ? (
              <StatusMessage
                tone="info"
                message="No review items yet. Capture a voice event or parse a manual transcript to see the confirm/reject loop."
              />
            ) : (
              reviewItems.map((item) => (
                <article
                  className={`review-card decision-card ${
                    item.result.kind === "proposal" ? "proposal" : "clarification"
                  }`}
                  key={item.id}
                >
                  <div className="cluster review-header">
                    <div className="decision-summary">
                      <strong className="decision-title">
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
                      disabled={isGameCompleted}
                      onClick={() => handleRejectReviewItem(item.id)}
                    >
                      Reject
                    </button>
                  </div>

                  <div className="transcript-box">
                    <div className="muted">Review transcript</div>
                    <div className="mono">{item.transcript}</div>
                  </div>

                  {item.result.kind === "proposal" ? (
                    <>
                      <div className="supporting-text">
                        Matched by {item.result.proposal.matchedPlayerBy.join(", ")}. Confirming uses the review
                        card&apos;s stable <span className="mono">client_event_id</span> so retries stay idempotent.
                      </div>
                      <div className="form-actions">
                        <button
                          className="button"
                          type="button"
                          disabled={activeReviewId === item.id || isGameCompleted}
                          onClick={() => {
                            void handleConfirmReviewItem(item.id);
                          }}
                        >
                          {activeReviewId === item.id ? "Confirming..." : "Confirm event"}
                        </button>
                        <button
                          className="button-ghost"
                          type="button"
                          disabled={isGameCompleted}
                          onClick={() => handleRejectReviewItem(item.id)}
                        >
                          Discard
                        </button>
                      </div>
                    </>
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

        <div className="stack">
          <section className="card stack feature-panel">
            <div className="section-toolbar">
              <div className="section-copy">
                <h3>Match state</h3>
                <p className="supporting-text">
                  Manual scorekeeping and saved set snapshots stay visible here so the current match
                  state is always close to the live workflow.
                </p>
              </div>
              <div className="supporting-text">
                {lastLoadedAt ? `Last sync ${formatDateTime(lastLoadedAt)}` : "Waiting for first sync..."}
              </div>
            </div>

            <section className="surface stack action-panel">
              <div className="action-panel-header">
                <h3>Set {game.current_set} score</h3>
                <p className="supporting-text">
                  Save the scoreboard manually when the rally outcome is known.
                </p>
              </div>

              <div className="scoreboard-grid">
                <label className="stack score-input" style={{ gap: "0.35rem" }}>
                  <span className="muted">Us</span>
                  <input
                    type="number"
                    min={0}
                    value={scoreDraft.us}
                    disabled={isGameCompleted}
                    onChange={(event) =>
                      setScoreDraft((current) => ({ ...current, us: event.target.value }))
                    }
                  />
                </label>

                <label className="stack score-input" style={{ gap: "0.35rem" }}>
                  <span className="muted">Them</span>
                  <input
                    type="number"
                    min={0}
                    value={scoreDraft.them}
                    disabled={isGameCompleted}
                    onChange={(event) =>
                      setScoreDraft((current) => ({ ...current, them: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="supporting-text">
                Saved snapshot: {currentSetScore.us}-{currentSetScore.them}
              </div>

              <div className="form-actions">
                <button
                  className="button-secondary"
                  type="button"
                  disabled={isSavingScore || isGameCompleted}
                  onClick={() => {
                    void handleSaveCurrentSetScore();
                  }}
                >
                  {isSavingScore ? "Saving..." : "Save score"}
                </button>
              </div>
            </section>

            <section className="surface stack action-panel secondary">
              <div className="action-panel-header">
                <h3>Set snapshots</h3>
                <p className="supporting-text">
                  These saved scores feed the report view and the eventual post-game summary flow.
                </p>
              </div>

              {trackedSetNumbers.length === 0 ? (
                <StatusMessage
                  tone="info"
                  message="No tracked sets yet. Save a score or confirm an event to establish set context."
                />
              ) : (
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
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </section>

          <section className="card stack feature-panel">
            <div className="section-copy">
              <h3>Fast trust actions</h3>
              <p className="supporting-text">
                The quickest recovery path stays focused on the most recent confirmed event.
              </p>
            </div>

            {!lastConfirmedEvent ? (
              <StatusMessage
                tone="info"
                message="Confirm an event first to unlock undo and last-event correction."
              />
            ) : (
              <>
                <div className="recovery-anchor">
                  <div className="recovery-anchor-label">Last confirmed event</div>
                  <strong>{buildEventSummary(lastConfirmedEvent, players)}</strong>
                  <div className="supporting-text">
                    Logged {formatDateTime(lastConfirmedEvent.timestamp)} · Set {lastConfirmedEvent.set_number}
                  </div>
                </div>

                <div className="form-actions">
                  <button
                  className="button-secondary"
                  type="button"
                  disabled={activeEventId === lastConfirmedEvent.id || isGameCompleted}
                    onClick={() => {
                      void handleUndoEvent(
                        lastConfirmedEvent.id,
                        "Last confirmed event undone with a soft delete. Live aggregates now exclude it."
                      );
                    }}
                  >
                    {activeEventId === lastConfirmedEvent.id ? "Undoing..." : "Undo last confirmed"}
                  </button>
                </div>

                <div className="surface stack correction-panel action-panel secondary">
                  <div className="action-panel-header">
                    <h3>Correct last confirmed event</h3>
                    <p className="supporting-text">
                      Example: <span className="mono">actually attack error</span> or{" "}
                      <span className="mono">actually Jane ace</span>.
                    </p>
                  </div>

                  <div className="cluster">
                    <button
                      className="button"
                      type="button"
                      disabled={!isCorrectionSpeechSupported || isApplyingCorrection || isGameCompleted}
                      onClick={() => {
                        if (isCorrectionListening) {
                          stopCorrectionListening();
                          return;
                        }

                        clearCorrectionSpeechError();
                        startCorrectionListening();
                      }}
                    >
                      {isCorrectionListening ? "Stop correction capture" : "Voice correct last event"}
                    </button>
                    <span className="capture-state">
                      {isCorrectionListening
                        ? "Listening for a correction to the last confirmed event..."
                        : "Idle until you start correction capture"}
                    </span>
                  </div>

                  {liveCorrectionTranscript ? (
                    <div className="transcript-box">
                      <div className="muted">Live correction transcript</div>
                      <div className="mono">{liveCorrectionTranscript}</div>
                    </div>
                  ) : null}

                  {correctionSpeechError ? <StatusMessage tone="error" message={correctionSpeechError} /> : null}

                  <form
                    className="form-grid"
                    onSubmit={(event) => {
                      event.preventDefault();

                      void applyLastEventCorrection({
                        transcript: correctionTranscript.trim(),
                        durationMs: null,
                        source: "manual"
                      });
                    }}
                  >
                    <label className="stack" style={{ gap: "0.4rem" }}>
                      <span className="muted">Manual correction transcript</span>
                      <input
                        placeholder="actually attack error"
                        value={correctionTranscript}
                        disabled={isGameCompleted}
                        onChange={(event) => setCorrectionTranscript(event.target.value)}
                      />
                    </label>
                    <div className="form-actions">
                      <button
                        className="button-secondary"
                        type="submit"
                        disabled={isApplyingCorrection || isGameCompleted}
                      >
                        {isApplyingCorrection ? "Applying..." : "Apply correction"}
                      </button>
                      <button
                        className="button-ghost"
                        type="button"
                        disabled={isGameCompleted}
                        onClick={() => setCorrectionTranscript("")}
                      >
                        Clear
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </section>

          <section className="card stack feature-panel">
            <div className="section-copy">
              <h3>Game lifecycle</h3>
              <p className="supporting-text">
                Finishing the match is explicit so Phase 6 can safely key off completed games.
              </p>
            </div>

            <div className="list-item">
              <strong>Current status</strong>
              <div className="supporting-text">
                {titleCase(game.status)} · Current set {game.current_set}
              </div>
            </div>

            <div className="form-actions">
              {game.status === "completed" ? (
                <>
                  <Link className="button" to={`/app/summary/${game.id}`}>
                    Open post-game summary
                  </Link>
                  <button
                    className="button-secondary"
                    type="button"
                    disabled={isUpdatingGameStatus}
                    onClick={() => {
                      void handleGameStatusChange("in_progress");
                    }}
                  >
                    {isUpdatingGameStatus ? "Saving..." : "Reopen game"}
                  </button>
                </>
              ) : (
                <button
                  className="button"
                  type="button"
                  disabled={isUpdatingGameStatus}
                  onClick={() => {
                    void handleGameStatusChange("completed");
                  }}
                >
                  {isUpdatingGameStatus ? "Saving..." : "Complete game"}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="card stack feature-panel event-log-panel">
        <div className="section-toolbar">
          <div className="section-copy">
            <h3>Event log</h3>
            <p className="supporting-text">
              Older fixes happen here through soft delete or lightweight edits so correction stays visible and audit-friendly.
            </p>
          </div>
          <div className="stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Show events</span>
            <div className="segmented-control" aria-label="Event log filter">
              <button
                className={`button-ghost segment-button ${eventLogFilter === "current" ? "is-active" : ""}`}
                type="button"
                aria-pressed={eventLogFilter === "current"}
                onClick={() => setEventLogFilter("current")}
              >
                Current set
              </button>
              <button
                className={`button-ghost segment-button ${eventLogFilter === "all" ? "is-active" : ""}`}
                type="button"
                aria-pressed={eventLogFilter === "all"}
                onClick={() => setEventLogFilter("all")}
              >
                All sets
              </button>
            </div>
          </div>
        </div>

        {visibleEventLog.length === 0 ? (
          <StatusMessage
            tone="info"
            message="No confirmed events match this filter yet."
          />
        ) : (
          <div className="event-log">
            {visibleEventLog.map((event) => {
              const player = players.find((candidate) => candidate.id === event.player_id);
              const isDeleted = event.deleted_at !== null;
              const isEditing = editingEventId === event.id && eventEditDraft !== null;
              const isWorking = activeEventId === event.id;

              return (
                <article className={`event-log-item event-log-item-compact ${isDeleted ? "deleted" : ""}`} key={event.id}>
                  <div className="cluster review-header">
                    <div className="decision-summary">
                      <strong>{buildEventSummary(event, players)}</strong>
                      <div className="supporting-text event-meta-line">
                        Set {event.set_number} · {formatDateTime(event.timestamp)}
                      </div>
                      <div className="supporting-text mono event-meta-line">Event id: {event.id.slice(0, 8)}</div>
                    </div>
                    <div className="event-badge">{isDeleted ? "Undone" : "Active"}</div>
                  </div>

                  {isEditing ? (
                    <div className="form-grid two">
                      <label className="stack" style={{ gap: "0.35rem" }}>
                        <span className="muted">Player</span>
                        <select
                          value={eventEditDraft.playerId}
                          disabled={isGameCompleted}
                          onChange={(changeEvent) =>
                            setEventEditDraft((current) =>
                              current
                                ? { ...current, playerId: changeEvent.target.value }
                                : current
                            )
                          }
                        >
                          {players.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              #{candidate.jersey_number} {candidate.first_name} {candidate.last_name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="stack" style={{ gap: "0.35rem" }}>
                        <span className="muted">Stat type</span>
                        <select
                          value={eventEditDraft.eventType}
                          disabled={isGameCompleted}
                          onChange={(changeEvent) =>
                            setEventEditDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    eventType: changeEvent.target.value as StatEventType
                                  }
                                : current
                            )
                          }
                        >
                          {trackedStatTypes.map((eventType) => (
                            <option key={eventType} value={eventType}>
                              {titleCase(eventType)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : player ? (
                    <div className="supporting-text">
                      Player: #{player.jersey_number} {player.first_name} {player.last_name}
                    </div>
                  ) : null}

                    <div className="form-actions compact-actions">
                      {!isDeleted ? (
                        <>
                        {isEditing ? (
                          <>
                            <button
                              className="button-secondary"
                              type="button"
                              disabled={isWorking || isGameCompleted}
                              onClick={() => {
                                void handleSaveEventEdit();
                              }}
                            >
                              {isWorking ? "Saving..." : "Save edit"}
                            </button>
                            <button
                              className="button-ghost"
                              type="button"
                              disabled={isGameCompleted}
                              onClick={() => {
                                setEditingEventId(null);
                                setEventEditDraft(null);
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="button-secondary"
                              type="button"
                              disabled={isGameCompleted}
                              onClick={() => handleStartEventEdit(event)}
                            >
                              Edit event
                            </button>
                            <button
                              className="button-ghost"
                              type="button"
                              disabled={isWorking || isGameCompleted}
                              onClick={() => {
                                void handleUndoEvent(
                                  event.id,
                                  "Event soft-deleted from the log. Live counts now exclude it."
                                );
                              }}
                            >
                              {isWorking ? "Undoing..." : "Soft delete"}
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="supporting-text">
                        Soft-deleted at {event.deleted_at ? formatDateTime(event.deleted_at) : "unknown time"}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="info-grid">
        <section className="card stack feature-panel">
          <div className="section-copy">
            <h3>Event totals</h3>
            <p className="supporting-text">
              These counts now reflect confirmed and still-active events only.
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

        <section className="card stack feature-panel table-card">
          <div className="section-copy">
            <h3>Per-player set table</h3>
            <p className="supporting-text">
              This table updates from confirmed edits and soft deletes, so it reflects the same
              trust-aware event history as the event log.
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
              {activeEvents.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty-state">
                      No confirmed events yet. Confirm a review item to populate the live set table.
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
                    <td>{row.currentSetTotals.block}</td>
                    <td>{row.currentSetTotals.dig}</td>
                    <td>
                      {row.currentSetTotals.serve_error +
                        row.currentSetTotals.reception_error +
                        row.currentSetTotals.attack_error}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};
