import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useSpeechCapture } from "@/features/games/useSpeechCapture";
import { StatusMessage } from "@/components/StatusMessage";
import {
  confirmStatEventBatch,
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
import { buildDeepgramKeyterms } from "@/lib/deepgram";
import { appLog } from "@/lib/logger";
import {
  buildProposalBatchResult,
  parseLastEventCorrection,
  parseMatchTranscript,
  type ParseMatchResult,
  type ParsedBatchClause,
  type ParsedSkippedClause,
  type ParsedStatProposal
} from "@/lib/matchParser";
import {
  getLlmParseEligibility,
  parseStatLlm,
  type LlmParseReason
} from "@/lib/parseStatLlm";
import { buildPlayerStatRows, summarizeEvents, trackedStatTypes } from "@/lib/stats";
import { requireSupabase } from "@/lib/supabase";
import { formatDateTime, getErrorMessage, titleCase } from "@/lib/utils";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type StatEventRow = Database["public"]["Tables"]["stat_events"]["Row"];

interface ReviewItem {
  id: string;
  clientCaptureId: string;
  transcript: string;
  createdAt: string;
  setNumber: number;
  captureDurationMs: number | null;
  source: "speech" | "manual";
  result: ParseMatchResult;
  llmAssist: ReviewItemLlmAssist;
  batchClauseAssist: Record<string, ReviewItemLlmAssist>;
}

type ReviewItemLlmAssist = {
  status: "idle" | "loading" | "error" | "skipped";
  message?: string;
};

interface EventEditDraft {
  playerId: string;
  eventType: StatEventType;
}

const formatSourceLabel = (source: ReviewItem["source"]) =>
  source === "speech" ? "Voice" : "Typed";

type SpeechCapturePhase = "idle" | "requesting_mic" | "authenticating" | "connecting" | "ready" | "finalizing";

const getCapturePhaseSummary = (phase: SpeechCapturePhase) => {
  switch (phase) {
    case "requesting_mic":
      return "Waiting for microphone access";
    case "authenticating":
      return "Preparing live dictation";
    case "connecting":
      return "Connecting to live transcription";
    case "ready":
      return "Ready for you to speak";
    case "finalizing":
      return "Finishing the transcript";
    case "idle":
    default:
      return "Ready for the next stat call";
  }
};

const getCapturePhaseInstruction = (phase: SpeechCapturePhase) => {
  switch (phase) {
    case "requesting_mic":
      return "Allow the mic if the browser asks for permission.";
    case "authenticating":
      return "Hold on while we prepare the live transcription session.";
    case "connecting":
      return "Wait to speak until this changes to ready so your important words are captured.";
    case "ready":
      return "Deepgram is live now. Say the play, then tap again to stop and review it.";
    case "finalizing":
      return "We heard you and are waiting for the last transcript chunk to arrive.";
    case "idle":
    default:
      return "Idle until you start capture";
  }
};

const getCaptureButtonLabel = (phase: SpeechCapturePhase, isListening: boolean, idleLabel: string, stopLabel: string) => {
  if (!isListening) {
    return idleLabel;
  }

  switch (phase) {
    case "requesting_mic":
      return "Allowing mic...";
    case "authenticating":
      return "Starting dictation...";
    case "connecting":
      return "Connecting...";
    case "ready":
      return stopLabel;
    case "finalizing":
      return "Finishing...";
    case "idle":
    default:
      return stopLabel;
  }
};

const buildEventSummary = (event: StatEventRow, players: PlayerRow[]) => {
  const player = players.find((candidate) => candidate.id === event.player_id);
  const playerLabel = player
    ? `#${player.jersey_number} ${player.first_name} ${player.last_name}`
    : "Unknown player";

  return `${titleCase(event.event_type)} - ${playerLabel}`;
};

const buildProposalFromLlm = ({
  uiId,
  player,
  eventType,
  setNumber
}: {
  uiId: string;
  player: PlayerRow;
  eventType: StatEventType;
  setNumber: number;
}): ParsedStatProposal => ({
  uiId,
  playerId: player.id,
  playerDisplayName: `${player.first_name} ${player.last_name}`,
  jerseyNumber: player.jersey_number,
  eventType,
  eventLabel: titleCase(eventType),
  setNumber,
  matchedPlayerBy: ["llm"]
});

const getReviewItemProposals = (item: ReviewItem) => {
  if (item.result.kind === "proposal") {
    return [item.result.proposal];
  }

  if (item.result.kind === "proposal_batch") {
    return item.result.proposals;
  }

  return [];
};

const getReviewItemSkippedClauses = (item: ReviewItem): ParsedSkippedClause[] =>
  item.result.kind === "proposal_batch" ? item.result.skippedClauses : [];

const getBatchClauseAssist = (item: ReviewItem, clauseId: string): ReviewItemLlmAssist =>
  item.batchClauseAssist[clauseId] ?? { status: "idle" };

const getReviewItemLoadingClauseCount = (item: ReviewItem) => {
  if (item.result.kind === "proposal_batch") {
    return item.result.clauses.filter((clause) => getBatchClauseAssist(item, clause.clauseId).status === "loading").length;
  }

  return item.llmAssist.status === "loading" ? 1 : 0;
};

const canConfirmReviewItem = (item: ReviewItem) =>
  item.result.kind !== "clarification" &&
  getReviewItemProposals(item).length > 0 &&
  getReviewItemLoadingClauseCount(item) === 0;

const buildProposalClientEventId = (item: ReviewItem, proposal: ParsedStatProposal) =>
  `${item.clientCaptureId}:${proposal.uiId}`;

const buildReviewHeading = (item: ReviewItem) => {
  if (item.result.kind === "proposal") {
    return `${item.result.proposal.eventLabel} for #${item.result.proposal.jerseyNumber} ${item.result.proposal.playerDisplayName}`;
  }

  if (item.result.kind === "proposal_batch") {
    return item.result.proposals.length > 0
      ? `${item.result.proposals.length} plays ready to review`
      : "That call needs clarification";
  }

  return "Needs clarification";
};

const buildReviewStatusMessage = (item: ReviewItem) => {
  if (item.result.kind === "proposal") {
    return `Interpreted ${item.result.proposal.eventLabel} for #${item.result.proposal.jerseyNumber} ${item.result.proposal.playerDisplayName}. Confirm to save it, or discard to skip.`;
  }

  if (item.result.kind === "proposal_batch") {
    const skippedCount = item.result.skippedClauses.length;
    const loadingCount = getReviewItemLoadingClauseCount(item);

    if (loadingCount > 0) {
      return `Interpreted ${item.result.proposals.length} play${item.result.proposals.length === 1 ? "" : "s"} so far. Still checking ${loadingCount} unclear part${loadingCount === 1 ? "" : "s"} with smart fill-in before you can confirm the group.`;
    }

    if (item.result.proposals.length === 0) {
      return "Nothing in that call could be saved yet. Review the skipped lines below or discard the whole group.";
    }

    return skippedCount > 0
      ? `Interpreted ${item.result.proposals.length} plays and skipped ${skippedCount} line${skippedCount === 1 ? "" : "s"} we could not use. Confirm the list below to save the good ones.`
      : `Interpreted ${item.result.proposals.length} plays from one call. Confirm to save them in order.`;
  }

  return item.result.clarification.message;
};

const buildBatchClauseAssistState = (
  result: Extract<ParseMatchResult, { kind: "proposal_batch" }>
) =>
  Object.fromEntries(
    result.clauses.flatMap((clause) => {
      if (!clause.skipped) {
        return [];
      }

      const eligibility = getLlmParseEligibility({
        reason: clause.skipped.reason,
        transcript: clause.text
      });

      return [
        [
          clause.clauseId,
          eligibility.allowed
            ? ({ status: "loading" } satisfies ReviewItemLlmAssist)
            : ({
              status: eligibility.status,
              message: eligibility.message
            } satisfies ReviewItemLlmAssist)
        ]
      ];
    })
  ) satisfies Record<string, ReviewItemLlmAssist>;

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
  const [editingReviewItemId, setEditingReviewItemId] = useState<string | null>(null);
  const [reviewItemEditDraft, setReviewItemEditDraft] = useState<EventEditDraft | null>(null);
  const [eventLogFilter, setEventLogFilter] = useState<"current" | "all">("current");
  const [correctionTranscript, setCorrectionTranscript] = useState("");
  const [isApplyingCorrection, setIsApplyingCorrection] = useState(false);
  const [showInlineCorrection, setShowInlineCorrection] = useState(false);
  const [scoreDraft, setScoreDraft] = useState({ us: "0", them: "0" });
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [isFinishingSet, setIsFinishingSet] = useState(false);
  const [editingSetNumber, setEditingSetNumber] = useState<number | null>(null);
  const [editSetScoreDraft, setEditSetScoreDraft] = useState({ us: "0", them: "0" });
  const [isUpdatingGameStatus, setIsUpdatingGameStatus] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const primaryMicRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          setIsScrolled(!entry.isIntersecting);
        },
        { rootMargin: "0px", threshold: 0 }
      );
      observerRef.current.observe(node);
    }
  }, []);
  const speechKeyterms = buildDeepgramKeyterms(players);

  const loadBundle = async (targetGameId: string) => {
    const nextBundle = await getGameBundle(requireSupabase(), targetGameId);
    setGame(nextBundle.game);
    setPlayers(nextBundle.players);
    setEvents(nextBundle.events);
    setLastLoadedAt(new Date().toISOString());
    setStatus(null);
    return nextBundle;
  };

  const runLlmAssist = async ({
    reviewItemId,
    clauseId,
    transcript,
    currentSet,
    clarificationReason
  }: {
    reviewItemId: string;
    clauseId?: string;
    transcript: string;
    currentSet: number;
    clarificationReason: LlmParseReason;
  }) => {
    if (!game) {
      return;
    }

    const startedAt = performance.now();

    appLog("info", "capture.parse.llm.started", {
      gameId: game.id,
      reviewItemId,
      clauseId: clauseId ?? null,
      clarificationReason,
      transcriptLength: transcript.length
    });

    try {
      const llmResult = await parseStatLlm({
        gameId: game.id,
        transcript,
        currentSet
      });
      const matchedPlayer = players.find((player) => player.id === llmResult.playerId);

      if (!matchedPlayer) {
        throw new Error("Smart fill-in named a player who is not on this roster.");
      }

      const nextProposal = buildProposalFromLlm({
        uiId: clauseId ?? "llm-recovered",
        player: matchedPlayer,
        eventType: llmResult.eventType,
        setNumber: currentSet
      });

      let applied = false;

      setReviewItems((current) =>
        current.map((candidate) => {
          if (candidate.id !== reviewItemId) {
            return candidate;
          }

          if (clauseId) {
            if (
              candidate.result.kind !== "proposal_batch" ||
              getBatchClauseAssist(candidate, clauseId).status !== "loading"
            ) {
              return candidate;
            }

            applied = true;

            const nextClauses = candidate.result.clauses.map((clause) =>
              clause.clauseId === clauseId
                ? {
                  clauseId,
                  text: clause.text,
                  proposal: nextProposal,
                  skipped: null
                }
                : clause
            );

            return {
              ...candidate,
              result: buildProposalBatchResult(nextClauses),
              batchClauseAssist: {
                ...candidate.batchClauseAssist,
                [clauseId]: {
                  status: "idle",
                  message: "Smart fill-in filled in that line."
                }
              }
            };
          }

          if (
            candidate.result.kind !== "clarification" ||
            candidate.llmAssist.status !== "loading"
          ) {
            return candidate;
          }

          applied = true;

          return {
            ...candidate,
            result: {
              kind: "proposal",
              proposal: nextProposal
            },
            llmAssist: {
              status: "idle",
              message: "Smart fill-in suggested a play. Review it before confirming."
            }
          };
        })
      );

      appLog("info", "capture.parse.llm.completed", {
        gameId: game.id,
        reviewItemId,
        clauseId: clauseId ?? null,
        latencyMs: Math.round(performance.now() - startedAt),
        applied,
        eventType: nextProposal.eventType,
        playerId: nextProposal.playerId
      });

      if (applied) {
        setWorkflowStatus({
          tone: "success",
          message: clauseId
            ? `Smart fill-in added ${nextProposal.eventLabel} for #${nextProposal.jerseyNumber} ${nextProposal.playerDisplayName} to the group. Review everything before you confirm.`
            : `Smart fill-in suggested ${nextProposal.eventLabel} for #${nextProposal.jerseyNumber} ${nextProposal.playerDisplayName}. Confirm to save, or discard to skip.`
        });
      }
    } catch (error) {
      const message = getErrorMessage(error);

      setReviewItems((current) =>
        current.map((candidate) => {
          if (candidate.id !== reviewItemId) {
            return candidate;
          }

          if (clauseId) {
            if (
              candidate.result.kind !== "proposal_batch" ||
              getBatchClauseAssist(candidate, clauseId).status !== "loading"
            ) {
              return candidate;
            }

            return {
              ...candidate,
              batchClauseAssist: {
                ...candidate.batchClauseAssist,
                [clauseId]: {
                  status: "error",
                  message
                }
              }
            };
          }

          if (
            candidate.result.kind !== "clarification" ||
            candidate.llmAssist.status !== "loading"
          ) {
            return candidate;
          }

          return {
            ...candidate,
            llmAssist: {
              status: "error",
              message
            }
          };
        })
      );

      appLog("warn", "capture.parse.llm.failed", {
        gameId: game.id,
        reviewItemId,
        clauseId: clauseId ?? null,
        latencyMs: Math.round(performance.now() - startedAt),
        error: message
      });
    }
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
        message: "This game is completed. Reopen it before adding more plays."
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
      eventType: result.kind === "proposal" ? result.proposal.eventType : null,
      proposalCount:
        result.kind === "proposal" ? 1 : result.kind === "proposal_batch" ? result.proposals.length : 0,
      skippedClauseCount: result.kind === "proposal_batch" ? result.skippedClauses.length : 0,
      clauseCount: result.kind === "proposal_batch" ? result.clauses.length : null
    });

    const reviewItemId = crypto.randomUUID();
    const clientCaptureId = crypto.randomUUID();
    const eligibility =
      result.kind === "clarification"
        ? getLlmParseEligibility({
          reason: result.clarification.reason,
          transcript
        })
        : null;
    const batchClauseAssist =
      result.kind === "proposal_batch" ? buildBatchClauseAssistState(result) : {};

    if (result.kind === "clarification" && eligibility && !eligibility.allowed) {
      appLog("info", "capture.parse.llm.skipped", {
        gameId: game.id,
        reviewItemId,
        reason: result.clarification.reason,
        skipMessage: eligibility.message
      });
    }

    if (result.kind === "proposal_batch") {
      result.clauses.forEach((clause) => {
        if (!clause.skipped) {
          return;
        }

        const assist = batchClauseAssist[clause.clauseId];
        if (!assist || assist.status === "loading") {
          return;
        }

        appLog("info", "capture.parse.llm.skipped", {
          gameId: game.id,
          reviewItemId,
          clauseId: clause.clauseId,
          reason: clause.skipped.reason,
          skipMessage: assist.message ?? null
        });
      });
    }

    const llmAssist: ReviewItemLlmAssist =
      result.kind === "clarification"
        ? eligibility?.allowed
          ? { status: "loading" }
          : {
            status: eligibility?.status ?? "skipped",
            message: eligibility?.message
          }
        : { status: "idle" };

    setReviewItems((current) =>
      [
        {
          id: reviewItemId,
          clientCaptureId,
          transcript,
          createdAt: new Date().toISOString(),
          setNumber: game.current_set,
          captureDurationMs: durationMs,
          source,
          result,
          llmAssist,
          batchClauseAssist
        },
        ...current
      ].slice(0, 8)
    );

    setManualTranscript("");
    setWorkflowStatus(
      result.kind === "clarification"
        ? {
          tone: eligibility?.allowed
            ? "info"
            : result.clarification.reason === "missing_event_type"
              ? "warn"
              : "info",
          message: eligibility?.allowed
            ? `${result.clarification.message} Checking with AI now.`
            : result.clarification.message
        }
        : {
          tone: "success",
          message: buildReviewStatusMessage({
            id: reviewItemId,
            clientCaptureId: "",
            transcript,
            createdAt: "",
            setNumber: game.current_set,
            captureDurationMs: durationMs,
            source,
            result,
            llmAssist,
            batchClauseAssist
          })
        }
    );

    if (result.kind === "clarification" && eligibility?.allowed) {
      void runLlmAssist({
        reviewItemId,
        transcript: eligibility.normalizedTranscript,
        currentSet: game.current_set,
        clarificationReason: result.clarification.reason
      });
    }

    if (result.kind === "proposal_batch") {
      const eligibleClauses = result.clauses.flatMap((clause) => {
        if (!clause.skipped) {
          return [];
        }

        const assist = batchClauseAssist[clause.clauseId];
        if (!assist || assist.status !== "loading") {
          return [];
        }

        const clauseEligibility = getLlmParseEligibility({
          reason: clause.skipped.reason,
          transcript: clause.text
        });

        if (!clauseEligibility.allowed) {
          return [];
        }

        return [
          {
            clauseId: clause.clauseId,
            transcript: clauseEligibility.normalizedTranscript,
            reason: clause.skipped.reason
          }
        ];
      });

      appLog("info", "capture.parse.batch.ready", {
        gameId: game.id,
        reviewItemId,
        clauseCount: result.clauses.length,
        deterministicProposalCount: result.proposals.length,
        aiEligibleClauseCount: eligibleClauses.length,
        skippedClauseCount: result.skippedClauses.length
      });

      eligibleClauses.forEach((clause) => {
        void runLlmAssist({
          reviewItemId,
          clauseId: clause.clauseId,
          transcript: clause.transcript,
          currentSet: game.current_set,
          clarificationReason: clause.reason
        });
      });
    }
  };

  const {
    isSupported: isSpeechCaptureSupported,
    isListening,
    phase: speechPhase,
    isReadyToCapture,
    liveTranscript,
    error: speechError,
    clearError: clearSpeechError,
    startListening,
    stopListening
  } = useSpeechCapture(handleCapturedTranscript, {
    keyterms: speechKeyterms,
    sessionLabel: "stat-capture"
  });

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
        message: "There is no saved play to correct yet."
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
        message: `Updated the last saved play to ${correctionResult.proposal.eventLabel} for #${correctionResult.proposal.jerseyNumber} ${correctionResult.proposal.playerDisplayName}.`
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
        message: `Current set updated to Set ${updatedGame.current_set}. New plays and the event list filter will use that set.`
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

  const handleSaveScoreAndAdvance = async () => {
    const us = Number(scoreDraft.us);
    const them = Number(scoreDraft.them);
    if (!Number.isInteger(us) || us < 0 || !Number.isInteger(them) || them < 0) {
      setWorkflowStatus({ tone: "warn", message: "Scores must be whole numbers at or above zero." });
      return;
    }
    try {
      setIsSavingScore(true);
      const updatedGame = await updateGame(requireSupabase(), game.id, {
        score_by_set: upsertSetScore(scoreBySet, { setNumber: game.current_set, us, them })
      });
      setGame(updatedGame);
      setIsFinishingSet(false);
      await changeCurrentSet(game.current_set + 1);
    } catch (error) {
      setWorkflowStatus({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleSaveSetScore = async (setNumber: number, us: number, them: number) => {
    try {
      setIsSavingScore(true);
      const currentScoreBySet = normalizeScoreBySet(game.score_by_set);
      const updatedGame = await updateGame(requireSupabase(), game.id, {
        score_by_set: upsertSetScore(currentScoreBySet, { setNumber, us, them })
      });
      setGame(updatedGame);
      setEditingSetNumber(null);
    } catch (error) {
      setWorkflowStatus({ tone: "error", message: getErrorMessage(error) });
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
    const isDraftConfirm = editingReviewItemId === itemId && reviewItemEditDraft !== null;

    if (!item || (item.result.kind === "clarification" && !isDraftConfirm)) {
      return;
    }

    if (item.result.kind !== "clarification") {
      const proposals = getReviewItemProposals(item);

      if (proposals.length === 0) {
        setWorkflowStatus({
          tone: "warn",
          message: "Nothing here is ready to save yet."
        });
        return;
      }

      if (getReviewItemLoadingClauseCount(item) > 0) {
        setWorkflowStatus({
          tone: "info",
          message: "Wait for smart fill-in to finish on the unclear lines before you confirm this group."
        });
        return;
      }
    }

    try {
      setActiveReviewId(itemId);

      if (item.result.kind === "clarification") {
        const draft = reviewItemEditDraft!;
        const player = players.find((p) => p.id === draft.playerId);
        await confirmStatEvent(requireSupabase(), {
          game_id: game.id,
          player_id: draft.playerId,
          event_type: draft.eventType,
          set_number: item.setNumber,
          timestamp: item.createdAt,
          client_event_id: item.clientCaptureId
        });
        await loadBundle(gameId);
        setReviewItems((current) => current.filter((candidate) => candidate.id !== itemId));
        setEditingReviewItemId(null);
        setReviewItemEditDraft(null);
        setWorkflowStatus({
          tone: "success",
          message: `Confirmed ${titleCase(draft.eventType)} for ${player ? `#${player.jersey_number} ${player.first_name} ${player.last_name}` : "the selected player"}. The live stats now reflect it.`
        });
        return;
      }

      const proposals = getReviewItemProposals(item);

      appLog("info", "capture.review.confirm.started", {
        gameId: game.id,
        reviewItemId: item.id,
        proposalCount: proposals.length
      });

      if (item.result.kind === "proposal_batch") {
        await confirmStatEventBatch(requireSupabase(), {
          target_game_id: game.id,
          target_set_number: item.setNumber,
          capture_created_at: item.createdAt,
          target_client_capture_id: item.clientCaptureId,
          proposals: proposals.map((proposal) => ({
            ui_id: proposal.uiId,
            player_id: proposal.playerId,
            event_type: proposal.eventType
          }))
        });
      } else {
        const override = editingReviewItemId === itemId ? reviewItemEditDraft : null;
        await confirmStatEvent(requireSupabase(), {
          game_id: game.id,
          player_id: override?.playerId ?? proposals[0].playerId,
          event_type: override?.eventType ?? proposals[0].eventType,
          set_number: item.setNumber,
          timestamp: item.createdAt,
          client_event_id: buildProposalClientEventId(item, proposals[0])
        });
      }

      await loadBundle(gameId);
      setReviewItems((current) => current.filter((candidate) => candidate.id !== itemId));
      setEditingReviewItemId(null);
      setReviewItemEditDraft(null);
      appLog("info", "capture.review.confirm.completed", {
        gameId: game.id,
        reviewItemId: item.id,
        proposalCount: proposals.length,
        mode: item.result.kind
      });
      setWorkflowStatus({
        tone: "success",
        message:
          proposals.length === 1
            ? `Confirmed ${proposals[0].eventLabel} for #${proposals[0].jerseyNumber} ${proposals[0].playerDisplayName}. The live stats now reflect it.`
            : `Confirmed ${proposals.length} plays in order. Live stats now include the full group.`
      });
    } catch (error) {
      appLog("warn", "capture.review.confirm.failed", {
        gameId: game.id,
        reviewItemId: item.id,
        proposalCount: item.result.kind !== "clarification" ? getReviewItemProposals(item).length : 0,
        mode: item.result.kind,
        error: getErrorMessage(error)
      });
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
      message: "Discarded. Nothing was saved."
    });
  };

  const handleUndoEvent = async (eventId: string, message: string) => {
    if (game.status === "completed") {
      setWorkflowStatus({
        tone: "warn",
        message: "This game is completed. Reopen it before undoing saved plays."
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
        message: "Play updated. Totals were recalculated."
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
              <span className="chip">Live capture &amp; post-game</span>
              <h2>
                vs {game.opponent_name} · Set {game.current_set}
              </h2>

            </div>
            <div className="hero-meta" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
              <div className="meta-pill">Status: {titleCase(game.status)}</div>
              <div className="meta-pill">Set: {game.current_set}</div>
              <div className="meta-pill">
                Score: <strong>{currentSetScore.us}-{currentSetScore.them}</strong>
              </div>
              <div className="meta-pill">Match: {matchScore.us}-{matchScore.them}</div>
              <div className="meta-pill">Plays: {activeEvents.length}</div>
              <div className="meta-pill" style={{ opacity: 0.7 }}>Updates: {lastLoadedAt ? "Live" : "Waiting"}</div>
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


      {/* 2. Slide-In Compact Sticky Header (Fixed Overlay) */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.96))",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--line-strong)",
          padding: "0.75rem 1.5rem",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          visibility: isScrolled ? "visible" : "hidden",
          opacity: isScrolled ? 1 : 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem"
        }}
      >
        <button
          className="button"
          type="button"
          disabled={!canCapture || !isSpeechCaptureSupported || isGameCompleted}
          onClick={() => {
            if (isListening) stopListening();
            else { clearSpeechError(); startListening(); }
          }}
          style={{
            padding: "0.75rem 1.25rem",
            fontSize: "0.95rem",
            borderRadius: "999px",
            boxShadow: isListening
              ? "0 0 0 4px rgba(255, 107, 44, 0.2), 0 4px 10px rgba(255, 107, 44, 0.3)"
              : "0 4px 12px rgba(255, 107, 44, 0.2)",
            background: isListening ? "linear-gradient(135deg, #FF3B3B, #FF6B2C)" : undefined,
            transition: "all 0.2s ease",
            whiteSpace: "nowrap"
          }}
        >
          {isListening ? "Recording..." : "Start Mic"}
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1, overflow: "hidden" }}>
          <span className="capture-state" style={{ color: isListening ? "var(--orange-primary)" : "var(--text-soft)", fontSize: "0.85rem", fontWeight: "700" }}>
            {isListening ? "Listening for the next play..." : "Idle until you start capture"}
          </span>
          {liveTranscript && (
            <div className="mono" style={{ fontSize: "0.9rem", color: "var(--text-strong)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              "{liveTranscript}"
            </div>
          )}
        </div>
      </div>

      {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}
      {workflowStatus ? <StatusMessage tone={workflowStatus.tone} message={workflowStatus.message} /> : null}

      <div className="split-layout sidebar-heavy">
        <section className="card stack feature-panel feature-panel-primary" ref={primaryMicRefCallback}>
          <div className="section-toolbar">
            <h3>Log a play</h3>
            <div className="supporting-text">
              {getCapturePhaseSummary(speechPhase)}
            </div>
          </div>

          {!canCapture ? (
            <StatusMessage
              tone="info"
              message="Add players to the roster before logging stats so we know who each call refers to."
            />
          ) : null}
          {isGameCompleted ? (
            <StatusMessage
              tone="info"
              message="This match is finished. Reopen the game if you need to add plays, confirm the queue, undo, or edit."
            />
          ) : null}

          <section className="surface stack capture-panel action-panel primary">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
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
                style={{
                  width: "100%",
                  padding: "1.1rem 2rem",
                  fontSize: "1.15rem",
                  letterSpacing: "0.01em",
                  boxShadow: isListening
                    ? "0 0 0 5px rgba(255, 107, 44, 0.18), 0 8px 24px rgba(255, 107, 44, 0.35)"
                    : "0 6px 20px rgba(255, 107, 44, 0.25)",
                  background: isListening ? "linear-gradient(135deg, #FF3B3B, #FF6B2C)" : undefined,
                  transition: "all 0.2s ease"
                }}
              >
                {getCaptureButtonLabel(speechPhase, isListening, "Push to talk", "Stop listening")}
              </button>
              <span className="capture-state" style={{ fontSize: "0.88rem" }}>
                {getCapturePhaseInstruction(speechPhase)}
              </span>
            </div>

            {isListening && !isReadyToCapture ? (
              <StatusMessage tone="info" message={'Wait for \u201cReady for you to speak\u201d before saying the play.'} />
            ) : null}

            {liveTranscript ? (
              <div className="transcript-box">
                <div className="muted">Live dictation</div>
                <div className="mono">{liveTranscript}</div>
              </div>
            ) : null}

            {speechError ? <StatusMessage tone="error" message={speechError} /> : null}

            <form
              className="stack"
              style={{ gap: "0.5rem" }}
              onSubmit={(event) => {
                event.preventDefault();
                if (!manualTranscript.trim()) {
                  setWorkflowStatus({
                    tone: "warn",
                    message: "Type or paste what you called before parsing."
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
              <textarea
                rows={2}
                placeholder="Or type it — e.g. 12 kill, Jane ace"
                value={manualTranscript}
                disabled={isGameCompleted}
                onChange={(event) => setManualTranscript(event.target.value)}
                style={{ resize: "none", borderRadius: "0.75rem" }}
              />
              <div className="form-actions">
                <button className="button-secondary" type="submit" disabled={!canCapture || isGameCompleted}>
                  Interpret
                </button>
                {manualTranscript && (
                  <button
                    className="button-ghost"
                    type="button"
                    disabled={isGameCompleted}
                    onClick={() => setManualTranscript("")}
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="review-list">
            <h3>Review queue</h3>

            {reviewItems.length === 0 ? (
              <StatusMessage
                tone="info"
                message="No review items yet. Use the mic or the text box to log a play, then confirm or discard it here."
              />
            ) : (
              reviewItems.map((item) => (
                <article
                  className={`review-card decision-card ${item.result.kind === "clarification" ? "clarification" : "proposal"
                    }`}
                  key={item.id}
                >
                  <div className="cluster review-header">
                    <div className="decision-summary">
                      <strong className="decision-title">{buildReviewHeading(item)}</strong>
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
                    <div className="muted">Original wording</div>
                    <div className="mono">{item.transcript}</div>
                  </div>

                  {item.result.kind === "proposal" ? (() => {
                    const proposal = item.result.proposal;
                    return (
                    <>
                      {editingReviewItemId === item.id && reviewItemEditDraft ? (
                        <div className="form-grid two">
                          <label className="stack" style={{ gap: "0.35rem" }}>
                            <span className="muted">Player</span>
                            <select
                              value={reviewItemEditDraft.playerId}
                              onChange={(e) =>
                                setReviewItemEditDraft((cur) => cur ? { ...cur, playerId: e.target.value } : cur)
                              }
                            >
                              {players.map((p) => (
                                <option key={p.id} value={p.id}>
                                  #{p.jersey_number} {p.first_name} {p.last_name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="stack" style={{ gap: "0.35rem" }}>
                            <span className="muted">Stat type</span>
                            <select
                              value={reviewItemEditDraft.eventType}
                              onChange={(e) =>
                                setReviewItemEditDraft((cur) => cur ? { ...cur, eventType: e.target.value as StatEventType } : cur)
                              }
                            >
                              {trackedStatTypes.map((t) => (
                                <option key={t} value={t}>{titleCase(t)}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : (
                        <div className="supporting-text">
                          Matched by {item.result.proposal.matchedPlayerBy.join(", ")}. If your connection drops,
                          confirming again won&apos;t create a duplicate play.
                        </div>
                      )}
                      <div className="form-actions">
                        <button
                          className="button"
                          type="button"
                          disabled={activeReviewId === item.id || isGameCompleted || !canConfirmReviewItem(item)}
                          onClick={() => {
                            void handleConfirmReviewItem(item.id);
                          }}
                        >
                          {activeReviewId === item.id ? "Confirming..." : "Confirm event"}
                        </button>
                        {editingReviewItemId === item.id ? (
                          <button
                            className="button-ghost"
                            type="button"
                            onClick={() => {
                              setEditingReviewItemId(null);
                              setReviewItemEditDraft(null);
                            }}
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            className="button-ghost"
                            type="button"
                            disabled={isGameCompleted}
                            onClick={() => {
                              setEditingReviewItemId(item.id);
                              setReviewItemEditDraft({
                                playerId: proposal.playerId,
                                eventType: proposal.eventType
                              });
                            }}
                          >
                            Edit
                          </button>
                        )}
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
                    );
                  })() : item.result.kind === "proposal_batch" ? (
                    <div className="stack" style={{ gap: "0.75rem" }}>
                      <div className="supporting-text">
                        One voice or typed call stays grouped here. When smart fill-in finishes on any unclear
                        lines, you can confirm the whole list at once—each saved play is deduplicated if you tap
                        confirm twice by mistake.
                      </div>

                      <div className="batch-proposal-list">
                        {item.result.clauses.map((clause, index) => {
                          const clauseAssist = getBatchClauseAssist(item, clause.clauseId);

                          if (clause.proposal) {
                            return (
                              <div className="batch-proposal-row" key={clause.clauseId}>
                                <div className="batch-proposal-order">{index + 1}</div>
                                <div className="stack" style={{ gap: "0.2rem" }}>
                                  <strong>
                                    {clause.proposal.eventLabel} for #{clause.proposal.jerseyNumber}{" "}
                                    {clause.proposal.playerDisplayName}
                                  </strong>
                                  <div className="supporting-text">
                                    Matched by {clause.proposal.matchedPlayerBy.join(", ")}
                                  </div>
                                  <div className="supporting-text">Heard: &ldquo;{clause.text}&rdquo;</div>
                                </div>
                              </div>
                            );
                          }

                          if (!clause.skipped) {
                            return null;
                          }

                          return (
                            <div className="list-item" key={clause.clauseId}>
                              <strong>Couldn&apos;t use: &ldquo;{clause.text}&rdquo;</strong>
                              <div className="supporting-text">{clause.skipped.message}</div>
                              {clauseAssist.status === "loading" ? (
                                <div className="supporting-text">
                                  Checking this line with smart fill-in before you can confirm the group.
                                </div>
                              ) : null}
                              {clauseAssist.status === "error" && clauseAssist.message ? (
                                <div className="supporting-text">
                                  Smart fill-in couldn&apos;t finish this line: {clauseAssist.message}
                                </div>
                              ) : null}
                              {clauseAssist.status === "skipped" && clauseAssist.message ? (
                                <div className="supporting-text">{clauseAssist.message}</div>
                              ) : null}
                              {clause.skipped.candidates?.length ? (
                                <div className="supporting-text">
                                  Possible matches:{" "}
                                  {clause.skipped.candidates
                                    .map(
                                      (candidate) =>
                                        `#${candidate.jerseyNumber} ${candidate.playerDisplayName}`
                                    )
                                    .join(", ")}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      {getReviewItemLoadingClauseCount(item) > 0 ? (
                        <StatusMessage
                          tone="info"
                          message={`Waiting on ${getReviewItemLoadingClauseCount(item)} smart fill-in ${getReviewItemLoadingClauseCount(item) === 1 ? "check" : "checks"} before this group is ready to confirm.`}
                        />
                      ) : null}
                      {item.result.proposals.length === 0 && getReviewItemLoadingClauseCount(item) === 0 ? (
                        <StatusMessage
                          tone="warn"
                          message="No plays in this group are ready to save yet."
                        />
                      ) : null}

                      <div className="form-actions">
                        <button
                          className="button"
                          type="button"
                          disabled={activeReviewId === item.id || isGameCompleted || !canConfirmReviewItem(item)}
                          onClick={() => {
                            void handleConfirmReviewItem(item.id);
                          }}
                        >
                          {activeReviewId === item.id
                            ? "Confirming..."
                            : getReviewItemLoadingClauseCount(item) > 0
                              ? "Waiting on smart fill-in..."
                              : "Confirm all supported plays"}
                        </button>
                        <button
                          className="button-ghost"
                          type="button"
                          disabled={isGameCompleted}
                          onClick={() => handleRejectReviewItem(item.id)}
                        >
                          Discard batch
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="stack" style={{ gap: "0.6rem" }}>
                      <StatusMessage tone="warn" message={item.result.clarification.message} />
                      {item.llmAssist.status === "loading" ? (
                        <StatusMessage
                          tone="info"
                          message="Asking smart fill-in for a tighter match. Nothing saves until you confirm."
                        />
                      ) : null}
                      {item.llmAssist.status === "error" && item.llmAssist.message ? (
                        <StatusMessage
                          tone="info"
                          message={`Smart fill-in could not help here: ${item.llmAssist.message}`}
                        />
                      ) : null}
                      {item.llmAssist.status === "skipped" && item.llmAssist.message ? (
                        <div className="supporting-text">{item.llmAssist.message}</div>
                      ) : null}
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
                      {editingReviewItemId === item.id && reviewItemEditDraft ? (
                        <>
                          <div className="form-grid two">
                            <label className="stack" style={{ gap: "0.35rem" }}>
                              <span className="muted">Player</span>
                              <select
                                value={reviewItemEditDraft.playerId}
                                onChange={(e) =>
                                  setReviewItemEditDraft((cur) => cur ? { ...cur, playerId: e.target.value } : cur)
                                }
                              >
                                {players.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    #{p.jersey_number} {p.first_name} {p.last_name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="stack" style={{ gap: "0.35rem" }}>
                              <span className="muted">Stat type</span>
                              <select
                                value={reviewItemEditDraft.eventType}
                                onChange={(e) =>
                                  setReviewItemEditDraft((cur) => cur ? { ...cur, eventType: e.target.value as StatEventType } : cur)
                                }
                              >
                                {trackedStatTypes.map((t) => (
                                  <option key={t} value={t}>{titleCase(t)}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="form-actions">
                            <button
                              className="button"
                              type="button"
                              disabled={activeReviewId === item.id || isGameCompleted}
                              onClick={() => { void handleConfirmReviewItem(item.id); }}
                            >
                              {activeReviewId === item.id ? "Confirming..." : "Confirm event"}
                            </button>
                            <button
                              className="button-ghost"
                              type="button"
                              onClick={() => { setEditingReviewItemId(null); setReviewItemEditDraft(null); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="form-actions">
                          <button
                            className="button-ghost"
                            type="button"
                            disabled={isGameCompleted || players.length === 0}
                            onClick={() => {
                              setEditingReviewItemId(item.id);
                              setReviewItemEditDraft({
                                playerId: players[0].id,
                                eventType: trackedStatTypes[0]
                              });
                            }}
                          >
                            Edit &amp; save manually
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {item.captureDurationMs !== null ? (
                    <div className="supporting-text">
                      Voice note: about {Math.max(1, Math.round(item.captureDurationMs / 1000))} sec
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </section>
        </section>

        <div className="stack">
          <section className="card stack feature-panel">
            <h3>Match state</h3>

            {isGameCompleted ? null : (
              <div className="surface stack" style={{ padding: "1rem", borderRadius: "1rem" }}>
                <div>
                  <strong>Set {game.current_set}</strong>
                  <span className="muted" style={{ marginLeft: "0.5rem" }}>current</span>
                </div>

                {isFinishingSet ? (
                  <>
                    <div className="scoreboard-grid">
                      <label className="stack score-input" style={{ gap: "0.35rem" }}>
                        <span className="muted">Us</span>
                        <input
                          type="number"
                          min={0}
                          value={scoreDraft.us}
                          onChange={(e) => setScoreDraft((c) => ({ ...c, us: e.target.value }))}
                        />
                      </label>
                      <label className="stack score-input" style={{ gap: "0.35rem" }}>
                        <span className="muted">Them</span>
                        <input
                          type="number"
                          min={0}
                          value={scoreDraft.them}
                          onChange={(e) => setScoreDraft((c) => ({ ...c, them: e.target.value }))}
                        />
                      </label>
                    </div>
                    <div className="form-actions">
                      <button
                        className="button"
                        type="button"
                        disabled={isSavingScore}
                        onClick={() => { void handleSaveScoreAndAdvance(); }}
                      >
                        {isSavingScore ? "Saving..." : "Save score & next set"}
                      </button>
                      <button
                        className="button-ghost"
                        type="button"
                        disabled={isUpdatingSet}
                        onClick={() => {
                          setIsFinishingSet(false);
                          void changeCurrentSet(game.current_set + 1);
                        }}
                      >
                        Skip score
                      </button>
                      <button
                        className="button-ghost"
                        type="button"
                        onClick={() => setIsFinishingSet(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="form-actions">
                    <button
                      className="button-secondary"
                      type="button"
                      disabled={isGameCompleted}
                      onClick={() => {
                        const s = getSetScore(scoreBySet, game.current_set);
                        setScoreDraft({ us: String(s.us), them: String(s.them) });
                        setIsFinishingSet(true);
                      }}
                    >
                      Finish set
                    </button>
                  </div>
                )}
              </div>
            )}

            {trackedSetNumbers.length > 0 && (
              <div className="stack" style={{ gap: "0.4rem" }}>
                {trackedSetNumbers.map((setNumber) => {
                  const setScore = getSetScore(scoreBySet, setNumber);
                  const isEditing = editingSetNumber === setNumber;
                  const isCurrent = setNumber === game.current_set;

                  return (
                    <div className="surface" key={setNumber} style={{ padding: "0.75rem 1rem", borderRadius: "0.75rem" }}>
                      {isEditing ? (
                        <div className="stack" style={{ gap: "0.5rem" }}>
                          <div className="scoreboard-grid">
                            <label className="stack score-input" style={{ gap: "0.25rem" }}>
                              <span className="muted">Us</span>
                              <input
                                type="number"
                                min={0}
                                value={editSetScoreDraft.us}
                                onChange={(e) => setEditSetScoreDraft((c) => ({ ...c, us: e.target.value }))}
                              />
                            </label>
                            <label className="stack score-input" style={{ gap: "0.25rem" }}>
                              <span className="muted">Them</span>
                              <input
                                type="number"
                                min={0}
                                value={editSetScoreDraft.them}
                                onChange={(e) => setEditSetScoreDraft((c) => ({ ...c, them: e.target.value }))}
                              />
                            </label>
                          </div>
                          <div className="form-actions">
                            <button
                              className="button-secondary"
                              type="button"
                              disabled={isSavingScore}
                              onClick={() => {
                                void handleSaveSetScore(setNumber, Number(editSetScoreDraft.us), Number(editSetScoreDraft.them));
                              }}
                            >
                              {isSavingScore ? "Saving..." : "Save"}
                            </button>
                            <button className="button-ghost" type="button" onClick={() => setEditingSetNumber(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="cluster" style={{ justifyContent: "space-between" }}>
                          <div>
                            <strong>Set {setNumber}</strong>
                            {isCurrent && <span className="muted" style={{ marginLeft: "0.4rem", fontSize: "0.8rem" }}>current</span>}
                            <span className="muted" style={{ marginLeft: "0.75rem" }}>{setScore.us}–{setScore.them}</span>
                          </div>
                          {!isGameCompleted && (
                            <button
                              className="button-ghost"
                              type="button"
                              style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
                              onClick={() => {
                                setEditingSetNumber(setNumber);
                                setEditSetScoreDraft({ us: String(setScore.us), them: String(setScore.them) });
                              }}
                            >
                              Edit score
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="form-actions" style={{ borderTop: "1px solid var(--line-subtle)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
              {game.status === "completed" ? (
                <>
                  <Link className="button" to={`/app/summary/${game.id}`}>
                    Open post-game summary
                  </Link>
                  <button
                    className="button-ghost"
                    type="button"
                    disabled={isUpdatingGameStatus}
                    onClick={() => { void handleGameStatusChange("in_progress"); }}
                  >
                    {isUpdatingGameStatus ? "Saving..." : "Reopen game"}
                  </button>
                </>
              ) : (
                <button
                  className="button-secondary"
                  type="button"
                  disabled={isUpdatingGameStatus}
                  onClick={() => { void handleGameStatusChange("completed"); }}
                >
                  {isUpdatingGameStatus ? "Saving..." : "Complete game"}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="card stack feature-panel event-log-panel">
        <h3>Play history</h3>
        <div>
          <div className="segmented-control" aria-label="Play history filter" style={{ width: "100%" }}>
            <button
              className={`button-ghost segment-button ${eventLogFilter === "current" ? "is-active" : ""}`}
              type="button"
              aria-pressed={eventLogFilter === "current"}
              onClick={() => setEventLogFilter("current")}
                style={{ whiteSpace: "nowrap", flex: 1 }}
            >
              Current set
            </button>
            <button
              className={`button-ghost segment-button ${eventLogFilter === "all" ? "is-active" : ""}`}
              type="button"
              aria-pressed={eventLogFilter === "all"}
              onClick={() => setEventLogFilter("all")}
              style={{ whiteSpace: "nowrap", flex: 1 }}
            >
              All sets
            </button>
          </div>
        </div>

        {visibleEventLog.length === 0 ? (
          <StatusMessage
            tone="info"
            message="No saved plays match this filter yet."
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
                              Edit play
                            </button>
                            {event.id === lastConfirmedEvent?.id && (
                              <button
                                className="button-ghost"
                                type="button"
                                disabled={isGameCompleted}
                                onClick={() => {
                                  setShowInlineCorrection((v) => !v);
                                  setCorrectionTranscript("");
                                }}
                              >
                                Correct
                              </button>
                            )}
                            <button
                              className="button-ghost"
                              type="button"
                              disabled={isWorking || isGameCompleted}
                              onClick={() => {
                                void handleUndoEvent(
                                  event.id,
                                  "Play removed from totals. It stays visible in history as undone."
                                );
                              }}
                            >
                              {isWorking ? "Undoing..." : "Undo play"}
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="supporting-text">
                        Undone at {event.deleted_at ? formatDateTime(event.deleted_at) : "unknown time"}
                      </div>
                    )}
                  </div>

                  {event.id === lastConfirmedEvent?.id && showInlineCorrection && !isDeleted && !isEditing ? (
                    <form
                      className="stack"
                      style={{ gap: "0.5rem", paddingTop: "0.25rem" }}
                      onSubmit={(e) => {
                        e.preventDefault();
                        void applyLastEventCorrection({
                          transcript: correctionTranscript.trim(),
                          durationMs: null,
                          source: "manual"
                        }).then(() => {
                          setShowInlineCorrection(false);
                          setCorrectionTranscript("");
                        });
                      }}
                    >
                      <input
                        placeholder="e.g. actually attack error, actually Jane ace"
                        value={correctionTranscript}
                        disabled={isApplyingCorrection || isGameCompleted}
                        onChange={(e) => setCorrectionTranscript(e.target.value)}
                        style={{ borderRadius: "0.75rem" }}
                      />
                      <div className="form-actions">
                        <button
                          className="button-secondary"
                          type="submit"
                          disabled={isApplyingCorrection || !correctionTranscript.trim() || isGameCompleted}
                        >
                          {isApplyingCorrection ? "Applying..." : "Apply"}
                        </button>
                        <button
                          className="button-ghost"
                          type="button"
                          onClick={() => {
                            setShowInlineCorrection(false);
                            setCorrectionTranscript("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="info-grid">
        <section className="card stack feature-panel">
          <div className="section-copy" style={{ marginBottom: "0.5rem" }}>
            <h3>Stat totals</h3>

          </div>
          <div className="grid three" style={{ gap: "0.5rem" }}>
            {trackedStatTypes.map((eventType) => (
              <div key={eventType} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.375rem 0.625rem", background: "var(--surface-2, rgba(255,255,255,0.04))", borderRadius: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>{titleCase(eventType)}</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{totals[eventType]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card stack feature-panel table-card">
          <div className="section-copy">
            <h3>Per-player set table</h3>

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
                      No saved plays yet. Confirm something from the review queue to fill this table.
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
