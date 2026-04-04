import type { Database, StatEventType } from "@/lib/database.types";
import { titleCase } from "@/lib/utils";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"];

interface PlayerCandidate {
  player: PlayerRow;
  matchedBy: string[];
  score: number;
}

export interface ParsedStatProposal {
  uiId: string;
  playerId: string;
  playerDisplayName: string;
  jerseyNumber: number;
  eventType: StatEventType;
  eventLabel: string;
  setNumber: number;
  matchedPlayerBy: string[];
}

export interface ParsedSkippedClause {
  clauseId: string;
  text: string;
  reason: "unsupported_event" | "missing_event_type" | "missing_player" | "ambiguous_player";
  message: string;
  candidates?: Array<{
    playerId: string;
    playerDisplayName: string;
    jerseyNumber: number;
    matchedBy: string[];
  }>;
}

export interface ParsedBatchClause {
  clauseId: string;
  text: string;
  proposal: ParsedStatProposal | null;
  skipped: ParsedSkippedClause | null;
}

export interface ParseClarification {
  reason: "missing_event_type" | "missing_player" | "ambiguous_player";
  message: string;
  candidates?: Array<{
    playerId: string;
    playerDisplayName: string;
    jerseyNumber: number;
    matchedBy: string[];
  }>;
}

export type ParseMatchResult =
  | {
      kind: "proposal";
      proposal: ParsedStatProposal;
    }
  | {
      kind: "proposal_batch";
      clauses: ParsedBatchClause[];
      proposals: ParsedStatProposal[];
      skippedClauses: ParsedSkippedClause[];
    }
  | {
      kind: "clarification";
      clarification: ParseClarification;
    };

export interface ParsedCorrectionProposal {
  playerId: string;
  playerDisplayName: string;
  jerseyNumber: number;
  eventType: StatEventType;
  eventLabel: string;
  matchedPlayerBy: string[];
}

const eventAliases: Array<{ eventType: StatEventType; aliases: string[] }> = [
  { eventType: "serve_error", aliases: ["serve error", "service error", "missed serve", "service miss"] },
  {
    eventType: "reception_error",
    aliases: ["reception error", "serve receive error", "passing error", "pass error", "shank", "shanked"]
  },
  { eventType: "attack_error", aliases: ["attack error", "hitting error", "hit out", "hit long"] },
  { eventType: "set", aliases: ["set assist", "assist", "set", "sets"] },
  { eventType: "kill", aliases: ["kill", "kills", "killed"] },
  { eventType: "ace", aliases: ["ace", "aces", "aced"] },
  { eventType: "block", aliases: ["block", "blocks", "blocked", "stuff block"] },
  { eventType: "dig", aliases: ["dig", "digs", "dug"] }
];

const unsupportedContextAliases = [
  "pass",
  "passes",
  "passed",
  "passing",
  "receive",
  "receives",
  "received",
  "reception",
  "free ball",
  "cover",
  "coverage"
] as const;

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const includesPhrase = (text: string, phrase: string) => {
  const pattern = new RegExp(`(^|\\s)${escapeRegExp(phrase).replace(/\s+/g, "\\s+")}(?=\\s|$)`);
  return pattern.test(text);
};

const findAliasIndex = (text: string, alias: string) => {
  const pattern = new RegExp(`(^|\\s)${escapeRegExp(alias).replace(/\s+/g, "\\s+")}(?=\\s|$)`);
  const match = pattern.exec(text);
  if (!match || match.index === undefined) {
    return -1;
  }

  return match.index + match[1].length;
};

export const resolveEventType = (transcript: string) => {
  const normalizedTranscript = normalizeSearchText(transcript);
  const matches = eventAliases
    .flatMap(({ eventType, aliases }) =>
      aliases
        .filter((alias) => includesPhrase(normalizedTranscript, alias))
        .map((alias) => ({ eventType, alias }))
    )
    .sort((left, right) => right.alias.length - left.alias.length);

  if (matches.length === 0) {
    return null;
  }

  return matches[0];
};

const addCandidate = (
  candidates: Map<string, PlayerCandidate>,
  player: PlayerRow,
  matchedBy: string,
  score: number
) => {
  const existing = candidates.get(player.id);

  if (existing) {
    const reasons = existing.matchedBy.includes(matchedBy)
      ? existing.matchedBy
      : [...existing.matchedBy, matchedBy];

    candidates.set(player.id, {
      player,
      matchedBy: reasons,
      score: existing.score + score
    });
    return;
  }

  candidates.set(player.id, {
    player,
    matchedBy: [matchedBy],
    score
  });
};

