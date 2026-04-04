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
    return error.message || "Could not parse that suggestion automatically.";
  }

  try {
    const payload = (await response.clone().json()) as { error?: string; message?: string };
    return payload.error || payload.message || error.message || "Could not parse that suggestion automatically.";
  } catch {
    try {
      const text = await response.clone().text();
      return text || error.message || "Could not parse that suggestion automatically.";
    } catch {
      return error.message || "Could not parse that suggestion automatically.";
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
      message: "Smart fill-in for unclear calls is turned off in this build."
    };
  }

  if (!allowedClarificationReasons.has(reason)) {
    return {
      allowed: false as const,
      status: "skipped" as const,
      message: "Smart fill-in only runs when the stat type or player is unclear—not for other cases."
    };
  }

  const normalizedTranscript = transcript.trim();

  if (!normalizedTranscript) {
    return {
      allowed: false as const,
      status: "skipped" as const,
      message: "Smart fill-in was skipped because there was nothing typed in."
    };
  }

  if (normalizedTranscript.length > maxTranscriptLength) {
    return {
      allowed: false as const,
      status: "skipped" as const,
      message: `Smart fill-in only accepts short notes (up to ${maxTranscriptLength} characters) for now.`
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
    throw new Error("Sign in first to use smart fill-in for unclear calls.");
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
    throw new Error("Smart fill-in returned an incomplete play.");
  }

  return data;
};
