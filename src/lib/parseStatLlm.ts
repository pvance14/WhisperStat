import type { StatEventType } from "@/lib/database.types";
import type { ParseClarification } from "@/lib/matchParser";
import { appEnv } from "@/lib/env";
import { requireSupabase } from "@/lib/supabase";

const allowedClarificationReasons = new Set<ParseClarification["reason"]>([
  "missing_event_type",
  "missing_player"
]);

const maxTranscriptLength = 140;

export interface LlmParseResult {
  eventType: StatEventType;
  playerId: string;
}

export const getLlmParseEligibility = ({
  reason,
  transcript
}: {
  reason: ParseClarification["reason"];
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
    throw new Error(error.message || "AI assist could not parse this clarification.");
  }

  if (!data?.eventType || !data?.playerId) {
    throw new Error("AI assist returned an incomplete proposal.");
  }

  return data;
};