const buildCandidateMatches = (players: PlayerRow[], transcript: string) => {
  const normalizedTranscript = normalizeSearchText(transcript);
  const candidates = new Map<string, PlayerCandidate>();
  const jerseyMatches = normalizedTranscript.match(/(?:^|\s)#?(\d+)(?=\s|$)/g) ?? [];

  jerseyMatches.forEach((match) => {
    const jerseyNumber = Number(match.replace(/[^0-9]/g, ""));

    players
      .filter((player) => player.jersey_number === jerseyNumber)
      .forEach((player) => addCandidate(candidates, player, `#${jerseyNumber}`, 5));
  });

  players.forEach((player) => {
    const fullName = normalizeSearchText(`${player.first_name} ${player.last_name}`);
    const searchTerms = [
      { value: fullName, label: `${player.first_name} ${player.last_name}`, score: 4 },
      { value: normalizeSearchText(player.first_name), label: player.first_name, score: 2 },
      { value: normalizeSearchText(player.last_name), label: player.last_name, score: 2 },
      ...(player.aliases ?? []).map((alias) => ({
        value: normalizeSearchText(alias),
        label: alias,
        score: 3
      }))
    ];

    searchTerms.forEach((term) => {
      if (!term.value) {
        return;
      }

      if (includesPhrase(normalizedTranscript, term.value)) {
        addCandidate(candidates, player, term.label, term.score);
      }
    });
  });

  return [...candidates.values()].sort((left, right) => right.score - left.score);
};

const toCandidateSummary = (candidate: PlayerCandidate) => ({
  playerId: candidate.player.id,
  playerDisplayName: `${candidate.player.first_name} ${candidate.player.last_name}`,
  jerseyNumber: candidate.player.jersey_number,
  matchedBy: candidate.matchedBy
});

const resolvePlayer = (players: PlayerRow[], transcript: string) => {
  const rankedCandidates = buildCandidateMatches(players, transcript);

  if (rankedCandidates.length === 0) {
    return {
      kind: "clarification" as const,
      clarification: {
        reason: "missing_player" as const,
        message: "I found the stat type, but I couldn't match the player to this roster."
      }
    };
  }

  if (
    rankedCandidates.length > 1 &&
    rankedCandidates[0]?.score === rankedCandidates[1]?.score
  ) {
    return {
      kind: "clarification" as const,
      clarification: {
        reason: "ambiguous_player" as const,
        message: "I matched more than one player. Try a jersey number or a more specific name.",
        candidates: rankedCandidates.slice(0, 3).map(toCandidateSummary)
      }
    };
  }

  return {
    kind: "proposal" as const,
    player: rankedCandidates[0].player,
    matchedBy: rankedCandidates[0].matchedBy
  };
};

const isUnsupportedContextClause = (clause: string) => {
  const normalizedClause = normalizeSearchText(clause);
  return unsupportedContextAliases.some((alias) => includesPhrase(normalizedClause, alias));
};

const buildPlayerFragments = ({
  clause,
  eventAlias,
  eventType
}: {
  clause: string;
  eventAlias: string;
  eventType: StatEventType;
}) => {
  const normalizedClause = normalizeSearchText(clause);
  const aliasIndex = findAliasIndex(normalizedClause, eventAlias);
  const fragments: string[] = [];

  const addFragment = (value: string) => {
    const normalizedValue = normalizeSearchText(value);
    if (normalizedValue && !fragments.includes(normalizedValue)) {
      fragments.push(normalizedValue);
    }
  };

  const byIndex = normalizedClause.lastIndexOf(" by ");
  if (byIndex >= 0) {
    addFragment(normalizedClause.slice(byIndex + 4));
  }

  if (aliasIndex >= 0) {
    addFragment(normalizedClause.slice(0, aliasIndex));
    addFragment(normalizedClause.slice(aliasIndex + eventAlias.length));
  }

  if (eventType === "set" && aliasIndex >= 0) {
    addFragment(normalizedClause.slice(0, aliasIndex));
  }

  addFragment(normalizedClause);
  return fragments;
};

const resolvePlayerForClause = ({
  players,
  clause,
  eventAlias,
  eventType
}: {
  players: PlayerRow[];
  clause: string;
  eventAlias: string;
  eventType: StatEventType;
}) => {
  const fragments = buildPlayerFragments({
    clause,
    eventAlias,
    eventType
  });

  for (const fragment of fragments) {
    const rankedCandidates = buildCandidateMatches(players, fragment);

    if (rankedCandidates.length === 0) {
      continue;
    }

    if (
      rankedCandidates.length > 1 &&
      rankedCandidates[0]?.score === rankedCandidates[1]?.score
    ) {
      return {
        kind: "clarification" as const,
        clarification: {
          reason: "ambiguous_player" as const,
          message: "I matched more than one player in this rally clause. Try a jersey number or a more specific name.",
          candidates: rankedCandidates.slice(0, 3).map(toCandidateSummary)
        }
      };
    }

    return {
      kind: "proposal" as const,
      player: rankedCandidates[0].player,
      matchedBy: rankedCandidates[0].matchedBy
    };
  }

  return {
    kind: "clarification" as const,
    clarification: {
      reason: "missing_player" as const,
      message: "I found the stat type in this rally clause, but I couldn't match the player to this roster."
    }
  };
};

const primaryClauseSplitPattern =
  /\s*(?:[,;]+|(?:\b(?:and then|then|and)\b)|(?:[.!?]+))\s*/i;

const countResolvedEventMatches = (transcript: string) =>
  eventAliases.reduce((count, { aliases }) => {
    const hasMatch = aliases.some((alias) => includesPhrase(normalizeSearchText(transcript), alias));
    return count + (hasMatch ? 1 : 0);
  }, 0);

const splitSegmentOnTo = (segment: string) => {
  if (!/\bto\b/i.test(segment)) {
    return [segment];
  }

  if (countResolvedEventMatches(segment) < 2) {
    return [segment];
  }

  return segment
    .split(/\s+\bto\b\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
};

const splitTranscriptIntoClauses = (transcript: string) =>
  transcript
    .split(primaryClauseSplitPattern)
    .flatMap((part) => splitSegmentOnTo(part.trim()))
    .filter(Boolean);

export const buildProposalBatchResult = (
  clauses: ParsedBatchClause[]
): Extract<ParseMatchResult, { kind: "proposal_batch" }> => {
  const proposals = clauses.flatMap((clause) => (clause.proposal ? [clause.proposal] : []));
  const skippedClauses = clauses.flatMap((clause) => (clause.skipped ? [clause.skipped] : []));

  return {
    kind: "proposal_batch",
    clauses,
    proposals,
    skippedClauses
  };
};

const parseClause = ({
  clause,
  clauseIndex,
  players,
  currentSet
}: {
  clause: string;
  clauseIndex: number;
  players: PlayerRow[];
  currentSet: number;
}) => {
  const clauseId = `clause-${clauseIndex + 1}`;
  const eventMatch = resolveEventType(clause);

  if (!eventMatch) {
    if (isUnsupportedContextClause(clause)) {
      return {
        kind: "skipped" as const,
        skipped: {
          clauseId,
          text: clause,
          reason: "unsupported_event" as const,
          message: "This clause looks like rally context, but it does not map to a supported persisted stat in v1."
        }
      };
    }

    const playerResolution = resolvePlayer(players, clause);

    if (playerResolution.kind === "proposal") {
      return {
        kind: "skipped" as const,
        skipped: {
          clauseId,
          text: clause,
          reason: "missing_event_type" as const,
          message: "I matched the player in this rally clause, but I could not map the stat wording to the supported vocabulary yet."
        }
      };
    }

    if (playerResolution.clarification.reason === "ambiguous_player") {
      return {
        kind: "skipped" as const,
        skipped: {
          clauseId,
          text: clause,
          reason: "ambiguous_player" as const,
          message: "I matched more than one player in this rally clause. Try a jersey number or a more specific name.",
          candidates: playerResolution.clarification.candidates
        }
      };
    }

    return {
      kind: "skipped" as const,
      skipped: {
        clauseId,
        text: clause,
        reason: "unsupported_event" as const,
        message: "This clause did not map to a supported persisted stat in v1."
      }
    };
  }

  const playerResolution = resolvePlayerForClause({
    players,
    clause,
    eventAlias: eventMatch.alias,
    eventType: eventMatch.eventType
  });

  if (playerResolution.kind === "clarification") {
    return {
      kind: "skipped" as const,
      skipped: {
        clauseId,
        text: clause,
        reason: playerResolution.clarification.reason,
        message: playerResolution.clarification.message,
        candidates: playerResolution.clarification.candidates
      }
    };
  }

  return {
    kind: "proposal" as const,
    proposal: {
      uiId: clauseId,
      playerId: playerResolution.player.id,
      playerDisplayName: `${playerResolution.player.first_name} ${playerResolution.player.last_name}`,
      jerseyNumber: playerResolution.player.jersey_number,
      eventType: eventMatch.eventType,
      eventLabel: titleCase(eventMatch.eventType),
      setNumber: currentSet,
      matchedPlayerBy: playerResolution.matchedBy
    }
  };
};

export const parseMatchTranscript = ({
  transcript,
  players,
  currentSet
}: {
  transcript: string;
  players: PlayerRow[];
  currentSet: number;
}): ParseMatchResult => {
  const normalizedTranscript = transcript.trim();

  if (!normalizedTranscript) {
    return {
      kind: "clarification",
      clarification: {
        reason: "missing_event_type",
        message: "No transcript was provided to parse."
      }
    };
  }

  const eventMatch = resolveEventType(normalizedTranscript);

  const clauses = splitTranscriptIntoClauses(normalizedTranscript);
  const shouldAttemptBatch = clauses.length > 1;

  if (!shouldAttemptBatch && !eventMatch) {
    return {
      kind: "clarification",
      clarification: {
        reason: "missing_event_type",
        message: "I couldn't map that phrase to the MVP stat vocabulary yet."
      }
    };
  }

  if (!shouldAttemptBatch) {
    const playerResolution = resolvePlayer(players, normalizedTranscript);

    if (playerResolution.kind === "clarification") {
      return playerResolution;
    }

    return {
      kind: "proposal",
      proposal: {
        uiId: "clause-1",
        playerId: playerResolution.player.id,
        playerDisplayName: `${playerResolution.player.first_name} ${playerResolution.player.last_name}`,
        jerseyNumber: playerResolution.player.jersey_number,
        eventType: eventMatch!.eventType,
        eventLabel: titleCase(eventMatch!.eventType),
        setNumber: currentSet,
        matchedPlayerBy: playerResolution.matchedBy
      }
    };
  }

  const clauseResults = clauses.map((clause, clauseIndex) =>
    parseClause({
      clause,
      clauseIndex,
      players,
      currentSet
    })
  );

  const batchClauses: ParsedBatchClause[] = clauseResults.map((result, clauseIndex) =>
    result.kind === "proposal"
      ? {
          clauseId: result.proposal.uiId,
          text: clauses[clauseIndex],
          proposal: result.proposal,
          skipped: null
        }
      : {
          clauseId: result.skipped.clauseId,
          text: clauses[clauseIndex],
          proposal: null,
          skipped: result.skipped
        }
  );

  return buildProposalBatchResult(batchClauses);
};

export const parseLastEventCorrection = ({
  transcript,
  players,
  fallbackPlayerId
}: {
  transcript: string;
  players: PlayerRow[];
  fallbackPlayerId: string;
}):
  | {
      kind: "proposal";
      proposal: ParsedCorrectionProposal;
    }
  | {
      kind: "clarification";
      clarification: ParseClarification;
    } => {
  const normalizedTranscript = transcript.trim();

  if (!normalizedTranscript) {
    return {
      kind: "clarification",
      clarification: {
        reason: "missing_event_type",
        message: "Say or enter the replacement stat for the last confirmed event."
      }
    };
  }

  const eventMatch = resolveEventType(normalizedTranscript);

  if (!eventMatch) {
    return {
      kind: "clarification",
      clarification: {
        reason: "missing_event_type",
        message: "I couldn't find the replacement stat type in that correction."
      }
    };
  }

  const fallbackPlayer = players.find((player) => player.id === fallbackPlayerId);

  if (!fallbackPlayer) {
    return {
      kind: "clarification",
      clarification: {
        reason: "missing_player",
        message: "The original player for the last confirmed event is no longer available."
      }
    };
  }

  const playerResolution = resolvePlayer(players, normalizedTranscript);

  if (playerResolution.kind === "clarification") {
    if (playerResolution.clarification.reason === "ambiguous_player") {
      return playerResolution;
    }

    return {
      kind: "proposal",
      proposal: {
        playerId: fallbackPlayer.id,
        playerDisplayName: `${fallbackPlayer.first_name} ${fallbackPlayer.last_name}`,
        jerseyNumber: fallbackPlayer.jersey_number,
        eventType: eventMatch.eventType,
        eventLabel: titleCase(eventMatch.eventType),
        matchedPlayerBy: ["last confirmed player"]
      }
    };
  }

  return {
    kind: "proposal",
    proposal: {
      playerId: playerResolution.player.id,
      playerDisplayName: `${playerResolution.player.first_name} ${playerResolution.player.last_name}`,
      jerseyNumber: playerResolution.player.jersey_number,
      eventType: eventMatch.eventType,
      eventLabel: titleCase(eventMatch.eventType),
      matchedPlayerBy: playerResolution.matchedBy
    }
  };
};
