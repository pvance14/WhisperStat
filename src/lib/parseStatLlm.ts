import type { StatEventType } from "@/lib/database.types";
import type { ParseClarification, ParsedSkippedClause } from "@/lib/matchParser";
import { appEnv } from "@/lib/env";
import { requireSupabase } from "@/lib/supabase";

export type LlmParseReason = ParseClarification["reason"] | ParsedSkippedClause["reason"];

const allowedClarificationReasons = new Set<LlmParseReason>([
  "missing_event_type",
  "missing_player"
]);

const maxTranscriptLength = 140;

export interface LlmParseResult {
  eventType: StatEventType;
  playerId: string;
}

const getFunctionErrorMessage = async (error: { message?: string; context?: unknown }) => {
  const response = error.context instanceof Response ? error.context : null;

  if (!response) {
    return error.message || "AI assist could not parse this clarification.";
  }

  try {
    const payload = (await response.clone().json()) as { error?: string; message?: string };
    return payload.error || payload.message || error.message || "AI assist could not parse this clarification.";
  } catch {
    try {
      const text = await response.clone().text();
      return text || error.message || "AI assist could not parse this clarification.";
    } catch {
      return error.message || "AI assist could not parse this clarification.";
    }
  }
};

export const getLlmParseEligibility = ({
  reason,
  transcript
}: {
  reason: LlmParseReason;
  transcript: string;
}) => {
  if (!appEnv.llmParseEnabled) {
    return {
      allowed: false as const,
      status: "skipped" as const,
      message: "AI assist is off because VITE_LLM_PARSE_ENABLED is not enabled."
    };
  }

  if (!allowedClarificationReasons.has(reason)) {
    return {
      allowed: false as const,
      status: "skipped" as const,
      message: "AI assist is only enabled for missing event type or missing player clarifications."
    };
  }

  const normalizedTranscript = transcript.trim();

  if (!normalizedTranscript) {
    return {
      allowed: false as const,
      status: "skipped" as const,
      message: "AI assist was skipped because the transcript was empty."
    };
  }

  if (normalizedTranscript.length > maxTranscriptLength) {
    return {
      allowed: false as const,
      status: "skipped" as const,
      message: `AI assist was skipped because transcripts longer than ${maxTranscriptLength} characters are out of scope for this fallback.`
    };
  }

  return {
    allowed: true as const,
    normalizedTranscript
  };
};

export const parseStatLlm = async ({
  gameId,
  transcript,
  currentSet
}: {
  gameId: string;
  transcript: string;
  currentSet: number;
}) => {
  const supabase = requireSupabase();
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("You need to be signed in before AI assist can check a clarification.");
  }

  const { data, error } = await supabase.functions.invoke<LlmParseResult>("parse-stat-llm", {
    body: {
      gameId,
      transcript,
      currentSet
    },
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  if (!data?.eventType || !data?.playerId) {
    throw new Error("AI assist returned an incomplete proposal.");
  }

  return data;
};
