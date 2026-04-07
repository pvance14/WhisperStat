import type { Database } from "@/lib/database.types";
import { requireSupabase } from "@/lib/supabase";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"];

const maxKeyterms = 40;
const baseVolleyballKeyterms = [
  "kill",
  "ace",
  "serve error",
  "service error",
  "serve receive",
  "reception error",
  "attack error",
  "block",
  "dig",
  "setter",
  "outside",
  "middle",
  "right side",
  "free ball"
] as const;

interface DeepgramTokenResponse {
  accessToken: string;
  expiresIn: number | null;
}

const uniqueByCount = (values: string[]) => {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      return;
    }

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });

  return counts;
};

const addKeyterm = (terms: string[], seen: Set<string>, value: string) => {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed || seen.has(normalized) || terms.length >= maxKeyterms) {
    return;
  }

  seen.add(normalized);
  terms.push(trimmed);
};

export const buildDeepgramKeyterms = (players: PlayerRow[]) => {
  const firstNameCounts = uniqueByCount(players.map((player) => player.first_name));
  const lastNameCounts = uniqueByCount(players.map((player) => player.last_name));
  const terms: string[] = [];
  const seen = new Set<string>();

  players.forEach((player) => {
    addKeyterm(terms, seen, `${player.first_name} ${player.last_name}`);

    if ((firstNameCounts.get(player.first_name.trim().toLowerCase()) ?? 0) === 1) {
      addKeyterm(terms, seen, player.first_name);
    }

    if ((lastNameCounts.get(player.last_name.trim().toLowerCase()) ?? 0) === 1) {
      addKeyterm(terms, seen, player.last_name);
    }

    (player.aliases ?? []).forEach((alias) => {
      addKeyterm(terms, seen, alias);
    });
  });

  baseVolleyballKeyterms.forEach((term) => addKeyterm(terms, seen, term));

  return terms;
};

export const requestDeepgramAccessToken = async () => {
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
    throw new Error("Sign in first to use live dictation.");
  }

  const { data, error } = await supabase.functions.invoke<DeepgramTokenResponse>("deepgram-token", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (error) {
    const response = error.context instanceof Response ? error.context : null;

    if (!response) {
      throw new Error(error.message || "Could not start live dictation.");
    }

    try {
      const payload = (await response.clone().json()) as { error?: string; message?: string };
      throw new Error(payload.error || payload.message || error.message || "Could not start live dictation.");
    } catch {
      try {
        const text = await response.clone().text();
        throw new Error(text || error.message || "Could not start live dictation.");
      } catch {
        throw new Error(error.message || "Could not start live dictation.");
      }
    }
  }

  if (!data?.accessToken) {
    throw new Error("Live dictation did not receive a Deepgram access token.");
  }

  return data;
};
